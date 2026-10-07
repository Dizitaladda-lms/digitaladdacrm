import { afterEach, describe, expect, it } from "vitest";
import { getAttendanceWebAuthnConfig } from "../utils/attendanceWebAuthn.js";

const envKeys = ["CLIENT_URL", "ALLOWED_ORIGINS", "WEBAUTHN_RP_ID", "VERCEL_URL"];
const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of envKeys) {
    if (originalEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = originalEnv[key];
    }
  }
});

describe("getAttendanceWebAuthnConfig", () => {
  it("only trusts origins compatible with the relying-party domain", () => {
    process.env.CLIENT_URL = "https://crm.dizitaladda.com";
    process.env.ALLOWED_ORIGINS = "https://portal.dizitaladda.com,https://preview.vercel.app";
    process.env.WEBAUTHN_RP_ID = "dizitaladda.com";
    delete process.env.VERCEL_URL;

    expect(getAttendanceWebAuthnConfig()).toEqual({
      rpID: "dizitaladda.com",
      rpName: "Dizital Adda Attendance",
      origins: ["https://crm.dizitaladda.com", "https://portal.dizitaladda.com"],
    });
  });

  it("rejects a relying-party domain unrelated to configured origins", () => {
    process.env.CLIENT_URL = "https://crm.dizitaladda.com";
    process.env.ALLOWED_ORIGINS = "";
    process.env.WEBAUTHN_RP_ID = "unrelated.example";
    delete process.env.VERCEL_URL;

    expect(() => getAttendanceWebAuthnConfig()).toThrow(
      "WEBAUTHN_RP_ID must match a configured web origin."
    );
  });
});
