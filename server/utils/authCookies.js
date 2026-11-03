import ms from "ms";

export const ACCESS_TOKEN_COOKIE_NAME =
  process.env.ACCESS_TOKEN_COOKIE_NAME?.trim() || "accessToken";
export const REFRESH_TOKEN_COOKIE_NAME =
  process.env.REFRESH_TOKEN_COOKIE_NAME?.trim() || "refreshToken";

const sameSite = String(process.env.COOKIE_SAMESITE || "lax").toLowerCase();
if (!["lax", "strict", "none"].includes(sameSite)) {
  throw new Error("COOKIE_SAMESITE must be lax, strict, or none.");
}

const secureSetting = String(process.env.COOKIE_SECURE || "").toLowerCase();
if (secureSetting && !["true", "false"].includes(secureSetting)) {
  throw new Error("COOKIE_SECURE must be true or false.");
}
const secure = process.env.NODE_ENV === "production" || secureSetting === "true";
const domain = process.env.COOKIE_DOMAIN?.trim();

export const accessTokenMaxAge = ms(process.env.JWT_EXPIRES_IN || "15m");
export const refreshTokenMaxAge = ms(process.env.JWT_REFRESH_EXPIRES_IN || "30d");

export const getAuthCookieOptions = () => ({
  httpOnly: true,
  secure: secure || sameSite === "none",
  sameSite,
  ...(domain ? { domain } : {}),
});

export const setAuthCookies = (res, accessToken, refreshToken) => {
  const options = getAuthCookieOptions();
  res.cookie(ACCESS_TOKEN_COOKIE_NAME, accessToken, {
    ...options,
    maxAge: accessTokenMaxAge,
    path: "/",
  });
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
    ...options,
    maxAge: refreshTokenMaxAge,
    path: "/api/auth",
  });
};

export const clearAuthCookies = (res) => {
  const options = getAuthCookieOptions();
  const accessNames = new Set([ACCESS_TOKEN_COOKIE_NAME, "accessToken"]);
  const refreshNames = new Set([REFRESH_TOKEN_COOKIE_NAME, "refreshToken"]);

  for (const name of accessNames) {
    res.clearCookie(name, { ...options, path: "/" });
  }
  for (const name of refreshNames) {
    res.clearCookie(name, { ...options, path: "/" });
    res.clearCookie(name, { ...options, path: "/api/auth" });
  }
  res.clearCookie("deviceId", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
  });
};
