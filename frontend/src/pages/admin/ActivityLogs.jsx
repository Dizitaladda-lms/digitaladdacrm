import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Search,
  KeyRound,
  UsersRound,
  FileText,
  AlertTriangle,
  Clock,
  X,
  Eye,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpDown,
} from "lucide-react";
import {
  getActivityLogs,
  getActivityLogStats,
} from "../../services/activityLogService";
import toast from "react-hot-toast";
import "./ActivityLogs.css";

const MODULE_OPTIONS = [
  { value: "ALL", label: "All Modules" },
  { value: "AUTH", label: "🔑 Auth & Logins" },
  { value: "LEADS", label: "👥 Leads Management" },
  { value: "EMPLOYEES", label: "💼 Employees & Staff" },
  { value: "DOCUMENTS", label: "📄 Employee Documents" },
  { value: "ATTENDANCE", label: "📍 Attendance & GPS" },
  { value: "SETTINGS", label: "⚙️ System Settings" },
  { value: "ROSTER", label: "📅 Roster & Shifts" },
];

const ACTION_OPTIONS = [
  { value: "ALL", label: "All Actions" },
  { value: "LOGIN_SUCCESS", label: "Login Success" },
  { value: "LOGIN_FAILED", label: "Login Failed" },
  { value: "LOGOUT", label: "Logout" },
  { value: "CREATE", label: "Create" },
  { value: "UPDATE", label: "Update / Edit" },
  { value: "DELETE", label: "Delete" },
  { value: "CHECK_IN", label: "Check In" },
  { value: "CHECK_OUT", label: "Check Out" },
  { value: "DOCUMENT_UPLOADED", label: "Doc Uploaded" },
  { value: "DOCUMENT_VIEWED", label: "Doc Viewed" },
  { value: "PASSWORD_CHANGED", label: "Password Changed" },
];

