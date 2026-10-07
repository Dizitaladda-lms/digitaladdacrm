import ApiError from "./ApiError.js";

const normalizeOrigin = (value) => {
  if (!value) return null;
  const origin = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return new URL(origin).origin;
};

export const getAttendanceWebAuthnConfig = () => {
  const configuredOrigins = [
    process.env.CLIENT_URL,
    ...(process.env.ALLOWED_ORIGINS || "").split(","),
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  ]
    .filter(Boolean)
    .map((value) => {
      try {
        return normalizeOrigin(value.trim());
      } catch {
        throw new ApiError(500, "WebAuthn origin configuration is invalid.");
      }
    });

  if (process.env.NODE_ENV === "production") {
    for (const origin of configuredOrigins) {
      const { protocol, hostname } = new URL(origin);
      if (protocol !== "https:" && hostname !== "localhost") {
        throw new ApiError(500, "Production WebAuthn origins must use HTTPS.");
      }
    }
  }

  if (process.env.NODE_ENV !== "production" && configuredOrigins.length === 0) {
    configuredOrigins.push("http://localhost:5173", "http://127.0.0.1:5173");
  }

  const origins = [...new Set(configuredOrigins)];
  if (origins.length === 0) {
    throw new ApiError(500, "WebAuthn requires CLIENT_URL or ALLOWED_ORIGINS.");
  }

  const rpID = process.env.WEBAUTHN_RP_ID || new URL(origins[0]).hostname;
  const compatibleOrigins = origins.filter((origin) => {
    const hostname = new URL(origin).hostname;
    return hostname === rpID || hostname.endsWith(`.${rpID}`);
  });

  if (compatibleOrigins.length === 0) {
    throw new ApiError(500, "WEBAUTHN_RP_ID must match a configured web origin.");
  }

  return {
    rpID,
    rpName: "Dizital Adda Attendance",
    origins: compatibleOrigins,
  };
};
