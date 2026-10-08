const DATABASE_NAME = "dizitaladda-device";
const STORE_NAME = "identity";
const LOCAL_STORAGE_KEY = "dizitaladda_device_id";
const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let identityPromise;
let cachedIdentity;

const readIndexedDb = () =>
  new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB is unavailable."));
      return;
    }
    const openRequest = indexedDB.open(DATABASE_NAME, 1);
    openRequest.onupgradeneeded = () => {
      const database = openRequest.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    openRequest.onerror = () => reject(openRequest.error || new Error("Could not open device storage."));
    openRequest.onsuccess = () => {
      const database = openRequest.result;
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get("deviceId");
      request.onsuccess = () => {
        database.close();
        resolve(request.result);
      };
      request.onerror = () => {
        database.close();
        reject(request.error || new Error("Could not read device storage."));
      };
    };
  });

const writeIndexedDb = (deviceId) =>
  new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB is unavailable."));
      return;
    }
    const openRequest = indexedDB.open(DATABASE_NAME, 1);
    openRequest.onupgradeneeded = () => {
      const database = openRequest.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    openRequest.onerror = () => reject(openRequest.error || new Error("Could not open device storage."));
    openRequest.onsuccess = () => {
      const database = openRequest.result;
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(deviceId, "deviceId");
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => {
        database.close();
        reject(transaction.error || new Error("Could not save device identity."));
      };
    };
  });

const isValidDeviceId = (value) =>
  typeof value === "string" && UUID_V4_PATTERN.test(value);

export const getDeviceIdentity = () => {
  if (cachedIdentity) return Promise.resolve(cachedIdentity);
  if (identityPromise) return identityPromise;

  identityPromise = (async () => {
    let indexedDbId = null;
    try {
      indexedDbId = await readIndexedDb();
    } catch {
      // localStorage is the recovery fallback when IndexedDB is unavailable.
    }

    let localStorageId = null;
    try {
      localStorageId = localStorage.getItem(LOCAL_STORAGE_KEY);
    } catch {
      // IndexedDB may still persist a stable identity.
    }

    const deviceId = [indexedDbId, localStorageId].find(isValidDeviceId)
      || crypto.randomUUID();
    const writes = await Promise.allSettled([
      writeIndexedDb(deviceId),
      Promise.resolve().then(() => localStorage.setItem(LOCAL_STORAGE_KEY, deviceId)),
    ]);
    if (writes.every((result) => result.status === "rejected")) {
      throw new Error("Browser storage is unavailable; enable site storage to keep this device registered.");
    }

    const userAgent = navigator.userAgent || "";
    const platform = navigator.userAgentData?.platform || navigator.platform || "";
    cachedIdentity = {
      deviceId,
      deviceName: `${platform} ${/Android|iPhone|iPod|iPad|Tablet|Mobile/i.test(userAgent) ? "Mobile browser" : "Laptop browser"}`.trim().slice(0, 120),
    };
    return cachedIdentity;
  })().catch((error) => {
    identityPromise = null;
    throw error;
  });

  return identityPromise;
};
