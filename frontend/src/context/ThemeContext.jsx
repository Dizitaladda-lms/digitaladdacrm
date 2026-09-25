import { createContext, useContext, useEffect, useMemo } from "react";

const ThemeContext = createContext({
  theme: "light",
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  useEffect(() => {
    document.documentElement.dataset.theme = "light";
    try {
      localStorage.removeItem("dizitaladda-theme");
    } catch {
      // ignore in sandboxed environments
    }
  }, []);

  const value = useMemo(
    () => ({
      theme: "light",
      toggleTheme: () => {},
    }),
    []
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};
