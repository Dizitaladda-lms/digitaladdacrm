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
  MapPin,
  ExternalLink,
} from "lucide-react";
import { getMyAttendanceHistory } from "../../services/attendanceService";
import MobileBiometricAttendance from "../../components/attendance/MobileBiometricAttendance";
import LeaveRequests from "../../components/attendance/LeaveRequests";
import { calculateLateArrival } from "../../utils/shiftTiming";

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
    <div style={{ maxWidth: "1200px", margin: "0 auto", width: "100%", boxSizing: "border-box", overflowX: "hidden", fontFamily: "Inter, sans-serif" }}>
      {/* Mobile Attendance Check-in Widget */}
      <MobileBiometricAttendance onCheckInSuccess={fetchHistory} />
      <LeaveRequests />

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
              Register a passkey, then use it with GPS above to create your attendance entry.
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
                        {row.check_in_location && (
                          <div style={{ fontSize: "11px", color: "#475569", marginTop: "3px", display: "flex", alignItems: "center", gap: "4px" }}>
                            <MapPin size={11} style={{ color: "#2563eb", flexShrink: 0 }} />
                            <span style={{ maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.check_in_location}>
                              {row.check_in_location}
                            </span>
                          </div>
                        )}
                        {row.check_in_lat && row.check_in_lng && (
                          <a
                            href={`https://maps.google.com/?q=${row.check_in_lat},${row.check_in_lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: "11px", color: "#2563eb", fontWeight: "600", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "2px", marginTop: "2px" }}
                          >
                            📍 View Map <ExternalLink size={10} />
                          </a>
                        )}
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ color: "#9a3412", fontWeight: "700", fontSize: "14px" }}>{checkOut}</div>
                        {row.check_out_location && (
                          <div style={{ fontSize: "11px", color: "#475569", marginTop: "3px", display: "flex", alignItems: "center", gap: "4px" }}>
                            <MapPin size={11} style={{ color: "#ea580c", flexShrink: 0 }} />
                            <span style={{ maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.check_out_location}>
                              {row.check_out_location}
                            </span>
                          </div>
                        )}
                        {row.check_out_lat && row.check_out_lng && (
                          <a
                            href={`https://maps.google.com/?q=${row.check_out_lat},${row.check_out_lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: "11px", color: "#ea580c", fontWeight: "600", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "2px", marginTop: "2px" }}
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
                        <span style={{ fontSize: "12px", color: "#0284c7", display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: "600" }}>
                          <Wifi size={13} /> Office Verified ({row.ip_address || "127.0.0.1"})
                        </span>
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
