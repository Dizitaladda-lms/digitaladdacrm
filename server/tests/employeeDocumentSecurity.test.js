import { describe, expect, it, vi } from "vitest";
import {
  decryptDocumentDetail,
  encryptDocumentDetail,
  maskDocumentNumber,
} from "../utils/employeeDocumentSecurity.js";

describe("employee document detail security", () => {
  it("encrypts sensitive document values and restores them only with the server key", () => {
    vi.stubEnv("EMPLOYEE_DOCUMENT_ENCRYPTION_KEY", "test-document-key");
    const encrypted = encryptDocumentDetail("ABCDE1234F");

    expect(encrypted).not.toContain("ABCDE1234F");
    expect(decryptDocumentDetail(encrypted)).toBe("ABCDE1234F");
    expect(maskDocumentNumber("ABCDE1234F")).toBe("••••••234F");
  });
});
