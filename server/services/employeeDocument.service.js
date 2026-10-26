import crypto from "crypto";
import { v2 as cloudinary } from "cloudinary";
import { withTransaction } from "../config/db.js";
import ApiError from "../utils/ApiError.js";
import { decryptDocumentDetail, encryptDocumentDetail, maskDocumentNumber } from "../utils/employeeDocumentSecurity.js";
import { ensureEmployeeProfileForUser } from "./ensureEmployeeProfile.service.js";
import {
  createEmployeeDocumentRepository,
  deleteEmployeeDocumentRepository,
  findEmployeeDocumentByIdRepository,
  findEmployeeDocumentsRepository,
  findAllEmployeeDocumentsForHRRepository,
  findEmployeeDocumentByIdForHRRepository,
} from "../repositories/employeeDocumentRepository.js";

const DOCUMENT_TYPES = new Set([
  "AADHAAR_CARD",
  "PAN_CARD",
  "OFFICE_DOCUMENT",
  "OTHER",
  "PROFILE_PHOTO",
  "BANK_DETAILS",
]);

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

const toDocumentResponse = (document, { includeDetails = false } = {}) => {
  const documentNumber = decryptDocumentDetail(document.document_number_encrypted);
  const documentDetails = decryptDocumentDetail(document.document_details_encrypted);
  return {
  id: document.id,
  document_type: document.document_type,
  document_label: document.document_label,
  original_filename: document.original_filename,
  mime_type: document.mime_type,
  size_bytes: Number(document.size_bytes),
  created_at: document.created_at,
  is_profile_photo: document.document_type === "PROFILE_PHOTO",
  document_number: includeDetails ? documentNumber : maskDocumentNumber(documentNumber),
  document_details: includeDetails ? documentDetails : "",
  };
};

const parseManualDocumentDetails = (payload, documentType) => {
  const documentNumber = String(payload.document_number || "").trim().toUpperCase();
  const documentDetails = String(payload.document_details || "").trim().slice(0, 1000);
  const aadhaarDigits = documentNumber.replace(/\s/g, "");

  if (documentType === "PROFILE_PHOTO") {
    return { documentNumber: "", documentDetails: "" };
  }

  // All non-profile-photo documents require both document number and details (Compulsory)
  if (!documentNumber) {
    if (documentType === "AADHAAR_CARD") throw new ApiError(400, "Aadhaar number is compulsory.");
    if (documentType === "PAN_CARD") throw new ApiError(400, "PAN number is compulsory.");
    if (documentType === "BANK_DETAILS") throw new ApiError(400, "Bank account number is compulsory.");
    throw new ApiError(400, "Document / Reference number is compulsory.");
  }

  if (documentType === "AADHAAR_CARD") {
    if (!/^\d{12}$/.test(aadhaarDigits)) {
      throw new ApiError(400, "Aadhaar number must contain exactly 12 digits.");
    }
    if (!documentDetails) {
      throw new ApiError(400, "Aadhaar details (Name on Aadhaar & DOB/Address) are compulsory.");
    }
    return { documentNumber: aadhaarDigits, documentDetails };
  }

  if (documentType === "PAN_CARD") {
    if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(documentNumber)) {
      throw new ApiError(400, "Enter a valid 10-character PAN number (e.g. ABCDE1234F).");
    }
    if (!documentDetails) {
      throw new ApiError(400, "PAN details (Name on PAN & Father's Name/DOB) are compulsory.");
    }
    return { documentNumber, documentDetails };
  }

  if (documentType === "BANK_DETAILS") {
    const cleanAcc = documentNumber.replace(/[\s-]/g, "");
    if (!/^\d{9,18}$/.test(cleanAcc)) {
      throw new ApiError(400, "Bank account number must be between 9 and 18 digits.");
    }
    if (!documentDetails) {
      throw new ApiError(400, "Bank details (Bank Name, IFSC Code, Account Holder Name, Branch) are compulsory.");
    }
    return { documentNumber: cleanAcc, documentDetails };
  }

  if (!documentDetails) {
    throw new ApiError(400, "Document details are compulsory.");
  }

  return { documentNumber, documentDetails };
};

