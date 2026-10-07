import crypto from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  encryptFaceTemplate,
  hasConsistentLivenessScores,
} from "../utils/faceVerification.js";

describe("face template encryption", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("encrypts templates with authenticated AES-256-GCM", () => {
    vi.stubEnv("ATTENDANCE_FACE_ENCRYPTION_KEY", "11".repeat(32));
    const embedding = Array.from({ length: 1024 }, (_, index) => index / 1024);

    const template = encryptFaceTemplate(embedding);
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      Buffer.from(process.env.ATTENDANCE_FACE_ENCRYPTION_KEY, "hex"),
      Buffer.from(template.iv, "base64")
    );
    decipher.setAuthTag(Buffer.from(template.tag, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(template.encrypted, "base64")),
      decipher.final(),
    ]).toString("utf8");

    expect(JSON.parse(plaintext)).toEqual(embedding);
    expect(template.encrypted).not.toContain(JSON.stringify(embedding));
  });

  it("rejects face registration when the encryption key is not configured", () => {
    vi.stubEnv("ATTENDANCE_FACE_ENCRYPTION_KEY", "");

    expect(() => encryptFaceTemplate([0.1])).toThrow(
      "Face attendance is not configured."
    );
  });
});

describe("face liveness scoring", () => {
  it("allows one noisy capture when the three-frame average remains strong", () => {
    expect(hasConsistentLivenessScores([0.42, 0.78, 0.72])).toBe(true);
  });

  it("rejects weak, incomplete, and invalid liveness scores", () => {
    expect(hasConsistentLivenessScores([0.39, 0.9, 0.9])).toBe(false);
    expect(hasConsistentLivenessScores([0.5, 0.55, 0.6])).toBe(false);
    expect(hasConsistentLivenessScores([0.8, 0.8])).toBe(false);
    expect(hasConsistentLivenessScores([0.8, Number.NaN, 0.8])).toBe(false);
  });
});
