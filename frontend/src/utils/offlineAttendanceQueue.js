import { syncOfflineAttendance } from "../services/attendanceService";
import toast from "react-hot-toast";

const QUEUE_STORAGE_KEY = "dizitaladda_offline_attendance_queue";

/**
 * Get all queued offline punches
 */
export const getOfflineQueue = () => {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/**
 * Save a punch to the offline queue
 */
export const enqueueOfflinePunch = (punch) => {
  try {
    const queue = getOfflineQueue();
    const item = {
      id: `punch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      synced: false,
      ...punch,
    };
    queue.push(item);
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    return item;
  } catch (err) {
    console.error("Failed to enqueue offline punch:", err);
    return null;
  }
};

/**
 * Remove synced punches by IDs
 */
export const removePunchesFromQueue = (ids = []) => {
  try {
    const idSet = new Set(ids);
    const queue = getOfflineQueue();
    const filtered = queue.filter((item) => !idSet.has(item.id));
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error("Failed to remove synced punches:", err);
  }
};

/**
 * Clear all queued punches
 */
export const clearOfflineQueue = () => {
  try {
    localStorage.removeItem(QUEUE_STORAGE_KEY);
  } catch {}
};

let isSyncing = false;

/**
 * Synchronize all pending offline attendance punches to backend
 */
export const flushOfflineAttendanceQueue = async (onSynced = null) => {
  if (isSyncing || typeof navigator === "undefined" || !navigator.onLine) {
    return { synced: 0, pending: getOfflineQueue().length };
  }

  const queue = getOfflineQueue();
  if (!queue.length) return { synced: 0, pending: 0 };

  isSyncing = true;
  try {
    const payloadPunches = queue.map((p) => ({
      type: p.type || p.action || "check-in",
      punchTime: p.punchTime || p.punch_time || p.createdAt,
      latitude: p.latitude,
      longitude: p.longitude,
      accuracy: p.accuracy,
      location_name: p.location_name,
    }));

    const response = await syncOfflineAttendance({ punches: payloadPunches });
    if (response?.success) {
      removePunchesFromQueue(queue.map((p) => p.id));
      toast.success(
        `📡 ${queue.length} offline attendance punch${queue.length > 1 ? "es" : ""} synced successfully with office records!`
      );
      if (typeof onSynced === "function") {
        onSynced(response?.data);
      }
      return { synced: queue.length, pending: 0 };
    }
  } catch (err) {
    console.warn("Offline attendance sync postponed:", err?.message || err);
  } finally {
    isSyncing = false;
  }

  return { synced: 0, pending: getOfflineQueue().length };
};

// Auto-sync whenever internet connectivity resumes
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    // Wait 2 seconds for DNS & network route to stabilize
    setTimeout(() => {
      flushOfflineAttendanceQueue();
    }, 2000);
  });
}
