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

const AttendanceReports = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const [activeTab, setActiveTab] = useState("REPORTS"); // "REPORTS" | "FACE_APPROVALS"
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

  const pendingCount = pendingApprovals.filter(a => a.approval_status === "PENDING_APPROVAL").length;

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
          <h3 style={{ margin: "0 0 6px 0", fontSize: "18px", fontWeight: "700", color: "#0f172a" }}>
            📸 Pending Face Biometric Registrations ({pendingApprovals.length})
          </h3>
          <p style={{ margin: "0 0 20px 0", color: "#64748b", fontSize: "13.5px" }}>
            Review employee selfie face photos captured during iPhone/mobile Face ID registration. Approve to allow them to mark attendance.
          </p>

          {approvalsLoading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>Loading pending face approvals...</div>
          ) : pendingApprovals.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", background: "#f8fafc", borderRadius: "12px", color: "#64748b" }}>
              <CheckCircle2 size={40} style={{ color: "#10b981", marginBottom: "8px" }} />
              <h4 style={{ margin: "0 0 4px 0", color: "#1e293b" }}>All Face Registrations Approved!</h4>
              <p style={{ margin: 0, fontSize: "13.5px" }}>There are no pending employee face biometric registrations requiring HR review.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
              {pendingApprovals.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: "#f8fafc",
                    border: item.approval_status === "PENDING_APPROVAL" ? "2px solid #f59e0b" : "1px solid #cbd5e1",
                    borderRadius: "14px",
                    padding: "18px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
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
                          padding: "3px 10px",
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
                        }}
                      >
                        {item.approval_status === "PENDING_APPROVAL" ? "⏳ Pending HR Review" : item.approval_status}
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

                    <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "16px" }}>
                      <strong>Device:</strong> {item.device_info || "Mobile Device"}
                      <br />
                      <strong>Registered Date:</strong> {new Date(item.registered_at).toLocaleString("en-IN")}
                      {item.rejection_reason && (
                        <div style={{ color: "#ef4444", marginTop: "4px" }}>
                          <strong>Rejection Reason:</strong> {item.rejection_reason}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
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
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ fontWeight: "600", color: "#334155" }}>{row.department_name || "General"}</div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>{row.designation || row.role}</div>
                      </td>
                      <td style={{ padding: "14px 18px", color: "#475569" }}>
                        {new Date(row.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ color: "#166534", fontWeight: "700", fontSize: "14px" }}>{checkIn}</div>
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
                        <span style={{ fontWeight: "700", color: "#2563eb", background: "#eff6ff", padding: "4px 8px", borderRadius: "6px" }}>
                          {row.live_hours || row.total_hours || "0.0"} hrs
                        </span>
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: "600",
                            padding: "3px 10px",
                            borderRadius: "12px",
                            background: row.status === "PRESENT" ? "#dcfce7" : "#fee2e2",
                            color: row.status === "PRESENT" ? "#15803d" : "#b91c1c",
                          }}
                        >
                          {row.status || "PRESENT"}
                        </span>
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

