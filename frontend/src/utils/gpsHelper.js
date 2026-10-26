/**
 * ============================================================================
 * High-Accuracy GPS Helper for Office Attendance & Geofencing
 * ============================================================================
 */

/**
 * Calculates straight-line distance in meters between two coordinates using Haversine formula
 */
export const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371000; // Earth radius in meters
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Actively gathers high-accuracy GPS positions up to maxWaitMs (default 6s).
 * If a position with accuracy <= goodAccuracy (default 120m) is found, resolves early.
 * Otherwise, holds and returns the best reading seen during the window.
 */
export const getBestLocation = (maxWaitMs = 6000, goodAccuracy = 120, maxAgeMs = 30000) => {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return resolve({
        error: true,
        error_code: -1,
        error_message: "Geolocation is not supported by your browser/device.",
      });
    }

    let settled = false;
    let watchId = null;
    let timeoutId = null;
    let bestPosition = null;
    let lastError = null;

    const cleanup = () => {
      if (watchId !== null) {
        try {
          navigator.geolocation.clearWatch(watchId);
        } catch {
          // Ignore clearWatch errors
        }
        watchId = null;
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const finish = (result) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    const handlePosition = (pos) => {
      if (settled) return;
      const acc = Number(pos?.coords?.accuracy) || 999999;

      if (!bestPosition || acc < (Number(bestPosition.coords.accuracy) || 999999)) {
        bestPosition = pos;
      }

      // If accuracy <= goodAccuracy, resolve immediately without waiting further
      if (acc > 0 && acc <= goodAccuracy) {
        finish({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp || Date.now(),
          error: false,
        });
      }
    };

    const handleError = (err) => {
      lastError = err;
      // If user denied permission explicitly, fail immediately
      if (err?.code === 1) {
        finish({
          error: true,
          error_code: 1,
          error_message: err.message || "Location permission denied by user.",
          latitude: null,
          longitude: null,
          accuracy: null,
        });
      }
    };

    const geoOptions = {
      enableHighAccuracy: true,
      maximumAge: Number.isFinite(maxAgeMs) ? maxAgeMs : 30000,
      timeout: Math.min(Math.max(maxWaitMs, 2000), 8000),
    };

    // 1. Start continuous watchPosition
    try {
      watchId = navigator.geolocation.watchPosition(handlePosition, handleError, geoOptions);
    } catch (e) {
      handleError(e);
    }

    // 2. Also trigger getCurrentPosition in parallel
    try {
      navigator.geolocation.getCurrentPosition(handlePosition, handleError, geoOptions);
    } catch {
      // Ignore parallel trigger error
    }

    // 3. Set collection window deadline
    timeoutId = setTimeout(() => {
      if (bestPosition) {
        finish({
          latitude: bestPosition.coords.latitude,
          longitude: bestPosition.coords.longitude,
          accuracy: bestPosition.coords.accuracy,
          timestamp: bestPosition.timestamp || Date.now(),
          error: false,
        });
      } else {
        finish({
          error: true,
          error_code: lastError?.code ?? 3,
          error_message:
            lastError?.code === 1
              ? "Location permission was denied."
              : "Could not obtain fresh GPS coordinates in time. Please ensure device GPS is ON.",
          latitude: null,
          longitude: null,
          accuracy: null,
        });
      }
    }, maxWaitMs);
  });
};

/**
 * Evaluates GPS fix against office coordinates and radius.
 * Returns one of three strict statuses:
 * - "weak": accuracy > 150m (message: "GPS weak, dobara try karo", DO NOT show "Outside Office")
 * - "ok": distance <= officeRadius + accuracy
 * - "outside": distance > officeRadius + accuracy
 */
export const evaluateGpsStatus = (loc, officeLat, officeLng, officeRadius = 100) => {
  if (!loc || loc.error || loc.latitude == null || loc.longitude == null) {
    return {
      status: "unavailable",
      message: loc?.error_code === 1 ? "Location Permission Denied" : "GPS Unavailable",
      distance: null,
      accuracy: null,
      color: "#64748b",
      bgColor: "#f1f5f9",
      borderColor: "#cbd5e1",
    };
  }

  const distance = calculateHaversineDistance(
    Number(loc.latitude),
    Number(loc.longitude),
    Number(officeLat),
    Number(officeLng)
  );
  const accuracy = Number(loc.accuracy) || 0;

  // 1. "weak": accuracy > 150m (Never claim "Outside Office" when confidence radius is imprecise)
  if (accuracy > 150) {
    return {
      status: "weak",
      message: `GPS weak (${Math.round(accuracy)}m accuracy) • Dobara try karein`,
      distance,
      accuracy,
      color: "#b45309",
      bgColor: "#fef3c7",
      borderColor: "#fde68a",
    };
  }

  // 2. "ok": distance <= officeRadius + accuracy
  if (distance !== null && distance <= officeRadius + accuracy) {
    return {
      status: "ok",
      message: `Office Premises (${Math.round(distance)}m • Verified)`,
      distance,
      accuracy,
      color: "#15803d",
      bgColor: "#dcfce7",
      borderColor: "#bbf7d0",
    };
  }

  // 3. "outside": otherwise
  return {
    status: "outside",
    message: `Outside Office (${Math.round(distance || 0)}m away • ${officeRadius}m Req)`,
    distance,
    accuracy,
    color: "#b91c1c",
    bgColor: "#fee2e2",
    borderColor: "#fca5a5",
  };
};
