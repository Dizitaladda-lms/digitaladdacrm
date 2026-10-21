import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import {
  deleteMyEmployeeDocumentService,
  getMyEmployeeDocumentAccessUrlService,
  getMyEmployeeDocumentsService,
  uploadMyEmployeeDocumentService,
} from "../services/employeeDocument.service.js";

export const uploadMyEmployeeDocument = asyncHandler(async (req, res) => {
  const document = await uploadMyEmployeeDocumentService(req.user, req.file, req.body);
  return res.status(201).json(new ApiResponse(201, document, "Document uploaded securely."));
});

export const getMyEmployeeDocuments = asyncHandler(async (req, res) => {
  const documents = await getMyEmployeeDocumentsService(req.user);
  return res.status(200).json(new ApiResponse(200, documents, "My documents retrieved."));
});

export const getMyEmployeeDocumentAccessUrl = asyncHandler(async (req, res) => {
  const access = await getMyEmployeeDocumentAccessUrlService(req.user, req.params.id);
  return res.status(200).json(new ApiResponse(200, access, "Secure document access granted."));
});

export const deleteMyEmployeeDocument = asyncHandler(async (req, res) => {
  const result = await deleteMyEmployeeDocumentService(req.user, req.params.id);
  return res.status(200).json(new ApiResponse(200, result, "Document removed."));
});
