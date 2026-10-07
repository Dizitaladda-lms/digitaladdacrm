import { readFile } from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";
import "@tensorflow/tfjs-backend-cpu";
import "@tensorflow/tfjs-backend-wasm";
import humanModule from "../node_modules/@vladmandic/human/dist/human.node-wasm.js";
import ApiError from "./ApiError.js";

const Human = humanModule.Human || humanModule.default;
const MODEL_DIRECTORY = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../node_modules/@vladmandic/human/models"
);
const HUMAN_CONFIG = {
  backend: "cpu",
  modelBasePath: pathToFileURL(`${MODEL_DIRECTORY}${path.sep}`).href,
  debug: false,
  async: false,
  face: {
    enabled: true,
    detector: {
      rotation: true,
      maxDetected: 2,
      minConfidence: 0.6,
      skipFrames: 0,
      skipTime: 0,
    },
    mesh: { enabled: true },
    iris: { enabled: false },
    emotion: { enabled: false },
    description: { enabled: true, skipFrames: 0, skipTime: 0 },
    antispoof: { enabled: true, skipFrames: 0, skipTime: 0 },
    liveness: { enabled: true, skipFrames: 0, skipTime: 0 },
  },
  body: { enabled: false },
  hand: { enabled: false },
  object: { enabled: false },
};

let humanPromise;
let inferenceQueue = Promise.resolve();

const getHuman = () => {
  if (!humanPromise) {
    humanPromise = (async () => {
      const human = new Human(HUMAN_CONFIG);
      await human.tf.setBackend("cpu");
      await human.tf.ready();
      const originalFetch = globalThis.fetch;
      globalThis.fetch = (resource, requestInit) => {
        const url = resource instanceof URL ? resource.href : String(resource);
        if (url.startsWith("file://")) {
          return readFile(fileURLToPath(url)).then((body) => new Response(body, { status: 200 }));
        }
        return originalFetch(resource, requestInit);
      };
      try {
        await human.load();
      } finally {
        globalThis.fetch = originalFetch;
      }
      const requiredModels = ["blazeface", "facemesh", "faceres", "antispoof", "liveness"];
      const loadedModels = human.models.loaded();
      const missingModels = requiredModels.filter((model) => !loadedModels.includes(model));
      if (missingModels.length > 0) {
        throw new Error(`Face verification models failed to load: ${missingModels.join(", ")}`);
      }
      return human;
    })().catch((error) => {
      humanPromise = null;
      throw error;
    });
  }
  return humanPromise;
};

export const initializeFaceVerification = async () => {
  await getHuman();
};

const runSerialized = (callback) => {
  const result = inferenceQueue.then(callback, callback);
  inferenceQueue = result.then(() => undefined, () => undefined);
  return result;
};

const decodeImage = async (dataUrl) => {
  if (typeof dataUrl !== "string" || dataUrl.length > 1_400_000) {
    throw new ApiError(400, "Face check image is missing or too large.");
  }

  const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) {
    throw new ApiError(400, "Face check must be a captured JPEG image.");
  }
  const imageBuffer = Buffer.from(match[1], "base64");
  if (
    imageBuffer.length < 2_000 ||
    imageBuffer.length > 1_000_000 ||
    imageBuffer.toString("base64") !== match[1]
  ) {
    throw new ApiError(400, "Face check image is invalid.");
  }

  try {
    const { data, info } = await sharp(imageBuffer, { failOn: "error" })
      .rotate()
      .resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true })
      .removeAlpha()
      .toColourspace("srgb")
      .raw()
      .toBuffer({ resolveWithObject: true });
    if (info.channels !== 3 || info.width < 160 || info.height < 160) {
      throw new ApiError(400, "Move closer to the camera and try again.");
    }
    return { data: new Uint8Array(data), width: info.width, height: info.height };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "Face check image could not be read. Please capture it again.");
  }
};

const detectFace = async (image) => {
  const human = await getHuman();
  const input = human.tf.tensor4d(
    image.data,
    [1, image.height, image.width, 3],
    "float32"
  );
  let result;
  try {
    result = await human.detect(input, HUMAN_CONFIG);
    if (result.face?.length !== 1) {
      throw new ApiError(400, "Keep only one face in the camera frame.");
    }
    const face = result.face[0];
    if (
      face.embedding?.length !== 1024 ||
      face.embedding.some((value) => !Number.isFinite(value)) ||
      !Number.isFinite(face.rotation?.angle?.yaw) ||
      Math.min(face.box?.[2] || 0, face.box?.[3] || 0) < 120 ||
      Number(face.faceScore || face.boxScore || 0) < 0.6 ||
      Number(face.real || 0) < 0.6 ||
      !Number.isFinite(face.live)
    ) {
      throw new ApiError(
        400,
        "Live face check failed. Use good lighting, look at the camera, and follow the movement prompt."
      );
    }
    const analyzedFace = {
      embedding: Array.from(face.embedding, Number),
      yaw: face.rotation.angle.yaw,
      live: face.live,
    };
    return analyzedFace;
  } finally {
    human.tf.dispose(input);
    result?.face?.forEach((face) => {
      if (face.tensor) human.tf.dispose(face.tensor);
    });
  }
};

