import axiosInstance from "../api/axiosInstance";

export const loginUser = async (credentials) => {

  const response = await axiosInstance.post(

    "/auth/login",

    credentials

  );

  return response.data;

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