import { useState, useEffect, useRef, useCallback } from "react";
import {
  ScanFace,
  CheckCircle2,
  Clock,
  Smartphone,
  Laptop,
  MapPin,
  Camera,
  AlertTriangle,
  X,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  WifiOff,
  Radio,
} from "lucide-react";
import toast from "react-hot-toast";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import {
  getBiometricStatus,
  getBiometricRegistrationOptions,
  getBiometricAuthenticationOptions,
  registerBiometricCredential,
  checkInAttendance,
  checkOutAttendance,
} from "../../services/attendanceService";
import {
  enqueueOfflinePunch,
  flushOfflineAttendanceQueue,
  getOfflineQueue,
} from "../../utils/offlineAttendanceQueue";
import AttendanceFaceCapture from "./AttendanceFaceCapture";
import { calculateLateArrival, format12hTime } from "../../utils/shiftTiming";
import "./MobileBiometricAttendance.css";

// 100% In-House Geofence Protection - Strict 100 Meters Office Radius
const OFFICE_LAT = 28.54175;
const OFFICE_LNG = 77.240611111;
const MAX_GEOFENCE_RADIUS_METERS = 100;
const MAX_GPS_ACCURACY_METERS = 50;

/**
 * Calculates straight-line distance in meters using Haversine formula
 */
const calculateDistanceInMeters = (userLat, userLng) => {
  const R = 6371000; // Earth's radius in meters
  const rad = Math.PI / 180;
  const dLat = (OFFICE_LAT - userLat) * rad;
  const dLon = (OFFICE_LNG - userLng) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(userLat * rad) * Math.cos(OFFICE_LAT * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Helper to detect client device type (Laptop/Desktop vs iPhone/Android)
 */
export const checkDeviceType = () => {
  if (typeof navigator === "undefined") return { isLaptop: true, isIPhone: false, isAndroid: false, name: "Laptop / PC" };
  const ua = navigator.userAgent || "";
  const isIPhone = /iPhone|iPad|iPod|Macintosh.*Mobile/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isMobile =
    Boolean(navigator.userAgentData?.mobile) ||
    isIPhone ||
    isAndroid ||
    /Mobile|Tablet|Windows Phone|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  return {
    isLaptop: !isMobile,
    isIPhone,
    isAndroid,
    name: !isMobile ? "Laptop / Desktop" : isIPhone ? "iPhone / iPad" : "Mobile Phone",
  };
};

const LAST_KNOWN_GPS_STORAGE_KEY = "dizitaladda_last_valid_gps";
const LAST_KNOWN_GPS_TTL_MS = 15 * 60 * 1000; // 15 minutes
let memoryLastKnownGps = null;

const saveLastKnownGps = (fix) => {
  if (!fix || fix.latitude == null || fix.longitude == null) return;
  const payload = { ...fix, saved_at: Date.now() };
  memoryLastKnownGps = payload;
  try {
    sessionStorage.setItem(LAST_KNOWN_GPS_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage restrictions
  }
};

const loadLastKnownGps = () => {
  const now = Date.now();
  if (memoryLastKnownGps && now - (memoryLastKnownGps.saved_at || 0) <= LAST_KNOWN_GPS_TTL_MS) {
    return memoryLastKnownGps;
  }
  try {
    const raw = sessionStorage.getItem(LAST_KNOWN_GPS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      parsed.latitude != null &&
      parsed.longitude != null &&
      now - (parsed.saved_at || 0) <= LAST_KNOWN_GPS_TTL_MS
    ) {
      memoryLastKnownGps = parsed;
      return parsed;
    }
  } catch {
    // Ignore storage errors
  }
  return null;
};

const buildLocationFix = (position) => {
  const latitude = position.coords.latitude;
  const longitude = position.coords.longitude;
  const accuracy = position.coords.accuracy;
  const rawDistance = calculateDistanceInMeters(latitude, longitude);
  // Accuracy is a confidence radius, not extra geofence radius. Never subtract
  // it from the actual distance: 100m must remain 100m.
  const distance = rawDistance;

  const location_name =
    distance <= MAX_GEOFENCE_RADIUS_METERS
      ? "Dizital Adda Office Premises"
      : `Outside Office (${Math.round(rawDistance)}m away)`;

  const fix = {
    latitude,
    longitude,
    location_name,
    distance,
    raw_distance: rawDistance,
    accuracy,
    position_timestamp: position.timestamp || Date.now(),
  };
  saveLastKnownGps(fix);
  return fix;
};

/**
 * Multi-tier Parallel Geolocation fetcher:
 * Simultaneously queries Network/Wi-Fi positioning (fast indoors), High-Accuracy GPS,
 * and watchPosition so indoor office phones and laptops resolve reliably without timing out.
 */
export const getGPSLocation = ({ requireFresh = false } = {}) => {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return resolve({
        latitude: null,
        longitude: null,
        location_name: "Location Not Supported on this Browser",
        distance: null,
        error_code: -1,
      });
    }

    // Attendance actions must use a new high-accuracy fix. In particular, do
    // not reuse a 15-minute session cache or an OS-cached position here.
    //
    // A single getCurrentPosition call is unreliable inside the office: mobile
    // browsers often return their first, coarse cell/Wi-Fi reading (for example
    // 187m accuracy) even when GPS improves a few seconds later. Keep a fresh
    // high-accuracy watch alive briefly and use the best fresh reading it sees.
    // This does not relax either the 50m accuracy check or the 100m geofence.
    if (requireFresh) {
      let settled = false;
      let watchId = null;
      let timeoutId = null;
      let bestFix = null;
      let lastError = null;

      const finish = (result) => {
        if (settled) return;
        settled = true;
        if (watchId != null) navigator.geolocation.clearWatch(watchId);
        if (timeoutId != null) clearTimeout(timeoutId);
        resolve(result);
      };

      const handleFreshPosition = (position) => {
        if (settled) return;
        const fix = buildLocationFix(position);
        const ageMs = Date.now() - Number(fix.position_timestamp || 0);
        if (ageMs > 30_000) return;

        if (!bestFix || Number(fix.accuracy) < Number(bestFix.accuracy)) {
          bestFix = fix;
        }

        // A valid precise reading need not wait for the full collection window.
        if (Number(fix.accuracy) > 0 && Number(fix.accuracy) <= MAX_GPS_ACCURACY_METERS) {
          finish(fix);
        }
      };

      const handleFreshError = (err) => {
        if (settled) return;
        lastError = err;
        if (err?.code === 1) {
          finish({
            latitude: null,
            longitude: null,
            location_name: "Location Permission Denied",
            distance: null,
            error_code: 1,
            error_msg: err?.message || "Location permission was denied",
          });
        }
      };

      try {
        watchId = navigator.geolocation.watchPosition(
          handleFreshPosition,
          handleFreshError,
          { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
        );
      } catch (err) {
        handleFreshError(err);
      }

      // Some browser implementations resolve getCurrentPosition sooner than
      // watchPosition, so run it too; both callbacks share the same best fix.
      navigator.geolocation.getCurrentPosition(
        handleFreshPosition,
        handleFreshError,
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      );

      timeoutId = setTimeout(() => {
        if (bestFix) return finish(bestFix);
        finish({
          latitude: null,
          longitude: null,
          location_name: "GPS Location Unavailable / Turn ON Phone Location",
          distance: null,
          error_code: lastError?.code ?? 2,
          error_msg: lastError?.message || "Could not detect a fresh location",
        });
      }, 20500);
      return;
    }

    let settled = false;
    let pendingCount = 3;
    let bestCandidate = null;
    let lastError = null;
    let watchId = null;
    let settleTimer = null;

    const cleanup = () => {
      if (watchId != null) {
        try {
          navigator.geolocation.clearWatch(watchId);
        } catch {
          // Ignore clearWatch errors
        }
        watchId = null;
      }
      if (settleTimer) {
        clearTimeout(settleTimer);
        settleTimer = null;
      }
    };

    const finish = (result) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    const handleSuccess = (position) => {
      if (settled) return;
      const fix = buildLocationFix(position);

      // If within the 100m office geofence, resolve immediately!
      if (fix.distance <= MAX_GEOFENCE_RADIUS_METERS) {
        return finish(fix);
      }

      if (!bestCandidate || fix.distance < bestCandidate.distance) {
        bestCandidate = fix;
      }

      pendingCount -= 1;
      if (pendingCount <= 0) {
        return finish(bestCandidate);
      }

      // Give the high-accuracy provider up to 2.5s to refine if the first fix was coarse
      if (!settleTimer) {
        settleTimer = setTimeout(() => {
          if (!settled && bestCandidate) {
            finish(bestCandidate);
          }
        }, 2500);
      }
    };

    const handleError = (err) => {
      if (settled) return;
      lastError = err;
      pendingCount -= 1;

      if (pendingCount <= 0) {
        if (bestCandidate) {
          return finish(bestCandidate);
        }
        const cached = loadLastKnownGps();
        if (cached) {
          return finish(cached);
        }

        // Final instant fallback accepting any cached OS position (maximumAge: Infinity)
        navigator.geolocation.getCurrentPosition(
          (pos) => finish(buildLocationFix(pos)),
          (finalErr) => {
            const errToReport = finalErr || lastError || {};
            finish({
              latitude: null,
              longitude: null,
              location_name:
                errToReport.code === 1
                  ? "Location Permission Denied"
                  : "GPS Location Unavailable / Turn ON Phone Location",
              distance: null,
              error_code: errToReport.code ?? 2,
              error_msg: errToReport.message || "Could not detect location",
            });
          },
          { enableHighAccuracy: false, timeout: 3000, maximumAge: Infinity }
        );
      }
    };

    // 1. Fast Network / Wi-Fi / Cell tower location (works indoors in <1s)
    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      handleError,
      { enableHighAccuracy: false, timeout: 7000, maximumAge: 600000 }
    );

    // 2. High-Accuracy GPS satellite / fused location
    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      handleError,
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 120000 }
    );

    // 3. Active watchPosition wake-up (wakes up Android FusedLocationProvider)
    try {
      watchId = navigator.geolocation.watchPosition(
        handleSuccess,
        handleError,
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 900000 }
      );
    } catch {
      pendingCount -= 1;
    }
  });
};

