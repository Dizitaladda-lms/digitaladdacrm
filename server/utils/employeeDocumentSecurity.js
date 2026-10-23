import crypto from "crypto";
import ApiError from "./ApiError.js";

const getKey = () => {
  const secret = process.env.EMPLOYEE_DOCUMENT_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
  if (!secret) throw new ApiError(503, "Secure document details storage is not configured. Contact HR.");
  return crypto.createHash("sha256").update(secret).digest();
};

export const encryptDocumentDetail = (value) => {
  if (!value) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  return `${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${encrypted.toString("base64")}`;
};

export const decryptDocumentDetail = (value) => {
  if (!value) return "";
  try {
    const [iv, tag, encrypted] = String(value).split(":");
    if (!iv || !tag || !encrypted) return "";
    const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64")), decipher.final()]).toString("utf8");
  } catch { return ""; }
};

export const maskDocumentNumber = (value) => {
  const text = String(value || "").trim();
  return text ? `${"•".repeat(Math.max(0, text.length - 4))}${text.slice(-4)}` : "";
};
