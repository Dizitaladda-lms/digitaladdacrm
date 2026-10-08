import ApiError from "./ApiError.js";

export const DEVICE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const getDeviceId = (req) => {
  const deviceId = String(req.get("x-device-id") || req.cookies?.deviceId || "").trim();
  if (!DEVICE_ID_PATTERN.test(deviceId)) {
    throw new ApiError(400, "Device identity is missing or invalid. Refresh the page and try again.");
  }
  return deviceId.toLowerCase();
};

export const assertDeviceCookieMatches = (req, deviceId) => {
  const cookieDeviceId = req.cookies?.deviceId;
  if (cookieDeviceId && cookieDeviceId.toLowerCase() !== deviceId) {
    throw new ApiError(403, "The browser device cookie does not match this device. Sign in again.");
  }
};

export const getDeviceType = (userAgent = "") =>
  /Android|iPhone|iPod|iPad|Tablet|Mobile|Windows Phone|BlackBerry|IEMobile/i.test(userAgent)
    ? "mobile"
    : "laptop";

export const getDeviceName = (req, deviceType) => {
  const provided = String(req.get("x-device-name") || "").trim();
  if (provided) return provided.slice(0, 120);
  const platform = String(req.get("sec-ch-ua-platform") || "").replaceAll('"', "").trim();
  return [platform, deviceType === "mobile" ? "Mobile browser" : "Laptop browser"]
    .filter(Boolean)
    .join(" ")
    .slice(0, 120);
};

export const setDeviceCookie = (res, deviceId) => {
  res.cookie("deviceId", deviceId, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 365 * 24 * 60 * 60 * 1000,
    path: "/",
  });
};