export const uploadMyEmployeeDocumentService = async (user, file, payload = {}) => {
  if (!file) throw new ApiError(400, "Select a document to upload.");
  const documentType = String(payload.document_type || "").toUpperCase();
  if (!DOCUMENT_TYPES.has(documentType)) throw new ApiError(400, "Choose a valid document type.");
  const defaultLabel =
    documentType === "AADHAAR_CARD" ? "Aadhaar Card" :
    documentType === "PAN_CARD" ? "PAN Card" :
    documentType === "BANK_DETAILS" ? "Bank Details (Passbook / Cheque)" :
    documentType === "PROFILE_PHOTO" ? "Official ID Card Photo" :
    documentType === "OFFICE_DOCUMENT" ? "Office Document" :
    file.originalname || "Other Document";
  const documentLabel = String(payload.document_label || defaultLabel).trim().slice(0, 120);
  if (!documentLabel) throw new ApiError(400, "Document label is required.");
  const { documentNumber, documentDetails } = parseManualDocumentDetails(payload, documentType);

  configureCloudinary();
  const employee = await ensureEmployeeProfileForUser(user.id);
  if (!employee?.id) throw new ApiError(400, "Your employee profile is not available.");

  let uploaded;
  try {
    uploaded = await uploadToCloudinary(file, employee.id);
  } catch (error) {
    console.error("Cloudinary employee document upload failed", {
      message: error?.message,
      http_code: error?.http_code,
      name: error?.name,
    });
    if (Number(error?.http_code) === 401 || Number(error?.http_code) === 403) {
      throw new ApiError(503, "Cloudinary rejected document storage credentials or account access. Contact the administrator.");
    }
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
      documentNumberEncrypted: encryptDocumentDetail(documentNumber),
      documentDetailsEncrypted: encryptDocumentDetail(documentDetails),
    }));
  } catch (error) {
    await cloudinary.uploader.destroy(uploaded.public_id, {
      resource_type: uploaded.resource_type || "raw",
      type: "authenticated",
      invalidate: true,
    }).catch(() => {});
    throw error;
  }
  return toDocumentResponse(saved, { includeDetails: true });
};

export const getMyEmployeeDocumentsService = async (user) => {
  configureCloudinary();
  const employee = await ensureEmployeeProfileForUser(user.id);
  if (!employee?.id) throw new ApiError(400, "Your employee profile is not available.");
  const documents = await findEmployeeDocumentsRepository(employee.id);
  return documents.map((document) => toDocumentResponse(document, { includeDetails: true }));
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

export const getHREmployeeDocumentsService = async (filters = {}) => {
  configureCloudinary();
  const documentType = String(filters.document_type || "").toUpperCase();
  if (documentType && !DOCUMENT_TYPES.has(documentType)) {
    throw new ApiError(400, "Choose a valid document type.");
  }
  const documents = await findAllEmployeeDocumentsForHRRepository({
    search: String(filters.search || "").slice(0, 100),
    documentType,
  });
  return documents.map((document) => ({
    ...toDocumentResponse(document),
    employee_id: document.employee_id,
    employee_name: document.employee_name,
    employee_code: document.employee_code,
    designation: document.designation,
    employee_email: document.employee_email,
    department_name: document.department_name,
  }));
};

export const getHREmployeeDocumentAccessUrlService = async (documentId) => {
  configureCloudinary();
  const document = await findEmployeeDocumentByIdForHRRepository(parseDocumentId(documentId));
  if (!document) throw new ApiError(404, "Document not found.");
  return {
    access_url: cloudinary.url(document.cloudinary_public_id, {
      resource_type: document.cloudinary_resource_type || "raw",
      type: "authenticated",
      sign_url: true,
      secure: true,
    }),
    mime_type: document.mime_type,
    original_filename: document.original_filename,
  };
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
