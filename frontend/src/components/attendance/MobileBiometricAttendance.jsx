import React, { useState, useEffect, useRef } from "react";
import {
  Fingerprint,
  CheckCircle2,
  Lock,
  Clock,
  LogOut,
  Smartphone,
  MapPin,
  Globe,
  Camera,
  AlertTriangle,
  X,
  RefreshCw,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getBiometricStatus,
  registerBiometricCredential,
  checkInAttendance,
  checkOutAttendance,
} from "../../services/attendanceService";
import { useAuth } from "../../context/AuthContext";
import { calculateLateArrival, format12hTime } from "../../utils/shiftTiming";

// 100% In-House Geofence Protection - Zero external 3rd-party calls
const OFFICE_LAT = 28.541778;
const OFFICE_LNG = 77.240750;
const MAX_GEOFENCE_RADIUS_METERS = 100;

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

const getGPSLocation = () => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      return resolve({ latitude: null, longitude: null, location_name: "Location Not Supported", distance: null });
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const distance = calculateDistanceInMeters(latitude, longitude);

        // 100% In-house local label - no coordinates sent to OpenStreetMap or any external servers
        const location_name =
          distance <= MAX_GEOFENCE_RADIUS_METERS
            ? "Dizital Adda Office Premises"
            : `Outside Office (${Math.round(distance)}m away)`;

        resolve({ latitude, longitude, location_name, distance });
      },
      (error) => {
        console.warn("GPS Location Error:", error.message);
        resolve({ latitude: null, longitude: null, location_name: "GPS Location Denied / Unavailable", distance: null });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
};

const parseCredentialId = (credId) => {
  if (!credId || typeof credId !== "string") return null;
  if (credId.startsWith("FACE_ID") || credId.startsWith("WEBAUTHN_")) return null;
  try {
    let b64 = credId.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      arr[i] = bin.charCodeAt(i);
    }
    return arr;
  } catch (e) {
    return null;
  }
};

