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
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { changePassword } from "../../services/authService";
import axiosInstance from "../../api/axiosInstance";
import "./Profile.css";

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Performance Scorecard State
  const [timeframe, setTimeframe] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [perfData, setPerfData] = useState(null);
  const [loadingPerf, setLoadingPerf] = useState(true);

  useEffect(() => setFullName(user?.full_name || ""), [user?.full_name]);

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

  const fetchMyPerformance = useCallback(async () => {
    try {
      setLoadingPerf(true);
      const res = await axiosInstance.get("/employee/my-performance", { params: { timeframe, date_from: dateFrom || undefined, date_to: dateTo || undefined } });
      setPerfData(res.data?.data || res.data || {});
    } catch (error) {
      console.error("Failed to load my performance:", error);
    } finally {
      setLoadingPerf(false);
    }
  }, [timeframe, dateFrom, dateTo]);

  useEffect(() => {
    fetchMyPerformance();
  }, [fetchMyPerformance]);

  const saveProfile = async (event) => {
    event.preventDefault();
    const cleanName = fullName.trim();
    if (cleanName.length < 2) return toast.error("Please enter your full name.");
    try {
      setSavingProfile(true);
      await updateProfile({ full_name: cleanName });
      toast.success("Your profile name has been updated.");
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
      {/* Header Banner */}
      <header
        className="profile-header"
        style={{
          marginBottom: "24px",
          backgroundColor: "#FFFFFF",
          padding: "20px 24px",
          borderRadius: "16px",
          border: "1px solid #E2E8F0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
        }}
      >
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 800, color: "#0F172A", margin: 0 }}>
            My Profile & Performance Scorecard
          </h1>
          <span style={{ fontSize: "13px", color: "#64748B", marginTop: "4px", display: "block" }}>
            Track your counselling conversion metrics, week-wise & month-wise analytics, and account settings
          </span>
        </div>
      </header>

      {/* PERFORMANCE SCORECARD CARD SECTION */}
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

          {/* Timeframe Filter Buttons & Professional Date Filter */}
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
                  boxShadow: timeframe === t.id ? "0 1px 3px rgba(79, 70, 229, 0.2)" : "none",
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

            {(dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => { setDateFrom(""); setDateTo(""); }}
                style={{
                  fontSize: "12px",
                  color: "#4F46E5",
                  fontWeight: 700,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 8px",
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* 4 Scorecard Metric Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "14px",
            marginBottom: "20px",
          }}
        >
          <div
            className="crm-card"
            style={{
              marginBottom: 0,
              padding: "16px 18px",
              backgroundColor: "#FFFFFF",
              borderRadius: "12px",
              border: "1.5px solid #F1F5F9",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            }}
          >
            <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 700, textTransform: "uppercase" }}>
              Total Assigned Leads
            </span>
            <h3
              style={{
                fontSize: "28px",
                fontWeight: 800,
                color: "#0F172A",
                margin: "4px 0 0 0",
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.025em",
                lineHeight: 1.1,
              }}
            >
              {loadingPerf ? "—" : Number(summary.total_leads || 0).toLocaleString("en-IN")}
            </h3>
          </div>

          <div
            className="crm-card"
            style={{
              marginBottom: 0,
              padding: "16px 18px",
              backgroundColor: "#FFFFFF",
              borderRadius: "12px",
              border: "1.5px solid #F1F5F9",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            }}
          >
            <span style={{ fontSize: "11px", color: "#D97706", fontWeight: 700, textTransform: "uppercase" }}>
              Pending Callbacks
            </span>
            <h3
              style={{
                fontSize: "28px",
                fontWeight: 800,
                color: "#D97706",
                margin: "4px 0 0 0",
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.025em",
                lineHeight: 1.1,
              }}
            >
              {loadingPerf ? "—" : Number(summary.pending_followups || 0).toLocaleString("en-IN")}
            </h3>
          </div>

          <div
            className="crm-card"
            style={{
              marginBottom: 0,
              padding: "16px 18px",
              backgroundColor: "#FFFFFF",
              borderRadius: "12px",
              border: "1.5px solid #F1F5F9",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            }}
          >
            <span style={{ fontSize: "11px", color: "#16A34A", fontWeight: 700, textTransform: "uppercase" }}>
              Enrolled Admissions
            </span>
            <h3
              style={{
                fontSize: "28px",
                fontWeight: 800,
                color: "#16A34A",
                margin: "4px 0 0 0",
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.025em",
                lineHeight: 1.1,
              }}
            >
              {loadingPerf ? "—" : Number(summary.enrolled_conversions || 0).toLocaleString("en-IN")}
            </h3>
          </div>

          <div
            className="crm-card"
            style={{
              marginBottom: 0,
              padding: "16px 18px",
              backgroundColor: "#FFFFFF",
              borderRadius: "12px",
              border: "1.5px solid #F1F5F9",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            }}
          >
            <span style={{ fontSize: "11px", color: "#4F46E5", fontWeight: 700, textTransform: "uppercase" }}>
              Revenue Generated
            </span>
            <h3
              style={{
                fontSize: "28px",
                fontWeight: 800,
                color: "#4F46E5",
                margin: "4px 0 0 0",
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.025em",
                lineHeight: 1.1,
              }}
            >
              {loadingPerf ? "—" : `₹${Number(summary.total_revenue || 0).toLocaleString("en-IN")}`}
            </h3>
          </div>
        </div>

        {/* Conversion Efficiency Progress Bar */}
        <div
          style={{
            padding: "16px",
            backgroundColor: "#F8FAFC",
            borderRadius: "12px",
            border: "1px solid #E2E8F0",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>
              My Lead Conversion Rate
            </span>
            <strong style={{ fontSize: "15px", color: summary.conversion_rate >= 30 ? "#16A34A" : "#2563EB" }}>
              {summary.conversion_rate}% Conversion Efficiency
            </strong>
          </div>
          <div style={{ height: "8px", width: "100%", backgroundColor: "#E2E8F0", borderRadius: "4px", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${Math.min(100, summary.conversion_rate)}%`,
                backgroundColor: summary.conversion_rate >= 30 ? "#16A34A" : summary.conversion_rate >= 15 ? "#2563EB" : "#D97706",
                borderRadius: "4px",
                transition: "width 0.5s ease",
              }}
            />
          </div>
        </div>

        {/* Assigned Student Leads Table */}
        <div>
          <h4 style={{ fontSize: "14px", fontWeight: 800, color: "#0F172A", margin: "0 0 12px 0" }}>
            My Assigned Student Leads ({leadsList.length})
          </h4>

          {loadingPerf ? (
            <div style={{ textAlign: "center", padding: "24px", color: "#64748B", fontSize: "13px" }}>
              Loading performance details...
            </div>
          ) : leadsList.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px", backgroundColor: "#F8FAFC", borderRadius: "8px", color: "#64748B", fontSize: "13px" }}>
              No leads assigned in the selected timeframe.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #E2E8F0", color: "#64748B", textTransform: "uppercase" }}>
                    <th style={{ padding: "10px 12px" }}>Lead Code & Student</th>
                    <th style={{ padding: "10px 12px" }}>Course</th>
                    <th style={{ padding: "10px 12px" }}>Status</th>
                    <th style={{ padding: "10px 12px" }}>Priority</th>
                    <th style={{ padding: "10px 12px" }}>Assigned Date</th>
                  </tr>
                </thead>
                <tbody>
                  {leadsList.map((lead) => {
                    const statusClass =
                      lead.status === "ENROLLED"
                        ? "crm-badge-low"
                        : lead.status === "FOLLOW_UP"
                        ? "crm-badge-medium"
                        : "crm-badge-status";

                    return (
                      <tr key={lead.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                        <td style={{ padding: "10px 12px" }}>
                          <strong style={{ color: "#0F172A", display: "block" }}>{lead.full_name}</strong>
                          <span style={{ color: "#2563EB", fontFamily: "monospace" }}>{lead.lead_code}</span>
                        </td>
                        <td style={{ padding: "10px 12px", color: "#334155" }}>
                          {lead.interested_course || "BCA"}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span className={`crm-badge ${statusClass}`} style={{ fontSize: "10px" }}>
                            {lead.status || "NEW"}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", fontWeight: 700, color: lead.priority === "HIGH" ? "#DC2626" : "#64748B" }}>
                          {lead.priority || "MEDIUM"}
                        </td>
                        <td style={{ padding: "10px 12px", color: "#64748B" }}>
                          {lead.created_at ? new Date(lead.created_at).toLocaleDateString("en-IN") : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ACCOUNT SETTINGS & SECURITY SECTION */}
      <div className="profile-layout">
        <aside className="profile-summary">
          <div className="profile-avatar">{initials}</div>
          <h2>{user?.full_name || "Your Name"}</h2>
          <p>{user?.role || "Counsellor"}</p>
          <div>
            <span>Account Email</span>
            <strong>{user?.email || "—"}</strong>
          </div>
          <div>
            <span>Account Status</span>
            <strong className="profile-active">Active</strong>
          </div>
        </aside>

        <div className="profile-content">
          <form className="profile-form" onSubmit={saveProfile}>
            <div className="profile-card-heading">
              <div className="profile-card-icon">
                <UserRound size={19} />
              </div>
              <div>
                <h2>Personal Details</h2>
                <p>Your email is managed by an administrator and cannot be changed here.</p>
              </div>
            </div>
            <div className="profile-fields">
              <label>
                Full name
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  autoComplete="name"
                  maxLength="150"
                />
              </label>
              <label>
                Email address
                <input value={user?.email || ""} readOnly aria-readonly="true" />
              </label>
            </div>
            <button className="profile-submit" type="submit" disabled={savingProfile}>
              {savingProfile ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}
              {savingProfile ? "Saving..." : "Save Name"}
            </button>
          </form>

          <form className="profile-form security-form" onSubmit={savePassword}>
            <div className="profile-card-heading">
              <div className="profile-card-icon security">
                <ShieldCheck size={19} />
              </div>
              <div>
                <h2>Change Password</h2>
                <p>Use a new, unique password with at least 8 characters.</p>
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
              {savingPassword ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Profile;
