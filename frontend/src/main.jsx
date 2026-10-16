import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { registerSW } from "virtual:pwa-register";

import App from "./App";
import "./index.css";

import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

// Automatically activate new service worker and purge stale precaches on deployment
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSW(true);
  },
  onRegisteredSW(_swUrl, registration) {
    if (registration) {
      registration.update().catch(() => {});
    }
  },
  onOfflineReady() {
    console.log("PWA ready.");
  },
});

if (typeof window !== "undefined" && "caches" in window) {
  caches
    .keys()
    .then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.includes("precache"))
          .map((key) => caches.delete(key))
      )
    )
    .catch(() => {});
}

// Automatic reload handler when dynamic imports change or stale chunk runs
window.addEventListener("error", (event) => {
  const isChunkError =
    event?.message?.includes("Failed to fetch dynamically imported module") ||
    event?.message?.includes("Importing a module script failed") ||
    event?.message?.includes("Loading chunk") ||
    event?.message?.includes("isHR is not defined") ||
    event?.message?.includes("user is not defined");

  if (isChunkError) {
    if ("caches" in window) {
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
    }
    const lastReload = sessionStorage.getItem("app_chunk_reload");
    const now = Date.now();
    if (!lastReload || now - Number(lastReload) > 3000) {
      sessionStorage.setItem("app_chunk_reload", String(now));
      console.log("⚡ New code deployment or stale cache detected. Purging cache and reloading...");
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
