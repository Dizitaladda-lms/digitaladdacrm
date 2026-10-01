import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  KeyRound,
  LoaderCircle,
  Save,
  ShieldCheck,
  UserRound,
  TrendingUp,
  Filter,
  Users,
  Calendar,
  Sparkles,
  Briefcase,
  Building,
  Mail,
  Phone,
  Clock,
  Video,
  CheckCircle2,
  CalendarCheck,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { changePassword } from "../../services/authService";
import { getMyReportToday, getMyReportsHistory } from "../../services/reportService";
import axiosInstance from "../../api/axiosInstance";
import "./Profile.css";

const Profile = () => {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [designation, setDesignation] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const isCounsellor = user?.role === "COUNSELLOR";

  // Counsellor Performance Scorecard State
  const [timeframe, setTimeframe] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [perfData, setPerfData] = useState(null);
  const [loadingPerf, setLoadingPerf] = useState(false);

  // Operations / Non-Counsellor Work State
  const [opsData, setOpsData] = useState({
    totalHours: 0,
    totalClasses: 0,
    approvedCount: 0,
    todaySubmitted: false,
  });
  const [loadingOps, setLoadingOps] = useState(false);

  useEffect(() => {
    setFullName(user?.full_name || "");
    setDesignation(user?.designation || "");
  }, [user]);

  const initials = useMemo(
    () =>
      (user?.full_name || "User")
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
    [user?.full_name]
  );

  // Load Counsellor Performance Analytics
  const fetchMyPerformance = useCallback(async () => {
    if (!isCounsellor) return;
    try {
      setLoadingPerf(true);
      const res = await axiosInstance.get("/employee/my-performance", {
        params: {
          timeframe,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        },
      });
      setPerfData(res.data?.data || res.data || {});
    } catch (error) {
      console.error("Failed to load my performance:", error);
    } finally {
      setLoadingPerf(false);
    }
  }, [isCounsellor, timeframe, dateFrom, dateTo]);

  // Load Non-Counsellor / Operations Summary
  const fetchOpsSummary = useCallback(async () => {
    if (isCounsellor) return;
    try {
      setLoadingOps(true);
      const [todayRes, historyRes] = await Promise.all([
        getMyReportToday().catch(() => null),
        getMyReportsHistory({ limit: 30 }).catch(() => null),
      ]);

      const reports = historyRes?.data?.reports || [];
      const totalHours = reports.reduce(
        (sum, r) => sum + (parseFloat(r.total_hours_worked) || 0),
        0
      );
      const totalClasses = reports.reduce(
        (sum, r) => sum + (r.classes?.length || (r.took_class ? 1 : 0)),
        0
      );
      const approvedCount = reports.filter((r) => r.status === "HR_APPROVED").length;

      setOpsData({
        totalHours,
        totalClasses,
        approvedCount,
        todaySubmitted: !!todayRes?.data,
      });
    } catch (err) {
      console.error("Failed to load operations profile summary:", err);
    } finally {
      setLoadingOps(false);
    }
  }, [isCounsellor]);

  useEffect(() => {
    if (isCounsellor) {
      fetchMyPerformance();
    } else {
      fetchOpsSummary();
    }
  }, [isCounsellor, fetchMyPerformance, fetchOpsSummary]);

  const saveProfile = async (event) => {
    event.preventDefault();
    const cleanName = fullName.trim();
    const cleanDesig = designation.trim();
    if (cleanName.length < 2) return toast.error("Please enter your full name.");
    try {
      setSavingProfile(true);
      await updateProfile({
        full_name: cleanName,
        designation: cleanDesig,
      });
      toast.success("Profile details updated successfully!");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not update your profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    if (!passwords.currentPassword || !passwords.newPassword)
      return toast.error("Please fill in all password fields.");
    if (passwords.newPassword.length < 8)
      return toast.error("New password must be at least 8 characters.");
    if (passwords.newPassword !== passwords.confirmPassword)
      return toast.error("New passwords do not match.");
    try {
      setSavingPassword(true);
      await changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success("Password changed successfully.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not change password.");
    } finally {
      setSavingPassword(false);
    }
  };

  const summary = perfData?.summary || {
    total_leads: 0,
    pending_followups: 0,
    enrolled_conversions: 0,
    total_revenue: 0,
    conversion_rate: 0,
  };

  const leadsList = perfData?.leads || [];

  return (
    <section className="profile-page" style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Sleek Top Hero Banner */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          padding: "24px 28px",
          border: "1px solid #E2E8F0",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #2563EB, #4F46E5)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "26px",
                fontWeight: 800,
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
              }}
            >
              {initials}
            </div>
            <span
              style={{
                position: "absolute",
                bottom: "2px",
                right: "2px",
                width: "16px",
                height: "16px",
                backgroundColor: "#22C55E",
                border: "2.5px solid #FFFFFF",
                borderRadius: "50%",
              }}
              title="Active User"
            />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "4px" }}>
              <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#0F172A", margin: 0 }}>
                {user?.full_name || "Team Member"}
              </h1>
              {user?.employee_code && (
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    background: "#F1F5F9",
                    color: "#475569",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    letterSpacing: "0.02em",
                  }}
                >
                  {user.employee_code}
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              {/* Designation Badge */}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  background: "#EFF6FF",
                  color: "#1D4ED8",
                  padding: "4px 10px",
                  borderRadius: "20px",
                  border: "1px solid #BFDBFE",
                }}
              >
                <Briefcase size={13} />
                {user?.designation || "Executive"}
              </span>

              {/* Role Badge */}
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  background: "#F8FAFC",
                  color: "#334155",
                  padding: "4px 9px",
                  borderRadius: "20px",
                  border: "1px solid #E2E8F0",
                  textTransform: "uppercase",
                }}
              >
                {user?.role || "Staff"}
              </span>

              {/* Department */}
              {user?.department_name && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "#64748B",
                  }}
                >
                  <Building size={13} />
                  {user.department_name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Action Navigation */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {!isCounsellor && (
            <button
              type="button"
              onClick={() => navigate("/employee/daily-report")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "#2563EB",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "8px",
                padding: "8px 14px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <CalendarCheck size={16} />
              <span>Submit Daily Report</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate("/employee/performance")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#F8FAFC",
              color: "#334155",
              border: "1px solid #CBD5E1",
              borderRadius: "8px",
              padding: "8px 14px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <TrendingUp size={16} />
            <span>Scorecard</span>
          </button>
        </div>
      </div>

      {/* CONDITIONAL SECTION: COUNSELLOR LEAD SCORECARD OR OPERATIONS WORK SUMMARY */}
      {isCounsellor ? (
        <div className="crm-card" style={{ marginBottom: "24px", padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ padding: "10px", borderRadius: "10px", backgroundColor: "#EEF2FF", color: "#4F46E5" }}>
                <TrendingUp size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 750, color: "#0F172A", margin: 0 }}>
                  My Counselling Performance Analytics
                </h3>
                <p style={{ fontSize: "12px", color: "#64748B", margin: "2px 0 0 0" }}>
                  Live database analytics for your assigned student leads and fee conversions
                </p>
              </div>
            </div>

            {/* Timeframe Filter Buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <Filter size={15} style={{ color: "#64748B", marginRight: "2px" }} />
              {[
                { id: "week", label: "This Week" },
                { id: "month", label: "This Month" },
                { id: "all", label: "All Time" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTimeframe(t.id)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: timeframe === t.id ? 700 : 600,
                    border: timeframe === t.id ? "1px solid #4F46E5" : "1.5px solid #CBD5E1",
                    cursor: "pointer",
                    backgroundColor: timeframe === t.id ? "#4F46E5" : "#FFFFFF",
                    color: timeframe === t.id ? "#FFFFFF" : "#64748B",
                    transition: "all 0.15s ease",
                  }}
                >
                  {t.label}
                </button>
              ))}

              <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                <Calendar size={13} style={{ position: "absolute", left: "9px", color: "#64748B", pointerEvents: "none" }} />
                <input
                  aria-label="Performance start date"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  style={{
                    height: "34px",
                    paddingLeft: "28px",
                    paddingRight: "8px",
                    fontSize: "12px",
                    fontWeight: 500,
                    borderRadius: "7px",
                    border: "1.5px solid #CBD5E1",
                    backgroundColor: "#FFFFFF",
                    color: "#334155",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                <Calendar size={13} style={{ position: "absolute", left: "9px", color: "#64748B", pointerEvents: "none" }} />
                <input
                  aria-label="Performance end date"
                  type="date"
                  min={dateFrom || undefined}
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  style={{
                    height: "34px",
                    paddingLeft: "28px",
                    paddingRight: "8px",
                    fontSize: "12px",
                    fontWeight: 500,
                    borderRadius: "7px",
                    border: "1.5px solid #CBD5E1",
                    backgroundColor: "#FFFFFF",
                    color: "#334155",
                    outline: "none",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Core Analytics Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "20px" }}>
            <div style={{ padding: "16px", backgroundColor: "#FFFFFF", borderRadius: "12px", border: "1.5px solid #F1F5F9" }}>
              <span style={{ fontSize: "11px", color: "#2563EB", fontWeight: 700, textTransform: "uppercase" }}>Total Assigned</span>
              <h3 style={{ fontSize: "28px", fontWeight: 800, color: "#2563EB", margin: "4px 0 0 0" }}>
                {loadingPerf ? "—" : summary.total_leads || 0}
              </h3>
            </div>
            <div style={{ padding: "16px", backgroundColor: "#FFFFFF", borderRadius: "12px", border: "1.5px solid #F1F5F9" }}>
              <span style={{ fontSize: "11px", color: "#D97706", fontWeight: 700, textTransform: "uppercase" }}>Pending Follow-ups</span>
              <h3 style={{ fontSize: "28px", fontWeight: 800, color: "#D97706", margin: "4px 0 0 0" }}>
                {loadingPerf ? "—" : summary.pending_followups || 0}
              </h3>
            </div>
            <div style={{ padding: "16px", backgroundColor: "#FFFFFF", borderRadius: "12px", border: "1.5px solid #F1F5F9" }}>
              <span style={{ fontSize: "11px", color: "#16A34A", fontWeight: 700, textTransform: "uppercase" }}>Admissions Done</span>
              <h3 style={{ fontSize: "28px", fontWeight: 800, color: "#16A34A", margin: "4px 0 0 0" }}>
                {loadingPerf ? "—" : summary.enrolled_conversions || 0}
              </h3>
            </div>
            <div style={{ padding: "16px", backgroundColor: "#FFFFFF", borderRadius: "12px", border: "1.5px solid #F1F5F9" }}>
              <span style={{ fontSize: "11px", color: "#4F46E5", fontWeight: 700, textTransform: "uppercase" }}>Revenue Generated</span>
              <h3 style={{ fontSize: "28px", fontWeight: 800, color: "#4F46E5", margin: "4px 0 0 0" }}>
                {loadingPerf ? "—" : `₹${Number(summary.total_revenue || 0).toLocaleString("en-IN")}`}
              </h3>
            </div>
          </div>

          {/* Lead Table */}
          <div>
            <h4 style={{ fontSize: "14px", fontWeight: 800, color: "#0F172A", margin: "0 0 12px 0" }}>
              Recent Assigned Leads ({leadsList.length})
            </h4>
            {loadingPerf ? (
              <div style={{ textAlign: "center", padding: "20px", color: "#64748B" }}>Loading leads...</div>
            ) : leadsList.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px", backgroundColor: "#F8FAFC", borderRadius: "8px", color: "#64748B", fontSize: "13px" }}>
                No leads recorded in this period.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #E2E8F0", color: "#64748B", textTransform: "uppercase" }}>
                      <th style={{ padding: "10px 12px" }}>Student Name</th>
                      <th style={{ padding: "10px 12px" }}>Course</th>
                      <th style={{ padding: "10px 12px" }}>Status</th>
                      <th style={{ padding: "10px 12px" }}>Priority</th>
                      <th style={{ padding: "10px 12px" }}>Assigned Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leadsList.slice(0, 10).map((l) => (
                      <tr key={l.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                        <td style={{ padding: "10px 12px" }}>
                          <strong style={{ color: "#0F172A", display: "block" }}>{l.full_name}</strong>
                          <span style={{ color: "#2563EB", fontFamily: "monospace" }}>{l.lead_code}</span>
                        </td>
                        <td style={{ padding: "10px 12px", color: "#334155" }}>{l.interested_course || "—"}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <span className="crm-badge crm-badge-status">{l.status}</span>
                        </td>
                        <td style={{ padding: "10px 12px", fontWeight: 700, color: l.priority === "HIGH" ? "#DC2626" : "#64748B" }}>
                          {l.priority || "MEDIUM"}
                        </td>
                        <td style={{ padding: "10px 12px", color: "#64748B" }}>
                          {l.created_at ? new Date(l.created_at).toLocaleDateString("en-IN") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Academic & Operations Summary Card */
        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #E2E8F0",
            padding: "20px 24px",
            marginBottom: "24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 750, color: "#0F172A", margin: 0 }}>
                Operations, Classes & Daily Work Summary
              </h3>
              <p style={{ fontSize: "12px", color: "#64748B", margin: "2px 0 0 0" }}>
                Overview of your logged work hours, submitted reports, and verified class video recordings
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/employee/performance")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "12px",
                fontWeight: 600,
                color: "#2563EB",
                background: "#EFF6FF",
                padding: "6px 12px",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
              }}
            >
              <span>View Full Ledger</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
            <div style={{ padding: "14px", backgroundColor: "#F8FAFC", borderRadius: "10px", border: "1px solid #E2E8F0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#2563EB", marginBottom: "6px" }}>
                <Clock size={16} />
                <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>Logged Work Hours</span>
              </div>
              <strong style={{ fontSize: "24px", color: "#0F172A" }}>
                {loadingOps ? "—" : `${opsData.totalHours.toFixed(1)} hrs`}
              </strong>
            </div>

            <div style={{ padding: "14px", backgroundColor: "#F8FAFC", borderRadius: "10px", border: "1px solid #E2E8F0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#4F46E5", marginBottom: "6px" }}>
                <Video size={16} />
                <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>Classes with Video Proof</span>
              </div>
              <strong style={{ fontSize: "24px", color: "#0F172A" }}>
                {loadingOps ? "—" : opsData.totalClasses}
              </strong>
            </div>

            <div style={{ padding: "14px", backgroundColor: "#F8FAFC", borderRadius: "10px", border: "1px solid #E2E8F0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#16A34A", marginBottom: "6px" }}>
                <CheckCircle2 size={16} />
                <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>HR Approved Reports</span>
              </div>
              <strong style={{ fontSize: "24px", color: "#16A34A" }}>
                {loadingOps ? "—" : opsData.approvedCount}
              </strong>
            </div>

            <div style={{ padding: "14px", backgroundColor: "#F8FAFC", borderRadius: "10px", border: "1px solid #E2E8F0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#0F766E", marginBottom: "6px" }}>
                <CalendarCheck size={16} />
                <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>Today's Report Status</span>
              </div>
              <strong style={{ fontSize: "16px", color: opsData.todaySubmitted ? "#16A34A" : "#D97706", display: "block", marginTop: "6px" }}>
                {loadingOps ? "—" : opsData.todaySubmitted ? "✅ Submitted Today" : "⏳ Pending Submission"}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* ACCOUNT DETAILS & SECURITY SECTION */}
      <div className="profile-layout">
        <aside className="profile-summary">
          <div className="profile-avatar">{initials}</div>
          <h2>{user?.full_name || "Your Name"}</h2>
          <div style={{ marginBottom: "12px" }}>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#1D4ED8",
                background: "#EFF6FF",
                padding: "3px 10px",
                borderRadius: "14px",
                border: "1px solid #BFDBFE",
              }}
            >
              {user?.designation || user?.role || "Staff"}
            </span>
          </div>

          <div>
            <span>Employee Code</span>
            <strong>{user?.employee_code || "EMP-DIR"}</strong>
          </div>
          <div>
            <span>Account Email</span>
            <strong>{user?.email || "—"}</strong>
          </div>
          {user?.mobile && (
            <div>
              <span>Mobile Phone</span>
              <strong>{user.mobile}</strong>
            </div>
          )}
          <div>
            <span>Account Status</span>
            <strong className="profile-active">Active Member</strong>
          </div>
        </aside>

        <div className="profile-content">
          {/* Personal Details Form */}
          <form className="profile-form" onSubmit={saveProfile}>
            <div className="profile-card-heading">
              <div className="profile-card-icon">
                <UserRound size={19} />
              </div>
              <div>
                <h2>Personal Details & Designation</h2>
                <p>Update your display name and professional designation across the CRM portal.</p>
              </div>
            </div>

            <div className="profile-fields" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <label>
                Full Name *
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  autoComplete="name"
                  maxLength="150"
                  required
                  placeholder="e.g. Satyam Sharma"
                />
              </label>

              {/* Designation Selector / Manual Input */}
              <label>
                Designation *
                <span style={{ fontSize: "11px", color: "#64748B", fontWeight: "normal", marginBottom: "4px", display: "block" }}>
                  Pick a suggested title or type your custom manual designation below:
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
                  {[
                    "Full Stack Developer",
                    "Frontend Developer",
                    "Backend Developer",
                    "Faculty Trainer",
                    "Senior Academic Trainer",
                    "Admissions Counsellor",
                    "Senior Admissions Counsellor",
                    "Graphic Designer",
                    "Video Editor",
                    "Digital Marketing Executive",
                    "Operations Executive",
                    "HR Executive",
                    "Team Lead",
                  ].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDesignation(d)}
                      style={{
                        fontSize: "11.5px",
                        padding: "3px 9px",
                        borderRadius: "14px",
                        border: designation === d ? "1.5px solid #2563EB" : "1px solid #E2E8F0",
                        backgroundColor: designation === d ? "#EFF6FF" : "#F8FAFC",
                        color: designation === d ? "#1D4ED8" : "#475569",
                        cursor: "pointer",
                        fontWeight: designation === d ? "700" : "500",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>

                <input
                  list="profile-designation-list"
                  value={designation}
                  onChange={(event) => setDesignation(event.target.value)}
                  placeholder="e.g. Full Stack Developer (or type custom designation)"
                  required
                />
                <datalist id="profile-designation-list">
                  <option value="Full Stack Developer" />
                  <option value="Frontend Developer" />
                  <option value="Backend Developer" />
                  <option value="Software Developer" />
                  <option value="Faculty Trainer" />
                  <option value="Senior Academic Trainer" />
                  <option value="Admissions Counsellor" />
                  <option value="Senior Admissions Counsellor" />
                  <option value="Graphic Designer" />
                  <option value="Video Editor" />
                  <option value="Digital Marketing Executive" />
                  <option value="Operations Executive" />
                  <option value="HR Manager" />
                  <option value="HR Executive" />
                  <option value="Team Lead" />
                </datalist>
              </label>

              <label>
                Email Address (Managed by Administrator)
                <input value={user?.email || ""} readOnly aria-readonly="true" />
              </label>
            </div>

            <button className="profile-submit" type="submit" disabled={savingProfile}>
              {savingProfile ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}
              {savingProfile ? "Saving Profile..." : "Save Details"}
            </button>
          </form>

          {/* Change Password Form */}
          <form className="profile-form security-form" onSubmit={savePassword}>
            <div className="profile-card-heading">
              <div className="profile-card-icon security">
                <ShieldCheck size={19} />
              </div>
              <div>
                <h2>Change Password</h2>
                <p>Use a new, secure password with at least 8 characters.</p>
              </div>
            </div>

            <div className="profile-password-fields">
              <label>
                Current password
                <input
                  type="password"
                  value={passwords.currentPassword}
                  onChange={(event) =>
                    setPasswords({ ...passwords, currentPassword: event.target.value })
                  }
                  autoComplete="current-password"
                />
              </label>
              <label>
                New password
                <input
                  type="password"
                  value={passwords.newPassword}
                  onChange={(event) =>
                    setPasswords({ ...passwords, newPassword: event.target.value })
                  }
                  autoComplete="new-password"
                />
              </label>
              <label>
                Confirm new password
                <input
                  type="password"
                  value={passwords.confirmPassword}
                  onChange={(event) =>
                    setPasswords({ ...passwords, confirmPassword: event.target.value })
                  }
                  autoComplete="new-password"
                />
              </label>
            </div>

            <button className="profile-submit" type="submit" disabled={savingPassword}>
              {savingPassword ? <LoaderCircle className="spin" size={17} /> : <KeyRound size={17} />}
              {savingPassword ? "Updating Password..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Profile;
