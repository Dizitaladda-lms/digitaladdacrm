import multer from "multer";
import ApiError from "../utils/ApiError.js";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(new ApiError(400, "Only JPG, PNG, and WEBP screenshots are allowed."));
    }
    return callback(null, true);
  },
});

export const uploadLeaveApprovalProof = upload.single("manager_approval_proof");
