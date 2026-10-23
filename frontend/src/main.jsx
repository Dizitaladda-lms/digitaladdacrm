import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { registerSW } from "virtual:pwa-register";

import App from "./App";
import "./index.css";

import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

// When a deploy creates a new service worker, let the UI show an explicit
// update action. This is important for installed mobile and desktop PWA users.
const announceUpdate = () => {
  if (typeof window === "undefined") return;
  window.__dizitalAddaUpdateReady = true;
  window.dispatchEvent(new CustomEvent("dizitaladda:pwa-update-ready"));
};

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    if (typeof window !== "undefined") {
      window.__dizitalAddaApplyUpdate = () => updateSW(true);
      announceUpdate();
    }
  },
  onRegisteredSW(_swUrl, registration) {
    if (registration) {
      const notifyWhenWaiting = () => {
        if (registration.waiting) announceUpdate();
      };
      registration.update().catch(() => {});
      notifyWhenWaiting();
      registration.addEventListener("updatefound", () => {
        const installingWorker = registration.installing;
        installingWorker?.addEventListener("statechange", () => {
          if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
            notifyWhenWaiting();
          }
        });
      });
      const checkForUpdate = () => registration.update().catch(() => {});
      window.addEventListener("focus", checkForUpdate);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") checkForUpdate();
      });
    }
  },
  onOfflineReady() {
    console.log("PWA ready.");
  },
});

// Automatic reload handler when dynamic imports change or stale chunk runs
window.addEventListener("error", (event) => {
  const isChunkError =
    event?.message?.includes("Failed to fetch dynamically imported module") ||
    event?.message?.includes("Importing a module script failed") ||
    event?.message?.includes("Loading chunk") ||
    event?.message?.includes("TABS is not defined") ||
    event?.message?.includes("isHR is not defined") ||
    event?.message?.includes("user is not defined") ||
    event?.message?.includes("isAdmin is not defined");

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
