import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  CheckCircle2,
  Lock,
  Wifi,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  Plus,
  Trash2,
  ShieldCheck,
  Building2,
  Users,
  Settings,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getHRAttendanceReports,
  getOfficeIPs,
  addOfficeIP,
  deleteOfficeIP,
} from "../../services/attendanceService";

const AttendanceReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalRecords: 0 });

  // Office Wi-Fi Whitelist State & Modal
  const [showIpModal, setShowIpModal] = useState(false);
  const [officeIps, setOfficeIps] = useState([]);
  const [newIpAddress, setNewIpAddress] = useState("");
  const [newIpLabel, setNewIpLabel] = useState("");
  const [ipLoading, setIpLoading] = useState(false);

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

  const fetchOfficeIps = async () => {
    try {
      setIpLoading(true);
      const res = await getOfficeIPs();
      if (res?.data) {
        setOfficeIps(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch office IPs:", err);
    } finally {
      setIpLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [searchTerm, statusFilter, dateFrom, dateTo, pagination.page]);

  const handleOpenIpModal = () => {
    setShowIpModal(true);
    fetchOfficeIps();
  };

  const handleAddIp = async (e) => {
    e.preventDefault();
    if (!newIpAddress.trim()) {
      return toast.error("IP Address is required.");
    }

    try {
      await addOfficeIP({ ip_address: newIpAddress, label: newIpLabel || "Office Wi-Fi" });
      toast.success("Office Wi-Fi IP whitelisted!");
      setNewIpAddress("");
      setNewIpLabel("");
      fetchOfficeIps();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add office IP.");
    }
  };

  const handleDeleteIp = async (id) => {
    try {
      await deleteOfficeIP(id);
      toast.success("Office IP removed.");
      fetchOfficeIps();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete office IP.");
    }
  };

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
                <Wifi size={13} /> Office Wi-Fi Protected
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: "26px", fontWeight: "700" }}>
              Employee Biometric Attendance & Shift Reports
            </h1>
            <p style={{ margin: "6px 0 0 0", color: "#94a3b8", fontSize: "14px" }}>
              Real-time mobile fingerprint check-ins, shift hours, and Office Wi-Fi verification logs.
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={handleOpenIpModal}
              style={{
                background: "#0284c7",
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
                boxShadow: "0 4px 12px rgba(2, 132, 199, 0.3)",
              }}
            >
              <Settings size={16} /> Manage Office Wi-Fi IPs
            </button>

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
            placeholder="Search employee name, code, or email..."
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
                  <th style={{ padding: "14px 18px" }}>Check-In</th>
                  <th style={{ padding: "14px 18px" }}>Check-Out</th>
                  <th style={{ padding: "14px 18px" }}>Shift Hours</th>
                  <th style={{ padding: "14px 18px" }}>Office Wi-Fi IP</th>
                  <th style={{ padding: "14px 18px" }}>Status</th>
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
                      <td style={{ padding: "14px 18px", color: "#166534", fontWeight: "600" }}>{checkIn}</td>
                      <td style={{ padding: "14px 18px", color: "#9a3412", fontWeight: "600" }}>{checkOut}</td>
                      <td style={{ padding: "14px 18px" }}>
                        <span style={{ fontWeight: "700", color: "#2563eb", background: "#eff6ff", padding: "4px 8px", borderRadius: "6px" }}>
                          {row.live_hours || row.total_hours || "0.0"} hrs
                        </span>
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <span style={{ fontSize: "12px", color: "#0284c7", display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: "600" }}>
                          <Wifi size={13} /> Office Verified ({row.ip_address || "127.0.0.1"})
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Office Wi-Fi Whitelist Modal */}
      {showIpModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={() => setShowIpModal(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "28px",
              maxWidth: "560px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Wifi size={20} style={{ color: "#0284c7" }} />
                <h2 style={{ margin: 0, fontSize: "19px", color: "#0f172a" }}>Whitelisted Office Wi-Fi IPs</h2>
              </div>
              <button onClick={() => setShowIpModal(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#64748b" }}>
                ✕
              </button>
            </div>

            {/* Add IP Form */}
            <form onSubmit={handleAddIp} style={{ marginBottom: "24px", background: "#f8fafc", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#334155" }}>Add Approved Office Wi-Fi IP</h4>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "10px" }}>
                <input
                  type="text"
                  placeholder="IP Address (e.g. 103.21.45.67)"
                  value={newIpAddress}
                  onChange={(e) => setNewIpAddress(e.target.value)}
                  style={{ flex: 1, padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                />
                <input
                  type="text"
                  placeholder="Label (e.g. Main Office Router)"
                  value={newIpLabel}
                  onChange={(e) => setNewIpLabel(e.target.value)}
                  style={{ flex: 1, padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                />
              </div>
              <button
                type="submit"
                style={{
                  background: "#0284c7",
                  color: "#fff",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  fontWeight: "600",
                  fontSize: "13px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Plus size={15} /> Add IP Address
              </button>
            </form>

            {/* Whitelisted IP List */}
            <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#334155" }}>Currently Active Office IPs</h4>
            {ipLoading ? (
              <p style={{ color: "#64748b" }}>Loading IPs...</p>
            ) : officeIps.length === 0 ? (
              <p style={{ color: "#64748b" }}>No whitelisted IPs found.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {officeIps.map((ip) => (
                  <div
                    key={ip.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      background: "#fff",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "14px" }}>{ip.ip_address}</div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>{ip.label || "Office Wi-Fi"}</div>
                    </div>
                    <button
                      onClick={() => handleDeleteIp(ip.id)}
                      style={{ background: "#fee2e2", border: "none", color: "#b91c1c", padding: "6px 10px", borderRadius: "6px", cursor: "pointer" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceReports;
