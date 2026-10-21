import multer from "multer";
import ApiError from "../utils/ApiError.js";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return callback(new ApiError(400, "Only PDF, JPG, PNG, and WEBP documents are allowed."));
    }
    return callback(null, true);
  },
});

export const uploadEmployeeDocument = upload.single("file");
