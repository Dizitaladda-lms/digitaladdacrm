import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  loginUser,
  logoutUser,
  logoutAllDevices as logoutAllDevicesRequest,
  getProfile,
  updateProfile as updateProfileRequest,
} from "../services/authService";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const response = await getProfile();
        const profileUser = response?.data || response?.user || null;
        setUser(profileUser);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (credentials) => {
    const response = await loginUser(credentials);

    if (response?.success) {
      const payload = response.data || {};
      const userData = payload.user || null;
      if (userData) {
        setUser(userData);
      }
    }

    return response;
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch {
      // Ignore network errors during logout
    }

    setUser(null);
  };

  const logoutAllDevices = async () => {
    await logoutAllDevicesRequest();
    setUser(null);
  };

  const updateProfile = async (profile) => {
    const response = await updateProfileRequest(profile);
    const updatedUser = response?.data || response?.user || null;

    if (updatedUser) {
      setUser(updatedUser);
    }

    return response;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        logoutAllDevices,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