const MobileBiometricAttendance = ({ onCheckInSuccess }) => {
  const { user } = useAuth();
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState("");

  // Camera Selfie State for Face ID
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraMode, setCameraMode] = useState("CHECK_IN"); // "CHECK_IN" | "CHECK_OUT" | "REGISTRATION"
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);

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

  useEffect(() => {
    loadStatus();
    getGPSLocation().then((loc) => {
      if (loc && loc.location_name) {
        setLocationStatus(loc.location_name);
      }
    });
  }, []);

  // Ensure stream is properly attached to <video> ref when modal opens (critical for iOS Safari / iPhone)
  useEffect(() => {
    if (showCameraModal && !capturedPhoto && mediaStreamRef.current && videoRef.current) {
      videoRef.current.srcObject = mediaStreamRef.current;
      videoRef.current.play().catch((e) => console.log("Video playback catch on iOS:", e));
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
        // Ideal user-facing camera constraint for iPhone & iOS Safari
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "user" } },
          audio: false,
        });
      } catch (e1) {
        console.warn("Fallback basic video constraint for iOS:", e1);
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
      toast.error("Camera access required for Face ID selfie capture. Please allow camera permissions in iPhone Settings -> Safari -> Camera.");
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

    // Scale down to max 480px to keep payload ultra-lightweight (~50KB) and prevent 413 request entity too large
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
    ctx.drawImage(video, 0, 0, targetW, targetH);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.70);
    setCapturedPhoto(dataUrl);

    // Stop video stream after capture
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }
  };

  const submitFaceRegistration = async () => {
    if (!capturedPhoto) {
      toast.error("Please capture your face photo first.");
      return;
    }

    try {
      setActionLoading(true);

      const credentialId = "FACE_ID_MOBILE_" + Date.now();
      const publicKey = "FIDO2_FACE_KEY_" + Math.random().toString(36).substring(7);

      const res = await registerBiometricCredential({
        credentialId,
        publicKey,
        faceImage: capturedPhoto,
        deviceInfo: navigator.userAgent.includes("iPhone")
          ? "iPhone / iOS Face ID"
          : navigator.userAgent.includes("Mobile")
          ? "Mobile Face ID"
          : "Desktop Face Camera",
      });

      toast.success("Face Biometric selfie captured successfully & sent to HR for approval! 📸");
      closeCamera();
      await loadStatus();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to register face biometric.";
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegisterFingerprint = async () => {
    if (!window.isSecureContext) {
      toast.error("Biometric registration requires a secure connection (localhost or HTTPS).");
      return;
    }

    if (!window.PublicKeyCredential) {
      toast.error("Fingerprint scanner / Biometric is not supported on this device/browser.");
      return;
    }

    try {
      setActionLoading(true);
      toast.loading("Touch your fingerprint sensor to register...", { id: "biometric-reg" });

      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const userIdStr = String(user?.id || user?.email || "emp-" + Date.now());
      const userBytes = new TextEncoder().encode(userIdStr);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: challenge,
          rp: {
            name: "Dizital Adda Biometric Attendance",
            id: window.location.hostname,
          },
          user: {
            id: userBytes,
            name: user?.email || "employee@dizitaladda.com",
            displayName: user?.full_name || "Employee",
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 },  // ES256
            { type: "public-key", alg: -257 }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform", // Strictly built-in fingerprint / Touch ID / Windows Hello
            userVerification: "required",        // Strictly requires biometric touch
            residentKey: "preferred",
            requireResidentKey: false,
          },
          timeout: 60000,
          attestation: "none",
        },
      });

      toast.dismiss("biometric-reg");

      if (!credential || !credential.id) {
        toast.error("Failed to capture fingerprint credential from sensor.");
        return;
      }

      try {
        localStorage.setItem("dizitaladda_biometric_cred_id", credential.id);
      } catch (e) {}

      await registerBiometricCredential({
        credentialId: credential.id,
        publicKey: "WEBAUTHN_PUBLIC_KEY",
        deviceInfo: navigator.userAgent.includes("Windows")
          ? "Windows Hello Fingerprint / Biometric"
          : navigator.userAgent.includes("iPhone")
          ? "iOS Touch ID / Face ID"
          : navigator.userAgent.includes("Android")
          ? "Android Biometric / Fingerprint"
          : "Device Biometric Authenticator",
      });

      toast.success("Fingerprint registered successfully and submitted for HR approval! 🖐️");
      await loadStatus();
    } catch (err) {
      toast.dismiss("biometric-reg");
      console.error("Biometric registration error:", err);
      if (err.name === "NotAllowedError") {
        toast.error("Fingerprint registration cancelled or timed out.");
      } else {
        toast.error(err.response?.data?.message || err.message || "Failed to register fingerprint.");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const validateGPSLocation = (locationData) => {
    if (
      !locationData ||
      !locationData.latitude ||
      !locationData.longitude ||
      !locationData.location_name ||
      locationData.location_name.includes("Denied") ||
      locationData.location_name.includes("Unavailable") ||
      locationData.location_name.includes("Not Supported")
    ) {
      toast.error("📍 Device Location OFF or Permission Denied! Attendance cannot be marked. Please turn ON Location in iPhone Settings -> Privacy -> Location Services.");
      return false;
    }

    const distance = locationData.distance != null 
      ? locationData.distance 
      : calculateDistanceInMeters(Number(locationData.latitude), Number(locationData.longitude));

    if (distance > MAX_GEOFENCE_RADIUS_METERS) {
      toast.error(
        `📍 Out of Office Geofence Range! You are ${Math.round(distance)}m away from office premises. Attendance can only be marked within 100 meters of office location.`
      );
      return false;
    }

    return true;
  };

  const handleFaceCheckIn = async () => {
    if (!capturedPhoto) {
      toast.error("Please capture your selfie photo first.");
      return;
    }
    try {
      setActionLoading(true);
      setLocationStatus("Fetching exact GPS location...");

      const locationData = await getGPSLocation();
      setLocationStatus(locationData.location_name);

      if (!validateGPSLocation(locationData)) {
        return;
      }

      const credentialId = "FACE_ID_CHECKIN_" + Date.now();
      const res = await checkInAttendance({
        credentialId,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        location_name: locationData.location_name,
        faceImage: capturedPhoto,
      });

      toast.success(`Face ID Attendance Marked! 📍 ${locationData.location_name}`);
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
      toast.error("Please capture your selfie photo first.");
      return;
    }
    try {
      setActionLoading(true);
      setLocationStatus("Fetching exact GPS location...");

      const locationData = await getGPSLocation();
      setLocationStatus(locationData.location_name);

      if (!validateGPSLocation(locationData)) {
        return;
      }

      const res = await checkOutAttendance({
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        location_name: locationData.location_name,
        faceImage: capturedPhoto,
      });

      toast.success(`Face ID Check-Out Marked! 📍 ${locationData.location_name}`);
      closeCamera();
      await loadStatus();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to mark Face ID check-out.";
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      setActionLoading(true);

      // 1. Mandatory Biometric Hardware Scan: Pop up device fingerprint scanner!
      let credentialId = null;
      if (window.isSecureContext && window.PublicKeyCredential) {
        toast.loading("Touch your fingerprint sensor to verify attendance...", { id: "biometric-auth" });
        try {
          const challenge = new Uint8Array(32);
          window.crypto.getRandomValues(challenge);

          const storedCredId = statusData?.credential_id || localStorage.getItem("dizitaladda_biometric_cred_id");
          const credBuffer = parseCredentialId(storedCredId);

          const getOptions = {
            publicKey: {
              challenge: challenge,
              rpId: window.location.hostname,
              userVerification: "required", // Strictly prompts Windows Hello / Touch ID / Fingerprint sensor!
              timeout: 60000,
              ...(credBuffer
                ? {
                    allowCredentials: [
                      {
                        type: "public-key",
                        id: credBuffer,
                        transports: ["internal"],
                      },
                    ],
                  }
                : {}),
            },
          };

          const assertion = await navigator.credentials.get(getOptions);

          toast.dismiss("biometric-auth");
          if (!assertion || !assertion.id) {
            toast.error("Fingerprint scan failed. Please touch the sensor again.");
            return;
          }
          credentialId = assertion.id;
        } catch (authErr) {
          toast.dismiss("biometric-auth");
          console.error("Biometric verification error:", authErr);
          if (authErr.name === "NotAllowedError") {
            toast.error("Fingerprint verification cancelled or not detected. You must place your finger on the sensor to mark attendance!");
          } else {
            toast.error(`Fingerprint Scan Error: ${authErr.message || "Device fingerprint not verified"}`);
          }
          return; // Strictly stop: do NOT mark attendance without fingerprint scan!
        }
      } else {
        toast.error("Biometric fingerprint sensor is not supported on this browser or requires localhost / HTTPS.");
        return;
      }

      // 2. Fetch GPS Location
      setLocationStatus("Fetching exact GPS location...");
      const locationData = await getGPSLocation();
      setLocationStatus(locationData.location_name);

      if (!validateGPSLocation(locationData)) {
        return;
      }

      // 3. Mark check-in in DB
      const res = await checkInAttendance({
        credentialId: credentialId || "WEBAUTHN_VERIFIED_" + Date.now(),
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        location_name: locationData.location_name,
      });

      toast.success(`Fingerprint Verified! Check-In marked at 📍 ${locationData.location_name}`);
      await loadStatus();
      if (onCheckInSuccess) onCheckInSuccess(res?.data);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to mark check-in.";
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setActionLoading(true);

      // 1. Mandatory Biometric Hardware Scan: Pop up device fingerprint scanner!
      if (window.isSecureContext && window.PublicKeyCredential) {
        toast.loading("Touch your fingerprint sensor to verify check-out...", { id: "biometric-auth" });
        try {
          const challenge = new Uint8Array(32);
          window.crypto.getRandomValues(challenge);

          const storedCredId = statusData?.credential_id || localStorage.getItem("dizitaladda_biometric_cred_id");
          const credBuffer = parseCredentialId(storedCredId);

          const getOptions = {
            publicKey: {
              challenge: challenge,
              rpId: window.location.hostname,
              userVerification: "required", // Strictly prompts Windows Hello / Touch ID / Fingerprint sensor!
              timeout: 60000,
              ...(credBuffer
                ? {
                    allowCredentials: [
                      {
                        type: "public-key",
                        id: credBuffer,
                        transports: ["internal"],
                      },
                    ],
                  }
                : {}),
            },
          };

          const assertion = await navigator.credentials.get(getOptions);

          toast.dismiss("biometric-auth");
          if (!assertion || !assertion.id) {
            toast.error("Fingerprint scan failed. Please touch the sensor again.");
            return;
          }
        } catch (authErr) {
          toast.dismiss("biometric-auth");
          console.error("Biometric verification error:", authErr);
          if (authErr.name === "NotAllowedError") {
            toast.error("Fingerprint verification cancelled or not detected. Fingerprint is required to check-out!");
          } else {
            toast.error(`Fingerprint Scan Error: ${authErr.message || "Device fingerprint not verified"}`);
          }
          return; // Strictly stop!
        }
      } else {
        toast.error("Biometric fingerprint sensor is not supported on this browser or requires localhost / HTTPS.");
        return;
      }

      // 2. Fetch GPS Location
      setLocationStatus("Fetching exact GPS location...");
      const locationData = await getGPSLocation();
      setLocationStatus(locationData.location_name);

      if (!validateGPSLocation(locationData)) {
        return;
      }

      // 3. Mark check-out in DB
      const res = await checkOutAttendance({
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        location_name: locationData.location_name,
      });

      toast.success(`Fingerprint Verified! Check-Out marked at 📍 ${locationData.location_name}`);
      await loadStatus();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to check out.";
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const today = statusData?.today_attendance;
  const approvalStatus = statusData?.approval_status || (statusData?.is_registered ? "APPROVED" : "NOT_REGISTERED");

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
        borderRadius: "16px",
        padding: "24px",
        color: "#ffffff",
        marginBottom: "24px",
        boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.25)",
        position: "relative",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        overflowX: "hidden",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        {/* Title & Status */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
            <span
              style={{
                background: "rgba(59, 130, 246, 0.2)",
                color: "#60a5fa",
                padding: "4px 12px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: "600",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                border: "1px solid rgba(96, 165, 250, 0.3)",
              }}
            >
              <Smartphone size={14} /> iPhone & Mobile Face ID / Fingerprint
            </span>

            {approvalStatus === "APPROVED" && (
              <span
                style={{
                  background: "rgba(16, 185, 129, 0.2)",
                  color: "#34d399",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: "600",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  border: "1px solid rgba(52, 211, 153, 0.3)",
                }}
              >
                <ShieldCheck size={14} /> Face ID HR Approved
              </span>
            )}

            {approvalStatus === "PENDING_APPROVAL" && (
              <span
                style={{
                  background: "rgba(245, 158, 11, 0.2)",
                  color: "#fbbf24",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: "600",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                }}
              >
                <Clock size={14} /> Pending HR Approval
              </span>
            )}

            {approvalStatus === "REJECTED" && (
              <span
                style={{
                  background: "rgba(239, 68, 68, 0.2)",
                  color: "#f87171",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: "600",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                }}
              >
                <AlertTriangle size={14} /> Face ID Rejected by HR
              </span>
            )}
          </div>

          <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "700" }}>
            {today?.check_in_time
              ? today.check_out_time
                ? "Attendance Marked & Completed Today"
                : "Checked-In (Shift Active)"
              : "Mark Daily Mobile Attendance"}
          </h2>
          <p style={{ margin: "6px 0 0 0", color: "#94a3b8", fontSize: "13px" }}>
            {statusData?.shift_timing_type === "CUSTOM"
              ? `Your Assigned Shift: ${format12hTime(statusData.shift_start_time || "10:00")} - ${format12hTime(statusData.shift_end_time || "18:00")} (Custom Schedule)`
              : "Office Timings: Mon-Fri (10:00 AM - 6:00 PM), Sat (9:30 AM - 5:30 PM), Sun (9:30 AM - 2:00 PM)"}
          </p>
        </div>

        {/* Action Buttons: Both Fingerprint and Face ID supported after HR Approval */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {loading ? (
            <div style={{ color: "#94a3b8", fontSize: "14px" }}>Loading Status...</div>
          ) : approvalStatus === "NOT_REGISTERED" || approvalStatus === "REJECTED" ? (
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                onClick={handleRegisterFingerprint}
                disabled={actionLoading}
                style={{
                  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                  color: "#fff",
                  border: "none",
                  padding: "12px 18px",
                  borderRadius: "10px",
                  fontWeight: "700",
                  fontSize: "13.5px",
                  cursor: actionLoading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
                }}
              >
                <Fingerprint size={18} /> Register Fingerprint (Biometric Sensor)
              </button>

              <button
                onClick={() => openCamera("REGISTRATION")}
                disabled={actionLoading}
                style={{
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  color: "#fff",
                  border: "none",
                  padding: "12px 18px",
                  borderRadius: "10px",
                  fontWeight: "700",
                  fontSize: "13.5px",
                  cursor: actionLoading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 4px 14px rgba(16, 185, 129, 0.35)",
                }}
              >
                <Camera size={18} /> Register Face ID (Selfie Scan)
              </button>
            </div>
          ) : approvalStatus === "PENDING_APPROVAL" ? (
            <button
              onClick={() => openCamera("REGISTRATION")}
              style={{
                background: "rgba(245, 158, 11, 0.2)",
                border: "1px solid rgba(245, 158, 11, 0.4)",
                color: "#fbbf24",
                padding: "12px 20px",
                borderRadius: "10px",
                fontWeight: "700",
                fontSize: "13.5px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Clock size={16} /> Pending HR Approval — Re-capture Photo
            </button>
          ) : !today?.check_in_time ? (
            <>
              {/* Check-In Option 1: Fingerprint */}
              <button
                onClick={handleCheckIn}
                disabled={actionLoading}
                style={{
                  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                  color: "#fff",
                  border: "none",
                  padding: "12px 18px",
                  borderRadius: "10px",
                  fontWeight: "700",
                  fontSize: "13.5px",
                  cursor: actionLoading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
                }}
              >
                <Fingerprint size={18} /> {actionLoading ? "Fetching GPS..." : "Check-In (Fingerprint)"}
              </button>

              {/* Check-In Option 2: Face ID Scan */}
              <button
                onClick={() => openCamera("CHECK_IN")}
                disabled={actionLoading}
                style={{
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  color: "#fff",
                  border: "none",
                  padding: "12px 18px",
                  borderRadius: "10px",
                  fontWeight: "700",
                  fontSize: "13.5px",
                  cursor: actionLoading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 4px 14px rgba(16, 185, 129, 0.35)",
                }}
              >
                <Camera size={18} /> Check-In (Face ID)
              </button>

              <button
                type="button"
                onClick={handleRegisterFingerprint}
                title="Enroll or re-sync fingerprint on this computer or phone"
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.18)",
                  color: "#93c5fd",
                  padding: "11px 14px",
                  borderRadius: "10px",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Fingerprint size={15} /> Re-Enroll Fingerprint
              </button>
            </>
          ) : !today?.check_out_time ? (
            <>
              {/* Check-Out Option 1: Fingerprint */}
              <button
                onClick={handleCheckOut}
                disabled={actionLoading}
                style={{
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                  color: "#fff",
                  border: "none",
                  padding: "12px 18px",
                  borderRadius: "10px",
                  fontWeight: "700",
                  fontSize: "13.5px",
                  cursor: actionLoading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 4px 14px rgba(245, 158, 11, 0.35)",
                }}
              >
                <LogOut size={18} /> {actionLoading ? "Fetching GPS..." : "Check-Out (Fingerprint)"}
              </button>

              {/* Check-Out Option 2: Face ID Scan */}
              <button
                onClick={() => openCamera("CHECK_OUT")}
                disabled={actionLoading}
                style={{
                  background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
                  color: "#fff",
                  border: "none",
                  padding: "12px 18px",
                  borderRadius: "10px",
                  fontWeight: "700",
                  fontSize: "13.5px",
                  cursor: actionLoading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 4px 14px rgba(139, 92, 246, 0.35)",
                }}
              >
                <Camera size={18} /> Check-Out (Face ID)
              </button>

              <button
                type="button"
                onClick={handleRegisterFingerprint}
                title="Enroll or re-sync fingerprint on this computer or phone"
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.18)",
                  color: "#93c5fd",
                  padding: "11px 14px",
                  borderRadius: "10px",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Fingerprint size={15} /> Re-Enroll Fingerprint
              </button>
            </>
          ) : (
            <div
              style={{
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(52, 211, 153, 0.3)",
                color: "#34d399",
                padding: "10px 18px",
                borderRadius: "10px",
                fontWeight: "600",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
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
      </div>

      {/* Live Check-in Details Bar */}
      {today?.check_in_time && (
        <div
          style={{
            marginTop: "20px",
            paddingTop: "16px",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            gap: "24px",
            flexWrap: "wrap",
            fontSize: "13px",
            color: "#cbd5e1",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
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
            <div>
              <strong style={{ color: "#94a3b8" }}>Check-Out Time:</strong>{" "}
              <span style={{ color: "#fff", fontWeight: "600" }}>
                {new Date(today.check_out_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          )}

          <div>
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
        </div>
      )}

      {/* Camera Selfie Modal for iPhone & Mobile Face ID Registration */}
      {showCameraModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(6px)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            fontFamily: "Inter, sans-serif",
          }}
        >
          <div
            style={{
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "20px",
              padding: "24px",
              maxWidth: "460px",
              width: "100%",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              color: "#ffffff",
              position: "relative",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Camera size={20} style={{ color: "#10b981" }} />
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>
                  {cameraMode === "CHECK_IN"
                    ? "Face ID Attendance Check-In"
                    : cameraMode === "CHECK_OUT"
                    ? "Face ID Attendance Check-Out"
                    : "Face ID & Selfie Registration"}
                </h3>
              </div>
              <button
                onClick={closeCamera}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px" }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ color: "#94a3b8", fontSize: "13px", margin: "0 0 16px 0" }}>
              {cameraMode === "CHECK_IN"
                ? "Position your face inside the frame and capture your live selfie to mark check-in."
                : cameraMode === "CHECK_OUT"
                ? "Position your face inside the frame and capture your live selfie to mark check-out."
                : "Position your face inside the frame. Your selfie snapshot will be sent to HR for approval."}
            </p>

            {/* Video Stream / Photo Preview Container */}
            <div
              style={{
                position: "relative",
                width: "100%",
                height: "280px",
                background: "#020617",
                borderRadius: "14px",
                overflow: "hidden",
                border: "2px solid #3b82f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "20px",
              }}
            >
              {!capturedPhoto ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  {/* Oval Face Guide Overlay */}
                  <div
                    style={{
                      position: "absolute",
                      width: "180px",
                      height: "220px",
                      borderRadius: "50%",
                      border: "2px dashed #34d399",
                      boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.45)",
                      pointerEvents: "none",
                    }}
                  />
                </>
              ) : (
                <img
                  src={capturedPhoto}
                  alt="Captured Selfie"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              )}
            </div>

            {/* Modal Footer Controls */}
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              {!capturedPhoto ? (
                <button
                  onClick={takeSelfie}
                  style={{
                    flex: 1,
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    color: "#fff",
                    border: "none",
                    padding: "12px 18px",
                    borderRadius: "10px",
                    fontWeight: "700",
                    fontSize: "14px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <Camera size={18} /> Capture Selfie Photo
                </button>
              ) : (
                <>
                  <button
                    onClick={() => openCamera(cameraMode)}
                    disabled={actionLoading}
                    style={{
                      background: "#334155",
                      color: "#fff",
                      border: "none",
                      padding: "12px 16px",
                      borderRadius: "10px",
                      fontWeight: "600",
                      fontSize: "13.5px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <RefreshCw size={16} /> Retake
                  </button>
                  <button
                    onClick={
                      cameraMode === "CHECK_IN"
                        ? handleFaceCheckIn
                        : cameraMode === "CHECK_OUT"
                        ? handleFaceCheckOut
                        : submitFaceRegistration
                    }
                    disabled={actionLoading}
                    style={{
                      flex: 1,
                      background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                      color: "#fff",
                      border: "none",
                      padding: "12px 18px",
                      borderRadius: "10px",
                      fontWeight: "700",
                      fontSize: "14px",
                      cursor: actionLoading ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                  >
                    <UserCheck size={18} />{" "}
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