export const hasConsistentLivenessScores = (scores) =>
  scores.length === 3 &&
  scores.every(Number.isFinite) &&
  Math.min(...scores) >= 0.4 &&
  scores.reduce((total, score) => total + score, 0) / scores.length >= 0.6;

export const hasValidAttendanceLivenessScore = (score) =>
  Number.isFinite(score) && score >= 0.6;

export const hasExpectedFaceFrameCount = (frames, expectedCount) =>
  Array.isArray(frames) && frames.length === expectedCount;

const getEncryptionKey = () => {
  const encodedKey = process.env.ATTENDANCE_FACE_ENCRYPTION_KEY;
  if (!encodedKey || !/^[a-fA-F0-9]{64}$/.test(encodedKey)) {
    throw new ApiError(
      503,
      "Face attendance is not configured. Contact an administrator before registering."
    );
  }
  return Buffer.from(encodedKey, "hex");
};

export const assertFaceEncryptionConfigured = () => {
  getEncryptionKey();
};

export const encryptFaceTemplate = (embedding) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(embedding), "utf8"),
    cipher.final(),
  ]);
  return {
    encrypted: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
};

export const verifyAndCreateFaceTemplate = async (faceProof, expectedChallenge) =>
  runSerialized(async () => {
    if (
      !expectedChallenge?.nonce ||
      !["LEFT", "RIGHT"].includes(expectedChallenge.turn)
    ) {
      throw new ApiError(400, "Face verification challenge is invalid. Please start again.");
    }
    if (
      !faceProof ||
      faceProof.challenge !== expectedChallenge.nonce ||
      !hasExpectedFaceFrameCount(faceProof.frames, 3)
    ) {
      throw new ApiError(400, "Face verification expired or incomplete. Please try again.");
    }

    const human = await getHuman();
    const results = [];
    for (const dataUrl of faceProof.frames) {
      results.push(await detectFace(await decodeImage(dataUrl)));
    }

    if (!hasConsistentLivenessScores(results.map(({ live }) => live))) {
      throw new ApiError(
        400,
        "Live face check failed. Use good lighting, look at the camera, and follow the movement prompt."
      );
    }

    const [centerStart, turned, centerEnd] = results;
    const centered = Math.abs(centerStart.yaw) < 0.35 && Math.abs(centerEnd.yaw) < 0.35;
    const turnedCorrectly = Math.abs(turned.yaw) > 0.25;
    const matchOptions = { order: 2, multiplier: 25, min: 0.2, max: 0.8 };
    const samePerson =
      human.match.similarity(
        centerStart.embedding,
        centerEnd.embedding,
        matchOptions
      ) >= 0.5;
    if (!centered || !turnedCorrectly || !samePerson) {
      throw new ApiError(
        401,
        "Face verification did not match. Follow the on-screen head-turn steps and try again."
      );
    }
    return encryptFaceTemplate(centerStart.embedding);
  });

export const verifyFaceAttendance = async (faceProof, expectedChallenge, encryptedTemplate) =>
  runSerialized(async () => {
    if (!expectedChallenge?.nonce) {
      throw new ApiError(400, "Face verification challenge is invalid. Please start again.");
    }
    if (!encryptedTemplate?.encrypted || !encryptedTemplate?.iv || !encryptedTemplate?.tag) {
      throw new ApiError(403, "Register your attendance face before marking attendance.");
    }
    if (
      !faceProof ||
      faceProof.challenge !== expectedChallenge.nonce ||
      !hasExpectedFaceFrameCount(faceProof.frames, 1)
    ) {
      throw new ApiError(400, "Face verification expired or incomplete. Please try again.");
    }

    let registeredEmbedding;
    try {
      const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        getEncryptionKey(),
        Buffer.from(encryptedTemplate.iv, "base64")
      );
      decipher.setAuthTag(Buffer.from(encryptedTemplate.tag, "base64"));
      registeredEmbedding = JSON.parse(
        Buffer.concat([
          decipher.update(Buffer.from(encryptedTemplate.encrypted, "base64")),
          decipher.final(),
        ]).toString("utf8")
      );
      if (
        !Array.isArray(registeredEmbedding) ||
        registeredEmbedding.length !== 1024 ||
        registeredEmbedding.some((value) => !Number.isFinite(value))
      ) {
        throw new Error("Stored face template has an invalid format.");
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, "Stored face template could not be verified. Contact HR.");
    }

    const human = await getHuman();
    const results = [];
    for (const dataUrl of faceProof.frames) {
      results.push(await detectFace(await decodeImage(dataUrl)));
    }

    const [capturedFace] = results;
    if (!hasValidAttendanceLivenessScore(capturedFace.live)) {
      throw new ApiError(
        400,
        "Live face check failed. Use good lighting, look at the camera, and follow the movement prompt."
      );
    }

    const centered = Math.abs(capturedFace.yaw) < 0.35;
    const matchesRegisteredFace =
      human.match.similarity(registeredEmbedding, capturedFace.embedding, {
        order: 2,
        multiplier: 25,
        min: 0.2,
        max: 0.8,
      }) >= 0.5;
    if (!centered || !matchesRegisteredFace) {
      throw new ApiError(401, "Face did not match the registered employee. Try again or contact HR.");
    }
    return true;
  });
