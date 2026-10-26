import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Keep a new worker waiting until the user accepts the in-app update.
      // This gives installed iOS/Android PWA users a clear "Update now" action
      // instead of silently retaining an old screen/bundle.
      registerType: "prompt",
      injectRegister: "auto",
      includeAssets: ["favicon.png", "favicon.svg"],
      manifest: {
        name: "Dizital Adda CRM",
        short_name: "Dizital CRM",
        description: "Dizital Adda customer and operations management",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/pwa-icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        skipWaiting: false,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // Include app shell and hashed bundles. Without these files a normal
        // software deploy does not change the worker manifest, so users never
        // receive the "Update now" prompt.
        globPatterns: ["**/*.{html,js,css,ico,png,svg}"],
        // A browser refresh, an installed-PWA relaunch, or a push notification
        // can open a client-side route directly (for example
        // /employee/assigned-work). Serve the React app shell so BrowserRouter
        // can resolve that route instead of showing the host's 404 page.
        // API and auth requests must still reach their server endpoints.
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api(?:\/|$)/, /^\/auth(?:\/|$)/],
        importScripts: ["push-sw.js"],
      },
    }),
  ],
  resolve: {
    extensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json"],
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react") || id.includes("react-dom") || id.includes("react-router-dom")) {
              return "vendor-core";
            }
            if (id.includes("lucide-react")) {
              return "vendor-icons";
            }
            if (id.includes("axios")) {
              return "vendor-api";
            }
            return "vendor-utils";
          }
        },
      },
    },
  },
});
