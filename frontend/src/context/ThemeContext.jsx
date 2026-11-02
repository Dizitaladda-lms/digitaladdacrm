import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { FESTIVAL_PREF_KEY, FESTIVAL_MODE, isFestivalActive } from "../config/festivalConfig";

const ThemeContext = createContext(null);

const getSavedFestivalPreference = () => {
  try {
    const saved = localStorage.getItem(FESTIVAL_PREF_KEY);
    return ["auto", "on", "off"].includes(saved) ? saved : "auto";
  } catch {
    return "auto";
  }
};

const isMotionLimited = () => {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const lowCoreCount = typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 2;
  const saveData = navigator.connection?.saveData === true;
  return Boolean(reducedMotion || lowCoreCount || saveData);
};

export const ThemeProvider = ({ children }) => {
  const [festival, setFestivalState] = useState(getSavedFestivalPreference);
  const [dateActive, setDateActive] = useState(() => isFestivalActive());
  const [motionLimited, setMotionLimited] = useState(isMotionLimited);

  useEffect(() => {
    document.documentElement.dataset.theme = "light";
    try {
      localStorage.removeItem("dizitaladda-theme");
    } catch {
      // ignore in sandboxed environments
    }
  }, []);

  const setFestival = useCallback((preference) => {
    if (!["auto", "on", "off"].includes(preference)) return;
    setFestivalState(preference);
    try {
      localStorage.setItem(FESTIVAL_PREF_KEY, preference);
    } catch {
      // The preference remains active for the current page when storage is unavailable.
    }
  }, []);

  const toggleFestival = useCallback(() => {
    const nextPreference = festival === "auto"
      ? "on"
      : festival === "on"
        ? "off"
        : "auto";
    setFestival(nextPreference);
  }, [festival, setFestival]);

  const festivalActive = FESTIVAL_MODE === "diwali"
    ? true
    : FESTIVAL_MODE === "off"
      ? false
      : festival === "auto"
        ? dateActive
        : festival === "on";

  useEffect(() => {
    const updateDate = () => setDateActive(isFestivalActive());
    const intervalId = window.setInterval(updateDate, 60_000);
    document.addEventListener("visibilitychange", updateDate);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", updateDate);
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setMotionLimited(isMotionLimited());
    mediaQuery?.addEventListener?.("change", updateMotion);
    navigator.connection?.addEventListener?.("change", updateMotion);
    return () => {
      mediaQuery?.removeEventListener?.("change", updateMotion);
      navigator.connection?.removeEventListener?.("change", updateMotion);
    };
  }, []);

  useEffect(() => {
    if (festivalActive) {
      document.documentElement.dataset.festival = "diwali";
    } else {
      delete document.documentElement.dataset.festival;
    }
    document.documentElement.dataset.festivalMotion = motionLimited ? "reduced" : "full";
    return () => {
      delete document.documentElement.dataset.festival;
      delete document.documentElement.dataset.festivalMotion;
    };
  }, [festivalActive, motionLimited]);

  const value = useMemo(() => ({
    theme: "light",
    toggleTheme: () => {},
    festival,
    festivalActive,
    festivalModeLocked: FESTIVAL_MODE !== "auto",
    setFestival,
    toggleFestival,
    animationsEnabled: festivalActive && !motionLimited,
  }), [festival, festivalActive, motionLimited, setFestival, toggleFestival]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};
