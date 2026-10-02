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
  ShieldCheck,
  FileText,
} from "lucide-react";
import { getMyAttendanceHistory } from "../../services/attendanceService";
import MobileBiometricAttendance from "../../components/attendance/MobileBiometricAttendance";

const MyAttendance = () => {
  const [attendanceList, setAttendanceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalRecords: 0 });

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await getMyAttendanceHistory({ page: pagination.page, limit: 15 });
      if (res?.data) {
        const list = res.data.attendance || [];
        setAttendanceList(list);
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
      console.error("Failed to fetch personal attendance history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [pagination.page]);

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      {/* Mobile Attendance Check-in Widget */}
      <MobileBiometricAttendance onCheckInSuccess={fetchHistory} />

      {/* History Header & Read-Only Notice */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          padding: "20px 24px",
          marginBottom: "20px",
          border: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#0f172a" }}>
              My Personal Attendance History
            </h2>
            <span
              style={{
                background: "#f1f5f9",
                color: "#475569",
                fontSize: "12px",
                fontWeight: "600",
                padding: "3px 10px",
                borderRadius: "12px",
                border: "1px solid #cbd5e1",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Lock size={12} /> Read-Only Record
            </span>
          </div>
          <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "13.5px" }}>
            Verified check-in and check-out records synced directly to HR.
          </p>
        </div>

        <button
          onClick={fetchHistory}
          style={{
            background: "#f8fafc",
            border: "1px solid #cbd5e1",
            padding: "8px 14px",
            borderRadius: "8px",
            color: "#334155",
            fontWeight: "600",
            fontSize: "13px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh Log
        </button>
      </div>

      {/* Attendance Table */}
      <div style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>
            <RefreshCw size={28} style={{ animation: "spin 1s linear infinite", marginBottom: "8px" }} />
            <p>Loading attendance history...</p>
          </div>
        ) : attendanceList.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 24px", color: "#64748b" }}>
            <AlertCircle size={36} style={{ color: "#94a3b8", marginBottom: "8px" }} />
            <h3 style={{ margin: "0 0 4px 0", color: "#334155" }}>No Attendance Records Found</h3>
            <p style={{ margin: 0, fontSize: "14px" }}>
              Mark your mobile fingerprint check-in above to create your first attendance entry.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569", fontWeight: "600" }}>
                  <th style={{ padding: "14px 18px" }}>Date</th>
                  <th style={{ padding: "14px 18px" }}>Check-In Time</th>
                  <th style={{ padding: "14px 18px" }}>Check-Out Time</th>
                  <th style={{ padding: "14px 18px" }}>Shift Hours</th>
                  <th style={{ padding: "14px 18px" }}>Wi-Fi Verification</th>
                  <th style={{ padding: "14px 18px" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {attendanceList.map((row) => {
                  const dateStr = new Date(row.date).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    weekday: "short",
                  });
                  const checkIn = row.check_in_time
                    ? new Date(row.check_in_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                    : "--";
                  const checkOut = row.check_out_time
                    ? new Date(row.check_out_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                    : "--";

                  return (
                    <tr key={row.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s ease" }}>
                      <td style={{ padding: "14px 18px", fontWeight: "600", color: "#0f172a" }}>{dateStr}</td>
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
    </div>
  );
};

export default MyAttendance;
