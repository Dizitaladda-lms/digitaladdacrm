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
} from "lucide-react";
import toast from "react-hot-toast";
import axiosInstance from "../../../api/axiosInstance";

const EmployeePerformanceModal = ({ employee, isOpen, onClose }) => {
  if (!isOpen || !employee) return null;

  const [timeframe, setTimeframe] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [perfData, setPerfData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPerformance = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/employees/${employee.id}/performance`, { params: { timeframe, date_from: dateFrom || undefined, date_to: dateTo || undefined } });
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
    total_revenue: 0,
    conversion_rate: 0,
  };

  const leadsList = perfData?.leads || [];

  return (
    <div className="crm-drawer-backdrop" style={{ zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div
        className="crm-card"
        style={{
          width: "100%",
          maxWidth: "840px",
          maxHeight: "90vh",
          backgroundColor: "#FFFFFF",
          borderRadius: "16px",
          padding: "24px",
          overflowY: "auto",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        }}
      >
        {/* Header Bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                height: "46px",
                width: "46px",
                borderRadius: "12px",
                backgroundColor: "#EFF6FF",
                color: "#2563EB",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <UserCheck size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A", margin: 0 }}>
                {employee.full_name || employee.counsellor_name} — Performance Scorecard
              </h3>
              <p style={{ fontSize: "12px", color: "#64748B", margin: "2px 0 0 0" }}>
                Code: <strong>{employee.employee_code || `EMP${employee.id}`}</strong> | Role: <strong>{employee.role || "COUNSELLOR"}</strong> | Dept: <strong>{employee.department_name || "Admissions"}</strong>
              </p>
            </div>
          </div>

          <button type="button" onClick={onClose} className="crm-close-btn">
            <X size={20} />
          </button>
        </div>

        {/* Timeframe Toggle Buttons (Week-wise, Month-wise, All Time) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "20px",
            backgroundColor: "#F8FAFC",
            padding: "12px",
            borderRadius: "12px",
            border: "1px solid #E2E8F0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 700, color: "#334155" }}>
            <Filter size={16} style={{ color: "#2563EB" }} />
            <span>Performance Timeframe:</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {[
              { id: "week", label: "This Week (7 Days)" },
              { id: "month", label: "This Month (30 Days)" },
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
                  fontWeight: 700,
                  border: "1px solid #CBD5E1",
                  cursor: "pointer",
                  backgroundColor: timeframe === t.id ? "#2563EB" : "#FFFFFF",
                  color: timeframe === t.id ? "#FFFFFF" : "#64748B",
                  transition: "all 0.2s ease",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ fontSize: "12px", color: "#475569" }}>From <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></label>
            <label style={{ fontSize: "12px", color: "#475569" }}>To <input type="date" min={dateFrom || undefined} value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></label>
            {(dateFrom || dateTo) && <button type="button" onClick={() => { setDateFrom(""); setDateTo(""); }} style={{ fontSize: "12px", color: "#2563EB", fontWeight: 700 }}>Clear dates</button>}
          </div>
        </div>

        {/* 4 Summary Scorecard Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <div className="crm-card" style={{ marginBottom: 0, padding: "14px" }}>
            <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 700, textTransform: "uppercase" }}>
              Total Assigned Leads
            </span>
            <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#0F172A", margin: "4px 0 0 0" }}>
              {loading ? "—" : summary.total_leads}
            </h3>
          </div>

          <div className="crm-card" style={{ marginBottom: 0, padding: "14px" }}>
            <span style={{ fontSize: "11px", color: "#D97706", fontWeight: 700, textTransform: "uppercase" }}>
              Pending Follow-ups
            </span>
            <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#D97706", margin: "4px 0 0 0" }}>
              {loading ? "—" : summary.pending_followups}
            </h3>
          </div>

          <div className="crm-card" style={{ marginBottom: 0, padding: "14px" }}>
            <span style={{ fontSize: "11px", color: "#16A34A", fontWeight: 700, textTransform: "uppercase" }}>
              Enrolled Conversions
            </span>
            <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#16A34A", margin: "4px 0 0 0" }}>
              {loading ? "—" : summary.enrolled_conversions}
            </h3>
          </div>

          <div className="crm-card" style={{ marginBottom: 0, padding: "14px" }}>
            <span style={{ fontSize: "11px", color: "#2563EB", fontWeight: 700, textTransform: "uppercase" }}>
              Revenue Generated
            </span>
            <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#2563EB", margin: "4px 0 0 0" }}>
              {loading ? "—" : `₹${Number(summary.total_revenue || 0).toLocaleString("en-IN")}`}
            </h3>
          </div>
        </div>

        {/* Conversion Rate Meter Bar */}
        <div
          style={{
            padding: "16px",
            backgroundColor: "#EFF6FF",
            borderRadius: "12px",
            border: "1px solid #BFDBFE",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <TrendingUp size={16} className="text-blue-600" />
              <strong style={{ fontSize: "13px", color: "#1E40AF" }}>Overall Conversion Efficiency</strong>
            </div>
            <strong style={{ fontSize: "16px", color: "#1E40AF" }}>{summary.conversion_rate}% Converted</strong>
          </div>
          <div style={{ height: "8px", width: "100%", backgroundColor: "#DBEAFE", borderRadius: "4px", overflow: "hidden" }}>
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
        <div className="crm-card" style={{ marginBottom: 0 }}>
          <h4 style={{ fontSize: "14px", fontWeight: 800, color: "#0F172A", margin: "0 0 12px 0" }}>
            Assigned Student Leads ({leadsList.length})
          </h4>

          {loading ? (
            <div style={{ textAlign: "center", padding: "24px", color: "#64748B", fontSize: "13px" }}>
              Loading performance details...
            </div>
          ) : leadsList.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px", backgroundColor: "#F8FAFC", borderRadius: "8px", color: "#64748B", fontSize: "13px" }}>
              No leads assigned to this employee in the selected timeframe.
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
    </div>
  );
};

export default EmployeePerformanceModal;
