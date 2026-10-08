import { describe, expect, it, vi } from "vitest";
import {
  DEVICE_ID_PATTERN,
  assertDeviceCookieMatches,
  getDeviceId,
  getDeviceName,
  getDeviceType,
  setDeviceCookie,
} from "../utils/deviceBinding.js";

describe("browser device identity helpers", () => {
  const uuid = "a3bb189e-8bf9-4f26-9e4b-9f4e7fcd8123";

  it("accepts UUID v4 device ids from the request header or persistent cookie", () => {
    expect(DEVICE_ID_PATTERN.test(uuid)).toBe(true);
    expect(getDeviceId({ get: () => uuid })).toBe(uuid);
    expect(getDeviceId({ get: () => "", cookies: { deviceId: uuid } })).toBe(uuid);
    expect(() => getDeviceId({ get: () => "not-a-uuid" })).toThrow(/device identity/i);
    expect(() => getDeviceId({ get: () => "a3bb189e-8bf9-1f26-9e4b-9f4e7fcd8123" })).toThrow();
  });

  it("classifies mobile and desktop user agents on the server", () => {
    expect(getDeviceType("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile"))
      .toBe("mobile");
    expect(getDeviceType("Mozilla/5.0 (Windows NT 10.0; Win64; x64)"))
      .toBe("laptop");
  });

  it("allows recovery when the httpOnly cookie is missing but rejects a mismatched cookie", () => {
    expect(() => assertDeviceCookieMatches({ cookies: {} }, uuid)).not.toThrow();
    expect(() => assertDeviceCookieMatches({ cookies: { deviceId: uuid } }, uuid)).not.toThrow();
    expect(() => assertDeviceCookieMatches({
      cookies: { deviceId: "b3bb189e-8bf9-4f26-9e4b-9f4e7fcd8123" },
    }, uuid)).toThrow(/cookie does not match/i);
  });

  it("limits caller-supplied device names and sets a persistent secure cookie", () => {
    const set = vi.fn();
    const response = { cookie: set };
    const req = {
      get: (header) => header === "x-device-name" ? " Work laptop " : "",
    };

    expect(getDeviceName(req, "laptop")).toBe("Work laptop");
    setDeviceCookie(response, uuid);
    expect(set).toHaveBeenCalledWith("deviceId", uuid, expect.objectContaining({
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 365 * 24 * 60 * 60 * 1000,
    }));
  });
});
