import React from "react";
import { Wrench, ShieldAlert, ArrowRight, Fingerprint, Clock, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo/dizitaladda-logo.png";

const UnderMaintenance = ({ currentPath = "" }) => {
  const navigate = useNavigate();

  const handleGoToAttendance = () => {
    if (window.location.pathname.startsWith("/employee")) {
      navigate("/employee/my-attendance");
    } else {
      navigate("/my-attendance");
    }
  };

  return (
    <div
      style={{
        minHeight: "75vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "540px",
          width: "100%",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          borderRadius: "24px",
          padding: "40px 32px",
          color: "#ffffff",
          textAlign: "center",
          boxShadow: "0 20px 40px -15px rgba(15, 23, 42, 0.4)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow effect */}
        <div
          style={{
            position: "absolute",
            top: "-50px",
            right: "-50px",
            width: "150px",
            height: "150px",
            background: "rgba(245, 158, 11, 0.15)",
            borderRadius: "50%",
            filter: "blur(40px)",
            pointerEvents: "none",
          }}
        />

        {/* Logo */}
        <div style={{ marginBottom: "24px" }}>
          <img src={logo} alt="DizitalAdda" style={{ height: "40px", filter: "brightness(0) invert(1)" }} />
        </div>

        {/* Maintenance Badge */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(245, 158, 11, 0.2)", color: "#fbbf24", padding: "6px 16px", borderRadius: "20px", fontSize: "13px", fontWeight: "600", border: "1px solid rgba(245, 158, 11, 0.3)", marginBottom: "20px" }}>
          <Wrench size={16} /> Section Under Maintenance
        </div>

        {/* Title & Description */}
        <h1 style={{ fontSize: "24px", fontWeight: "800", margin: "0 0 12px 0", color: "#ffffff" }}>
          System Under Upgrade & Maintenance
        </h1>

        <p style={{ color: "#94a3b8", fontSize: "14.5px", lineHeight: "1.6", margin: "0 0 28px 0" }}>
          This page is currently undergoing scheduled system updates and maintenance. <strong style={{ color: "#38bdf8" }}>Attendance marking (Check-In / Check-Out) is fully active and accessible.</strong>
        </p>

        {/* Attendance Action Box */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            borderRadius: "16px",
            padding: "20px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            marginBottom: "28px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "12px" }}>
            <Fingerprint size={22} style={{ color: "#34d399" }} />
            <span style={{ fontWeight: "700", fontSize: "16px", color: "#34d399" }}>
              Mobile & Face ID Attendance Active
            </span>
          </div>
          <p style={{ margin: "0 0 16px 0", color: "#cbd5e1", fontSize: "13px" }}>
            Mark your daily check-in / check-out with live GPS location & selfie verification.
          </p>

          <button
            onClick={handleGoToAttendance}
            style={{
              width: "100%",
              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              color: "#ffffff",
              border: "none",
              padding: "13px 20px",
              borderRadius: "12px",
              fontWeight: "700",
              fontSize: "14.5px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
            }}
          >
            <Fingerprint size={18} /> Mark Attendance Now <ArrowRight size={18} />
          </button>
        </div>

        {/* Footer info */}
        <div style={{ color: "#64748b", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
          <Lock size={12} /> Dizital Adda CRM — System Maintenance Control
        </div>
      </div>
    </div>
  );
};

export default UnderMaintenance;
