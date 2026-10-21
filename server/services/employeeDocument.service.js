import crypto from "crypto";
import { v2 as cloudinary } from "cloudinary";
import { withTransaction } from "../config/db.js";
import ApiError from "../utils/ApiError.js";
import { ensureEmployeeProfileForUser } from "./ensureEmployeeProfile.service.js";
import {
  createEmployeeDocumentRepository,
  deleteEmployeeDocumentRepository,
  findEmployeeDocumentByIdRepository,
  findEmployeeDocumentsRepository,
} from "../repositories/employeeDocumentRepository.js";

const DOCUMENT_TYPES = new Set(["AADHAAR_CARD", "PAN_CARD", "OFFICE_DOCUMENT", "OTHER", "PROFILE_PHOTO"]);

const parseDocumentId = (documentId) => {
  const id = Number(documentId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new ApiError(400, "Invalid document ID.");
  }
  return id;
};

const configureCloudinary = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new ApiError(503, "Secure document storage is not configured. Contact HR.");
  }
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
};

const uploadToCloudinary = (file, employeeId) => new Promise((resolve, reject) => {
  const publicId = `dizitaladda/employee-documents/${employeeId}/${crypto.randomUUID()}`;
  const stream = cloudinary.uploader.upload_stream(
    {
      public_id: publicId,
      resource_type: "auto",
      type: "authenticated",
      overwrite: false,
      invalidate: true,
      context: { employee_id: String(employeeId), purpose: "employee_document" },
    },
    (error, result) => (error ? reject(error) : resolve(result))
  );
  stream.end(file.buffer);
});

const toDocumentResponse = (document) => ({
  id: document.id,
  document_type: document.document_type,
  document_label: document.document_label,
  original_filename: document.original_filename,
  mime_type: document.mime_type,
  size_bytes: Number(document.size_bytes),
  created_at: document.created_at,
  is_profile_photo: document.document_type === "PROFILE_PHOTO",
});

export const uploadMyEmployeeDocumentService = async (user, file, payload = {}) => {
  if (!file) throw new ApiError(400, "Select a document to upload.");
  const documentType = String(payload.document_type || "").toUpperCase();
  if (!DOCUMENT_TYPES.has(documentType)) throw new ApiError(400, "Choose a valid document type.");
  const documentLabel = String(payload.document_label || file.originalname || "Document").trim().slice(0, 120);
  if (!documentLabel) throw new ApiError(400, "Document label is required.");

  configureCloudinary();
  const employee = await ensureEmployeeProfileForUser(user.id);
  if (!employee?.id) throw new ApiError(400, "Your employee profile is not available.");

  let uploaded;
  try {
    uploaded = await uploadToCloudinary(file, employee.id);
  } catch {
    throw new ApiError(502, "Document upload failed. Please try again.");
  }

  let saved;
  try {
    saved = await withTransaction(async (client) => createEmployeeDocumentRepository(client, {
      employeeId: employee.id,
      userId: user.id,
      documentType,
      documentLabel,
      originalFilename: file.originalname.slice(0, 255),
      mimeType: file.mimetype,
      sizeBytes: file.size,
      publicId: uploaded.public_id,
      resourceType: uploaded.resource_type || "raw",
      version: uploaded.version ? String(uploaded.version) : null,
    }));
  } catch (error) {
    await cloudinary.uploader.destroy(uploaded.public_id, {
      resource_type: uploaded.resource_type || "raw",
      type: "authenticated",
      invalidate: true,
    }).catch(() => {});
    throw error;
  }
  return toDocumentResponse(saved);
};

export const getMyEmployeeDocumentsService = async (user) => {
  configureCloudinary();
  const employee = await ensureEmployeeProfileForUser(user.id);
  if (!employee?.id) throw new ApiError(400, "Your employee profile is not available.");
  const documents = await findEmployeeDocumentsRepository(employee.id);
  return documents.map(toDocumentResponse);
};

export const getMyEmployeeDocumentAccessUrlService = async (user, documentId) => {
  configureCloudinary();
  const employee = await ensureEmployeeProfileForUser(user.id);
  const document = await findEmployeeDocumentByIdRepository(parseDocumentId(documentId), employee?.id);
  if (!document) throw new ApiError(404, "Document not found.");
  const accessUrl = cloudinary.url(document.cloudinary_public_id, {
    resource_type: document.cloudinary_resource_type || "raw",
    type: "authenticated",
    sign_url: true,
    secure: true,
  });
  return { access_url: accessUrl, mime_type: document.mime_type, original_filename: document.original_filename };
};

export const deleteMyEmployeeDocumentService = async (user, documentId) => {
  configureCloudinary();
  const employee = await ensureEmployeeProfileForUser(user.id);
  const deleted = await withTransaction(async (client) => deleteEmployeeDocumentRepository(client, parseDocumentId(documentId), employee?.id));
  if (!deleted) throw new ApiError(404, "Document not found.");
  await cloudinary.uploader.destroy(deleted.cloudinary_public_id, {
    resource_type: deleted.cloudinary_resource_type || "raw",
    type: "authenticated",
    invalidate: true,
  }).catch(() => {});
  return { id: deleted.id };
};
