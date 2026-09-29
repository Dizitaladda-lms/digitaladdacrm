import React, { useEffect, useState, useCallback } from "react";
import {
  X,
  UserCheck,
  TrendingUp,
  Clock,
  GraduationCap,
  IndianRupee,
  Calendar,
  Filter,
  Layers,
  Target,
  Award,
} from "lucide-react";
import toast from "react-hot-toast";
import axiosInstance from "../../../api/axiosInstance";
import WhatsAppIcon from "../../common/WhatsAppIcon";

const EmployeePerformanceModal = ({ employee, isOpen, onClose }) => {
  if (!isOpen || !employee) return null;

  const [timeframe, setTimeframe] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [perfData, setPerfData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "weekly" | "leads"

  const fetchPerformance = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/employees/${employee.id}/performance`, {
        params: {
          timeframe,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        },
      });
      setPerfData(res.data?.data || res.data || {});
    } catch (error) {
      console.error("Failed to fetch employee performance:", error);
      toast.error("Could not load employee performance scorecard.");
    } finally {
      setLoading(false);
    }
  }, [employee.id, timeframe, dateFrom, dateTo]);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  const summary = perfData?.summary || {
    total_leads: 0,
    pending_followups: 0,
    enrolled_conversions: 0,
    walkin_count: 0,
    rejected_leads: 0,
    total_revenue: 0,
    conversion_rate: 0,
  };

  const statusBreakdown = perfData?.status_breakdown || [];
  const courseBreakdown = perfData?.course_breakdown || [];
  const weekWise = perfData?.week_wise || [];
  const leadsList = perfData?.leads || [];

  return (
    <div
      className="crm-drawer-backdrop"
      style={{
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(3px)",
        position: "fixed",
        inset: 0,
        padding: "16px",
      }}
    >
      <div
        className="crm-card"
        style={{
          width: "100%",
          maxWidth: "960px",
          maxHeight: "92vh",
          backgroundColor: "#FFFFFF",
          borderRadius: "16px",
          padding: "24px",
          overflowY: "auto",
          border: "1.5px solid #e2e8f0",
          boxShadow:
            "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)",
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "20px",
            paddingBottom: "16px",
            borderBottom: "1.5px solid #f1f5f9",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                height: "52px",
                width: "52px",
                borderRadius: "12px",
                backgroundColor: "#eef2ff",
                color: "#4f46e5",
                border: "1px solid #c7d2fe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "18px",
              }}
            >
              {employee.full_name?.charAt(0).toUpperCase() || "E"}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: 800,
                    color: "#0F172A",
                    margin: 0,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {employee.full_name || employee.counsellor_name}
                </h3>
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 700,
                    backgroundColor: "#f1f5f9",
                    color: "#475569",
                    border: "1px solid #e2e8f0",
                    fontFamily: "monospace",
                  }}
                >
                  {employee.employee_code || `EMP${employee.id}`}
                </span>
              </div>
              <p
                style={{
                  fontSize: "12.5px",
                  color: "#64748B",
                  margin: "4px 0 0 0",
                }}
              >
                Role: <strong style={{ color: "#334155" }}>{employee.role || "COUNSELLOR"}</strong>{" "}
                | Designation:{" "}
                <strong style={{ color: "#334155" }}>
                  {employee.designation || "Admissions Counsellor"}
                </strong>{" "}
                | Department:{" "}
                <strong style={{ color: "#334155" }}>
                  {employee.department_name || "Admissions"}
                </strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "6px",
              borderRadius: "8px",
              border: "1.5px solid #e2e8f0",
              background: "#ffffff",
              color: "#64748b",
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Timeframe Filter Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "20px",
            backgroundColor: "#F8FAFC",
            padding: "12px 16px",
            borderRadius: "12px",
            border: "1.5px solid #E2E8F0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Filter size={15} style={{ color: "#4f46e5" }} />
            <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#334155" }}>
              Timeframe:
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {[
                { id: "week", label: "7 Days" },
                { id: "month", label: "30 Days" },
                { id: "all", label: "All Time" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTimeframe(t.id)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 700,
                    border: "1.5px solid",
                    borderColor: timeframe === t.id ? "#4f46e5" : "#cbd5e1",
                    cursor: "pointer",
                    backgroundColor: timeframe === t.id ? "#4f46e5" : "#FFFFFF",
                    color: timeframe === t.id ? "#FFFFFF" : "#64748B",
                    transition: "all 0.15s ease",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <label style={{ fontSize: "12px", color: "#475569", fontWeight: 600 }}>
              From:{" "}
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{
                  height: "30px",
                  padding: "0 6px",
                  borderRadius: "6px",
                  border: "1.5px solid #cbd5e1",
                  fontSize: "12px",
                }}
              />
            </label>
            <label style={{ fontSize: "12px", color: "#475569", fontWeight: 600 }}>
              To:{" "}
              <input
                type="date"
                min={dateFrom || undefined}
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{
                  height: "30px",
                  padding: "0 6px",
                  borderRadius: "6px",
                  border: "1.5px solid #cbd5e1",
                  fontSize: "12px",
                }}
              />
            </label>
            {(dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                }}
                style={{
                  fontSize: "12px",
                  color: "#4f46e5",
                  fontWeight: 700,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* 4 Essential KPI Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              padding: "16px",
              borderRadius: "12px",
              background: "#eff6ff",
              border: "1.5px solid #bfdbfe",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                color: "#1e40af",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Assigned Leads
            </span>
            <div
              style={{
                fontSize: "24px",
                fontWeight: 800,
                color: "#1e3a8a",
                marginTop: "4px",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {loading ? "—" : Number(summary.total_leads || 0).toLocaleString("en-IN")}
            </div>
          </div>

          <div
            style={{
              padding: "16px",
              borderRadius: "12px",
              background: "#fffbeb",
              border: "1.5px solid #fde68a",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                color: "#b45309",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Pending Follow-ups
            </span>
            <div
              style={{
                fontSize: "24px",
                fontWeight: 800,
                color: "#92400e",
                marginTop: "4px",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {loading ? "—" : Number(summary.pending_followups || 0).toLocaleString("en-IN")}
            </div>
          </div>

          <div
            style={{
              padding: "16px",
              borderRadius: "12px",
              background: "#f5f3ff",
              border: "1.5px solid #ddd6fe",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                color: "#6b21a8",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Admissions Enrolled
            </span>
            <div
              style={{
                fontSize: "24px",
                fontWeight: 800,
                color: "#581c87",
                marginTop: "4px",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {loading ? "—" : Number(summary.enrolled_conversions || 0).toLocaleString("en-IN")}
            </div>
          </div>

          <div
            style={{
              padding: "16px",
              borderRadius: "12px",
              background: "#f0fdf4",
              border: "1.5px solid #bbf7d0",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                color: "#15803d",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Fee Revenue Collected
            </span>
            <div
              style={{
                fontSize: "24px",
                fontWeight: 800,
                color: "#166534",
                marginTop: "4px",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {loading
                ? "—"
                : `₹${Number(summary.total_revenue || 0).toLocaleString("en-IN")}`}
            </div>
          </div>
        </div>

        {/* Conversion Rate Gauge */}
        <div
          style={{
            padding: "14px 18px",
            backgroundColor: "#f8fafc",
            borderRadius: "12px",
            border: "1.5px solid #E2E8F0",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <TrendingUp size={16} style={{ color: "#4f46e5" }} />
              <strong style={{ fontSize: "13px", color: "#334155" }}>
                Overall Conversion Efficiency: {summary.conversion_rate}%
              </strong>
            </div>
            <span style={{ fontSize: "12px", color: "#64748b" }}>
              {summary.enrolled_conversions || 0} Admissions from {summary.total_leads || 0} Leads
            </span>
          </div>
          <div
            style={{
              height: "7px",
              width: "100%",
              backgroundColor: "#E2E8F0",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.min(100, summary.conversion_rate || 0)}%`,
                backgroundColor:
                  summary.conversion_rate >= 30
                    ? "#16A34A"
                    : summary.conversion_rate >= 15
                    ? "#4f46e5"
                    : "#D97706",
                borderRadius: "4px",
                transition: "width 0.5s ease",
              }}
            />
          </div>
        </div>

        {/* View Navigation Tabs */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            borderBottom: "1.5px solid #e2e8f0",
            marginBottom: "18px",
          }}
        >
          {[
            { id: "overview", label: "Pipeline & Course Breakdown" },
            { id: "weekly", label: `Weekly Trend (${weekWise.length} Weeks)` },
            { id: "leads", label: `Assigned Leads (${leadsList.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: 700,
                border: "none",
                background: "none",
                color: activeTab === tab.id ? "#4f46e5" : "#64748b",
                borderBottom:
                  activeTab === tab.id
                    ? "2px solid #4f46e5"
                    : "2px solid transparent",
                cursor: "pointer",
                marginBottom: "-1.5px",
                transition: "all 0.15s ease",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: Pipeline & Course Breakdown */}
        {activeTab === "overview" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
              gap: "16px",
            }}
          >
            {/* Pipeline Stage Distribution */}
            <div
              style={{
                background: "#f8fafc",
                borderRadius: "12px",
                padding: "16px",
                border: "1.5px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "12px",
                }}
              >
                <Target size={16} style={{ color: "#4f46e5" }} />
                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#0f172a" }}>
                  Lead Pipeline Stages
                </h4>
              </div>
              {statusBreakdown.length === 0 ? (
                <p style={{ fontSize: "12.5px", color: "#64748b", textAlign: "center", padding: "16px 0" }}>
                  No lead stages recorded yet.
                </p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                  {statusBreakdown.map((sb, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "8px",
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "11px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          color: "#475569",
                        }}
                      >
                        <span>{sb.status}</span>
                        <strong style={{ color: "#0f172a" }}>{sb.count}</strong>
                      </div>
                      <div
                        style={{
                          height: "4px",
                          background: "#f1f5f9",
                          borderRadius: "4px",
                          marginTop: "6px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${summary.total_leads > 0 ? Math.min(100, Math.round((Number(sb.count) / summary.total_leads) * 100)) : 0}%`,
                            background: "#4f46e5",
                            borderRadius: "4px",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Converting Courses */}
            <div
              style={{
                background: "#f8fafc",
                borderRadius: "12px",
                padding: "16px",
                border: "1.5px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "12px",
                }}
              >
                <GraduationCap size={16} style={{ color: "#7c3aed" }} />
                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#0f172a" }}>
                  Top Converting Courses
                </h4>
              </div>
              {courseBreakdown.length === 0 ? (
                <p style={{ fontSize: "12.5px", color: "#64748b", textAlign: "center", padding: "16px 0" }}>
                  No course conversion records.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {courseBreakdown.map((cb, idx) => {
                    const convRate =
                      Number(cb.total_leads) > 0
                        ? Math.round((Number(cb.enrolled) / Number(cb.total_leads)) * 100)
                        : 0;
                    return (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: "13px", color: "#0f172a" }}>{cb.course}</strong>
                          <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>
                            {cb.total_leads} leads assigned
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span
                            style={{
                              padding: "2px 7px",
                              borderRadius: "4px",
                              background: "#f3e8ff",
                              color: "#6b21a8",
                              fontWeight: 750,
                              fontSize: "11px",
                            }}
                          >
                            🎓 {cb.enrolled} Enrolled
                          </span>
                          <span
                            style={{
                              padding: "2px 7px",
                              borderRadius: "4px",
                              background: "#dcfce7",
                              color: "#15803d",
                              fontWeight: 700,
                              fontSize: "11px",
                            }}
                          >
                            {convRate}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Week-Wise Performance Trend */}
        {activeTab === "weekly" && (
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              border: "1.5px solid #e2e8f0",
              overflow: "hidden",
            }}
          >
            {weekWise.length === 0 ? (
              <p style={{ textAlign: "center", padding: "24px", color: "#64748b", fontSize: "13px" }}>
                No weekly records recorded yet.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                  <thead>
                    <tr
                      style={{
                        background: "#f8fafc",
                        borderBottom: "1.5px solid #e2e8f0",
                        color: "#475569",
                        textAlign: "left",
                        fontSize: "11px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                      }}
                    >
                      <th style={{ padding: "10px 14px" }}>Week</th>
                      <th style={{ padding: "10px 14px" }}>Duration</th>
                      <th style={{ padding: "10px 14px" }}>Assigned</th>
                      <th style={{ padding: "10px 14px" }}>Completed</th>
                      <th style={{ padding: "10px 14px" }}>Pending</th>
                      <th style={{ padding: "10px 14px" }}>Admissions Done</th>
                      <th style={{ padding: "10px 14px" }}>Conversion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weekWise.map((w, idx) => {
                      const assigned = Number(w.assigned_count || 0);
                      const completed = Number(w.completed_count || 0);
                      const enrolled = Number(w.enrolled_count || 0);
                      const pending = Number(w.pending_count || 0);
                      const rate = assigned > 0 ? Math.min(100, Math.round((enrolled / assigned) * 100)) : 0;

                      return (
                        <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "10px 14px", fontWeight: 700, color: "#0f172a" }}>
                            {w.week_name}
                          </td>
                          <td style={{ padding: "10px 14px", color: "#64748b" }}>{w.week_label}</td>
                          <td style={{ padding: "10px 14px", fontWeight: 650 }}>{assigned}</td>
                          <td style={{ padding: "10px 14px", color: "#16a34a", fontWeight: 650 }}>
                            {completed}
                          </td>
                          <td style={{ padding: "10px 14px", color: "#d97706", fontWeight: 650 }}>
                            {pending}
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: "4px",
                                background: "#f3e8ff",
                                color: "#6b21a8",
                                fontWeight: 700,
                              }}
                            >
                              🎓 {enrolled}
                            </span>
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <div
                                style={{
                                  width: "60px",
                                  height: "6px",
                                  background: "#e2e8f0",
                                  borderRadius: "4px",
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    height: "100%",
                                    width: `${rate}%`,
                                    background: rate >= 20 ? "#16a34a" : "#4f46e5",
                                    borderRadius: "4px",
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: "11px", fontWeight: 700, color: "#334155" }}>
                                {rate}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Assigned Leads List with WhatsApp */}
        {activeTab === "leads" && (
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              border: "1.5px solid #e2e8f0",
              overflow: "hidden",
            }}
          >
            {leadsList.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "24px",
                  color: "#64748B",
                  fontSize: "13px",
                }}
              >
                No leads assigned to this employee in the selected timeframe.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    textAlign: "left",
                    fontSize: "12.5px",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: "#f8fafc",
                        borderBottom: "1.5px solid #e2e8f0",
                        color: "#475569",
                        fontSize: "11px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                      }}
                    >
                      <th style={{ padding: "10px 14px" }}>Student & Code</th>
                      <th style={{ padding: "10px 14px" }}>Course</th>
                      <th style={{ padding: "10px 14px" }}>Status</th>
                      <th style={{ padding: "10px 14px" }}>Priority</th>
                      <th style={{ padding: "10px 14px" }}>Assigned Date</th>
                      <th style={{ padding: "10px 14px" }}>WhatsApp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leadsList.map((lead) => {
                      const cleanPhone = String(lead.mobile || "").replace(/\D/g, "").slice(-10);
                      return (
                        <tr key={lead.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "10px 14px" }}>
                            <strong style={{ color: "#0F172A", display: "block" }}>
                              {lead.full_name}
                            </strong>
                            <span
                              style={{
                                color: "#4f46e5",
                                fontFamily: "monospace",
                                fontSize: "11px",
                              }}
                            >
                              {lead.lead_code}
                            </span>
                          </td>
                          <td style={{ padding: "10px 14px", color: "#334155" }}>
                            {lead.interested_course || "Program Inquiry"}
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontSize: "11px",
                                fontWeight: 700,
                                background:
                                  lead.status === "ENROLLED"
                                    ? "#f3e8ff"
                                    : lead.status === "FOLLOW_UP"
                                    ? "#fef3c7"
                                    : "#eff6ff",
                                color:
                                  lead.status === "ENROLLED"
                                    ? "#6b21a8"
                                    : lead.status === "FOLLOW_UP"
                                    ? "#b45309"
                                    : "#2563eb",
                              }}
                            >
                              {lead.status || "NEW"}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: "10px 14px",
                              fontWeight: 700,
                              color: lead.priority === "HIGH" ? "#DC2626" : "#64748B",
                            }}
                          >
                            {lead.priority || "MEDIUM"}
                          </td>
                          <td style={{ padding: "10px 14px", color: "#64748B" }}>
                            {lead.created_at
                              ? new Date(lead.created_at).toLocaleDateString("en-IN")
                              : "—"}
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            {cleanPhone ? (
                              <a
                                href={`https://wa.me/91${cleanPhone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`WhatsApp ${lead.full_name}`}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  padding: "4px 8px",
                                  borderRadius: "6px",
                                  background: "#f0fdf4",
                                  color: "#15803d",
                                  border: "1px solid #bbf7d0",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  textDecoration: "none",
                                }}
                              >
                                <WhatsAppIcon size={13} />
                                <span>WhatsApp</span>
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeePerformanceModal;
