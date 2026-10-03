import React from "react";
import { Wrench, Fingerprint, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const UnderMaintenance = ({ moduleName = "System Module" }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role || "";
  const isHR = ["HR", "ADMIN", "SUPER_ADMIN"].includes(role);

  const handleGoToAttendance = () => {
    if (isHR) {
      navigate("/attendance-reports");
    } else if (["EMPLOYEE", "COUNSELLOR", "TL", "TRAINER", "INTERN"].includes(role)) {
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
          background: "#ffffff",
          borderRadius: "20px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.08)",
          padding: "40px",
          maxWidth: "560px",
          width: "100%",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            background: "#fff7ed",
            color: "#ea580c",
            border: "2px solid #ffedd5",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "20px",
          }}
        >
          <Wrench size={36} />
        </div>

        <div
          style={{
            display: "inline-block",
            background: "#fef3c7",
            color: "#b45309",
            padding: "4px 14px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "700",
            marginBottom: "12px",
          }}
        >
          🛠️ SYSTEM SCHEDULED MAINTENANCE
        </div>

        <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a", margin: "0 0 10px 0" }}>
          {moduleName} Under Maintenance
        </h2>

        <p style={{ color: "#64748b", fontSize: "14.5px", lineHeight: "1.6", margin: "0 0 28px 0" }}>
          This portal section is currently undergoing system upgrade & maintenance.
          <br />
          <strong style={{ color: "#1e293b" }}>Mobile Biometric Attendance</strong> module is active and available for daily check-in & check-out.
        </p>

        <div style={{ background: "#f8fafc", borderRadius: "14px", padding: "18px", border: "1px dashed #cbd5e1", marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "#166534", fontWeight: "700", fontSize: "14px" }}>
            <Fingerprint size={20} /> Biometric Attendance Active
          </div>
          <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "4px" }}>
            Use phone/desktop biometric & live GPS location to mark attendance.
          </div>
        </div>

        <button
          onClick={handleGoToAttendance}
          style={{
            background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
            color: "#ffffff",
            border: "none",
            padding: "14px 28px",
            borderRadius: "12px",
            fontWeight: "700",
            fontSize: "15px",
            cursor: "pointer",
            width: "100%",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            boxShadow: "0 10px 20px -5px rgba(37, 99, 235, 0.4)",
          }}
        >
          <Fingerprint size={18} /> Open Biometric Attendance <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default UnderMaintenance;
