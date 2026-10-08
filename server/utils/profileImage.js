import sharp from "sharp";
import ApiError from "./ApiError.js";

export const MAX_PROFILE_IMAGE_UPLOAD_BYTES = 200 * 1024;
export const MAX_PROFILE_IMAGE_STORED_BYTES = 50 * 1024;

const SUPPORTED_FORMATS = new Set(["jpeg", "png", "webp"]);

export const resizeProfileImageBuffer = async (imageBuffer) => {
  let metadata;
  try {
    metadata = await sharp(imageBuffer, {
      failOn: "error",
      limitInputPixels: 40_000_000,
    }).metadata();
  } catch {
    throw new ApiError(400, "The profile image is invalid or cannot be decoded.");
  }

  if (!SUPPORTED_FORMATS.has(metadata.format)) {
    throw new ApiError(400, "Use a PNG, JPEG, or WebP profile image.");
  }

  for (const quality of [75, 65, 55, 45, 35]) {
    const output = await sharp(imageBuffer, {
      failOn: "error",
      limitInputPixels: 40_000_000,
    })
      .rotate()
      .resize(256, 256, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();

    if (output.length <= MAX_PROFILE_IMAGE_STORED_BYTES) return output;
  }

  throw new ApiError(400, "The profile image could not be compressed below 50 KB.");
};

export const prepareProfileImageDataUrl = async (dataUrl) => {
  if (dataUrl === "" || dataUrl === null || dataUrl === undefined) return null;
  if (typeof dataUrl !== "string") {
    throw new ApiError(400, "Profile image must be an image data URL.");
  }

  const match = /^data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) {
    throw new ApiError(400, "Use a PNG, JPEG, or WebP profile image.");
  }

  const imageBuffer = Buffer.from(match[1], "base64");
  if (
    imageBuffer.length > MAX_PROFILE_IMAGE_UPLOAD_BYTES ||
    imageBuffer.toString("base64") !== match[1]
  ) {
    throw new ApiError(400, "Profile image must be a valid image smaller than 200 KB.");
  }

  const compressed = await resizeProfileImageBuffer(imageBuffer);
  return `data:image/jpeg;base64,${compressed.toString("base64")}`;
};
