import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  CheckCircle2,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  MapPin,
  ExternalLink,
  Navigation,
  RotateCcw,
  UserCheck,
  UserX,
  Camera,
  Smartphone,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import {
  getHRAttendanceReports,
  resetBiometricCredential,
  getPendingBiometricApprovals,
  approveBiometricRegistration,
  rejectBiometricRegistration,
} from "../../services/attendanceService";
import { calculateLateArrival } from "../../utils/shiftTiming";

const AttendanceReports = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const [activeTab, setActiveTab] = useState("REPORTS"); // "REPORTS" | "FACE_APPROVALS"
  const [approvalTab, setApprovalTab] = useState("PENDING"); // "PENDING" | "APPROVED" | "REJECTED" | "ALL"
  const [approvalSearch, setApprovalSearch] = useState("");
  const [reports, setReports] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvalsLoading, setApprovalsLoading] = useState(false);
  const [resettingId, setResettingId] = useState(null);
  const [actionId, setActionId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalRecords: 0 });

  const fetchPendingApprovals = async () => {
    try {
      setApprovalsLoading(true);
      const res = await getPendingBiometricApprovals();
      if (res?.data) {
        setPendingApprovals(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch pending biometric approvals:", err);
    } finally {
      setApprovalsLoading(false);
    }
  };

  const handleApproveFace = async (id, employeeName) => {
    try {
      setActionId(id);
      await approveBiometricRegistration(id);
      toast.success(`Face Biometric approved for ${employeeName}! They can now mark attendance.`);
      fetchPendingApprovals();
    } catch (err) {
      console.error("Failed to approve biometric:", err);
      toast.error(err.response?.data?.message || "Failed to approve face biometric.");
    } finally {
      setActionId(null);
    }
  };

  const handleRejectFace = async (id, employeeName) => {
    const reason = window.prompt(`Enter reason for rejecting Face Biometric for ${employeeName}:`, "Selfie photo unclear or face mismatch");
    if (reason === null) return;

    try {
      setActionId(id);
      await rejectBiometricRegistration(id, reason);
      toast.success(`Face Biometric rejected for ${employeeName}.`);
      fetchPendingApprovals();
    } catch (err) {
      console.error("Failed to reject biometric:", err);
      toast.error(err.response?.data?.message || "Failed to reject face biometric.");
    } finally {
      setActionId(null);
    }
  };

  const handleResetBiometric = async (employeeId, employeeName) => {
    if (!window.confirm(`Are you sure you want to reset biometric registration for ${employeeName}? They will be able to register a new biometric device on their next check-in.`)) {
      return;
    }

    try {
      setResettingId(employeeId);
      await resetBiometricCredential(employeeId);
      toast.success(`Biometric reset successfully for ${employeeName}.`);
      fetchReports();
      fetchPendingApprovals();
    } catch (err) {
      console.error("Failed to reset biometric:", err);
      toast.error(err.response?.data?.message || "Failed to reset biometric credential.");
    } finally {
      setResettingId(null);
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await getHRAttendanceReports({
        search: searchTerm,
        status: statusFilter,
        date_from: dateFrom,
        date_to: dateTo,
        page: pagination.page,
        limit: 15,
      });

      if (res?.data) {
        const list = res.data.attendance || [];
        setReports(list);
        const pag = res.data.pagination;
        if (pag) {
          setPagination({
            page: pag.page || 1,
            totalPages: pag.totalPages || 1,
            totalRecords: pag.totalRecords || list.length,
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch HR attendance reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    fetchPendingApprovals();
  }, [searchTerm, statusFilter, dateFrom, dateTo, pagination.page]);

  const pendingApprovalsList = pendingApprovals.filter(a => a.approval_status === "PENDING_APPROVAL");
  const approvedList = pendingApprovals.filter(a => a.approval_status === "APPROVED");
  const rejectedList = pendingApprovals.filter(a => a.approval_status === "REJECTED");
  const pendingCount = pendingApprovalsList.length;
  const approvedCount = approvedList.length;
  const rejectedCount = rejectedList.length;
  const totalApprovalsCount = pendingApprovals.length;

  const displayedApprovals = pendingApprovals.filter((item) => {
    if (approvalTab === "PENDING" && item.approval_status !== "PENDING_APPROVAL") return false;
    if (approvalTab === "APPROVED" && item.approval_status !== "APPROVED") return false;
    if (approvalTab === "REJECTED" && item.approval_status !== "REJECTED") return false;

    if (approvalSearch.trim()) {
      const q = approvalSearch.toLowerCase().trim();
      const matchName = item.employee_name?.toLowerCase().includes(q);
      const matchCode = item.employee_code?.toLowerCase().includes(q);
      const matchDept = item.department_name?.toLowerCase().includes(q);
      const matchDesig = item.designation?.toLowerCase().includes(q);
      return matchName || matchCode || matchDept || matchDesig;
    }
    return true;
  });

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      {/* Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          borderRadius: "16px",
          padding: "26px",
          color: "#ffffff",
          marginBottom: "24px",
          boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.25)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
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
                <ShieldCheck size={14} /> Super Admin Control
              </span>
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
                <Navigation size={13} /> GPS & Face ID Verified
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: "26px", fontWeight: "700" }}>
              Employee Attendance & Face Biometric Approval
            </h1>
            <p style={{ margin: "6px 0 0 0", color: "#94a3b8", fontSize: "14px" }}>
              Approve new iPhone FaceID / selfie registrations and track live daily GPS attendance check-ins.
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => { fetchReports(); fetchPendingApprovals(); }}
              style={{
                background: "#2563eb",
                color: "#fff",
                border: "none",
                padding: "10px 18px",
                borderRadius: "10px",
                fontWeight: "600",
                fontSize: "13.5px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
              }}
            >
              <RefreshCw size={16} className={loading || approvalsLoading ? "spin" : ""} /> Refresh Data
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: "flex", gap: "12px", marginTop: "24px", borderTop: "1px solid rgba(255, 255, 255, 0.1)", paddingTop: "18px" }}>
          <button
            onClick={() => setActiveTab("REPORTS")}
            style={{
              background: activeTab === "REPORTS" ? "#2563eb" : "rgba(255, 255, 255, 0.08)",
              color: activeTab === "REPORTS" ? "#ffffff" : "#94a3b8",
              border: "none",
              padding: "9px 18px",
              borderRadius: "10px",
              fontWeight: "700",
              fontSize: "13.5px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Calendar size={16} /> Daily Attendance Logs
          </button>

          <button
            onClick={() => setActiveTab("FACE_APPROVALS")}
            style={{
              background: activeTab === "FACE_APPROVALS" ? "#10b981" : "rgba(255, 255, 255, 0.08)",
              color: activeTab === "FACE_APPROVALS" ? "#ffffff" : "#94a3b8",
              border: "none",
              padding: "9px 18px",
              borderRadius: "10px",
              fontWeight: "700",
              fontSize: "13.5px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Camera size={16} /> Face Biometric HR Approvals
            {pendingCount > 0 && (
              <span style={{ background: "#ef4444", color: "#fff", fontSize: "11px", fontWeight: "800", padding: "2px 8px", borderRadius: "12px" }}>
                {pendingCount} Pending
              </span>
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: FACE BIOMETRIC HR APPROVALS */}
      {activeTab === "FACE_APPROVALS" ? (
        <div style={{ background: "#ffffff", borderRadius: "12px", padding: "24px", border: "1px solid #e2e8f0" }}>
          {/* Section Header & Sub-filter controls */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
            <div>
              <h3 style={{ margin: "0 0 6px 0", fontSize: "20px", fontWeight: "700", color: "#0f172a" }}>
                📸 {approvalTab === "PENDING"
                  ? `Pending Face Biometric Approvals (${pendingCount})`
                  : approvalTab === "APPROVED"
                  ? `Approved Face Biometrics (${approvedCount})`
                  : approvalTab === "REJECTED"
                  ? `Rejected Face Biometrics (${rejectedCount})`
                  : `All Face Biometric Registrations (${totalApprovalsCount})`}
              </h3>
              <p style={{ margin: 0, color: "#64748b", fontSize: "13.5px" }}>
                {approvalTab === "PENDING"
                  ? "Review employee selfie face photos captured during iPhone/mobile Face ID registration. Approve to allow them to mark attendance."
                  : approvalTab === "APPROVED"
                  ? "Employees with approved Face ID biometrics who are authorized to mark daily attendance."
                  : approvalTab === "REJECTED"
                  ? "Registrations that were rejected by HR. Employees cannot mark attendance until re-approved or reset."
                  : "Complete directory of all employee Face ID registrations and their current approval status."}
              </p>
            </div>

            {/* Sub-tab Filter Pills */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                onClick={() => setApprovalTab("PENDING")}
                style={{
                  padding: "8px 16px",
                  borderRadius: "20px",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  border: approvalTab === "PENDING" ? "2px solid #d97706" : "1px solid #e2e8f0",
                  background: approvalTab === "PENDING" ? "#fef3c7" : "#f8fafc",
                  color: approvalTab === "PENDING" ? "#b45309" : "#64748b",
                  transition: "all 0.15s ease",
                }}
              >
                ⏳ Pending Review
                <span
                  style={{
                    background: approvalTab === "PENDING" ? "#b45309" : "#cbd5e1",
                    color: "#fff",
                    borderRadius: "10px",
                    padding: "1px 7px",
                    fontSize: "11px",
                    fontWeight: "800",
                  }}
                >
                  {pendingCount}
                </span>
              </button>

              <button
                onClick={() => setApprovalTab("APPROVED")}
                style={{
                  padding: "8px 16px",
                  borderRadius: "20px",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  border: approvalTab === "APPROVED" ? "2px solid #16a34a" : "1px solid #e2e8f0",
                  background: approvalTab === "APPROVED" ? "#dcfce7" : "#f8fafc",
                  color: approvalTab === "APPROVED" ? "#15803d" : "#64748b",
                  transition: "all 0.15s ease",
                }}
              >
                ✅ Approved
                <span
                  style={{
                    background: approvalTab === "APPROVED" ? "#16a34a" : "#cbd5e1",
                    color: "#fff",
                    borderRadius: "10px",
                    padding: "1px 7px",
                    fontSize: "11px",
                    fontWeight: "800",
                  }}
                >
                  {approvedCount}
                </span>
              </button>

              <button
                onClick={() => setApprovalTab("REJECTED")}
                style={{
                  padding: "8px 16px",
                  borderRadius: "20px",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  border: approvalTab === "REJECTED" ? "2px solid #dc2626" : "1px solid #e2e8f0",
                  background: approvalTab === "REJECTED" ? "#fee2e2" : "#f8fafc",
                  color: approvalTab === "REJECTED" ? "#b91c1c" : "#64748b",
                  transition: "all 0.15s ease",
                }}
              >
                ❌ Rejected
                <span
                  style={{
                    background: approvalTab === "REJECTED" ? "#dc2626" : "#cbd5e1",
                    color: "#fff",
                    borderRadius: "10px",
                    padding: "1px 7px",
                    fontSize: "11px",
                    fontWeight: "800",
                  }}
                >
                  {rejectedCount}
                </span>
              </button>

              <button
                onClick={() => setApprovalTab("ALL")}
                style={{
                  padding: "8px 16px",
                  borderRadius: "20px",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  border: approvalTab === "ALL" ? "2px solid #2563eb" : "1px solid #e2e8f0",
                  background: approvalTab === "ALL" ? "#eff6ff" : "#f8fafc",
                  color: approvalTab === "ALL" ? "#1d4ed8" : "#64748b",
                  transition: "all 0.15s ease",
                }}
              >
                📋 All ({totalApprovalsCount})
              </button>
            </div>
          </div>

          {/* Quick Search Bar within Face Approvals */}
          <div style={{ marginBottom: "20px", position: "relative", maxWidth: "450px" }}>
            <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Search employee name, code, or department..."
              value={approvalSearch}
              onChange={(e) => setApprovalSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 36px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13.5px",
                outline: "none",
              }}
            />
          </div>

          {/* Content Area */}
          {approvalsLoading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
              <RefreshCw size={28} className="spin" style={{ marginBottom: "8px" }} />
              <p>Loading biometric registrations...</p>
            </div>
          ) : approvalTab === "PENDING" && pendingCount === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 24px", background: "#f8fafc", borderRadius: "14px", border: "1px dashed #cbd5e1" }}>
              <CheckCircle2 size={44} style={{ color: "#10b981", marginBottom: "10px" }} />
              <h4 style={{ margin: "0 0 6px 0", color: "#1e293b", fontSize: "17px", fontWeight: "700" }}>All Face Registrations Approved!</h4>
              <p style={{ margin: "0 0 16px 0", fontSize: "13.5px", color: "#64748b" }}>
                There are no pending employee face biometric registrations requiring HR review right now.
              </p>
              {approvedCount > 0 && (
                <button
                  onClick={() => setApprovalTab("APPROVED")}
                  style={{
                    background: "#166534",
                    color: "#fff",
                    border: "none",
                    padding: "9px 20px",
                    borderRadius: "8px",
                    fontWeight: "600",
                    fontSize: "13.5px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <UserCheck size={16} /> View Approved Employees ({approvedCount})
                </button>
              )}
            </div>
          ) : displayedApprovals.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 24px", background: "#f8fafc", borderRadius: "14px", border: "1px dashed #cbd5e1" }}>
              <AlertCircle size={40} style={{ color: "#94a3b8", marginBottom: "10px" }} />
              <h4 style={{ margin: "0 0 4px 0", color: "#1e293b", fontSize: "16px" }}>No Registrations Found</h4>
              <p style={{ margin: 0, fontSize: "13.5px", color: "#64748b" }}>
                {approvalSearch
                  ? "No employee records matched your search query."
                  : `No records found in ${approvalTab.toLowerCase()} category.`}
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
              {displayedApprovals.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: "#f8fafc",
                    border:
                      item.approval_status === "PENDING_APPROVAL"
                        ? "2px solid #f59e0b"
                        : item.approval_status === "APPROVED"
                        ? "1px solid #86efac"
                        : "1px solid #fca5a5",
                    borderRadius: "14px",
                    padding: "18px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    boxShadow: item.approval_status === "PENDING_APPROVAL" ? "0 4px 12px rgba(245, 158, 11, 0.1)" : "none",
                  }}
                >
                  <div>
                    {/* Header Info */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                      <div>
                        <div style={{ fontWeight: "700", fontSize: "16px", color: "#0f172a" }}>{item.employee_name}</div>
                        <div style={{ fontSize: "12px", color: "#2563eb", fontWeight: "600" }}>{item.employee_code || `#${item.employee_id}`}</div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>{item.department_name} • {item.designation || item.role}</div>
                      </div>

                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          padding: "4px 10px",
                          borderRadius: "12px",
                          background:
                            item.approval_status === "APPROVED"
                              ? "#dcfce7"
                              : item.approval_status === "PENDING_APPROVAL"
                              ? "#fef3c7"
                              : "#fee2e2",
                          color:
                            item.approval_status === "APPROVED"
                              ? "#15803d"
                              : item.approval_status === "PENDING_APPROVAL"
                              ? "#b45309"
                              : "#b91c1c",
                          border:
                            item.approval_status === "APPROVED"
                              ? "1px solid #bbf7d0"
                              : item.approval_status === "PENDING_APPROVAL"
                              ? "1px solid #fde68a"
                              : "1px solid #fecaca",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        {item.approval_status === "APPROVED" && <CheckCircle2 size={12} />}
                        {item.approval_status === "APPROVED"
                          ? "Approved"
                          : item.approval_status === "PENDING_APPROVAL"
                          ? "⏳ Pending Review"
                          : "✕ Rejected"}
                      </span>
                    </div>

                    {/* Face Photo Selfie Preview */}
                    <div
                      style={{
                        width: "100%",
                        height: "200px",
                        background: "#020617",
                        borderRadius: "10px",
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: "12px",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      {item.face_image_url ? (
                        <img
                          src={item.face_image_url}
                          alt={`${item.employee_name} Face Selfie`}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <div style={{ color: "#94a3b8", fontSize: "13px", textAlign: "center" }}>
                          <Camera size={32} style={{ marginBottom: "6px" }} />
                          <br /> No Face Selfie Captured
                        </div>
                      )}
                    </div>

                    <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "16px", lineHeight: "1.6" }}>
                      <div><strong>Device:</strong> {item.device_info || "Mobile Device"}</div>
                      <div><strong>Registered:</strong> {new Date(item.registered_at).toLocaleString("en-IN")}</div>
                      {item.approval_status === "APPROVED" && item.approved_at && (
                        <div style={{ color: "#166534" }}>
                          <strong>Approved At:</strong> {new Date(item.approved_at).toLocaleString("en-IN")}
                          {item.approved_by_name && <span> by <em>{item.approved_by_name}</em></span>}
                        </div>
                      )}
                      {item.rejection_reason && (
                        <div style={{ color: "#ef4444", marginTop: "4px", background: "#fef2f2", padding: "4px 8px", borderRadius: "6px", border: "1px solid #fee2e2" }}>
                          <strong>Rejection Reason:</strong> {item.rejection_reason}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions based on approval status */}
                  {item.approval_status === "PENDING_APPROVAL" ? (
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button
                        onClick={() => handleRejectFace(item.id, item.employee_name)}
                        disabled={actionId === item.id}
                        style={{
                          flex: 1,
                          background: "#fff1f2",
                          color: "#e11d48",
                          border: "1px solid #fecdd3",
                          padding: "10px",
                          borderRadius: "8px",
                          fontWeight: "700",
                          fontSize: "13px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                        }}
                      >
                        <UserX size={15} /> Reject
                      </button>
                      <button
                        onClick={() => handleApproveFace(item.id, item.employee_name)}
                        disabled={actionId === item.id}
                        style={{
                          flex: 1,
                          background: "#166534",
                          color: "#ffffff",
                          border: "none",
                          padding: "10px",
                          borderRadius: "8px",
                          fontWeight: "700",
                          fontSize: "13px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          boxShadow: "0 2px 8px rgba(22, 101, 52, 0.3)",
                        }}
                      >
                        <UserCheck size={15} /> Approve Face
                      </button>
                    </div>
                  ) : item.approval_status === "APPROVED" ? (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => handleRejectFace(item.id, item.employee_name)}
                        disabled={actionId === item.id}
                        title="Revoke approval and block biometric check-in"
                        style={{
                          flex: 1,
                          background: "#fff1f2",
                          color: "#e11d48",
                          border: "1px solid #fecdd3",
                          padding: "8px",
                          borderRadius: "8px",
                          fontWeight: "600",
                          fontSize: "12px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "5px",
                        }}
                      >
                        <UserX size={13} /> Revoke / Reject
                      </button>
                      <button
                        onClick={() => handleResetBiometric(item.employee_id, item.employee_name)}
                        disabled={resettingId === item.employee_id}
                        title="Reset biometric registration so employee can register anew"
                        style={{
                          flex: 1,
                          background: "#f1f5f9",
                          color: "#475569",
                          border: "1px solid #cbd5e1",
                          padding: "8px",
                          borderRadius: "8px",
                          fontWeight: "600",
                          fontSize: "12px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "5px",
                        }}
                      >
                        <RotateCcw size={13} className={resettingId === item.employee_id ? "spin" : ""} /> Reset Biometric
                      </button>
                    </div>
                  ) : (
                    /* REJECTED */
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => handleApproveFace(item.id, item.employee_name)}
                        disabled={actionId === item.id}
                        style={{
                          flex: 1,
                          background: "#166534",
                          color: "#ffffff",
                          border: "none",
                          padding: "8px",
                          borderRadius: "8px",
                          fontWeight: "600",
                          fontSize: "12px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "5px",
                        }}
                      >
                        <UserCheck size={13} /> Re-Approve
                      </button>
                      <button
                        onClick={() => handleResetBiometric(item.employee_id, item.employee_name)}
                        disabled={resettingId === item.employee_id}
                        style={{
                          flex: 1,
                          background: "#f1f5f9",
                          color: "#475569",
                          border: "1px solid #cbd5e1",
                          padding: "8px",
                          borderRadius: "8px",
                          fontWeight: "600",
                          fontSize: "12px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "5px",
                        }}
                      >
                        <RotateCcw size={13} className={resettingId === item.employee_id ? "spin" : ""} /> Reset
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* TAB 2: DAILY ATTENDANCE LOGS (Existing Filter Bar & Table) */
        <>
          {/* Filter Bar */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          borderRadius: "16px",
          padding: "26px",
          color: "#ffffff",
          marginBottom: "24px",
          boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.25)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
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
                <ShieldCheck size={14} /> HR & Executive Control
              </span>
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
                <Navigation size={13} /> GPS Location Verified
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: "26px", fontWeight: "700" }}>
              Employee Biometric Attendance & Location Reports
            </h1>
            <p style={{ margin: "6px 0 0 0", color: "#94a3b8", fontSize: "14px" }}>
              Real-time mobile biometric check-ins, shift duration, and exact GPS login/logout locations.
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={fetchReports}
              style={{
                background: "#2563eb",
                color: "#fff",
                border: "none",
                padding: "10px 18px",
                borderRadius: "10px",
                fontWeight: "600",
                fontSize: "13.5px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
              }}
            >
              <RefreshCw size={16} className={loading ? "spin" : ""} /> Refresh Logs
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          padding: "16px 20px",
          marginBottom: "24px",
          border: "1px solid #e2e8f0",
          display: "flex",
          gap: "16px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: "240px", position: "relative" }}>
          <Search size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
          <input
            type="text"
            placeholder="Search employee name, code, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px 10px 42px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "14px",
              outline: "none",
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Filter size={16} style={{ color: "#64748b" }} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "14px",
              background: "#fff",
              outline: "none",
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="PRESENT">Present</option>
            <option value="LATE">Late</option>
            <option value="HALF_DAY">Half Day</option>
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{ padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
          />
          <span style={{ color: "#94a3b8" }}>to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={{ padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
          />
        </div>
      </div>

      {/* Attendance Log Table */}
      <div style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "50px 0", color: "#64748b" }}>
            <RefreshCw size={32} style={{ animation: "spin 1s linear infinite", marginBottom: "12px" }} />
            <p>Loading employee attendance logs...</p>
          </div>
        ) : reports.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 24px", color: "#64748b" }}>
            <AlertCircle size={40} style={{ color: "#94a3b8", marginBottom: "12px" }} />
            <h3 style={{ margin: "0 0 4px 0", color: "#334155" }}>No Attendance Reports Found</h3>
            <p style={{ margin: 0, fontSize: "14px" }}>
              {searchTerm ? "No employee records match your search criteria." : "No biometric attendance logs have been recorded for the selected period."}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569", fontWeight: "600" }}>
                  <th style={{ padding: "14px 18px" }}>Employee</th>
                  <th style={{ padding: "14px 18px" }}>Department / Role</th>
                  <th style={{ padding: "14px 18px" }}>Date</th>
                  <th style={{ padding: "14px 18px" }}>Check-In {isSuperAdmin ? "(Time & Location)" : "Time"}</th>
                  <th style={{ padding: "14px 18px" }}>Check-Out {isSuperAdmin ? "(Time & Location)" : "Time"}</th>
                  <th style={{ padding: "14px 18px" }}>Shift Hours</th>
                  <th style={{ padding: "14px 18px" }}>Status</th>
                  <th style={{ padding: "14px 18px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((row) => {
                  const checkIn = row.check_in_time
                    ? new Date(row.check_in_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                    : "--";
                  const checkOut = row.check_out_time
                    ? new Date(row.check_out_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                    : "--";

                  return (
                    <tr key={row.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ fontWeight: "700", color: "#0f172a" }}>{row.employee_name || "Employee"}</div>
                        <div style={{ fontSize: "12px", color: "#2563eb", fontWeight: "600" }}>{row.employee_code || `#${row.employee_id}`}</div>
                        {row.shift_timing_type === "CUSTOM" && (
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: "700",
                              padding: "1px 6px",
                              borderRadius: "4px",
                              background: "#ecfdf5",
                              color: "#047857",
                              border: "1px solid #a7f3d0",
                              display: "inline-block",
                              marginTop: "3px",
                            }}
                            title={`Custom Shift: ${row.shift_start_time || "10:00"} - ${row.shift_end_time || "18:00"}`}
                          >
                            ⏱️ Shift {row.shift_start_time || "10:00"} - {row.shift_end_time || "18:00"}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ fontWeight: "600", color: "#334155" }}>{row.department_name || "General"}</div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>{row.designation || row.role}</div>
                      </td>
                      <td style={{ padding: "14px 18px", color: "#475569" }}>
                        {new Date(row.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          <span style={{ color: "#166534", fontWeight: "700", fontSize: "14px" }}>{checkIn}</span>
                          {row.check_in_time && (() => {
                            const lateInfo = calculateLateArrival(row.check_in_time, row);
                            if (!lateInfo) return null;
                            if (lateInfo.isLate) {
                              return (
                                <span
                                  title={`Shift: ${lateInfo.shiftLabel} • Expected by ${lateInfo.expectedLabel}`}
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: "700",
                                    padding: "2px 7px",
                                    borderRadius: "6px",
                                    background: "#fef3c7",
                                    color: "#b45309",
                                    border: "1px solid #fde68a",
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
                                  fontSize: "10.5px",
                                  fontWeight: "600",
                                  padding: "2px 6px",
                                  borderRadius: "6px",
                                  background: "#f0fdf4",
                                  color: "#16a34a",
                                  border: "1px solid #bbf7d0",
                                }}
                              >
                                ✓ On Time
                              </span>
                            );
                          })()}
                        </div>
                        {isSuperAdmin && row.check_in_location && (
                          <div style={{ fontSize: "12px", color: "#475569", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                            <MapPin size={12} style={{ color: "#2563eb", flexShrink: 0 }} />
                            <span style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.check_in_location}>
                              {row.check_in_location}
                            </span>
                          </div>
                        )}
                        {isSuperAdmin && row.check_in_lat && row.check_in_lng && (
                          <a
                            href={`https://maps.google.com/?q=${row.check_in_lat},${row.check_in_lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: "11px", color: "#2563eb", fontWeight: "600", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "3px", marginTop: "3px" }}
                          >
                            📍 View Map <ExternalLink size={10} />
                          </a>
                        )}
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ color: "#9a3412", fontWeight: "700", fontSize: "14px" }}>{checkOut}</div>
                        {isSuperAdmin && row.check_out_location && (
                          <div style={{ fontSize: "12px", color: "#475569", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                            <MapPin size={12} style={{ color: "#ea580c", flexShrink: 0 }} />
                            <span style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.check_out_location}>
                              {row.check_out_location}
                            </span>
                          </div>
                        )}
                        {isSuperAdmin && row.check_out_lat && row.check_out_lng && (
                          <a
                            href={`https://maps.google.com/?q=${row.check_out_lat},${row.check_out_lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: "11px", color: "#ea580c", fontWeight: "600", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "3px", marginTop: "3px" }}
                          >
                            📍 View Map <ExternalLink size={10} />
                          </a>
                        )}
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        {(() => {
                          const isActive = Boolean(row.check_in_time && !row.check_out_time);
                          let totalMinutes = 0;
                          if (isActive && row.check_in_time) {
                            const diff = Math.max(0, Date.now() - new Date(row.check_in_time).getTime());
                            totalMinutes = Math.floor(diff / 60000);
                          } else {
                            const hoursNum = Number(row.live_hours ?? row.total_hours ?? 0);
                            totalMinutes = Math.round(hoursNum * 60);
                          }

                          if (!row.check_in_time) {
                            return <span style={{ color: "#94a3b8", fontWeight: "600", fontSize: "13px" }}>--</span>;
                          }

                          const h = Math.floor(totalMinutes / 60);
                          const m = totalMinutes % 60;
                          const formattedDuration = h > 0 ? `${h}h ${m}m` : `${m}m`;
                          const decimalHours = (totalMinutes / 60).toFixed(2);

                          return (
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                              <span
                                title={`${decimalHours} decimal hrs`}
                                style={{
                                  fontWeight: "700",
                                  color: isActive ? "#15803d" : "#2563eb",
                                  background: isActive ? "#dcfce7" : "#eff6ff",
                                  padding: "4px 8px",
                                  borderRadius: "6px",
                                  fontSize: "13px",
                                }}
                              >
                                {formattedDuration}
                              </span>
                              {isActive && (
                                <span
                                  style={{
                                    fontSize: "10.5px",
                                    fontWeight: "700",
                                    color: "#16a34a",
                                    background: "#f0fdf4",
                                    border: "1px solid #bbf7d0",
                                    padding: "2px 6px",
                                    borderRadius: "10px",
                                  }}
                                  title="Shift currently in progress"
                                >
                                  ● Active
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        {(() => {
                          const lateInfo = row.check_in_time ? calculateLateArrival(row.check_in_time) : null;
                          const isLate = row.status === "LATE" || (lateInfo && lateInfo.isLate);
                          const isPresent = row.status === "PRESENT" || (!isLate && row.check_in_time);

                          let bg = "#fee2e2";
                          let color = "#b91c1c";
                          let border = "1px solid #fecaca";
                          let text = row.status || "ABSENT";

                          if (isLate) {
                            bg = "#fef3c7";
                            color = "#b45309";
                            border = "1px solid #fde68a";
                            text = lateInfo?.formattedLate ? `LATE (+${lateInfo.formattedLate})` : "LATE";
                          } else if (isPresent) {
                            bg = "#dcfce7";
                            color = "#15803d";
                            border = "1px solid #bbf7d0";
                            text = "PRESENT";
                          } else if (row.status === "HALF_DAY") {
                            bg = "#ede9fe";
                            color = "#6d28d9";
                            border = "1px solid #ddd6fe";
                            text = "HALF DAY";
                          }

                          return (
                            <span
                              style={{
                                fontSize: "12px",
                                fontWeight: "700",
                                padding: "4px 10px",
                                borderRadius: "12px",
                                background: bg,
                                color: color,
                                border,
                                display: "inline-block",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {text}
                            </span>
                          );
                        })()}
                      </td>
                      <td style={{ padding: "14px 18px", textAlign: "right" }}>
                        <button
                          onClick={() => handleResetBiometric(row.employee_id, row.employee_name)}
                          disabled={resettingId === row.employee_id}
                          title="Reset Biometric Lock for Employee"
                          style={{
                            background: "#fff1f2",
                            color: "#e11d48",
                            border: "1px solid #fecdd3",
                            padding: "6px 12px",
                            borderRadius: "8px",
                            fontSize: "12px",
                            fontWeight: "600",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                          }}
                        >
                          <RotateCcw size={13} className={resettingId === row.employee_id ? "spin" : ""} />
                          Reset Biometric
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
      )}
    </div>
  );
};

export default AttendanceReports;