const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    total_today: 0,
    logins_today: 0,
    failed_logins_today: 0,
    changes_today: 0,
    active_users_today: 0,
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("ALL");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateRange, setDateRange] = useState("ALL"); // ALL | TODAY | 7D | 30D

  const [selectedLog, setSelectedLog] = useState(null);

  const calculateDateBounds = (range) => {
    if (range === "TODAY") {
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
      }).format(new Date());
      return { startDate: today, endDate: today };
    }
    if (range === "7D") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      const start = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
      }).format(d);
      return { startDate: start, endDate: "" };
    }
    if (range === "30D") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      const start = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
      }).format(d);
      return { startDate: start, endDate: "" };
    }
    return { startDate: "", endDate: "" };
  };

  const loadLogs = useCallback(
    async (targetPage = 1) => {
      try {
        setLoading(true);
        const { startDate, endDate } = calculateDateBounds(dateRange);

        const [logRes, statRes] = await Promise.allSettled([
          getActivityLogs({
            page: targetPage,
            limit: 25,
            search,
            module: moduleFilter !== "ALL" ? moduleFilter : "",
            action: actionFilter !== "ALL" ? actionFilter : "",
            status: statusFilter !== "ALL" ? statusFilter : "",
            startDate,
            endDate,
          }),
          getActivityLogStats(),
        ]);

        if (logRes.status === "fulfilled" && logRes.value?.data) {
          const data = logRes.value.data;
          setLogs(data.logs || []);
          setTotal(data.total || 0);
          setPage(data.page || 1);
          setTotalPages(data.totalPages || 1);
        }

        if (statRes.status === "fulfilled" && statRes.value?.data) {
          setStats(statRes.value.data);
        }
      } catch (err) {
        console.error("Failed to load activity logs:", err);
        toast.error("Could not load activity logs.");
      } finally {
        setLoading(false);
      }
    },
    [search, moduleFilter, actionFilter, statusFilter, dateRange]
  );

  useEffect(() => {
    loadLogs(1);
  }, [loadLogs]);

  const handleResetFilters = () => {
    setSearch("");
    setModuleFilter("ALL");
    setActionFilter("ALL");
    setStatusFilter("ALL");
    setDateRange("ALL");
  };

  const formatTimestamp = (iso) => {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return d.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    } catch {
      return iso;
    }
  };

  const getBadgeClass = (action, status) => {
    if (status === "FAILED" || action.includes("FAILED")) return "act-badge-failed";
    if (action.includes("LOGIN") || action.includes("CHECK_IN")) return "act-badge-success";
    if (action.includes("CREATE") || action.includes("UPLOAD")) return "act-badge-create";
    if (action.includes("UPDATE") || action.includes("EDIT")) return "act-badge-update";
    if (action.includes("DELETE") || action.includes("REMOVE")) return "act-badge-delete";
    return "act-badge-neutral";
  };

  return (
    <div className="act-logs-page">
      {/* Header */}
      <div className="act-logs-header">
        <div className="act-logs-title-wrap">
          <h1>
            <ShieldAlert size={26} style={{ color: "#2563eb" }} />
            Activity Logs &amp; Audit Trail
          </h1>
          <p>
            Real-time monitoring of all user logins, data modifications, security events, and system changes across the CRM.
          </p>
        </div>

        <div className="act-logs-actions">
          <button
            type="button"
            className="btn-act-refresh"
            onClick={() => loadLogs(page)}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "spin-anim" : ""} />
            {loading ? "Refreshing..." : "Refresh Logs"}
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="act-stats-grid">
        <div className="act-stat-card">
          <div className="act-stat-icon-wrap" style={{ background: "#eff6ff", color: "#2563eb" }}>
            <Layers size={22} />
          </div>
          <div className="act-stat-info">
            <span className="act-stat-label">Total Activities Today</span>
            <span className="act-stat-value">{stats.total_today || 0}</span>
          </div>
        </div>

        <div className="act-stat-card">
          <div className="act-stat-icon-wrap" style={{ background: "#ecfdf5", color: "#059669" }}>
            <KeyRound size={22} />
          </div>
          <div className="act-stat-info">
            <span className="act-stat-label">Logins Today</span>
            <span className="act-stat-value">{stats.logins_today || 0}</span>
          </div>
        </div>

        <div className="act-stat-card">
          <div className="act-stat-icon-wrap" style={{ background: "#fffbeb", color: "#d97706" }}>
            <ArrowUpDown size={22} />
          </div>
          <div className="act-stat-info">
            <span className="act-stat-label">Data Changes Today</span>
            <span className="act-stat-value">{stats.changes_today || 0}</span>
          </div>
        </div>

        <div className="act-stat-card">
          <div className="act-stat-icon-wrap" style={{ background: "#f5f3ff", color: "#7c3aed" }}>
            <UsersRound size={22} />
          </div>
          <div className="act-stat-info">
            <span className="act-stat-label">Active Users Today</span>
            <span className="act-stat-value">{stats.active_users_today || 0}</span>
          </div>
        </div>

        <div className="act-stat-card">
          <div
            className="act-stat-icon-wrap"
            style={{
              background: stats.failed_logins_today > 0 ? "#fef2f2" : "#f1f5f9",
              color: stats.failed_logins_today > 0 ? "#dc2626" : "#64748b",
            }}
          >
            <AlertTriangle size={22} />
          </div>
          <div className="act-stat-info">
            <span className="act-stat-label">Failed Logins Today</span>
            <span
              className="act-stat-value"
              style={{ color: stats.failed_logins_today > 0 ? "#dc2626" : undefined }}
            >
              {stats.failed_logins_today || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="act-filters-card">
        <div className="act-filters-row">
          <div className="act-search-box">
            <Search size={16} className="act-search-icon" />
            <input
              type="text"
              placeholder="Search user, email, description, IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="act-search-input"
            />
          </div>

          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="act-select"
          >
            {MODULE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="act-select"
          >
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="act-select"
          >
            <option value="ALL">All Time</option>
            <option value="TODAY">Today Only</option>
            <option value="7D">Last 7 Days</option>
            <option value="30D">Last 30 Days</option>
          </select>

          {(search || moduleFilter !== "ALL" || actionFilter !== "ALL" || dateRange !== "ALL") && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="btn-act-reset"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Activity Table */}
      <div className="act-table-container">
        <div className="act-table-wrap">
          <table className="act-table">
            <thead>
              <tr>
                <th style={{ width: "170px" }}>Timestamp (IST)</th>
                <th style={{ width: "220px" }}>User / Actor</th>
                <th style={{ width: "130px" }}>Module</th>
                <th style={{ width: "150px" }}>Action</th>
                <th>Activity Description &amp; Details</th>
                <th style={{ width: "160px" }}>IP &amp; Device</th>
                <th style={{ width: "70px", textAlign: "center" }}>View</th>
              </tr>
            </thead>
            <tbody>
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "40px" }}>
                    <RefreshCw size={24} className="spin-anim" style={{ margin: "0 auto 10px", color: "#3b82f6" }} />
                    <p style={{ color: "#64748b", margin: 0 }}>Loading activity logs...</p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "50px 20px" }}>
                    <ShieldCheck size={36} style={{ color: "#10b981", margin: "0 auto 10px" }} />
                    <strong style={{ display: "block", color: "#0f172a", fontSize: "15px" }}>
                      No activity logs match your filter
                    </strong>
                    <p style={{ color: "#64748b", margin: "4px 0 0" }}>
                      Try adjusting the search keyword or selecting a different module/date range.
                    </p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const badgeCls = getBadgeClass(log.action, log.status);
                  const initials = (log.user_name || log.user_email || "U")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <tr key={log.id}>
                      {/* Timestamp */}
                      <td style={{ whiteSpace: "nowrap", fontSize: "12px", color: "#475569" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Clock size={13} style={{ color: "#94a3b8" }} />
                          {formatTimestamp(log.created_at)}
                        </div>
                      </td>

                      {/* User Cell */}
                      <td>
                        <div className="act-user-cell">
                          <div className="act-user-avatar">{initials}</div>
                          <div className="act-user-meta">
                            <span className="act-user-name">
                              {log.user_name || "System / Guest"}
                            </span>
                            <span className="act-user-role">
                              {log.role || log.user_email || "External"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Module */}
                      <td>
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: "12px",
                            color: "#475569",
                            background: "#f1f5f9",
                            padding: "3px 8px",
                            borderRadius: "5px",
                          }}
                        >
                          {log.module}
                        </span>
                      </td>

                      {/* Action */}
                      <td>
                        <span className={`act-badge ${badgeCls}`}>
                          {log.status === "FAILED" ? (
                            <AlertTriangle size={12} />
                          ) : log.action.includes("LOGIN") ? (
                            <KeyRound size={12} />
                          ) : (
                            <CheckCircle2 size={12} />
                          )}
                          {log.action}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="act-desc-cell">
                        <span className="act-desc-text">
                          {log.description || "Activity recorded"}
                        </span>
                        {log.entity_name && (
                          <div className="act-meta-chips">
                            <span className="act-meta-chip">
                              Target: {log.entity_name}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* IP & Device */}
                      <td>
                        <div className="act-meta-chips" style={{ flexDirection: "column" }}>
                          {log.ip_address && (
                            <span className="act-meta-chip ip-chip">
                              📍 {log.ip_address}
                            </span>
                          )}
                          {log.device_name && (
                            <span className="act-meta-chip" title={log.user_agent}>
                              💻 {log.device_name}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* View Button */}
                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          title="View complete metadata"
                          style={{
                            background: "transparent",
                            border: 0,
                            color: "#3b82f6",
                            cursor: "pointer",
                            padding: "6px",
                            borderRadius: "6px",
                          }}
                        >
                          <Eye size={17} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="act-pagination">
          <span className="act-page-info">
            Showing Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total} total records)
          </span>

          <div className="act-page-btns">
            <button
              type="button"
              className="btn-page-step"
              onClick={() => loadLogs(page - 1)}
              disabled={page <= 1 || loading}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn-page-step"
              onClick={() => loadLogs(page + 1)}
              disabled={page >= totalPages || loading}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Metadata Detail Modal */}
      {selectedLog && (
        <div className="act-modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="act-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="act-modal-header">
              <h3>Activity Log Details (#{selectedLog.id})</h3>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                style={{ background: 0, border: 0, cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="act-modal-body">
              <div className="act-modal-row">
                <strong>Timestamp:</strong>
                <span>{formatTimestamp(selectedLog.created_at)}</span>
              </div>
              <div className="act-modal-row">
                <strong>Action:</strong>
                <span>
                  <span className={`act-badge ${getBadgeClass(selectedLog.action, selectedLog.status)}`}>
                    {selectedLog.action}
                  </span>
                </span>
              </div>
              <div className="act-modal-row">
                <strong>Module:</strong>
                <span>{selectedLog.module}</span>
              </div>
              <div className="act-modal-row">
                <strong>Actor:</strong>
                <span>
                  {selectedLog.user_name || "Unknown"} ({selectedLog.user_email || "N/A"}) — Role: {selectedLog.role || "N/A"}
                </span>
              </div>
              <div className="act-modal-row">
                <strong>Description:</strong>
                <span>{selectedLog.description}</span>
              </div>
              <div className="act-modal-row">
                <strong>IP Address:</strong>
                <span>{selectedLog.ip_address || "N/A"}</span>
              </div>
              <div className="act-modal-row">
                <strong>Device:</strong>
                <span>{selectedLog.device_name || "N/A"}</span>
              </div>
              <div className="act-modal-row">
                <strong>User Agent:</strong>
                <span style={{ fontSize: "11px", color: "#64748b" }}>
                  {selectedLog.user_agent || "N/A"}
                </span>
              </div>

              <div style={{ marginTop: "14px" }}>
                <strong>Raw Metadata / Changed Fields:</strong>
                <pre className="act-json-box">
                  {JSON.stringify(
                    typeof selectedLog.details === "string"
                      ? JSON.parse(selectedLog.details || "{}")
                      : selectedLog.details || {},
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>

            <div className="act-modal-footer">
              <button
                type="button"
                className="btn-page-step"
                onClick={() => setSelectedLog(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityLogs;
