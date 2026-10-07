import { beforeEach, describe, expect, it, vi } from "vitest";

const dependencies = vi.hoisted(() => ({
  verifyAuthenticationResponse: vi.fn(),
  findEmployeeByUserIdRepository: vi.fn(),
  findEmployeeBiometricRepository: vi.fn(),
  consumeEmployeeBiometricChallengeRepository: vi.fn(),
  updateEmployeeBiometricCounterRepository: vi.fn(),
  createAttendanceCheckInRepository: vi.fn(),
  verifyFaceAttendance: vi.fn(),
  getAttendanceWebAuthnConfig: vi.fn(),
}));

vi.mock("@simplewebauthn/server", () => ({
  generateAuthenticationOptions: vi.fn(),
  generateRegistrationOptions: vi.fn(),
  verifyAuthenticationResponse: dependencies.verifyAuthenticationResponse,
  verifyRegistrationResponse: vi.fn(),
}));

vi.mock("../repositories/employeeRepository.js", () => ({
  findEmployeeByUserIdRepository: dependencies.findEmployeeByUserIdRepository,
}));

vi.mock("../repositories/attendanceRepository.js", () => ({
  getWhitelistedIPsRepository: vi.fn(),
  addWhitelistedIPRepository: vi.fn(),
  deleteWhitelistedIPRepository: vi.fn(),
  findEmployeeBiometricRepository: dependencies.findEmployeeBiometricRepository,
  saveEmployeeBiometricRepository: vi.fn(),
  deleteEmployeeBiometricRepository: vi.fn(),
  getPendingBiometricApprovalsRepository: vi.fn(),
  saveEmployeeBiometricChallengeRepository: vi.fn(),
  consumeEmployeeBiometricChallengeRepository: dependencies.consumeEmployeeBiometricChallengeRepository,
  updateEmployeeBiometricCounterRepository: dependencies.updateEmployeeBiometricCounterRepository,
  approveBiometricRepository: vi.fn(),
  rejectBiometricRepository: vi.fn(),
  findTodayAttendanceRepository: vi.fn(),
  createAttendanceCheckInRepository: dependencies.createAttendanceCheckInRepository,
  updateAttendanceCheckOutRepository: vi.fn(),
  getMyAttendanceHistoryRepository: vi.fn(),
  getHRAttendanceReportsRepository: vi.fn(),
}));

vi.mock("../utils/faceVerification.js", () => ({
  assertFaceEncryptionConfigured: vi.fn(),
  verifyAndCreateFaceTemplate: vi.fn(),
  verifyFaceAttendance: dependencies.verifyFaceAttendance,
}));

vi.mock("../utils/attendanceWebAuthn.js", () => ({
  getAttendanceWebAuthnConfig: dependencies.getAttendanceWebAuthnConfig,
}));

import ApiError from "../utils/ApiError.js";
import { checkInAttendanceService } from "../services/attendanceService.js";

describe("attendance face verification gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dependencies.findEmployeeByUserIdRepository.mockResolvedValue({ id: 14 });
    dependencies.findEmployeeBiometricRepository.mockResolvedValue({
      credential_id: Buffer.alloc(16, 1).toString("base64url"),
      public_key: Buffer.alloc(32, 2).toString("base64url"),
      sign_count: 0,
      authenticator_transports: ["internal"],
      approval_status: "APPROVED",
      face_template_encrypted: "encrypted",
      face_template_iv: "iv",
      face_template_tag: "tag",
    });
    dependencies.consumeEmployeeBiometricChallengeRepository.mockImplementation(
      async (_employeeId, purpose) =>
        purpose === "authentication"
          ? "passkey-challenge"
          : JSON.stringify({ nonce: "face-challenge", turn: "LEFT" })
    );
    dependencies.verifyAuthenticationResponse.mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 1 },
    });
    dependencies.updateEmployeeBiometricCounterRepository.mockResolvedValue(true);
    dependencies.getAttendanceWebAuthnConfig.mockReturnValue({
      rpID: "attendance.example.com",
      origins: ["https://attendance.example.com"],
    });
    dependencies.verifyFaceAttendance.mockRejectedValue(
      new ApiError(401, "Face did not match.")
    );
  });

  it("does not create attendance unless the submitted face matches", async () => {
    await expect(
      checkInAttendanceService(
        {
          assertion: { id: "credential" },
          faceProof: { challenge: "face-challenge", frames: [] },
          latitude: 28.54175,
          longitude: 77.240611111,
          location_name: "Dizital Adda Office Premises",
        },
        { id: 9, email: "employee@example.com", full_name: "Employee" },
        { headers: {}, ip: "127.0.0.1" }
      )
    ).rejects.toMatchObject({ statusCode: 401 });

    expect(dependencies.verifyFaceAttendance).toHaveBeenCalledOnce();
    expect(dependencies.createAttendanceCheckInRepository).not.toHaveBeenCalled();
  });
});
