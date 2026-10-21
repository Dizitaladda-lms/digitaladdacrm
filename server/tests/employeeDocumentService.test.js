import { beforeEach, describe, expect, it, vi } from "vitest";

const cloudinaryMocks = vi.hoisted(() => ({
  config: vi.fn(),
  url: vi.fn(() => "https://res.cloudinary.com/example/signed-document"),
  destroy: vi.fn(),
}));

vi.mock("../config/db.js", () => ({
  withTransaction: vi.fn(),
}));

vi.mock("cloudinary", () => ({
  v2: {
    config: cloudinaryMocks.config,
    url: cloudinaryMocks.url,
    uploader: { destroy: cloudinaryMocks.destroy },
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
}));

import { ensureEmployeeProfileForUser } from "../services/ensureEmployeeProfile.service.js";
import {
  findEmployeeDocumentByIdRepository,
  findEmployeeDocumentsRepository,
} from "../repositories/employeeDocumentRepository.js";
import {
  getMyEmployeeDocumentAccessUrlService,
  getMyEmployeeDocumentsService,
} from "../services/employeeDocument.service.js";

describe("employee document service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
    process.env.CLOUDINARY_API_KEY = "test-key";
    process.env.CLOUDINARY_API_SECRET = "test-secret";
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
});
