import { afterEach, describe, expect, it, vi } from "vitest";
import pool from "../config/db.js";
import { saveEmployeeBiometricRepository } from "../repositories/attendanceRepository.js";

describe("saveEmployeeBiometricRepository", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("activates a first passkey immediately without HR approval", async () => {
    const query = vi.spyOn(pool, "query").mockResolvedValue({ rows: [{ id: 12 }] });

    await saveEmployeeBiometricRepository(null, {
      employee_id: 12,
      credential_id: "credential-id",
      public_key: "public-key",
      sign_count: 0,
      authenticator_transports: ["internal"],
    });

    expect(query.mock.calls[0][0]).toContain("'APPROVED', NULL, NULL");
    expect(query.mock.calls[0][0]).toContain("is_locked = TRUE");
  });

  it("only allows replacing a biometric after HR reset requires re-enrollment", async () => {
    const query = vi.spyOn(pool, "query").mockResolvedValue({ rows: [] });

    const result = await saveEmployeeBiometricRepository(null, {
      employee_id: 12,
      credential_id: "replacement-credential",
      public_key: "replacement-public-key",
      sign_count: 0,
      authenticator_transports: ["internal"],
    });

    expect(result).toBeNull();
    expect(query.mock.calls[0][0]).toContain(
      "employee_biometrics.approval_status = 'RE_ENROLL_REQUIRED'"
    );
    expect(query.mock.calls[0][0]).toContain(
      "COALESCE(employee_biometrics.public_key, '') = ''"
    );
  });
});
