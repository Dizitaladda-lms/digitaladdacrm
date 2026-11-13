import {
  cleanupOutdatedCaches,
  matchPrecache,
  precacheAndRoute,
} from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { NetworkFirst, NetworkOnly } from "workbox-strategies";

const BUILD_ID = __SW_BUILD_ID__;
const NAVIGATION_CACHE = `dizital-crm-navigation-${BUILD_ID}`;

// Keep the existing push notification handlers in the separately maintained
// public worker script.
importScripts("/push-sw.js");

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(
            (cacheName) =>
              cacheName.startsWith("dizital-crm-navigation-") &&
              cacheName !== NAVIGATION_CACHE
          )
          .map((cacheName) => caches.delete(cacheName))
      );
      await self.clients.claim();
    })()
  );
});

const isApiOrAuthRequest = ({ url }) =>
  url.origin === self.location.origin && /^\/(?:api|auth)(?:\/|$)/i.test(url.pathname);

const apiNetworkOnly = new NetworkOnly({
  plugins: [
    {
      async handlerDidError() {
        return new Response(
          JSON.stringify({ success: false, message: "Network unavailable. Please try again." }),
          {
            status: 503,
            headers: { "Content-Type": "application/json; charset=utf-8" },
          }
        );
      },
    },
  ],
});

for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
  registerRoute(isApiOrAuthRequest, apiNetworkOnly, method);
}

const navigationStrategy = new NetworkFirst({
  cacheName: NAVIGATION_CACHE,
  networkTimeoutSeconds: 8,
  plugins: [
    {
      async handlerDidError() {
        const cachedAppShell = await matchPrecache("/index.html");
        return (
          cachedAppShell ||
          new Response("<h1>You're offline</h1><p>Please reconnect and try again.</p>", {
            status: 200,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          })
        );
      },
    },
  ],
});

registerRoute(
  new NavigationRoute(navigationStrategy, {
    denylist: [/^\/api(?:\/|$)/i, /^\/auth(?:\/|$)/i],
  })
);
