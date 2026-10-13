const LOCAL_STORAGE_KEY = "dizitaladda_device_id";
const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let cachedIdentity = null;

const isValidDeviceId = (value) =>
  typeof value === "string" && UUID_V4_PATTERN.test(value);

const generateUuidV4 = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // Fallback below
    }
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const getDeviceIdentity = () => {
  if (cachedIdentity) {
    return Promise.resolve(cachedIdentity);
  }

  let storedId = null;
  try {
    storedId = localStorage.getItem(LOCAL_STORAGE_KEY);
  } catch {
    // Ignore localStorage restrictions
  }

  if (!isValidDeviceId(storedId)) {
    try {
      storedId = sessionStorage.getItem(LOCAL_STORAGE_KEY);
    } catch {
      // Ignore sessionStorage restrictions
    }
  }

  const deviceId = isValidDeviceId(storedId) ? storedId : generateUuidV4();

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, deviceId);
  } catch {
    // Ignore localStorage restrictions
  }
  try {
    sessionStorage.setItem(LOCAL_STORAGE_KEY, deviceId);
  } catch {
    // Ignore sessionStorage restrictions
  }

  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  const platform =
    typeof navigator !== "undefined"
      ? navigator.userAgentData?.platform || navigator.platform || ""
      : "";

  cachedIdentity = {
    deviceId,
    deviceName: `${platform} ${
      /Android|iPhone|iPod|iPad|Tablet|Mobile/i.test(userAgent)
        ? "Mobile browser"
        : "Laptop browser"
    }`
      .trim()
      .slice(0, 120),
  };

  return Promise.resolve(cachedIdentity);
};
