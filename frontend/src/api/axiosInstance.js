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
  timeout: 15000,
  withCredentials: true,
});

let refreshPromise = null;
const REFRESH_GENERATION_KEY = "dizitaladda_auth_refresh_generation";

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
  const identity = await getDeviceIdentity();
  config.headers = config.headers || {};
  config.headers["X-Device-Id"] = identity.deviceId;
  config.headers["X-Device-Name"] = identity.deviceName;
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
  (response) => response,
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
          return axiosInstance(originalRequest);
        }
        if (!refreshPromise) {
          refreshPromise = axiosInstance.post("/auth/refresh-token")
            .then((response) => {
              markRefreshGeneration();
              return response;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }
        await refreshPromise;
        return axiosInstance(originalRequest);
      };

      if (typeof navigator !== "undefined" && navigator.locks?.request) {
        return await navigator.locks.request("dizitaladda-auth-refresh", refreshAndRetry);
      }
      return await refreshAndRetry();
    } catch (refreshError) {
      if (getRefreshGeneration() !== generationAtFailure) {
        return axiosInstance(originalRequest);
      }
      if ([401, 403].includes(refreshError.response?.status) && window.location.pathname !== "/") {
        window.location.href = "/";
      }
      return Promise.reject(refreshError);
    }
  }
);

export default axiosInstance;
