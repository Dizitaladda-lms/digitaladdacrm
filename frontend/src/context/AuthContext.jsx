import {
  createContext,
  useContext,
  useEffect,
  useRef,
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
  const authActionSeq = useRef(0);

  useEffect(() => {
    const seqAtStart = authActionSeq.current;
    const restoreSession = async () => {
      try {
        const response = await getProfile();
        if (authActionSeq.current !== seqAtStart) return;
        const profileUser = response?.data || response?.user || null;
        setUser(profileUser);
      } catch {
        if (authActionSeq.current !== seqAtStart) return;
        setUser(null);
      } finally {
        if (authActionSeq.current === seqAtStart) {
          setLoading(false);
        }
      }
    };

    restoreSession();
  }, []);

  const login = async (credentials) => {
    authActionSeq.current += 1;
    const response = await loginUser(credentials);

    if (response?.success) {
      const payload = response.data || {};
      const userData = payload.user || response.user || null;
      if (userData) {
        setUser(userData);
      }
      setLoading(false);
    }

    return response;
  };

  const logout = async () => {
    authActionSeq.current += 1;
    try {
      await logoutUser();
    } catch {
      // Ignore network errors during logout
    }

    setUser(null);
  };

  const logoutAllDevices = async () => {
    authActionSeq.current += 1;
    await logoutAllDevicesRequest();
    setUser(null);
  };

  const updateProfile = async (profile) => {
    authActionSeq.current += 1;
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
