import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Users,
  PhoneCall,
  GraduationCap,
  Calendar,
  Search,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertCircle,
  Award,
  DollarSign,
  Filter,
  Eye,
  Building2,
  ShieldCheck,
  UserCheck,
  CalendarDays,
} from "lucide-react";
import toast from "react-hot-toast";
import { getTeamReports, reviewReportAsHR } from "../../services/reportService";
import { useAuth } from "../../context/AuthContext";
import ReportDetailsModal from "../../components/reports/ReportDetailsModal";
import { formatWorkHours } from "../../utils/shiftTiming";
import EmployeePerformanceModal from "../../components/admin/employees/EmployeePerformanceModal";

const SalesDepartmentReport = () => {
  const { user } = useAuth();
  const role = user?.role || "";
  const isSuperAdmin = role === "SUPER_ADMIN";
  const isHR = role === "HR";
  const canSeeSalesReport = isSuperAdmin || isHR;

  const [loading, setLoading] = useState(false);
  const [dateRangeMode, setDateRangeMode] = useState("TODAY"); // "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "ALL_TIME" | "CUSTOM"
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [attendanceFilter, setAttendanceFilter] = useState("ALL"); // "ALL" | "PRESENT" | "NOT_CHECKED_IN"
  const [statusFilter, setStatusFilter] = useState("");
  const [salesMetrics, setSalesMetrics] = useState({
    kpi: { totalLeads: 0, totalCalls: 0, connectedCalls: 0, totalAdmissions: 0, totalRevenue: 0 },
    counsellors: [],
  });
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);

  // Scorecard modal state
  const [selectedEmployeeForPerf, setSelectedEmployeeForPerf] = useState(null);
  const [isPerfModalOpen, setIsPerfModalOpen] = useState(false);

  if (!canSeeSalesReport) {
    return (
      <div style={{ padding: "48px 24px", textAlign: "center", fontFamily: "Inter, sans-serif" }}>
        <div
          style={{
            maxWidth: "480px",
            margin: "0 auto",
            background: "#ffffff",
            borderRadius: "16px",
            padding: "36px 24px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)",
          }}
        >
          <AlertCircle size={48} style={{ color: "#ef4444", marginBottom: "16px" }} />
          <h2 style={{ margin: "0 0 8px 0", color: "#0f172a", fontSize: "20px", fontWeight: "700" }}>
            Access Restricted
          </h2>
          <p style={{ color: "#64748b", fontSize: "14px", lineHeight: "1.5", margin: 0 }}>
            The Sales Department Performance & Revenue Overview is strictly restricted to <strong>HR and Super Admin</strong>.
          </p>
        </div>
      </div>
    );
  }

  // Helper for quick date range selection
  const handleDatePreset = (mode) => {
    setDateRangeMode(mode);
    const today = new Date();

    if (mode === "TODAY") {
      const dateStr = today.toISOString().split("T")[0];
      setStartDate(dateStr);
      setEndDate(dateStr);
    } else if (mode === "THIS_WEEK") {
      const first = today.getDate() - today.getDay();
      const firstDay = new Date(today.setDate(first)).toISOString().split("T")[0];
      const todayStr = new Date().toISOString().split("T")[0];
      setStartDate(firstDay);
      setEndDate(todayStr);
    } else if (mode === "THIS_MONTH") {
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      setStartDate(`${year}-${month}-01`);
      setEndDate(today.toISOString().split("T")[0]);
    } else if (mode === "ALL_TIME") {
      setStartDate("");
      setEndDate("");
    }
  };

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      const params = {};

      if (dateRangeMode === "ALL_TIME") {
        // No date constraint for all time
      } else if (startDate && endDate && startDate === endDate) {
        params.date = startDate;
      } else {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }

      if (statusFilter) params.status = statusFilter;

      const res = await getTeamReports(params);

      if (!res?.data?.salesMetrics) {
        throw new Error("Sales overview metrics were not returned by the server.");
      }

      setSalesMetrics(res.data.salesMetrics);
      setReports(Array.isArray(res.data.reports) ? res.data.reports : []);
    } catch (err) {
      console.error("Failed to fetch Sales Department overview:", err);
      toast.error(
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load Sales Department real data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, [startDate, endDate, dateRangeMode, statusFilter]);

  const kpi = salesMetrics.kpi || { totalLeads: 0, totalCalls: 0, connectedCalls: 0, totalAdmissions: 0, totalRevenue: 0 };
  
  // Filter counsellors list with search & attendance filter
  const counsellors = (salesMetrics.counsellors || []).filter((c) => {
    // Attendance filter
    if (attendanceFilter === "PRESENT" && c.today_attendance_status !== "PRESENT") return false;
    if (attendanceFilter === "NOT_CHECKED_IN" && c.today_attendance_status === "PRESENT") return false;

    // Search filter
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.employee_name?.toLowerCase().includes(term) ||
      c.employee_code?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.designation?.toLowerCase().includes(term)
    );
  });

  const connectedCallRate = kpi.totalCalls > 0 ? ((kpi.connectedCalls / kpi.totalCalls) * 100).toFixed(1) : "0.0";
  const overallConversionRate = kpi.totalLeads > 0 ? ((kpi.totalAdmissions / kpi.totalLeads) * 100).toFixed(1) : "0.0";

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
                <ShieldCheck size={14} /> HR & Operations Live Control
              </span>
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
                  border: "1px solid rgba(251, 191, 36, 0.3)",
                }}
              >
                <TrendingUp size={13} /> Real-Time Database Analytics
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: "26px", fontWeight: "700" }}>
              Sales Department Performance & Revenue Analytics
            </h1>
            <p style={{ margin: "6px 0 0 0", color: "#94a3b8", fontSize: "14px" }}>
              Live real-time DB overview of sales counsellors, lead follow-ups, course enrollments, revenue, and daily reports.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={fetchSalesData}
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
              <RefreshCw size={16} className={loading ? "spin" : ""} /> Refresh Real Data
            </button>
          </div>
        </div>

        {/* Date Filter Presets Bar */}
        <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid rgba(255, 255, 255, 0.1)", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: "13px", color: "#94a3b8", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "5px" }}>
            <CalendarDays size={15} /> Date Range:
          </span>

          {[
            { label: "Today", value: "TODAY" },
            { label: "This Week", value: "THIS_WEEK" },
            { label: "This Month", value: "THIS_MONTH" },
            { label: "All Time", value: "ALL_TIME" },
          ].map((preset) => (
            <button
              key={preset.value}
              onClick={() => handleDatePreset(preset.value)}
              style={{
                background: dateRangeMode === preset.value ? "#3b82f6" : "rgba(255, 255, 255, 0.1)",
                color: "#ffffff",
                border: dateRangeMode === preset.value ? "1px solid #60a5fa" : "1px solid transparent",
                padding: "5px 12px",
                borderRadius: "20px",
                fontSize: "12.5px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              {preset.label}
            </button>
          ))}

          {dateRangeMode !== "ALL_TIME" && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginLeft: "auto" }}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setDateRangeMode("CUSTOM");
                  setStartDate(e.target.value);
                }}
                style={{ background: "#1e293b", border: "1px solid #475569", color: "#fff", padding: "5px 10px", borderRadius: "8px", fontSize: "12px" }}
              />
              <span style={{ color: "#94a3b8", fontSize: "12px" }}>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setDateRangeMode("CUSTOM");
                  setEndDate(e.target.value);
                }}
                style={{ background: "#1e293b", border: "1px solid #475569", color: "#fff", padding: "5px 10px", borderRadius: "8px", fontSize: "12px" }}
              />
            </div>
          )}
        </div>
      </div>

      {/* TOP 4 KPI CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "18px", marginBottom: "24px" }}>
        {/* Card 1: Leads & Calls */}
        <div style={{ background: "#ffffff", borderRadius: "12px", padding: "20px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#64748b" }}>Assigned Leads & Calls</span>
            <div style={{ background: "#eff6ff", color: "#2563eb", padding: "8px", borderRadius: "10px" }}>
              <Users size={20} />
            </div>
          </div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a" }}>
            {kpi.totalLeads} <span style={{ fontSize: "14px", color: "#64748b", fontWeight: "500" }}>leads</span>
          </div>
          <p style={{ margin: "4px 0 0 0", fontSize: "12.5px", color: "#2563eb", fontWeight: "600" }}>
            📞 {kpi.totalCalls} Total Outbound Calls
          </p>
        </div>

        {/* Card 2: Connected Calls */}
        <div style={{ background: "#ffffff", borderRadius: "12px", padding: "20px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#64748b" }}>Connected Calls Ratio</span>
            <div style={{ background: "#fffbeb", color: "#d97706", padding: "8px", borderRadius: "10px" }}>
              <PhoneCall size={20} />
            </div>
          </div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a" }}>
            {kpi.connectedCalls} <span style={{ fontSize: "14px", color: "#64748b", fontWeight: "500" }}>connected</span>
          </div>
          <p style={{ margin: "4px 0 0 0", fontSize: "12.5px", color: "#d97706", fontWeight: "600" }}>
            ⚡ {connectedCallRate}% Call Connection Rate
          </p>
        </div>

        {/* Card 3: Admissions Closed */}
        <div style={{ background: "#ffffff", borderRadius: "12px", padding: "20px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#64748b" }}>Course Admissions Closed</span>
            <div style={{ background: "#f0fdf4", color: "#16a34a", padding: "8px", borderRadius: "10px" }}>
              <GraduationCap size={20} />
            </div>
          </div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a" }}>
            {kpi.totalAdmissions} <span style={{ fontSize: "14px", color: "#64748b", fontWeight: "500" }}>enrolled</span>
          </div>
          <p style={{ margin: "4px 0 0 0", fontSize: "12.5px", color: "#16a34a", fontWeight: "600" }}>
            🎯 {overallConversionRate}% Lead Conversion
          </p>
        </div>

        {/* Card 4: Fee Revenue */}
        <div style={{ background: "#ffffff", borderRadius: "12px", padding: "20px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#64748b" }}>Fee Revenue Collected</span>
            <div style={{ background: "#fff7ed", color: "#ea580c", padding: "8px", borderRadius: "10px" }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "#ea580c" }}>
            ₹ {Number(kpi.totalRevenue || 0).toLocaleString("en-IN")}
          </div>
          <p style={{ margin: "4px 0 0 0", fontSize: "12.5px", color: "#ea580c", fontWeight: "600" }}>
            💰 Total Net Sales Revenue
          </p>
        </div>
      </div>

      {/* FILTER CONTROLS BAR & COUNSELLORS TABLE */}
      <div style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "28px", overflow: "hidden" }}>
        <div style={{ padding: "18px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: "#0f172a" }}>
              Sales Counsellors Individual Leaderboard ({counsellors.length})
            </h3>
            <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#64748b" }}>
              Real-time DB calling metrics, attendance status, admissions, and revenue per sales member.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            {/* Search Filter */}
            <div style={{ position: "relative", minWidth: "220px" }}>
              <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
              <input
                type="text"
                placeholder="Search by counsellor name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px 8px 36px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>

            {/* Attendance Filter */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Filter size={15} style={{ color: "#64748b" }} />
              <select
                value={attendanceFilter}
                onChange={(e) => setAttendanceFilter(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                  background: "#fff",
                  outline: "none",
                  fontWeight: "600",
                }}
              >
                <option value="ALL">All Attendance Status</option>
                <option value="PRESENT">Present Only</option>
                <option value="NOT_CHECKED_IN">Not Checked In</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569", fontWeight: "600" }}>
                <th style={{ padding: "14px 18px" }}>Sales Counsellor</th>
                <th style={{ padding: "14px 18px" }}>Attendance Status</th>
                <th style={{ padding: "14px 18px" }}>Assigned Leads</th>
                <th style={{ padding: "14px 18px" }}>Calls / Connected</th>
                <th style={{ padding: "14px 18px" }}>Admissions Closed</th>
                <th style={{ padding: "14px 18px" }}>Revenue (₹)</th>
                <th style={{ padding: "14px 18px" }}>Conversion %</th>
                <th style={{ padding: "14px 18px" }}>HR Performance Tag</th>
                <th style={{ padding: "14px 18px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {counsellors.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "32px", color: "#64748b" }}>
                    No sales counsellors match your active filter criteria.
                  </td>
                </tr>
              ) : (
                counsellors.map((c) => {
                  const isPresent = c.today_attendance_status === "PRESENT";
                  const conversion = parseFloat(c.conversion_rate || 0);
                  const initials = c.employee_name ? c.employee_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "CN";

                  return (
                    <tr key={c.employee_id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          {c.user_avatar ? (
                            <img
                              src={c.user_avatar}
                              alt={c.employee_name}
                              style={{ width: "38px", height: "38px", borderRadius: "50%", objectFit: "cover", border: "2px solid #e2e8f0" }}
                            />
                          ) : (
                            <div
                              style={{
                                width: "38px",
                                height: "38px",
                                borderRadius: "50%",
                                background: "linear-gradient(135deg, #2563eb, #3b82f6)",
                                color: "#ffffff",
                                fontWeight: "700",
                                fontSize: "13px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {initials}
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: "700", color: "#0f172a" }}>{c.employee_name}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                              <span style={{ fontSize: "11px", fontWeight: "600", color: "#2563eb", background: "#eff6ff", padding: "1px 6px", borderRadius: "4px", border: "1px solid #bfdbfe" }}>
                                {c.designation || c.role || "Counsellor"}
                              </span>
                              <span style={{ fontSize: "11.5px", color: "#64748b", fontWeight: "500" }}>{c.employee_code || c.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <span
                          style={{
                            fontSize: "11.5px",
                            fontWeight: "700",
                            padding: "3px 9px",
                            borderRadius: "12px",
                            background: isPresent ? "#dcfce7" : "#fee2e2",
                            color: isPresent ? "#15803d" : "#b91c1c",
                          }}
                        >
                          {isPresent ? `Present (${c.today_hours || 0}h)` : "Not Checked In"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 18px", fontWeight: "700", color: "#2563eb" }}>
                        {c.assigned_leads_count}
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <span style={{ fontWeight: "700", color: "#0f172a" }}>{c.total_calls_count}</span>
                        <span style={{ fontSize: "12px", color: "#64748b", marginLeft: "4px" }}>({c.connected_calls_count} connected)</span>
                      </td>
                      <td style={{ padding: "14px 18px", fontWeight: "700", color: "#16a34a" }}>
                        {c.admissions_count}
                      </td>
                      <td style={{ padding: "14px 18px", fontWeight: "700", color: "#ea580c" }}>
                        ₹ {Number(c.total_revenue || 0).toLocaleString("en-IN")}
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <span
                          style={{
                            fontWeight: "700",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            background: conversion > 0 ? "#eef2ff" : "#f1f5f9",
                            color: conversion > 0 ? "#4338ca" : "#64748b",
                          }}
                        >
                          {c.conversion_rate}%
                        </span>
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        {c.admissions_count >= 2 || conversion >= 10 ? (
                          <span style={{ fontSize: "11px", fontWeight: "700", background: "#fef3c7", color: "#b45309", padding: "3px 8px", borderRadius: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <Award size={12} /> Top Performer
                          </span>
                        ) : isPresent ? (
                          <span style={{ fontSize: "11px", fontWeight: "600", background: "#f1f5f9", color: "#475569", padding: "3px 8px", borderRadius: "12px" }}>
                            Active Counsellor
                          </span>
                        ) : (
                          <span style={{ fontSize: "11px", fontWeight: "600", background: "#fee2e2", color: "#991b1b", padding: "3px 8px", borderRadius: "12px" }}>
                            Needs Attention
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "14px 18px", textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEmployeeForPerf({
                              id: c.employee_id,
                              full_name: c.employee_name,
                              employee_code: c.employee_code,
                              role: c.role,
                              designation: c.designation,
                              department_name: c.department_name,
                            });
                            setIsPerfModalOpen(true);
                          }}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            border: "1px solid #bfdbfe",
                            backgroundColor: "#eff6ff",
                            color: "#2563eb",
                            fontSize: "12px",
                            fontWeight: "600",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                          }}
                        >
                          <Eye size={13} />
                          <span>Scorecard</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DAILY WORK REPORTS LOG TABLE */}
      <div style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div style={{ padding: "18px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: "#0f172a" }}>
              Sales Team Daily Work Submissions Log
            </h3>
            <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#64748b" }}>
              Detailed daily work summaries, hours logged, and verification status from sales team members.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                background: "#fff",
                outline: "none",
                fontWeight: "600",
              }}
            >
              <option value="">All Review Statuses</option>
              <option value="SUBMITTED">Pending Dept Head</option>
              <option value="TL_REVIEWED">Approved by Dept Head</option>
              <option value="HR_APPROVED">HR Approved</option>
              <option value="REVISION_REQUESTED">Revision Requested</option>
            </select>

            <span style={{ fontSize: "13px", fontWeight: "600", color: "#2563eb", background: "#eff6ff", padding: "4px 10px", borderRadius: "20px" }}>
              {reports.length} Reports Logged
            </span>
          </div>
        </div>

        {reports.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
            <AlertCircle size={32} style={{ marginBottom: "8px", color: "#94a3b8" }} />
            <p style={{ margin: 0 }}>No sales work reports submitted for this date range.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569", fontWeight: "600" }}>
                  <th style={{ padding: "14px 18px" }}>Team Member</th>
                  <th style={{ padding: "14px 18px" }}>Role / Dept</th>
                  <th style={{ padding: "14px 18px" }}>Hours Logged</th>
                  <th style={{ padding: "14px 18px" }}>Work Summary</th>
                  <th style={{ padding: "14px 18px" }}>Approval Status</th>
                  <th style={{ padding: "14px 18px" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((row) => (
                  <tr key={row.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "14px 18px" }}>
                      <div style={{ fontWeight: "700", color: "#0f172a" }}>{row.user_name}</div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>{row.employee_code || row.user_email}</div>
                    </td>
                    <td style={{ padding: "14px 18px" }}>
                      <span style={{ fontSize: "12px", fontWeight: "600", color: "#334155", background: "#f1f5f9", padding: "3px 8px", borderRadius: "6px" }}>
                        {row.role_type || "COUNSELLOR"} ({row.department_name || "Sales"})
                      </span>
                    </td>
                    <td style={{ padding: "14px 18px", fontWeight: "700", color: "#2563eb" }} title={`${Number(row.total_hours_worked || 0).toFixed(2)} decimal hrs`}>
                      <Clock size={13} style={{ display: "inline", marginRight: "4px" }} />
                      {formatWorkHours(row.total_hours_worked)}
                    </td>
                    <td style={{ padding: "14px 18px", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {row.work_title || row.tasks_summary}
                    </td>
                    <td style={{ padding: "14px 18px" }}>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: "600",
                          padding: "3px 10px",
                          borderRadius: "12px",
                          background: row.status === "HR_APPROVED" ? "#dcfce7" : row.status === "HEAD_APPROVED" || row.status === "TL_REVIEWED" ? "#dbeafe" : "#fef3c7",
                          color: row.status === "HR_APPROVED" ? "#15803d" : row.status === "HEAD_APPROVED" || row.status === "TL_REVIEWED" ? "#1e40af" : "#92400e",
                        }}
                      >
                        {row.status === "SUBMITTED"
                          ? "Pending Dept Head"
                          : row.status === "HEAD_APPROVED" || row.status === "TL_REVIEWED"
                          ? "Approved by Dept Head"
                          : row.status === "HR_APPROVED"
                          ? "HR Approved"
                          : row.status?.replace("_", " ")}
                      </span>
                    </td>
                    <td style={{ padding: "14px 18px" }}>
                      <button
                        onClick={() => setSelectedReport(row)}
                        style={{
                          background: "#eff6ff",
                          color: "#2563eb",
                          border: "none",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          fontWeight: "600",
                          fontSize: "12.5px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Eye size={14} /> View Report
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Employee 360 Performance Scorecard Modal */}
      <EmployeePerformanceModal
        employee={selectedEmployeeForPerf}
        isOpen={isPerfModalOpen}
        onClose={() => setIsPerfModalOpen(false)}
      />

      {/* Report Modal */}
      {selectedReport && (
        <ReportDetailsModal
          report={selectedReport}
          userRole="HR"
          onClose={() => setSelectedReport(null)}
          onReviewAsHR={async (rep) => {
            try {
              await reviewReportAsHR(rep.id, { status: "HR_APPROVED", feedback: "Approved by HR" });
              toast.success("Sales report approved by HR!");
              setSelectedReport(null);
              fetchSalesData();
            } catch (err) {
              toast.error("Failed to approve report.");
            }
          }}
        />
      )}
    </div>
  );
};

export default SalesDepartmentReport;
