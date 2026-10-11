import axios from "axios";
import { getDeviceIdentity } from "../utils/deviceIdentity";

const envApiUrl = (import.meta.env.VITE_API_URL || "").trim();

const normalizedBaseURL = envApiUrl
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

let refreshPromise = null;
let memoryAccessToken = null;
let memoryRefreshToken = null;
const REFRESH_GENERATION_KEY = "dizitaladda_auth_refresh_generation";
const ACCESS_TOKEN_STORAGE_KEY = "dizitaladda_access_token";
const REFRESH_TOKEN_STORAGE_KEY = "dizitaladda_refresh_token";

const getStoredAccessToken = () => {
  if (memoryAccessToken) return memoryAccessToken;
  try {
    return localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) || null;
  } catch {
    return null;
  }
};

const getStoredRefreshToken = () => {
  if (memoryRefreshToken) return memoryRefreshToken;
  try {
    return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) || null;
  } catch {
    return null;
  }
};

export const setStoredAuthTokens = (accessToken, refreshToken) => {
  if (accessToken) {
    memoryAccessToken = accessToken;
    try {
      localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
    } catch {
      // Ignore storage restrictions
    }
  }
  if (refreshToken) {
    memoryRefreshToken = refreshToken;
    try {
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
    } catch {
      // Ignore storage restrictions
    }
  }
};

export const clearStoredAuthTokens = () => {
  memoryAccessToken = null;
  memoryRefreshToken = null;
  try {
    localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  } catch {
    // Ignore storage restrictions
  }
};

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
    // Refresh coordination still works within this tab if storage is unavailable.
  }
};

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

  const token = getStoredAccessToken();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
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
    if (/\/auth\/(login|refresh-token)(?:[/?]|$)/i.test(reqUrl)) {
      const payload = response.data?.data || response.data || {};
      if (payload.accessToken || payload.refreshToken) {
        setStoredAuthTokens(payload.accessToken, payload.refreshToken);
      }
    } else if (/\/auth\/(logout|logout-all)(?:[/?]|$)/i.test(reqUrl)) {
      clearStoredAuthTokens();
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    const requestUrl = originalRequest.url || "";
    const isAuthEndpoint = /\/auth\/(login|logout|refresh-token|register|forgot-password|reset-password)(?:[/?]|$)/i
      .test(requestUrl);
    if (isAuthEndpoint) return Promise.reject(error);

    originalRequest._retry = true;
    const generationAtFailure = originalRequest._authGeneration || "0";
    try {
      const refreshAndRetry = async () => {
        if (getRefreshGeneration() !== generationAtFailure) {
          if (originalRequest.headers) {
            delete originalRequest.headers.Authorization;
          }
          return axiosInstance(originalRequest);
        }
        if (!refreshPromise) {
          const fallbackRefreshToken = getStoredRefreshToken();
          refreshPromise = axiosInstance
            .post(
              "/auth/refresh-token",
              fallbackRefreshToken ? { refreshToken: fallbackRefreshToken } : {}
            )
            .then((response) => {
              const payload = response.data?.data || response.data || {};
              if (payload.accessToken || payload.refreshToken) {
                setStoredAuthTokens(payload.accessToken, payload.refreshToken);
              }
              markRefreshGeneration();
              return response;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }
        await refreshPromise;
        if (originalRequest.headers) {
          delete originalRequest.headers.Authorization;
        }
        return axiosInstance(originalRequest);
      };

      if (typeof navigator !== "undefined" && navigator.locks?.request) {
        return await navigator.locks.request("dizitaladda-auth-refresh", refreshAndRetry);
      }
      return await refreshAndRetry();
    } catch (refreshError) {
      if (getRefreshGeneration() !== generationAtFailure) {
        if (originalRequest.headers) {
          delete originalRequest.headers.Authorization;
        }
        return axiosInstance(originalRequest);
      }
      if ([401, 403].includes(refreshError.response?.status)) {
        clearStoredAuthTokens();
        if (window.location.pathname !== "/") {
          window.location.href = "/";
        }
      }
      return Promise.reject(refreshError);
    }
  }
);

export default axiosInstance;
