import axiosInstance from "../api/axiosInstance";

/**
 * Convert URL-safe base64 string to Uint8Array for PushManager
 */
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if browser supports Web Push Notifications & Service Worker
 */
export const isPushSupported = () => {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
};

/**
 * Get current push status:
 * { supported, permission: 'default' | 'granted' | 'denied', isSubscribed: boolean }
 */
export const getPushSubscriptionStatus = async () => {
  if (!isPushSupported()) {
    return { supported: false, permission: "unsupported", isSubscribed: false };
  }

  const permission = Notification.permission;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return {
      supported: true,
      permission,
      isSubscribed: Boolean(subscription),
      subscription,
    };
  } catch (err) {
    return {
      supported: true,
      permission,
      isSubscribed: false,
      error: err.message,
    };
  }
};

/**
 * Subscribe user to Web Push
 */
export const subscribeUserToPush = async () => {
  if (!isPushSupported()) {
    throw new Error("Web Push notifications are not supported on this browser or device.");
  }

  // Request browser permission
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(
      permission === "denied"
        ? "Notification permission was blocked. Please enable notifications in your browser site settings."
        : "Notification permission was dismissed."
    );
  }

  // Fetch VAPID public key
  const res = await axiosInstance.get("/notifications/vapid-public-key");
  const vapidPublicKey = res.data?.data?.publicKey;
  if (!vapidPublicKey) {
    throw new Error("VAPID public key not found on server.");
  }

  const convertedKey = urlBase64ToUint8Array(vapidPublicKey);

  // Wait for Service Worker
  const registration = await navigator.serviceWorker.ready;

  // Unsubscribe existing stale subscription if any
  let subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    try {
      await subscription.unsubscribe();
    } catch {
      // ignore
    }
  }

  // Subscribe new push subscription
  subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: convertedKey,
  });

  const subJson = subscription.toJSON();

  // Save subscription to backend
  await axiosInstance.post("/notifications/push-subscribe", {
    subscription: subJson,
    userAgent: navigator.userAgent,
  });

  return { success: true, subscription: subJson };
};

/**
 * Unsubscribe user from Web Push
 */
export const unsubscribeUserFromPush = async () => {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await axiosInstance.post("/notifications/push-unsubscribe", { endpoint });
    }
    return true;
  } catch (err) {
    console.warn("Error unsubscribing push:", err);
    return false;
  }
};

/**
 * Test push notification (server sends a test push to logged-in user)
 */
export const sendTestPushNotification = async () => {
  const response = await axiosInstance.post("/notifications/push-test");
  return response.data;
};
