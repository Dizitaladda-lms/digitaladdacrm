import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { registerSW } from "virtual:pwa-register";

import App from "./App";
import "./index.css";

import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

// Automatically activate new service worker and refresh page on deployment
const updateSW = registerSW({
  onNeedRefresh() {
    console.log("⚡ New application version detected. Updating automatically...");
    updateSW(true);
  },
  onOfflineReady() {
    console.log("PWA ready for offline use.");
  },
});

// Automatic reload handler when dynamic imports change on new deployment
window.addEventListener("error", (event) => {
  const isChunkError =
    event?.message?.includes("Failed to fetch dynamically imported module") ||
    event?.message?.includes("Importing a module script failed") ||
    event?.message?.includes("Loading chunk");

  if (isChunkError) {
    const lastReload = sessionStorage.getItem("app_chunk_reload");
    const now = Date.now();
    if (!lastReload || now - Number(lastReload) > 5000) {
      sessionStorage.setItem("app_chunk_reload", String(now));
      console.log("⚡ New code deployment detected. Reloading page...");
      window.location.reload();
    }
  }
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Toaster
            position="top-right"
            containerStyle={{ top: 72, right: 20, zIndex: 99999 }}
            gutter={10}
          />
          <App />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
