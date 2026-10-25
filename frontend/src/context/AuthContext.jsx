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
import { hasFailedSessionRecovery } from "../api/axiosInstance";

const AuthContext = createContext();

const OFFLINE_USER_KEY = "dizitaladda_offline_user";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem(OFFLINE_USER_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const authActionSeq = useRef(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      if (hasFailedSessionRecovery()) return;
      getProfile()
        .then((response) => {
          const profileUser = response?.data || response?.user || null;
          if (profileUser) {
            setUser(profileUser);
            try {
              localStorage.setItem(OFFLINE_USER_KEY, JSON.stringify(profileUser));
            } catch {}
          }
        })
        .catch(() => {});
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const seqAtStart = authActionSeq.current;
    const restoreSession = async () => {
      try {
        const response = await getProfile();
        if (authActionSeq.current !== seqAtStart) return;
        const profileUser = response?.data || response?.user || null;
        setUser(profileUser);
        if (profileUser) {
          try {
            localStorage.setItem(OFFLINE_USER_KEY, JSON.stringify(profileUser));
          } catch {}
        }
      } catch (err) {
        if (authActionSeq.current !== seqAtStart) return;
        const isNetworkErr =
          !navigator.onLine ||
          err?.code === "ERR_NETWORK" ||
          !err?.response ||
          [502, 503, 504].includes(err?.response?.status);

        if (isNetworkErr) {
          setIsOffline(true);
          try {
            const cached = localStorage.getItem(OFFLINE_USER_KEY);
            if (cached) {
              const cachedUser = JSON.parse(cached);
              if (cachedUser && cachedUser.id) {
                setUser(cachedUser);
                return;
              }
            }
          } catch {}
        }

        if (err?.response?.status === 401) {
          try {
            localStorage.removeItem(OFFLINE_USER_KEY);
          } catch {}
          setUser(null);
        } else {
          try {
            const cached = localStorage.getItem(OFFLINE_USER_KEY);
            if (cached) {
              setUser(JSON.parse(cached));
              return;
            }
          } catch {}
          setUser(null);
        }
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
        try {
          localStorage.setItem(OFFLINE_USER_KEY, JSON.stringify(userData));
        } catch {}
      }
      setLoading(false);
    }

    return response;
  };

  const logout = async () => {
    authActionSeq.current += 1;
    try {
      localStorage.removeItem(OFFLINE_USER_KEY);
    } catch {}
    try {
      await logoutUser();
    } catch {
      // Ignore network errors during logout
    }

    setUser(null);
  };

  const logoutAllDevices = async () => {
    authActionSeq.current += 1;
    try {
      localStorage.removeItem(OFFLINE_USER_KEY);
    } catch {}
    await logoutAllDevicesRequest();
    setUser(null);
  };

  const updateProfile = async (profile) => {
    authActionSeq.current += 1;
    const response = await updateProfileRequest(profile);
    const updatedUser = response?.data || response?.user || null;

    if (updatedUser) {
      setUser(updatedUser);
      try {
        localStorage.setItem(OFFLINE_USER_KEY, JSON.stringify(updatedUser));
      } catch {}
    }

    return response;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isOffline,
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
