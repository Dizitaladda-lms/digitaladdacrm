const localDevOrigin = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i;

const getConfiguredOrigins = () => [
  process.env.CLIENT_URL || "",
  ...(process.env.ALLOWED_ORIGINS || "").split(","),
]
  .map((origin) => origin.trim())
  .filter(Boolean)
  .map((origin) => {
    try {
      return new URL(origin).origin;
    } catch {
      return null;
    }
  })
  .filter(Boolean);

export const isAllowedOrigin = (origin) => {
  if (!origin || origin === "null") return false;
  let normalized;
  try {
    const parsedOrigin = new URL(origin);
    if (parsedOrigin.origin !== origin) return false;
    normalized = parsedOrigin.origin;
  } catch {
    return false;
  }
  if (process.env.NODE_ENV !== "production" && localDevOrigin.test(normalized)) {
    return true;
  }
  return getConfiguredOrigins().includes(normalized);
};

export const getRequestOrigin = (req) => {
  const origin = req.get("Origin");
  if (origin) return origin;
  const referer = req.get("Referer");
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
};

export const isSignedWebhookPath = (path) =>
  /^\/api\/(?:public\/(?:leads?\/)?(?:meta-webhook|google-webhook)|telephony\/webhook)$/i.test(path);
