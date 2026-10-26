import { beforeEach, describe, expect, it, vi } from "vitest";
import { Writable } from "stream";

const cloudinaryMocks = vi.hoisted(() => ({
  config: vi.fn(),
  url: vi.fn(() => "https://res.cloudinary.com/example/signed-document"),
  destroy: vi.fn().mockResolvedValue({ result: "ok" }),
  upload_stream: vi.fn(),
}));

vi.mock("../config/db.js", () => ({
  withTransaction: vi.fn(async (cb) => await cb({ query: vi.fn() })),
}));

vi.mock("cloudinary", () => ({
  v2: {
    config: cloudinaryMocks.config,
    url: cloudinaryMocks.url,
    uploader: {
      destroy: cloudinaryMocks.destroy,
      upload_stream: vi.fn((_options, callback) => {
        const stream = new Writable({
          write(_chunk, _encoding, next) {
            next();
          },
        });
        stream.on("finish", () => {
          callback(null, {
            public_id: "dizitaladda/employee-documents/44/mock-uuid",
            resource_type: "raw",
            version: "12345",
          });
        });
        return stream;
      }),
    },
  },
}));

vi.mock("../services/ensureEmployeeProfile.service.js", () => ({
  ensureEmployeeProfileForUser: vi.fn(),
}));

vi.mock("../repositories/employeeDocumentRepository.js", () => ({
  createEmployeeDocumentRepository: vi.fn(),
  deleteEmployeeDocumentRepository: vi.fn(),
  findEmployeeDocumentByIdRepository: vi.fn(),
  findEmployeeDocumentsRepository: vi.fn(),
  findAllEmployeeDocumentsForHRRepository: vi.fn(),
  findEmployeeDocumentByIdForHRRepository: vi.fn(),
}));

import { ensureEmployeeProfileForUser } from "../services/ensureEmployeeProfile.service.js";
import {
  createEmployeeDocumentRepository,
  findEmployeeDocumentByIdRepository,
  findEmployeeDocumentsRepository,
} from "../repositories/employeeDocumentRepository.js";
import {
  getMyEmployeeDocumentAccessUrlService,
  getMyEmployeeDocumentsService,
  uploadMyEmployeeDocumentService,
} from "../services/employeeDocument.service.js";

describe("employee document service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
    process.env.CLOUDINARY_API_KEY = "test-key";
    process.env.CLOUDINARY_API_SECRET = "test-secret";
    process.env.EMPLOYEE_DOCUMENT_ENCRYPTION_KEY = "test-secret-key-32-chars-long123";
    ensureEmployeeProfileForUser.mockResolvedValue({ id: 44 });
  });

  it("returns only safe document metadata for the signed document list", async () => {
    findEmployeeDocumentsRepository.mockResolvedValue([{
      id: 3,
      document_type: "AADHAAR_CARD",
      document_label: "Aadhaar front",
      original_filename: "aadhaar.pdf",
      mime_type: "application/pdf",
      size_bytes: "1024",
      cloudinary_public_id: "private-value-must-not-leak",
      created_at: "2026-10-21T00:00:00.000Z",
    }]);

    const documents = await getMyEmployeeDocumentsService({ id: 8 });

    expect(findEmployeeDocumentsRepository).toHaveBeenCalledWith(44);
    expect(documents).toEqual([expect.objectContaining({ id: 3, size_bytes: 1024 })]);
    expect(documents[0]).not.toHaveProperty("cloudinary_public_id");
  });

  it("looks up a document using the current employee profile before signing its URL", async () => {
    findEmployeeDocumentByIdRepository.mockResolvedValue({
      id: 3,
      cloudinary_public_id: "dizitaladda/employee-documents/44/abc",
      cloudinary_resource_type: "image",
      mime_type: "image/jpeg",
      original_filename: "photo.jpg",
    });

    const result = await getMyEmployeeDocumentAccessUrlService({ id: 8 }, "3");

    expect(findEmployeeDocumentByIdRepository).toHaveBeenCalledWith(3, 44);
    expect(cloudinaryMocks.url).toHaveBeenCalledWith(
      "dizitaladda/employee-documents/44/abc",
      expect.objectContaining({ type: "authenticated", sign_url: true, resource_type: "image" })
    );
    expect(result.access_url).toContain("signed-document");
  });

  it("rejects malformed document IDs before querying documents", async () => {
    await expect(getMyEmployeeDocumentAccessUrlService({ id: 8 }, "not-an-id"))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(findEmployeeDocumentByIdRepository).not.toHaveBeenCalled();
  });

  it("rejects upload when document file is missing", async () => {
    await expect(
      uploadMyEmployeeDocumentService({ id: 8 }, null, { document_type: "AADHAAR_CARD" })
    ).rejects.toMatchObject({ statusCode: 400, message: "Select a document to upload." });
  });

  it("rejects upload when Aadhaar number is missing or invalid", async () => {
    const dummyFile = { originalname: "aadhaar.pdf", mimetype: "application/pdf", size: 1024, buffer: Buffer.from("test") };
    await expect(
      uploadMyEmployeeDocumentService(
        { id: 8 },
        dummyFile,
        { document_type: "AADHAAR_CARD", document_label: "My Aadhaar", document_number: "1234", document_details: "John Doe" }
      )
    ).rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/12 digits/) });
  });

  it("rejects upload when Bank Details account or details are missing", async () => {
    const dummyFile = { originalname: "passbook.pdf", mimetype: "application/pdf", size: 1024, buffer: Buffer.from("test") };
    await expect(
      uploadMyEmployeeDocumentService(
        { id: 8 },
        dummyFile,
        { document_type: "BANK_DETAILS", document_label: "Salary Account", document_number: "", document_details: "" }
      )
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("accepts bank details when all compulsory fields are provided", async () => {
    const dummyFile = { originalname: "passbook.pdf", mimetype: "application/pdf", size: 1024, buffer: Buffer.from("test") };
    createEmployeeDocumentRepository.mockResolvedValue({
      id: 99,
      document_type: "BANK_DETAILS",
      document_label: "Salary Account Passbook",
      original_filename: "passbook.pdf",
      mime_type: "application/pdf",
      size_bytes: 1024,
      document_number_encrypted: "enc_acc",
      document_details_encrypted: "enc_details",
      created_at: new Date().toISOString(),
    });

    const result = await uploadMyEmployeeDocumentService(
      { id: 8 },
      dummyFile,
      {
        document_type: "BANK_DETAILS",
        document_label: "Salary Account Passbook",
        document_number: "123456789012",
        document_details: "Bank: HDFC Bank | IFSC: HDFC0001234 | Holder: John Doe | Branch: Delhi",
      }
    );

    expect(result).toHaveProperty("document_type", "BANK_DETAILS");
    expect(createEmployeeDocumentRepository).toHaveBeenCalledOnce();
  });
});
