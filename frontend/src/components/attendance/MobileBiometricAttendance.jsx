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
import AttendanceFaceCapture from "./AttendanceFaceCapture";
import { calculateLateArrival, format12hTime } from "../../utils/shiftTiming";
import "./MobileBiometricAttendance.css";

// 100% In-House Geofence Protection - Strict 100 Meters Office Radius
const OFFICE_LAT = 28.54175;
const OFFICE_LNG = 77.240611111;
const MAX_GEOFENCE_RADIUS_METERS = 100;

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
  const isMobile = isIPhone || isAndroid || /webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  return {
    isLaptop: !isMobile,
    isIPhone,
    isAndroid,
    name: !isMobile ? "Laptop / Desktop" : isIPhone ? "iPhone / iPad" : "Mobile Phone",
  };
};

/**
 * Multi-tier Geolocation fetcher:
 * Supports laptops (Windows/Mac Wi-Fi positioning) and mobile phones (GPS)
 */
export const getGPSLocation = () => {
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

    const device = checkDeviceType();

    const processPosition = (position) => {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      const distance = calculateDistanceInMeters(latitude, longitude);

      const location_name =
        distance <= MAX_GEOFENCE_RADIUS_METERS
          ? "Dizital Adda Office Premises"
          : `Outside Office (${Math.round(distance)}m away)`;

      resolve({
        latitude,
        longitude,
        location_name,
        distance,
        accuracy: position.coords.accuracy,
      });
    };

    // Attempt 1: High Accuracy (fast for GPS, quick timeout for laptops)
    navigator.geolocation.getCurrentPosition(
      processPosition,
      (firstErr) => {
        // If user explicitly denied permission (code 1), do NOT retry
        if (firstErr.code === 1) {
          return resolve({
            latitude: null,
            longitude: null,
            location_name: "Location Permission Denied",
            distance: null,
            error_code: 1,
            error_msg: firstErr.message,
          });
        }

        // On laptops/desktops without GPS chips, high-accuracy often times out (code 3)
        // or is unavailable (code 2). Immediately fallback to Wi-Fi network positioning!
        navigator.geolocation.getCurrentPosition(
          processPosition,
          (secondErr) => {
            console.warn("Geolocation fallback failed:", secondErr);
            resolve({
              latitude: null,
              longitude: null,
              location_name:
                secondErr.code === 1
                  ? "Location Permission Denied"
                  : "GPS Location Unavailable / Timed Out",
              distance: null,
              error_code: secondErr.code,
              error_msg: secondErr.message,
            });
          },
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 30000 }
        );
      },
      { enableHighAccuracy: true, timeout: device.isLaptop ? 5000 : 10000, maximumAge: 0 }
    );
  });
};