const MobileBiometricAttendance = ({ onCheckInSuccess }) => {
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [locationData, setLocationData] = useState(() => loadLastKnownGps());
  const [locating, setLocating] = useState(false);
  const [showLocationHelpModal, setShowLocationHelpModal] = useState(false);
  const [faceConsentChecked, setFaceConsentChecked] = useState(false);
  const [faceCaptureRequest, setFaceCaptureRequest] = useState(null);
  const [offlinePunchesCount, setOfflinePunchesCount] = useState(() => getOfflineQueue().length);

  // Camera Selfie State for Face ID (Laptop Webcam & Mobile Camera)
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraMode, setCameraMode] = useState("CHECK_IN"); // "CHECK_IN" | "CHECK_OUT" | "REGISTRATION"
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);

  const device = checkDeviceType();

  const loadStatus = async () => {
    try {
      setLoading(true);
      const res = await getBiometricStatus();
      if (res?.data) {
        setStatusData(res.data);
      }
    } catch (err) {
      console.error("Failed to load biometric status:", err);
    } finally {
      setLoading(false);
    }
  };

  const showBiometricActionError = async (error, fallbackMessage) => {
    if (["ECONNABORTED", "ETIMEDOUT"].includes(error?.code)) {
      await loadStatus();
      toast.error(
        "Server ka response late hai. Current attendance status refresh kar diya hai; dobara try karne se pehle status check karein."
      );
      return;
    }
    toast.error(error.response?.data?.message || error.message || fallbackMessage);
  };

  const refreshLocation = useCallback(async (isUserInitiated = false) => {
    try {
      // A user-triggered refresh must bypass browser/OS cached coordinates.
      // Background refreshes remain fast, but the visible button gets a new
      // high-accuracy fix before the employee attempts attendance.
      const gpsPromise = getGPSLocation({ requireFresh: isUserInitiated });
      setLocating(true);
      const loc = await gpsPromise;
      setLocationData(loc);

      if (loc?.latitude != null && loc?.longitude != null) {
        setShowLocationHelpModal(false);
        if (isUserInitiated) {
          toast.success(
            loc.distance <= MAX_GEOFENCE_RADIUS_METERS
              ? "📍 Location verified! You are within office premises."
              : `📍 Location updated (${Math.round(loc.distance)}m from office).`
          );
        }
      } else if (loc?.error_code === 1) {
        setShowLocationHelpModal(true);
        if (isUserInitiated) {
          toast.error(
            "📍 Location Permission Blocked! URL bar ke 🔒 Lock/Tune icon ya Phone Settings -> Apps -> Chrome -> Permissions me Location 'Allow' karein.",
            { duration: 6000 }
          );
        }
      } else if (isUserInitiated) {
        setShowLocationHelpModal(true);
        toast.error(
          "📍 Phone ka GPS / Location OFF hai! Apne phone ke upar Notification bar se Location (GPS) ON karein aur Retry dabayein.",
          { duration: 6000 }
        );
      }
      return loc;
    } catch (err) {
      console.warn("Failed to refresh location:", err);
      return null;
    } finally {
      setLocating(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    refreshLocation(false);
    flushOfflineAttendanceQueue(() => {
      loadStatus();
      setOfflinePunchesCount(getOfflineQueue().length);
    });

    const handleNetworkChange = () => {
      setOfflinePunchesCount(getOfflineQueue().length);
      if (navigator.onLine) {
        flushOfflineAttendanceQueue(() => {
          loadStatus();
          setOfflinePunchesCount(getOfflineQueue().length);
        });
      }
    };

    window.addEventListener("online", handleNetworkChange);
    window.addEventListener("offline", handleNetworkChange);
    return () => {
      window.removeEventListener("online", handleNetworkChange);
      window.removeEventListener("offline", handleNetworkChange);
    };
  }, [refreshLocation]);

  // Automatically re-request GPS the moment user changes browser Location permission (Block -> Allow / Ask)
  // or returns to the app after turning ON phone GPS in notification shade / settings
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        refreshLocation(false);
      }
    };
    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    let permissionStatusObj = null;
    let isMounted = true;

    if (typeof navigator !== "undefined" && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((permStatus) => {
          if (!isMounted) return;
          permissionStatusObj = permStatus;
          if (permStatus.state === "denied") {
            setShowLocationHelpModal(true);
          }
          permStatus.onchange = () => {
            if (permStatus.state === "granted" || permStatus.state === "prompt") {
              setShowLocationHelpModal(false);
              refreshLocation(true);
            } else if (permStatus.state === "denied") {
              setShowLocationHelpModal(true);
            }
          };
        })
        .catch(() => {});
    }

    return () => {
      isMounted = false;
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      if (permissionStatusObj) {
        permissionStatusObj.onchange = null;
      }
    };
  }, [refreshLocation]);

  // Continuous background watchPosition on BOTH Mobile & Laptop so turning ON GPS immediately updates status
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return undefined;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const fix = buildLocationFix(position);
        setShowLocationHelpModal(false);
        setLocationData((prev) => {
          // Do not overwrite an already-verified office fix with a noisy coarse reading
          if (
            prev?.distance != null &&
            prev.distance <= MAX_GEOFENCE_RADIUS_METERS &&
            fix.distance > MAX_GEOFENCE_RADIUS_METERS &&
            Number(fix.accuracy) > 100
          ) {
            return prev;
          }
          return fix;
        });
      },
      () => {},
      { enableHighAccuracy: !device.isLaptop, timeout: 15000, maximumAge: 60000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [device.isLaptop]);

  // Ensure stream is properly attached to <video> ref when modal opens
  useEffect(() => {
    if (showCameraModal && !capturedPhoto && mediaStreamRef.current && videoRef.current) {
      videoRef.current.srcObject = mediaStreamRef.current;
      videoRef.current.play().catch((e) => console.log("Video playback catch on camera open:", e));
    }
  }, [showCameraModal, capturedPhoto]);

  const openCamera = async (mode = "CHECK_IN") => {
    setCameraMode(mode);
    setShowCameraModal(true);
    setCapturedPhoto(null);

    // Stop any previously open stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: device.isLaptop ? undefined : { ideal: "user" },
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });
      } catch (e1) {
        console.warn("Fallback generic video constraint for webcam:", e1);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.log("Autoplay catch on camera open:", playErr);
        }
      }
    } catch (err) {
      console.error("Camera access error:", err);
      if (device.isLaptop) {
        toast.error(
          "Webcam access required for Face ID. Please click the camera/lock icon in your browser URL bar (top-left) and select 'Allow' for camera access.",
          { duration: 6000 }
        );
      } else if (device.isIPhone) {
        toast.error(
          "Camera access required. Please allow camera permissions in iPhone Settings -> Safari -> Camera.",
          { duration: 6000 }
        );
      } else {
        toast.error(
          "Camera access required. Please allow camera permissions in your browser site settings.",
          { duration: 6000 }
        );
      }
    }
  };

  const closeCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setShowCameraModal(false);
    setCapturedPhoto(null);
  };

  const takeSelfie = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const srcW = video.videoWidth || 640;
    const srcH = video.videoHeight || 480;

    // Scale down to max 480px to keep payload ultra-lightweight (~50KB) and prevent 413
    const maxDim = 480;
    let targetW = srcW;
    let targetH = srcH;

    if (srcW > srcH) {
      if (srcW > maxDim) {
        targetW = maxDim;
        targetH = Math.round((srcH * maxDim) / srcW);
      }
    } else {
      if (srcH > maxDim) {
        targetH = maxDim;
        targetW = Math.round((srcW * maxDim) / srcH);
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");

    // Mirror horizontal so the final snapshot matches the user's live preview
    ctx.translate(targetW, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, targetW, targetH);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.70);
    setCapturedPhoto(dataUrl);

    // Stop video stream after capture
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }
  };

  const validateGPSLocation = (loc) => {
    if (!loc || loc.latitude == null || loc.longitude == null) {
      setShowLocationHelpModal(true);
      if (loc?.error_code === 1) {
        if (device.isLaptop) {
          toast.error(
            "📍 Laptop Location Blocked! Click 'Allow Location' or click the lock/tune icon 🔒 in your browser URL bar, set Location to 'Allow', and click Refresh.",
            { duration: 7000 }
          );
        } else if (device.isIPhone) {
          toast.error(
            "📍 iPhone Location Blocked! Turn ON Location in iPhone Settings -> Privacy -> Location Services and Safari -> Allow.",
            { duration: 7000 }
          );
        } else {
          toast.error(
            "📍 Phone Location Blocked! Turn ON Location in phone settings and allow browser site access.",
            { duration: 7000 }
          );
        }
      } else {
        toast.error(
          device.isLaptop
            ? "📍 Laptop Location Unavailable! Please make sure your laptop is connected to Wi-Fi and Windows Location is ON."
            : "📍 Phone GPS is OFF or Unavailable! Upar notification bar se Phone Location (GPS) ON karein aur Chrome App ko Location permission dein.",
          { duration: 7000 }
        );
      }
      return false;
    }

    const distance =
      loc.distance != null
        ? loc.distance
        : calculateDistanceInMeters(Number(loc.latitude), Number(loc.longitude));

    if (!Number.isFinite(Number(loc.accuracy)) || Number(loc.accuracy) <= 0 || Number(loc.accuracy) > MAX_GPS_ACCURACY_METERS) {
      toast.error(`GPS accuracy is ${Math.round(Number(loc.accuracy) || 0)}m. Please move near a window/open area and retry (accuracy must be 50m or better).`, { duration: 7000 });
      return false;
    }

    // STRICT 100-METER GEOFENCE ENFORCEMENT ON BOTH LAPTOP & MOBILE
    if (distance > MAX_GEOFENCE_RADIUS_METERS) {
      toast.error(
        `📍 Out of Office Range! You are ${Math.round(distance)} meters away from the office. Attendance can ONLY be marked within 100 meters of the Dizital Adda office premises.`,
        { duration: 7000 }
      );
      return false;
    }

    return true;
  };

  const submitFaceRegistration = async () => {
    if (!capturedPhoto) {
      toast.error("Please capture your face photo first.");
      return;
    }

    try {
      setActionLoading(true);

      const credentialId = "FACE_ID_" + (device.isLaptop ? "LAPTOP_" : "MOBILE_") + Date.now();
      const publicKey = "FIDO2_FACE_KEY_" + Math.random().toString(36).substring(7);

      await registerBiometricCredential({
        credentialId,
        publicKey,
        faceImage: capturedPhoto,
        deviceInfo: device.isLaptop
          ? "Laptop / Desktop Webcam Face ID"
          : device.isIPhone
          ? "iPhone / iOS Face ID"
          : "Mobile Face ID",
      });

      toast.success(
        device.isLaptop
          ? "Laptop Webcam Face photo captured & sent to HR for approval! 📸"
          : "Face selfie captured & sent to HR for approval! 📸"
      );
      closeCamera();
      await loadStatus();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to register face biometric.";
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFaceCheckIn = async () => {
    if (!capturedPhoto) {
      toast.error("Please capture your face photo first.");
      return;
    }
    try {
      setActionLoading(true);

      const loc = await getGPSLocation({ requireFresh: true });
      if (loc?.latitude != null) {
        setLocationData(loc);
      }

      if (!validateGPSLocation(loc)) {
        return;
      }

      if (!navigator.onLine) {
        const nowIso = new Date().toISOString();
        enqueueOfflinePunch({
          type: "check-in",
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
          location_name: loc.location_name,
          punchTime: nowIso,
          faceImage: capturedPhoto,
        });
        setOfflinePunchesCount(getOfflineQueue().length);
        setStatusData((prev) => ({
          ...prev,
          today_attendance: {
            ...(prev?.today_attendance || {}),
            check_in_time: nowIso,
            status: "PRESENT",
            check_in_location: loc.location_name,
            is_offline: true,
          },
        }));
        toast.success(
          `📡 Offline Face ID Check-in saved! 📍 ${loc.location_name} (${Math.round(loc.distance || 0)}m). Internet aate hi auto-sync hoga.`
        );
        closeCamera();
        return;
      }

      const credentialId = "FACE_ID_CHECKIN_" + Date.now();
      const res = await checkInAttendance({
        credentialId,
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc.accuracy,
        location_name: loc.location_name,
        faceImage: capturedPhoto,
      });

      if (res?.data) {
        setStatusData((prev) =>
          prev ? { ...prev, today_attendance: { ...prev.today_attendance, ...res.data } } : prev
        );
      }

      toast.success(
        `Face ID Attendance Checked-In! 📍 ${loc.location_name} (${Math.round(loc.distance || 0)}m)`
      );
      closeCamera();
      await loadStatus();
      if (onCheckInSuccess) onCheckInSuccess(res?.data);
    } catch (err) {
      const isNetError =
        !navigator.onLine ||
        err?.code === "ERR_NETWORK" ||
        !err?.response ||
        [502, 503, 504].includes(err?.response?.status);
      let loc = locationData;
      if (isNetError && loc?.latitude != null && (loc?.distance == null || loc?.distance <= MAX_GEOFENCE_RADIUS_METERS)) {
        const nowIso = new Date().toISOString();
        enqueueOfflinePunch({
          type: "check-in",
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
          location_name: loc.location_name,
          punchTime: nowIso,
          faceImage: capturedPhoto,
        });
        setOfflinePunchesCount(getOfflineQueue().length);
        setStatusData((prev) => ({
          ...prev,
          today_attendance: {
            ...(prev?.today_attendance || {}),
            check_in_time: nowIso,
            status: "PRESENT",
            check_in_location: loc.location_name,
            is_offline: true,
          },
        }));
        toast.success(
          `📡 Server unreachable! Offline Check-in saved at 📍 ${loc.location_name}. Will sync automatically.`
        );
        closeCamera();
        return;
      }
      const msg = err.response?.data?.message || err.message || "Failed to mark Face ID check-in.";
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFaceCheckOut = async () => {
    if (!capturedPhoto) {
      toast.error("Please capture your face photo first.");
      return;
    }
    try {
      setActionLoading(true);

      const loc = await getGPSLocation({ requireFresh: true });
      if (loc?.latitude != null) {
        setLocationData(loc);
      }

      if (!validateGPSLocation(loc)) return;

      if (!navigator.onLine) {
        const nowIso = new Date().toISOString();
        enqueueOfflinePunch({
          type: "check-out",
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc?.accuracy,
          location_name: loc.location_name,
          punchTime: nowIso,
          faceImage: capturedPhoto,
        });
        setOfflinePunchesCount(getOfflineQueue().length);
        setStatusData((prev) => ({
          ...prev,
          today_attendance: {
            ...(prev?.today_attendance || {}),
            check_out_time: nowIso,
            check_out_location: loc.location_name,
            is_offline: true,
          },
        }));
        toast.success(`Offline Face ID Check-out saved at ${loc.location_name}. Internet aate hi auto-sync hoga.`);
        closeCamera();
        return;
      }

      const result = await checkOutAttendance({
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc?.accuracy,
        location_name: loc.location_name,
        faceImage: capturedPhoto,
      });

      if (result?.data) {
        setStatusData((prev) =>
          prev ? { ...prev, today_attendance: { ...prev.today_attendance, ...result.data } } : prev
        );
      }

      toast.success(`Face ID Check-Out Marked! 📍 ${loc.location_name}`);
      closeCamera();
      await loadStatus();
      if (onCheckInSuccess) onCheckInSuccess(result?.data);
    } catch (err) {
      const isNetError =
        !navigator.onLine ||
        err?.code === "ERR_NETWORK" ||
        !err?.response ||
        [502, 503, 504].includes(err?.response?.status);
      if (isNetError) {
        toast.error("Connection interrupted. Reconnect and check out again so a fresh GPS location can be verified.");
        return;
      }
      /* Legacy fallback intentionally disabled: it reused check-in coordinates
         after a failed checkout request, which could falsify the checkout place.
      if (false) {
        const nowIso = new Date().toISOString();
        const currentToday = statusData?.today_attendance;
        const resolvedLat = currentToday?.check_in_lat ?? OFFICE_LAT;
        const resolvedLng = currentToday?.check_in_lng ?? OFFICE_LNG;
        const resolvedLocName = currentToday?.check_in_location || "Office Premises";
        enqueueOfflinePunch({
          type: "check-out",
          latitude: resolvedLat,
          longitude: resolvedLng,
          accuracy: 0,
          location_name: resolvedLocName,
          punchTime: nowIso,
          faceImage: capturedPhoto,
        });
        setOfflinePunchesCount(getOfflineQueue().length);
        setStatusData((prev) => ({
          ...prev,
          today_attendance: {
            ...(prev?.today_attendance || {}),
            check_out_time: nowIso,
            check_out_location: resolvedLocName,
            is_offline: true,
          },
        }));
        toast.success(
          `📡 Server unreachable! Offline Check-out saved at 📍 ${resolvedLocName}. Will sync automatically.`
        );
        closeCamera();
        return;
      }
      */
      const msg = err.response?.data?.message || err.message || "Failed to mark Face ID check-out.";
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegisterPasskey = async () => {
    if (!window.isSecureContext) {
      toast.error("Biometric registration requires a secure connection (localhost or HTTPS).");
      return;
    }

    if (!window.PublicKeyCredential) {
      toast.error("This device or browser does not support passkeys.");
      return;
    }

    try {
      setActionLoading(true);
      toast.loading("Set up your device passkey...", { id: "biometric-reg" });
      const optionsResponse = await getBiometricRegistrationOptions();
      const credential = await startRegistration({
        optionsJSON: optionsResponse.data,
      });
      await registerBiometricCredential(credential);
      toast.dismiss("biometric-reg");
      toast.success("Device passkey registered and active.");
      await loadStatus();
    } catch (err) {
      toast.dismiss("biometric-reg");
      await showBiometricActionError(err, "Failed to register passkey.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleFaceCaptureCancel = useCallback(() => {
    setFaceCaptureRequest(null);
  }, []);

  const handleFaceCaptureComplete = async (frames) => {
    const captureRequest = faceCaptureRequest;
    if (!captureRequest) return;

    setActionLoading(true);
    const faceProof = {
      challenge: captureRequest.challenge.challenge,
      frames,
    };
    try {
      if (captureRequest.purpose === "registration") {
        await registerBiometricCredential({
          ...captureRequest.credential,
          faceProof,
          faceConsent: true,
        });
        toast.success("Passkey and face registered, active, and locked. HR approval is not required.");
        await loadStatus();
      } else {
        const submitAttendance =
          captureRequest.purpose === "check-in" ? checkInAttendance : checkOutAttendance;
        const result = await submitAttendance({
          ...captureRequest.attendancePayload,
          faceProof,
        });
        toast.success(
          captureRequest.purpose === "check-in"
            ? `Passkey and face verified. Check-in marked at 📍 ${captureRequest.attendancePayload.location_name}`
            : `Passkey and face verified. Check-out marked at 📍 ${captureRequest.attendancePayload.location_name}`
        );
        await loadStatus();
        if (onCheckInSuccess) {
          onCheckInSuccess(result?.data);
        }
      }
    } catch (err) {
      await showBiometricActionError(err, "Face verification failed.");
    } finally {
      setFaceCaptureRequest(null);
      setActionLoading(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      setActionLoading(true);
      const loc = await getGPSLocation({ requireFresh: true });
      if (loc?.latitude != null) {
        setLocationData(loc);
      }
      if (!validateGPSLocation(loc)) {
        return;
      }

      if (!navigator.onLine) {
        const nowIso = new Date().toISOString();
        enqueueOfflinePunch({
          type: "check-in",
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
          location_name: loc.location_name,
          punchTime: nowIso,
        });
        setOfflinePunchesCount(getOfflineQueue().length);
        setStatusData((prev) => ({
          ...prev,
          today_attendance: {
            ...(prev?.today_attendance || {}),
            check_in_time: nowIso,
            status: "PRESENT",
            check_in_location: loc.location_name,
            is_offline: true,
          },
        }));
        toast.success(
          `📡 Offline Check-in marked! 📍 ${loc.location_name} (${Math.round(loc.distance || 0)}m). Will sync automatically.`
        );
        return;
      }

      let assertion;
      if (statusData?.passkey_required !== false) {
        if (!window.isSecureContext || !window.PublicKeyCredential) {
          throw new Error("Passkeys require a supported browser and a secure HTTPS connection.");
        }
        toast.loading("Verify your device passkey...", { id: "biometric-auth" });
        const optionsResponse = await getBiometricAuthenticationOptions();
        assertion = await startAuthentication({
          optionsJSON: optionsResponse.data,
        });
      }
      const attendancePayload = {
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc.accuracy,
        location_name: loc.location_name,
        ...(assertion ? { assertion } : {}),
      };
      const result = await checkInAttendance(attendancePayload);
      if (result?.data) {
        setStatusData((prev) =>
          prev ? { ...prev, today_attendance: { ...prev.today_attendance, ...result.data } } : prev
        );
      }
      toast.dismiss("biometric-auth");
      toast.success(
        statusData?.passkey_required === false
          ? `Check-in marked at 📍 ${loc.location_name}`
          : `Passkey verified. Check-in marked at 📍 ${loc.location_name}`
      );
      await loadStatus();
      if (onCheckInSuccess) onCheckInSuccess(result?.data);
    } catch (err) {
      toast.dismiss("biometric-auth");
      const isNetError =
        !navigator.onLine ||
        err?.code === "ERR_NETWORK" ||
        !err?.response ||
        [502, 503, 504].includes(err?.response?.status);
      let loc = locationData;
      if (isNetError && loc?.latitude != null && (loc?.distance == null || loc?.distance <= MAX_GEOFENCE_RADIUS_METERS)) {
        const nowIso = new Date().toISOString();
        enqueueOfflinePunch({
          type: "check-in",
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
          location_name: loc.location_name,
          punchTime: nowIso,
        });
        setOfflinePunchesCount(getOfflineQueue().length);
        setStatusData((prev) => ({
          ...prev,
          today_attendance: {
            ...(prev?.today_attendance || {}),
            check_in_time: nowIso,
            status: "PRESENT",
            check_in_location: loc.location_name,
            is_offline: true,
          },
        }));
        toast.success(
          `📡 Network issue! Offline Check-in saved at 📍 ${loc.location_name}. Will sync automatically.`
        );
        return;
      }
      await showBiometricActionError(err, "Failed to mark check-in.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setActionLoading(true);

      const loc = await getGPSLocation({ requireFresh: true });
      if (loc?.latitude != null) {
        setLocationData(loc);
      }

      if (!validateGPSLocation(loc)) return;

      if (!navigator.onLine) {
        const nowIso = new Date().toISOString();
        enqueueOfflinePunch({
          type: "check-out",
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc?.accuracy,
          location_name: loc.location_name,
          punchTime: nowIso,
        });
        setOfflinePunchesCount(getOfflineQueue().length);
        setStatusData((prev) => ({
          ...prev,
          today_attendance: {
            ...(prev?.today_attendance || {}),
            check_out_time: nowIso,
            check_out_location: loc.location_name,
            is_offline: true,
          },
        }));
        toast.success(`Offline Check-out marked at ${loc.location_name}. Will sync automatically.`);
        return;
      }

      let assertion;
      if (statusData?.passkey_required !== false) {
        if (!window.isSecureContext || !window.PublicKeyCredential) {
          throw new Error("Passkeys require a supported browser and a secure HTTPS connection.");
        }
        toast.loading("Verify your device passkey...", { id: "biometric-auth" });
        const optionsResponse = await getBiometricAuthenticationOptions();
        assertion = await startAuthentication({
          optionsJSON: optionsResponse.data,
        });
      }
      const attendancePayload = {
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc?.accuracy,
        location_name: loc.location_name,
        ...(assertion ? { assertion } : {}),
      };
      const result = await checkOutAttendance(attendancePayload);
      if (result?.data) {
        setStatusData((prev) =>
          prev ? { ...prev, today_attendance: { ...prev.today_attendance, ...result.data } } : prev
        );
      }
      toast.dismiss("biometric-auth");
      toast.success(
        statusData?.passkey_required === false
          ? `Check-out marked at 📍 ${loc.location_name}`
          : `Passkey verified. Check-out marked at 📍 ${loc.location_name}`
      );
      await loadStatus();
      if (onCheckInSuccess) onCheckInSuccess(result?.data);
    } catch (err) {
      toast.dismiss("biometric-auth");
      const isNetError =
        !navigator.onLine ||
        err?.code === "ERR_NETWORK" ||
        !err?.response ||
        [502, 503, 504].includes(err?.response?.status);
      if (isNetError) {
        toast.error("Connection interrupted. Reconnect and check out again so a fresh GPS location can be verified.");
        return;
      }
      /* Legacy fallback intentionally disabled: it reused check-in coordinates
         after a failed checkout request, which could falsify the checkout place.
      if (false) {
        const nowIso = new Date().toISOString();
        const currentToday = statusData?.today_attendance;
        const resolvedLat = currentToday?.check_in_lat ?? OFFICE_LAT;
        const resolvedLng = currentToday?.check_in_lng ?? OFFICE_LNG;
        const resolvedLocName = currentToday?.check_in_location || "Office Premises";
        enqueueOfflinePunch({
          type: "check-out",
          latitude: resolvedLat,
          longitude: resolvedLng,
          accuracy: 0,
          location_name: resolvedLocName,
          punchTime: nowIso,
        });
        setOfflinePunchesCount(getOfflineQueue().length);
        setStatusData((prev) => ({
          ...prev,
          today_attendance: {
            ...(prev?.today_attendance || {}),
            check_out_time: nowIso,
            check_out_location: resolvedLocName,
            is_offline: true,
          },
        }));
        toast.success(
          `📡 Network issue! Offline Check-out saved at 📍 ${resolvedLocName}. Will sync automatically.`
        );
        return;
      }
      */
      await showBiometricActionError(err, "Failed to check out.");
    } finally {
      setActionLoading(false);
    }
  };

  const today = statusData?.today_attendance;
  const passkeyRequired = statusData?.passkey_required !== false;
  const approvalStatus = statusData?.approval_status || (statusData?.is_registered ? "APPROVED" : "NOT_REGISTERED");
  const needsPasskeyRegistration =
    passkeyRequired &&
    (approvalStatus === "NOT_REGISTERED" ||
      approvalStatus === "RE_ENROLL_REQUIRED" ||
      (approvalStatus === "APPROVED" && !statusData?.passkey_ready));
  const needsFaceRegistration = false;
  const biometricStatusLabel = !statusData?.passkey_ready
    ? "Passkey setup required"
    : "Passkey Active & Locked";

  const isWithinOffice = locationData?.distance != null && locationData.distance <= MAX_GEOFENCE_RADIUS_METERS;
  const hasAcceptableGpsAccuracy =
    Number.isFinite(Number(locationData?.accuracy)) &&
    Number(locationData.accuracy) > 0 &&
    Number(locationData.accuracy) <= MAX_GPS_ACCURACY_METERS;
  const isLocationDenied = locationData?.error_code === 1;
  const laptopAttendanceAllowed = Boolean(statusData?.laptop_attendance_enabled);
  const attendanceActionDisabled = actionLoading;

  return (
    <div className="biometric-card">
      <div className="biometric-card-header">
        {/* Title, Device, and Geofence Info */}
        <div className="biometric-card-info">
          <div className="biometric-pill-row">
            {/* Device pill */}
            <span className="biometric-pill biometric-pill-device">
              {device.isLaptop ? <Laptop size={14} /> : <Smartphone size={14} />}
              {device.isLaptop
                ? passkeyRequired ? "Laptop & Desktop Passkey" : "Laptop & Desktop Attendance"
                : passkeyRequired ? "Mobile Phone Passkey" : "Mobile Phone Attendance"}
            </span>

            {/* Approval status */}
            {passkeyRequired && approvalStatus === "APPROVED" && (
              <span className="biometric-pill biometric-pill-approved">
              <ShieldCheck size={14} />{" "}
              {biometricStatusLabel}
              </span>
            )}
            {passkeyRequired && approvalStatus === "PENDING_APPROVAL" && (
              <span className="biometric-pill biometric-pill-pending">
                <Clock size={14} /> Passkey Pending Review
              </span>
            )}
            {passkeyRequired && approvalStatus === "REJECTED" && (
              <span className="biometric-pill biometric-pill-rejected">
                <AlertTriangle size={14} /> Passkey Rejected by HR
              </span>
            )}
            {passkeyRequired && approvalStatus === "RE_ENROLL_REQUIRED" && (
              <span className="biometric-pill biometric-pill-rejected">
                <AlertTriangle size={14} /> Passkey setup required
              </span>
            )}

            {/* Geofence GPS status pill */}
            {locating ? (
              <span className="biometric-pill biometric-pill-geofence-loading">
                <RefreshCw size={12} className="spin-anim" /> Checking Geofence...
              </span>
            ) : locationData?.distance != null ? (
              isWithinOffice && hasAcceptableGpsAccuracy ? (
                <span className="biometric-pill biometric-pill-geofence-ok" title="Within 100 meters of office location">
                  <MapPin size={12} /> Office Premises ({Math.round(locationData.distance)}m • Within 100m)
                </span>
              ) : isWithinOffice ? (
                <span
                  className="biometric-pill biometric-pill-geofence-outside"
                  title="Get a fresh GPS location with 50m or better accuracy before checkout"
                >
                  <AlertTriangle size={12} /> GPS weak ({Math.round(locationData.accuracy || 0)}m accuracy - 50m required)
                </span>
              ) : (
                <span
                  className="biometric-pill biometric-pill-geofence-outside"
                  title="Attendance can only be marked within 100m of office location"
                >
                  <AlertTriangle size={12} /> Outside Office ({Math.round(locationData.distance)}m away • 100m Req)
                </span>
              )
            ) : isLocationDenied ? (
              <button
                type="button"
                onClick={() => refreshLocation(true)}
                className="biometric-pill biometric-pill-geofence-outside"
                style={{ cursor: "pointer" }}
                title="Click to allow location access again"
              >
                <AlertTriangle size={12} /> Location Permission Denied (Click to Allow)
              </button>
            ) : (
              <span className="biometric-pill biometric-pill-geofence-loading" title={locationData?.location_name}>
                <MapPin size={12} /> {locationData?.location_name || "Detecting GPS..."}
              </span>
            )}

            {/* A user-triggered refresh always fetches a fresh GPS fix. */}
            <button
              type="button"
              className="btn-loc-refresh"
              onClick={() => refreshLocation(true)}
              disabled={locating}
              title="Fetch a fresh high-accuracy GPS location before attendance"
              style={
                isLocationDenied
                  ? {
                      background: "#2563eb",
                      color: "#ffffff",
                      border: "1px solid #60a5fa",
                      fontWeight: 700,
                      padding: "4px 10px",
                    }
                  : undefined
              }
            >
              <RefreshCw size={11} className={locating ? "spin-anim" : ""} />{" "}
              {isLocationDenied ? "Allow Location / Refresh" : "Get Fresh GPS"}
            </button>

            {/* Offline Mode / Pending Queue Sync Pill */}
            {(!navigator.onLine || offlinePunchesCount > 0) && (
              <span
                className="biometric-pill"
                style={{
                  background: "#FFFBEB",
                  color: "#B45309",
                  border: "1px solid #FCD34D",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontWeight: 600,
                  fontSize: "12px",
                }}
              >
                <WifiOff size={13} />
                {!navigator.onLine
                  ? "Offline Mode (GPS Active)"
                  : `${offlinePunchesCount} Offline Punch Pending Sync`}
                {navigator.onLine && offlinePunchesCount > 0 && (
                  <button
                    type="button"
                    onClick={() => flushOfflineAttendanceQueue(() => loadStatus())}
                    style={{
                      background: "#F59E0B",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "4px",
                      padding: "2px 8px",
                      fontSize: "11px",
                      cursor: "pointer",
                      marginLeft: "4px",
                      fontWeight: 700,
                    }}
                  >
                    Sync Now
                  </button>
                )}
              </span>
            )}
          </div>

          <h2 className="biometric-title">
            {today?.check_in_time
              ? today.check_out_time
                ? "Attendance Marked & Completed Today"
                : "Checked-In (Shift Active)"
                : passkeyRequired
                ? "Mark Daily Attendance with Passkey"
                : "Mark Daily Attendance"}
          </h2>

          <p className="biometric-subtitle">
            {statusData?.shift_timing_type === "CUSTOM"
              ? `Your Assigned Shift: ${format12hTime(statusData.shift_start_time || "10:00")} - ${format12hTime(statusData.shift_end_time || "18:00")} (Custom Schedule)`
              : "Office Timings: Mon-Fri (10:00 AM - 6:00 PM), Sat (9:30 AM - 5:30 PM), Sun (9:30 AM - 2:00 PM)"}
          </p>

          {!locating && (!locationData || locationData.latitude == null) && (
            <div
              style={{
                marginTop: "12px",
                padding: "12px 14px",
                borderRadius: "12px",
                background: isLocationDenied
                  ? "rgba(239, 68, 68, 0.16)"
                  : "rgba(37, 99, 235, 0.16)",
                border: isLocationDenied
                  ? "1px solid rgba(248, 113, 113, 0.45)"
                  : "1px solid rgba(96, 165, 250, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", flex: "1 1 240px" }}>
                <AlertTriangle
                  size={18}
                  style={{
                    color: isLocationDenied ? "#f87171" : "#60a5fa",
                    marginTop: "2px",
                    flexShrink: 0,
                  }}
                />
                <div style={{ fontSize: "12.5px", color: "#f1f5f9", lineHeight: 1.45 }}>
                  <strong style={{ display: "block", marginBottom: "2px", color: "#ffffff" }}>
                    {isLocationDenied
                      ? "Location Access Denied / Blocked"
                      : "GPS Location Not Detected Yet"}
                  </strong>
                  {isLocationDenied
                    ? "Browser URL bar ke left me 🔒 Lock / Tune icon par click karke Location ko 'Allow' karein, phir neeche button dabayein."
                    : "Upar Notification bar se Phone ka GPS / Location ON karein (aur Chrome App me Location Allow rakhein), phir Refresh dabayein."}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => refreshLocation(true)}
                  disabled={locating}
                  style={{
                    background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                    color: "#ffffff",
                    border: "1px solid #60a5fa",
                    borderRadius: "8px",
                    padding: "7px 13px",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <RefreshCw size={13} className={locating ? "spin-anim" : ""} />
                  Allow / Refresh Location
                </button>
                <button
                  type="button"
                  onClick={() => setShowLocationHelpModal(true)}
                  style={{
                    background: "rgba(255, 255, 255, 0.12)",
                    color: "#e2e8f0",
                    border: "1px solid rgba(255, 255, 255, 0.25)",
                    borderRadius: "8px",
                    padding: "7px 11px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {isLocationDenied ? "How to Unblock?" : "How to Fix?"}
                </button>
              </div>
            </div>
          )}

          {!loading && needsPasskeyRegistration && (
            <div className="biometric-registration-notice" role="status">
              <ShieldCheck size={18} aria-hidden="true" />
              <div>
                <strong>Attendance security update</strong>
                <p>
                  Attendance system mein security changes kiye gaye hain. Pehli baar attendance lagane se pehle
                  yahan device passkey register karein. Registration ke baad ye turant active
                  ho jayenge—HR approval ka wait nahi karna hoga.
                </p>
                <p>
                  {device.isIPhone
                    ? "iPhone par Face ID ya phone passcode se device passkey confirm karein."
                    : device.isAndroid
                    ? "Android par apne device ke fingerprint ya screen lock prompt se passkey confirm karein."
                    : "Apne device ke security prompt se passkey confirm karein; face capture required nahi hai."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons: Seamless on both Laptop & Mobile */}
        <div className="biometric-actions">
          {loading ? (
            <div style={{ color: "#94a3b8", fontSize: "14px" }}>Loading Status...</div>
          ) : passkeyRequired && approvalStatus === "REJECTED" ? (
            <div className="btn-bio-pending">
              <AlertTriangle size={16} /> Contact HR to reset the rejected passkey before registering again.
            </div>
          ) : needsPasskeyRegistration ? (
            <>
              <button
                type="button"
                className="btn-bio-face-checkin"
                onClick={handleRegisterPasskey}
                disabled={actionLoading}
              >
                <ScanFace size={18} /> Register Device Passkey
              </button>
            </>
          ) : passkeyRequired && needsFaceRegistration ? (
            <div className="btn-bio-pending">
              <AlertTriangle size={16} /> Face template is missing. Contact HR to reset your attendance registration.
            </div>
          ) : passkeyRequired && approvalStatus === "PENDING_APPROVAL" ? (
            <div className="btn-bio-pending">
              <Clock size={16} /> Passkey pending review
            </div>
          ) : device.isLaptop && !laptopAttendanceAllowed && !today?.check_in_time ? (
            <div className="btn-bio-pending" role="status">
              <Laptop size={16} /> Laptop attendance is not enabled for your account. Please contact HR.
            </div>
          ) : !today?.check_in_time ? (
            <button
              type="button"
              className="btn-bio-primary"
              onClick={handleCheckIn}
              disabled={attendanceActionDisabled}
              title={device.isLaptop && !isWithinOffice ? "Attendance is available only within 100m of the office." : undefined}
            >
              {actionLoading ? (
                <RefreshCw size={18} className="spin-anim" />
              ) : passkeyRequired ? (
                <ScanFace size={18} />
              ) : (
                <MapPin size={18} />
              )}
              {actionLoading
                ? "Checking In..."
                : passkeyRequired
                ? "Check-In with Passkey"
                : "Check In"}
            </button>
          ) : !today?.check_out_time ? (
            <button
              type="button"
              className="btn-bio-primary"
              onClick={handleCheckOut}
              disabled={attendanceActionDisabled}
            >
              {actionLoading ? (
                <RefreshCw size={18} className="spin-anim" />
              ) : passkeyRequired ? (
                <ScanFace size={18} />
              ) : (
                <MapPin size={18} />
              )}
              {actionLoading
                ? "Checking Out..."
                : passkeyRequired
                ? "Check-Out with Passkey"
                : "Check Out"}
            </button>
          ) : (
            <div className="btn-bio-complete">
              {(() => {
                const totalMinutes = Math.round(Number(today.live_hours ?? today.total_hours ?? 0) * 60);
                const h = Math.floor(totalMinutes / 60);
                const m = totalMinutes % 60;
                const formatted = h > 0 ? `${h}h ${m}m` : `${m}m`;
                return (
                  <>
                    <CheckCircle2 size={18} /> Shift Complete ({formatted})
                  </>
                );
              })()}
            </div>
          )}
        </div>
        {!needsPasskeyRegistration && passkeyRequired && (
          <p className="biometric-subtitle">
            {device.isIPhone
              ? "On iPhone, confirm with Face ID or your device passcode. No camera face scan is required."
              : device.isAndroid
              ? "On Android, confirm with your fingerprint or device screen lock. Camera face check is not required."
              : "Confirm with your device's passkey security prompt. Camera face check is not required."}
          </p>
        )}
        {!passkeyRequired && (
          <p className="biometric-subtitle">
            Location access is required. Attendance is available only within 100 meters of the office.
          </p>
        )}
      </div>

      {faceCaptureRequest && (
        <AttendanceFaceCapture
          purpose={faceCaptureRequest.purpose}
          turn={faceCaptureRequest.challenge.turn}
          onComplete={handleFaceCaptureComplete}
          onCancel={handleFaceCaptureCancel}
        />
      )}

      {/* Live Check-in Details Bar */}
      {today?.check_in_time && (
        <div className="biometric-details-strip">
          <div className="biometric-detail-col">
            <strong style={{ color: "#94a3b8" }}>Check-In Time:</strong>{" "}
            <span style={{ color: "#fff", fontWeight: "600" }}>
              {new Date(today.check_in_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </span>
            {(() => {
              const lateInfo = calculateLateArrival(today.check_in_time, statusData);
              if (!lateInfo) return null;
              if (lateInfo.isLate) {
                return (
                  <span
                    title={`Shift: ${lateInfo.shiftLabel} • Expected: ${lateInfo.expectedLabel}`}
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: "6px",
                      background: "rgba(245, 158, 11, 0.25)",
                      color: "#fbbf24",
                      border: "1px solid rgba(245, 158, 11, 0.4)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "3px",
                    }}
                  >
                    ⚠️ Late by {lateInfo.formattedLate}
                  </span>
                );
              }
              return (
                <span
                  title={`On time • ${lateInfo.shiftLabel}`}
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "2px 6px",
                    borderRadius: "6px",
                    background: "rgba(16, 185, 129, 0.2)",
                    color: "#34d399",
                    border: "1px solid rgba(52, 211, 153, 0.3)",
                  }}
                >
                  ✓ On Time
                </span>
              );
            })()}
          </div>

          {today.check_out_time && (
            <div className="biometric-detail-col">
              <strong style={{ color: "#94a3b8" }}>Check-Out Time:</strong>{" "}
              <span style={{ color: "#fff", fontWeight: "600" }}>
                {new Date(today.check_out_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          )}

          <div className="biometric-detail-col">
            <strong style={{ color: "#94a3b8" }}>Shift Hours:</strong>{" "}
            {(() => {
              const isActive = Boolean(today.check_in_time && !today.check_out_time);
              let totalMinutes = 0;
              if (isActive && today.check_in_time) {
                const diff = Math.max(0, Date.now() - new Date(today.check_in_time).getTime());
                totalMinutes = Math.floor(diff / 60000);
              } else {
                const hoursNum = Number(today.live_hours ?? today.total_hours ?? 0);
                totalMinutes = Math.round(hoursNum * 60);
              }
              const h = Math.floor(totalMinutes / 60);
              const m = totalMinutes % 60;
              const formattedDuration = h > 0 ? `${h}h ${m}m` : `${m}m`;
              return (
                <span style={{ color: "#34d399", fontWeight: "700" }}>
                  {formattedDuration} {isActive && "(Active)"}
                </span>
              );
            })()}
          </div>

          {today.check_in_location && (
            <div className="biometric-detail-col">
              <strong style={{ color: "#94a3b8" }}>Location:</strong>{" "}
              <span style={{ color: "#93c5fd", fontWeight: "600" }}>
                📍 {today.check_in_location}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Camera Face ID Modal (Laptop Webcam & Mobile Camera) */}
      {showCameraModal && (
        <div className="bio-camera-modal-overlay">
          <div className="bio-camera-modal">
            {/* Header */}
            <div className="bio-camera-modal-header">
              <div className="bio-camera-modal-title">
                {device.isLaptop ? <Laptop size={20} style={{ color: "#3b82f6" }} /> : <Camera size={20} style={{ color: "#10b981" }} />}
                <h3>
                  {cameraMode === "CHECK_IN"
                    ? device.isLaptop
                      ? "Laptop Webcam Face ID Check-In"
                      : "Face ID Attendance Check-In"
                    : cameraMode === "CHECK_OUT"
                    ? device.isLaptop
                      ? "Laptop Webcam Face ID Check-Out"
                      : "Face ID Attendance Check-Out"
                    : device.isLaptop
                    ? "Laptop Webcam Face ID Registration"
                    : "Face ID & Selfie Registration"}
                </h3>
              </div>
              <button type="button" className="bio-camera-close-btn" onClick={closeCamera}>
                <X size={20} />
              </button>
            </div>

            <p className="bio-camera-desc">
              {cameraMode === "CHECK_IN"
                ? "Align your face inside the frame and capture your live photo to mark check-in (Within 100m of office)."
                : cameraMode === "CHECK_OUT"
                ? "Align your face inside the frame and capture your live photo to mark check-out (Within 100m of office)."
                : "Align your face inside the frame. Your selfie snapshot will be sent to HR for verification & approval."}
            </p>

            {/* In-modal Geofence Status Banner */}
            <div
              className={`bio-camera-geofence-status ${
                locating
                  ? "checking"
                  : isWithinOffice
                  ? "valid"
                  : "invalid"
              }`}
            >
              <MapPin size={14} />
              {locating ? (
                <span>Checking office distance...</span>
              ) : isWithinOffice ? (
                <span>✓ Verified: Inside Office Premises ({Math.round(locationData?.distance || 0)}m • 100m Geofence OK)</span>
              ) : locationData?.distance != null ? (
                <span>⚠️ Out of Range: {Math.round(locationData.distance)}m away (Must be within 100m of office)</span>
              ) : (
                <span>{locationData?.location_name || "Location permission required"}</span>
              )}
            </div>

            {/* Video Stream / Photo Preview Container */}
            <div className="bio-camera-viewport">
              {!capturedPhoto ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="bio-camera-video"
                  />
                  {/* Oval Face Guide Overlay */}
                  <div className="bio-camera-oval-guide" />
                </>
              ) : (
                <img
                  src={capturedPhoto}
                  alt="Captured Selfie"
                  className="bio-camera-photo-preview"
                />
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="bio-camera-modal-footer">
              {!capturedPhoto ? (
                <button
                  type="button"
                  onClick={takeSelfie}
                  className="btn-bio-face-checkin"
                  style={{ flex: 1 }}
                >
                  <Camera size={18} /> Capture Face Photo
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => openCamera(cameraMode)}
                    disabled={actionLoading}
                    className="btn-bio-secondary"
                  >
                    <RefreshCw size={16} /> Retake
                  </button>
                  <button
                    type="button"
                    onClick={
                      cameraMode === "CHECK_IN"
                        ? handleFaceCheckIn
                        : cameraMode === "CHECK_OUT"
                        ? handleFaceCheckOut
                        : submitFaceRegistration
                    }
                    disabled={actionLoading}
                    className="btn-bio-primary"
                    style={{ flex: 1 }}
                  >
                    <UserCheck size={18} />
                    {actionLoading
                      ? "Processing..."
                      : cameraMode === "CHECK_IN"
                      ? "Confirm Check-In (Face ID)"
                      : cameraMode === "CHECK_OUT"
                      ? "Confirm Check-Out (Face ID)"
                      : "Submit to HR for Approval"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Location Permission Re-Enable Modal (When user denied location & clicks Refresh / Check-In) */}
      {showLocationHelpModal && (
        <div
          className="bio-camera-modal-overlay"
          onClick={() => setShowLocationHelpModal(false)}
        >
          <div
            className="bio-camera-modal"
            style={{ maxWidth: "460px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bio-camera-modal-header">
              <div className="bio-camera-modal-title">
                <MapPin size={20} style={{ color: "#3b82f6" }} />
                <h3>Enable Location Access</h3>
              </div>
              <button
                type="button"
                className="bio-camera-close-btn"
                onClick={() => setShowLocationHelpModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <p className="bio-camera-desc" style={{ fontSize: "13.5px", color: "#e2e8f0" }}>
              {isLocationDenied ? (
                <>
                  Aapke browser me is site ke liye <strong>Location Access Denied / Blocked</strong> hai. Dobara location allow karne ke liye:
                </>
              ) : (
                <>
                  Aapke phone ya browser se <strong>GPS Location Signal</strong> nahi mil raha hai. Niche diye 3 points check karein:
                </>
              )}
            </p>

            <div
              style={{
                background: "rgba(37, 99, 235, 0.14)",
                border: "1px solid rgba(96, 165, 250, 0.35)",
                borderRadius: "12px",
                padding: "14px 16px",
                marginBottom: "18px",
                fontSize: "13px",
                color: "#dbeafe",
                lineHeight: 1.55,
              }}
            >
              {device.isLaptop ? (
                <ol style={{ margin: 0, paddingLeft: "18px" }}>
                  <li style={{ marginBottom: "6px" }}>
                    Browser ke upar URL bar ke left side me <strong>🔒 Lock / Tune icon</strong> par click karein.
                  </li>
                  <li style={{ marginBottom: "6px" }}>
                    <strong>Location</strong> ke samne <strong>Allow</strong> select karein (aur Windows Settings &rarr; Privacy &rarr; Location ON rakhein).
                  </li>
                  <li>
                    Neeche <strong>&ldquo;Location Allow Kar Diya — Retry Now&rdquo;</strong> button dabayein.
                  </li>
                </ol>
              ) : device.isIPhone ? (
                <ol style={{ margin: 0, paddingLeft: "18px" }}>
                  <li style={{ marginBottom: "6px" }}>
                    <strong>iPhone Settings &rarr; Privacy &amp; Security &rarr; Location Services</strong> ko <strong>ON</strong> karein, aur <strong>Safari Websites &rarr; While Using the App</strong> (+ Precise Location ON) select karein.
                  </li>
                  <li style={{ marginBottom: "6px" }}>
                    Safari address bar me <strong>aA</strong> ya Site Settings icon par tap karein &rarr; <strong>Website Settings</strong> &rarr; <strong>Location: Allow</strong> karein.
                  </li>
                  <li>
                    Neeche <strong>&ldquo;Location Allow Kar Diya — Retry Now&rdquo;</strong> par tap karein.
                  </li>
                </ol>
              ) : (
                <ol style={{ margin: 0, paddingLeft: "18px" }}>
                  <li style={{ marginBottom: "6px" }}>
                    <strong>Step 1 (Sabse Zaroori):</strong> Phone ke upar से <strong>Notification Bar (Quick Settings)</strong> niche swipe karein aur <strong>Location / GPS (📍)</strong> button ko <strong>ON</strong> karein.
                  </li>
                  <li style={{ marginBottom: "6px" }}>
                    <strong>Step 2 (Chrome App Permission):</strong> Phone <strong>Settings &rarr; Apps &rarr; Chrome &rarr; Permissions &rarr; Location</strong> me jakar <strong>&ldquo;Allow only while using the app&rdquo;</strong> aur <strong>&ldquo;Use precise location&rdquo;</strong> ON karein.
                  </li>
                  <li style={{ marginBottom: "6px" }}>
                    <strong>Step 3 (Website Permission):</strong> Browser URL bar ke left me <strong>🔒 Lock / Tune icon &rarr; Permissions &rarr; Location: Allow</strong> rakhein.
                  </li>
                  <li>
                    Ab neeche <strong>&ldquo;Location Allow Kar Diya — Retry Now&rdquo;</strong> par tap karein.
                  </li>
                </ol>
              )}
            </div>

            <div className="bio-camera-modal-footer" style={{ flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn-bio-secondary"
                onClick={() => window.location.reload()}
                style={{ flex: 1 }}
              >
                <RefreshCw size={15} /> Reload &amp; Ask Again
              </button>
              <button
                type="button"
                className="btn-bio-primary"
                disabled={locating}
                onClick={() => refreshLocation(true)}
                style={{ flex: 1.4 }}
              >
                <MapPin size={16} />
                {locating ? "Checking..." : "Location Allow Kar Diya — Retry Now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileBiometricAttendance;
