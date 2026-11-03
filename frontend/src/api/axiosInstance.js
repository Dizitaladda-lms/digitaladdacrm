import axios from "axios";
import { getDeviceIdentity } from "../utils/deviceIdentity";

const envApiUrl = (import.meta.env.VITE_API_URL || "").trim();
const isSameOriginHosted =
  typeof window !== "undefined" &&
  (/\.(dizitaladda\.com|vercel\.app)$/i.test(window.location.hostname) ||
    window.location.hostname === "dizitaladda.com");

const normalizedBaseURL = isSameOriginHosted
  ? ""
  : envApiUrl && !envApiUrl.includes("onrender.com")
  ? envApiUrl.replace(/\/api\/?$/, "").replace(/\/$/, "")
  : import.meta.env.DEV
  ? "http://localhost:5000"
  : "";

const axiosInstance = axios.create({
  baseURL: normalizedBaseURL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 25000,
  withCredentials: true,
});

const LEGACY_ACCESS_TOKEN_KEY = "dizitaladda_access_token";
const LEGACY_REFRESH_TOKEN_KEY = "dizitaladda_refresh_token";
const REFRESH_GENERATION_KEY = "dizitaladda_auth_refresh_generation";
const REFRESH_LOCK_NAME = "dizitaladda-auth-refresh";

export const clearStoredAuthTokens = () => {
  try {
    localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
    localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
  } catch {
    // Storage may be disabled by the browser.
  }
};

clearStoredAuthTokens();

let refreshPromise = null;
let sessionRecoveryFailed = false;

const getRefreshGeneration = () => {
  try {
    return localStorage.getItem(REFRESH_GENERATION_KEY) || "0";
  } catch {
    return "0";
  }
};

const markRefreshGeneration = () => {
  try {
    const current = Number(localStorage.getItem(REFRESH_GENERATION_KEY)) || 0;
    localStorage.setItem(REFRESH_GENERATION_KEY, String(current + 1));
  } catch {
    // The browser lock still coordinates refreshes where localStorage is unavailable.
  }
};

export const hasFailedSessionRecovery = () => sessionRecoveryFailed;

export const BIOMETRIC_REQUEST_TIMEOUT_MS = 120_000;

axiosInstance.interceptors.request.use(async (config) => {
  try {
    const identity = await getDeviceIdentity();
    config.headers = config.headers || {};
    config.headers["X-Device-Id"] = identity.deviceId;
    config.headers["X-Device-Name"] = identity.deviceName;
  } catch {
    config.headers = config.headers || {};
  }

  config._authGeneration ??= getRefreshGeneration();
  if (
    config.url &&
    !config.url.startsWith("http://") &&
    !config.url.startsWith("https://") &&
    config.url.startsWith("/")
  ) {
    config.url = config.url.startsWith("/api")
      ? config.url
      : `/api${config.url}`;
  }

  return config;
});

axiosInstance.interceptors.response.use(
  (response) => {
    const reqUrl = response.config?.url || "";
    if (/\/auth\/login(?:[/?]|$)/i.test(reqUrl)) {
      sessionRecoveryFailed = false;
      markRefreshGeneration();
    } else if (/\/auth\/logout(?:-all)?(?:[/?]|$)/i.test(reqUrl)) {
      markRefreshGeneration();
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    const requestUrl = originalRequest.url || "";
    const isAuthEndpoint = /\/auth\/(login|logout|logout-all|refresh-token|register|forgot-password|reset-password)(?:[/?]|$)/i
      .test(requestUrl);
    if (isAuthEndpoint) return Promise.reject(error);
    if (sessionRecoveryFailed) return Promise.reject(error);

    originalRequest._retry = true;
    const generationAtFailure = originalRequest._authGeneration || "0";
    const retryOriginalRequest = () => axiosInstance(originalRequest);

    const refreshAndRetry = async () => {
      if (getRefreshGeneration() !== generationAtFailure) {
        return retryOriginalRequest();
      }

      if (!refreshPromise) {
        refreshPromise = axiosInstance
          .post("/api/auth/refresh-token")
          .then((response) => {
            markRefreshGeneration();
            return response;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      await refreshPromise;
      return retryOriginalRequest();
    };

    try {
      if (typeof navigator !== "undefined" && navigator.locks?.request) {
        return await navigator.locks.request(REFRESH_LOCK_NAME, refreshAndRetry);
      }
      return await refreshAndRetry();
    } catch (refreshError) {
      if (getRefreshGeneration() !== generationAtFailure) {
        return retryOriginalRequest();
      }
      if ([401, 403].includes(refreshError.response?.status)) {
        sessionRecoveryFailed = true;
        if (window.location.pathname !== "/") {
          window.location.href = "/";
        }
      }
      return Promise.reject(refreshError);
    }
  }
);

export default axiosInstance;
