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

const getVapidApplicationServerKey = async () => {
  const res = await axiosInstance.get("/notifications/vapid-public-key");
  const vapidPublicKey = res.data?.data?.publicKey;
  if (!vapidPublicKey) {
    throw new Error("VAPID public key not found on server.");
  }
  return urlBase64ToUint8Array(vapidPublicKey);
};

const subscriptionUsesKey = (subscription, expectedKey) => {
  const currentKey = subscription?.options?.applicationServerKey;
  if (!currentKey) return true;
  const currentBytes = new Uint8Array(currentKey);
  return currentBytes.length === expectedKey.length &&
    currentBytes.every((value, index) => value === expectedKey[index]);
};

const saveSubscription = async (subscription) => {
  await axiosInstance.post("/notifications/push-subscribe", {
    subscription: subscription.toJSON(),
    userAgent: navigator.userAgent,
  });
};

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

  try {
    const subscription = await createOrSyncPushSubscription();
    return { success: true, subscription: subscription.toJSON() };
  } catch (error) {
    throw new Error(
      error?.response?.data?.message ||
      error?.message ||
      "Notification service is not ready. Please contact the administrator."
    );
  }
};

const createOrSyncPushSubscription = async () => {
  const applicationServerKey = await getVapidApplicationServerKey();
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  const isExpired = Boolean(
    subscription?.expirationTime && subscription.expirationTime <= Date.now()
  );
  if (subscription && (isExpired || !subscriptionUsesKey(subscription, applicationServerKey))) {
    const oldEndpoint = subscription.endpoint;
    await subscription.unsubscribe();
    try {
      await axiosInstance.post("/notifications/push-unsubscribe", { endpoint: oldEndpoint });
    } catch (error) {
      console.error("Could not remove the old push subscription from the server:", error);
    }
    subscription = null;
  }

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
  }

  await saveSubscription(subscription);
  return subscription;
};

/**
 * Re-sync an already granted browser subscription with the authenticated user.
 * This never prompts for permission; permission prompts remain user initiated.
 */
export const syncPushSubscription = async () => {
  if (!isPushSupported() || Notification.permission !== "granted") {
    return { success: false, reason: "permission-not-granted" };
  }
  const subscription = await createOrSyncPushSubscription();
  return { success: true, subscription: subscription.toJSON() };
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