const MobileBiometricAttendance = ({ onCheckInSuccess }) => {
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [locationData, setLocationData] = useState(null);
  const [locating, setLocating] = useState(false);
  const [faceConsentChecked, setFaceConsentChecked] = useState(false);
  const [faceCaptureRequest, setFaceCaptureRequest] = useState(null);

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

  const refreshLocation = async () => {
    try {
      setLocating(true);
      const loc = await getGPSLocation();
      setLocationData(loc);
    } catch (err) {
      console.warn("Failed to refresh location:", err);
    } finally {
      setLocating(false);
    }
  };

  useEffect(() => {
    loadStatus();
    refreshLocation();
  }, []);

  useEffect(() => {
    if (!device.isLaptop || typeof navigator === "undefined" || !navigator.geolocation) return undefined;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const distance = calculateDistanceInMeters(latitude, longitude);
        setLocationData({
          latitude,
          longitude,
          distance,
          accuracy,
          location_name:
            distance <= MAX_GEOFENCE_RADIUS_METERS
              ? "Dizital Adda Office Premises"
              : `Outside Office (${Math.round(distance)}m away)`,
        });
      },
      (error) => {
        console.warn("Laptop location watch failed:", error);
        setLocationData({
          latitude: null,
          longitude: null,
          location_name:
            error.code === 1 ? "Location Permission Denied" : "GPS Location Unavailable / Timed Out",
          distance: null,
          error_code: error.code,
          error_msg: error.message,
        });
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 5000 }
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
      if (loc?.error_code === 1) {
        if (device.isLaptop) {
          toast.error(
            "📍 Laptop Location Blocked! Click the lock/tune icon 🔒 in your browser URL bar (top left), set Location to 'Allow', and refresh. Also ensure Windows Location is turned ON in Windows Settings.",
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
            : "📍 GPS Location Unavailable! Please turn ON high accuracy GPS on your phone.",
          { duration: 6000 }
        );
      }
      return false;
    }

    const distance =
      loc.distance != null
        ? loc.distance
        : calculateDistanceInMeters(Number(loc.latitude), Number(loc.longitude));

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

      const loc = await getGPSLocation();
      setLocationData(loc);

      if (!validateGPSLocation(loc)) {
        return;
      }

      const credentialId = "FACE_ID_CHECKIN_" + Date.now();
      const res = await checkInAttendance({
        credentialId,
        latitude: loc.latitude,
        longitude: loc.longitude,
        location_name: loc.location_name,
        faceImage: capturedPhoto,
      });

      toast.success(
        `Face ID Attendance Checked-In! 📍 ${loc.location_name} (${Math.round(loc.distance || 0)}m)`
      );
      closeCamera();
      await loadStatus();
      if (onCheckInSuccess) onCheckInSuccess(res?.data);
    } catch (err) {
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

      const loc = await getGPSLocation();
      setLocationData(loc);

      if (!validateGPSLocation(loc)) {
        return;
      }

      await checkOutAttendance({
        latitude: loc.latitude,
        longitude: loc.longitude,
        location_name: loc.location_name,
        faceImage: capturedPhoto,
      });

      toast.success(
        `Face ID Check-Out Marked! 📍 ${loc.location_name} (${Math.round(loc.distance || 0)}m)`
      );
      closeCamera();
      await loadStatus();
    } catch (err) {
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
        if (captureRequest.purpose === "check-in" && onCheckInSuccess) {
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
      const loc = await getGPSLocation();
      setLocationData(loc);
      if (!validateGPSLocation(loc)) {
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
        location_name: loc.location_name,
        ...(assertion ? { assertion } : {}),
      };
      const result = await checkInAttendance(attendancePayload);
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
      await showBiometricActionError(err, "Failed to mark check-in.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setActionLoading(true);

      const loc = await getGPSLocation();
      setLocationData(loc);
      if (!validateGPSLocation(loc)) {
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
        location_name: loc.location_name,
        ...(assertion ? { assertion } : {}),
      };
      await checkOutAttendance(attendancePayload);
      toast.dismiss("biometric-auth");
      toast.success(
        statusData?.passkey_required === false
          ? `Check-out marked at 📍 ${loc.location_name}`
          : `Passkey verified. Check-out marked at 📍 ${loc.location_name}`
      );
      await loadStatus();
    } catch (err) {
      toast.dismiss("biometric-auth");
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
  const laptopAttendanceAllowed = Boolean(statusData?.laptop_attendance_enabled);
  const attendanceActionDisabled = actionLoading || !isWithinOffice;

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
              isWithinOffice ? (
                <span className="biometric-pill biometric-pill-geofence-ok" title="Within 100 meters of office location">
                  <MapPin size={12} /> Office Premises ({Math.round(locationData.distance)}m • Within 100m)
                </span>
              ) : (
                <span
                  className="biometric-pill biometric-pill-geofence-outside"
                  title="Attendance can only be marked within 100m of office location"
                >
                  <AlertTriangle size={12} /> Outside Office ({Math.round(locationData.distance)}m away • 100m Req)
                </span>
              )
            ) : (
              <span className="biometric-pill biometric-pill-geofence-loading" title={locationData?.location_name}>
                <MapPin size={12} /> {locationData?.location_name || "Detecting GPS..."}
              </span>
            )}

            {/* Fast Location Refresh button */}
            <button
              type="button"
              className="btn-loc-refresh"
              onClick={refreshLocation}
              disabled={locating}
              title="Re-verify GPS location distance"
            >
              <RefreshCw size={11} className={locating ? "spin-anim" : ""} /> Refresh
            </button>
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
          ) : device.isLaptop && !laptopAttendanceAllowed ? (
            <div className="btn-bio-pending" role="status">
              <Laptop size={16} /> Laptop attendance is not enabled for your account. Please contact HR.
            </div>
          ) : !today?.check_in_time ? (
            <button
              type="button"
              className="btn-bio-secondary"
              onClick={handleCheckIn}
              disabled={attendanceActionDisabled}
              title={device.isLaptop && !isWithinOffice ? "Attendance is available only within 100m of the office." : undefined}
            >
              {passkeyRequired ? <ScanFace size={16} /> : <MapPin size={16} />}
              {passkeyRequired ? "Check-In with Passkey" : "Check In"}
            </button>
          ) : !today?.check_out_time ? (
            <button
              type="button"
              className="btn-bio-secondary"
              onClick={handleCheckOut}
              disabled={attendanceActionDisabled}
              title={device.isLaptop && !isWithinOffice ? "Attendance is available only within 100m of the office." : undefined}
            >
              {passkeyRequired ? <ScanFace size={16} /> : <MapPin size={16} />}
              {passkeyRequired ? "Check-Out with Passkey" : "Check Out"}
            </button>
          ) : (
            <div className="btn-bio-complete">
              {(() => {
                const totalMinutes = Math.round(Number(today.total_hours || 0) * 60);
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
    </div>
  );
};

export default MobileBiometricAttendance;
