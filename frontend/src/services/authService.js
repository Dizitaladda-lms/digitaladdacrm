import axiosInstance, { clearStoredAuthTokens, setStoredAuthTokens } from "../api/axiosInstance";

export const loginUser = async (credentials) => {
  clearStoredAuthTokens();

  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await axiosInstance.post("/auth/login", credentials);
      const payload = response.data?.data || response.data || {};
      if (payload.accessToken || payload.refreshToken) {
        setStoredAuthTokens(payload.accessToken, payload.refreshToken);
      }
      return response.data;
    } catch (error) {
      lastError = error;
      const status = error?.response?.status;
      const isTransient = !error?.response || [502, 503, 504].includes(status);
      if (!isTransient || attempt === 1) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
  }
  throw lastError;
};

export const getProfile = async () => {

  const response = await axiosInstance.get(

    "/auth/me"

  );

  return response.data;

};

export const getProfileAvatar = async (version) => {
  const response = await axiosInstance.get("/auth/me/avatar", {
    params: version ? { v: version } : undefined,
  });
  return response.data;
};

// NEW: needed because logout now has to be a real server call — only the
// server can clear the httpOnly cookies. AuthContext.jsx already imports
// this; it didn't exist before because logout used to be purely local
// (just clearing localStorage).
export const logoutUser = async () => {

  const response = await axiosInstance.post(

    "/auth/logout"

  );

  return response.data;

};

export const logoutAllDevices = async () => {
  const response = await axiosInstance.post("/auth/logout-all");
  return response.data;
};

export const changePassword = async (payload) => {

    const response = await axiosInstance.patch(

        "/auth/change-password",

        payload

    );

    return response.data;

};

export const updateProfile = async (payload) => {
  const response = await axiosInstance.patch("/auth/profile", payload);
  return response.data;
};