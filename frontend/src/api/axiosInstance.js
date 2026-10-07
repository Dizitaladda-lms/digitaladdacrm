import axios from "axios";

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

export const BIOMETRIC_REQUEST_TIMEOUT_MS = 120_000;

axiosInstance.interceptors.request.use((config) => {
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
  (error) => {
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || "";
      const isAuthCheck =
        requestUrl.includes("/auth/me") ||
        requestUrl.includes("/auth/login") ||
        requestUrl.includes("/auth/logout") ||
        requestUrl.includes("/auth/refresh");

      const isAlreadyOnLogin = window.location.pathname === "/";

      // Only redirect via window location if not an auth check endpoint and not already on login page
      if (!isAuthCheck && !isAlreadyOnLogin) {
        window.location.href = "/";
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
