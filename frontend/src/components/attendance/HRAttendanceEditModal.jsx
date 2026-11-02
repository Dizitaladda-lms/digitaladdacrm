import React, { useState, useEffect, useMemo } from "react";
import { Clock, Calendar, UserCheck, X, CheckCircle2, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import {
  upsertEmployeeAttendanceByHR,
  getEmployeeAttendanceQuotaSummary,
} from "../../services/attendanceService";

const toIstTimeInputValue = (isoStr) => {
  if (!isoStr) return "";
  if (/^\d{2}:\d{2}/.test(String(isoStr).trim())) {
    return String(isoStr).trim().slice(0, 5);
  }
  const dt = new Date(isoStr);
  if (Number.isNaN(dt.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(dt);
  const h = parts.find((p) => p.type === "hour")?.value || "00";
  const m = parts.find((p) => p.type === "minute")?.value || "00";
  return `${h === "24" ? "00" : h}:${m}`;
};

const toDateInputValue = (val) => {
  if (!val) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(val).trim())) {
    return String(val).trim();
  }
  const dt = new Date(val);
  if (Number.isNaN(dt.getTime())) return String(val).slice(0, 10);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(dt);
};

const getCurrentIstTimeStr = () => toIstTimeInputValue(new Date().toISOString());

const HRAttendanceEditModal = ({
  isOpen,
  onClose,
  onSaved,
  initialRecord = null,
  employeesList = [],
  employeesLoading = false,
  defaultWorkMode = null,
}) => {
  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("AUTO");
  const [workMode, setWorkMode] = useState("OFFICE");
  const [checkInTime, setCheckInTime] = useState("10:00");
  const [checkOutTime, setCheckOutTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [quotaSummary, setQuotaSummary] = useState(null);
  const [loadingQuota, setLoadingQuota] = useState(false);

  const selectedEmployeeObj = useMemo(() => {
    if (initialRecord?.employee_id && Number(initialRecord.employee_id) === Number(employeeId)) {
      return initialRecord;
    }
    return employeesList.find((e) => Number(e.employee_id || e.id) === Number(employeeId)) || initialRecord;
  }, [employeeId, initialRecord, employeesList]);

  useEffect(() => {
    if (!isOpen) return;

    const empId = initialRecord?.employee_id || initialRecord?.id || (employeesList[0]?.employee_id || employeesList[0]?.id || "");
    setEmployeeId(empId ? String(empId) : "");
    setDate(toDateInputValue(initialRecord?.date));

    const existingCheckIn = toIstTimeInputValue(initialRecord?.check_in_time);
    const existingCheckOut = toIstTimeInputValue(initialRecord?.check_out_time);
    const defaultStart = (initialRecord?.shift_start_time || "10:00").slice(0, 5);

    if (existingCheckIn) {
      setCheckInTime(existingCheckIn);
    } else {
      setCheckInTime(defaultStart);
    }

    setCheckOutTime(existingCheckOut || "");

    const rawStatus = String(initialRecord?.raw_attendance_status || initialRecord?.status || "").toUpperCase();
    const recordWorkMode = String(initialRecord?.work_mode || "").toUpperCase();
    const isWfhRecord =
      defaultWorkMode === "WFH" ||
      recordWorkMode === "WFH" ||
      (!recordWorkMode &&
        (initialRecord?.verification_method === "WFH" ||
          String(initialRecord?.check_in_location || "").includes("Work From Home") ||
          rawStatus === "WFH"));

    if (isWfhRecord) {
      setWorkMode("WFH");
      setStatus("WFH");
    } else {
      setWorkMode("OFFICE");
      if (["PRESENT", "LATE", "WEEK_OFF", "ON_LEAVE", "ABSENT"].includes(rawStatus)) {
        setStatus(rawStatus);
      } else {
        setStatus("AUTO");
      }
    }
  }, [isOpen, initialRecord, employeesList, defaultWorkMode]);

  useEffect(() => {
    if (!isOpen || !employeeId) {
      setQuotaSummary(null);
      return;
    }
    let active = true;
    setLoadingQuota(true);
    getEmployeeAttendanceQuotaSummary(employeeId, date)
      .then((res) => {
        if (active && res?.data) {
          setQuotaSummary(res.data);
        }
      })
      .catch((err) => {
        console.error("Failed to load quota summary:", err);
      })
      .finally(() => {
        if (active) setLoadingQuota(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, employeeId, date]);

  const isTimeExcluded = ["ABSENT", "ON_LEAVE", "WEEK_OFF"].includes(status);

  const calculatedDuration = useMemo(() => {
    if (!checkInTime || !checkOutTime || isTimeExcluded) return null;
    const [inH, inM] = checkInTime.split(":").map(Number);
    const [outH, outM] = checkOutTime.split(":").map(Number);
    if (Number.isNaN(inH) || Number.isNaN(inM) || Number.isNaN(outH) || Number.isNaN(outM)) return null;
    const diffMins = outH * 60 + outM - (inH * 60 + inM);
    if (diffMins <= 0) return { invalid: true };
    const h = Math.floor(diffMins / 60);
    const m = diffMins % 60;
    return {
      invalid: false,
      label: h > 0 ? `${h}h ${m}m` : `${m}m`,
      hours: (diffMins / 60).toFixed(2),
    };
  }, [checkInTime, checkOutTime, isTimeExcluded]);

  if (!isOpen) return null;

  const isMarkingNew = !initialRecord?.id;
  const shiftStart = (selectedEmployeeObj?.shift_start_time || "10:00").slice(0, 5);
  const shiftEnd = (selectedEmployeeObj?.shift_end_time || "18:00").slice(0, 5);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!employeeId) {
      toast.error("Please select an employee.");
      return;
    }
    if (!date) {
      toast.error("Please select a date.");
      return;
    }

    if (!isTimeExcluded && !checkInTime) {
      toast.error("Please enter Check-In time.");
      return;
    }

    if (!isTimeExcluded && checkInTime && checkOutTime && calculatedDuration?.invalid) {
      toast.error("Check-Out time must be after Check-In time.");
      return;
    }

    try {
      setSaving(true);
      await upsertEmployeeAttendanceByHR({
        employee_id: Number(employeeId),
        date,
        status: workMode === "WFH" ? "WFH" : status,
        work_mode: workMode,
        check_in_time: isTimeExcluded ? null : checkInTime,
        check_out_time: isTimeExcluded ? null : (checkOutTime || null),
      });

      const empName =
        selectedEmployeeObj?.employee_name ||
        selectedEmployeeObj?.full_name ||
        "Employee";
      toast.success(
        workMode === "WFH"
          ? `${empName} marked as Work From Home (WFH)!`
          : isMarkingNew
          ? `Attendance marked for ${empName}!`
          : `Attendance & time updated for ${empName}!`
      );
      if (onSaved) await onSaved();
      onClose();
    } catch (error) {
      console.error("Failed to save employee attendance:", error);
      toast.error(error?.response?.data?.message || "Failed to save attendance.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.72)",
        backdropFilter: "blur(4px)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          maxWidth: "500px",
          width: "100%",
          padding: "24px",
          boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.35)",
          border: "1px solid #e2e8f0",
          fontFamily: "Inter, sans-serif",
          maxHeight: "92vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "18px" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#eff6ff", color: "#2563eb", padding: "4px 10px", borderRadius: "20px", fontSize: "11.5px", fontWeight: 700, marginBottom: "6px" }}>
              <UserCheck size={13} /> HR Attendance Control
            </div>
            <h3 style={{ margin: 0, fontSize: "19px", fontWeight: 700, color: "#0f172a" }}>
              {isMarkingNew ? "Mark Employee Attendance" : "Edit Attendance & Timing"}
            </h3>
            <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#64748b" }}>
              Mark attendance or correct a previous date's check-in, work mode, or status.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#f1f5f9",
              border: "none",
              borderRadius: "8px",
              padding: "6px",
              cursor: "pointer",
              color: "#475569",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Employee Display or Selector */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
              Employee
            </label>
            {initialRecord?.employee_id ? (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  background: "#f8fafc",
                  border: "1px solid #cbd5e1",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "14px" }}>
                    {initialRecord.employee_name || initialRecord.full_name || "Employee"}
                  </div>
                  <div style={{ fontSize: "12px", color: "#2563eb", fontWeight: 600 }}>
                    {initialRecord.employee_code || `#${initialRecord.employee_id}`}
                    {initialRecord.department_name ? ` • ${initialRecord.department_name}` : ""}
                  </div>
                </div>
                <span style={{ fontSize: "11.5px", fontWeight: 600, color: "#047857", background: "#ecfdf5", border: "1px solid #a7f3d0", padding: "3px 8px", borderRadius: "6px" }}>
                  Shift: {shiftStart} - {shiftEnd}
                </span>
              </div>
            ) : (
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  color: "#0f172a",
                  background: "#fff",
                  boxSizing: "border-box",
                }}
              >
                <option value="">-- Select Employee --</option>
                {employeesLoading && <option value="" disabled>Loading employees...</option>}
                {employeesList.map((emp) => {
                  const id = emp.employee_id || emp.id;
                  const name = emp.employee_name || emp.full_name;
                  const code = emp.employee_code || `#${id}`;
                  return (
                    <option key={id} value={id}>
                      {name} ({code}){emp.department_name ? ` - ${emp.department_name}` : ""}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          {/* Work Mode / Location Toggle */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
              Work Location & Mode
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <button
                type="button"
                onClick={() => {
                  setWorkMode("OFFICE");
                  if (status === "WFH") setStatus("AUTO");
                }}
                style={{
                  padding: "10px",
                  borderRadius: "10px",
                  border: workMode === "OFFICE" ? "2px solid #2563eb" : "1px solid #cbd5e1",
                  background: workMode === "OFFICE" ? "#eff6ff" : "#ffffff",
                  color: workMode === "OFFICE" ? "#1d4ed8" : "#475569",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  transition: "all 0.15s ease",
                }}
              >
                🏢 Office Premises
              </button>
              <button
                type="button"
                onClick={() => {
                  setWorkMode("WFH");
                  setStatus("WFH");
                }}
                style={{
                  padding: "10px",
                  borderRadius: "10px",
                  border: workMode === "WFH" ? "2px solid #10b981" : "1px solid #cbd5e1",
                  background: workMode === "WFH" ? "#ecfdf5" : "#ffffff",
                  color: workMode === "WFH" ? "#047857" : "#475569",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  transition: "all 0.15s ease",
                }}
              >
                🏠 Work From Home (WFH)
              </button>
            </div>
          </div>

          {/* Date & Status Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "12px", marginBottom: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                <Calendar size={13} style={{ verticalAlign: "middle", marginRight: "4px" }} />
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13.5px",
                  color: "#0f172a",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                Attendance Status
              </label>
              <select
                value={status}
                onChange={(e) => {
                  const val = e.target.value;
                  setStatus(val);
                  if (val === "WFH") {
                    setWorkMode("WFH");
                  } else if (workMode === "WFH" && val !== "WFH") {
                    setWorkMode("OFFICE");
                  }
                }}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13.5px",
                  color: "#0f172a",
                  background: "#fff",
                  fontWeight: 600,
                  boxSizing: "border-box",
                }}
              >
                <option value="AUTO">⚡ Auto (By Check-In Time)</option>
                <option value="PRESENT">✅ Present (On Time)</option>
                <option value="WFH">🏠 Work From Home (WFH)</option>
                <option value="LATE">⚠️ Late</option>
                <option value="WEEK_OFF">🏖️ Week Off</option>
                <option value="ON_LEAVE">🌴 On Leave</option>
                <option value="ABSENT">❌ Absent</option>
              </select>
            </div>
          </div>

          {/* WFH Notice Card */}
          {(workMode === "WFH" || status === "WFH") && (
            <div
              style={{
                background: "#ecfdf5",
                border: "1px solid #a7f3d0",
                borderRadius: "12px",
                padding: "12px 14px",
                marginBottom: "16px",
                display: "flex",
                gap: "10px",
                alignItems: "flex-start",
              }}
            >
              <span style={{ fontSize: "18px" }}>🏠</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: "13px", color: "#065f46" }}>
                  Work From Home (WFH) Active
                </div>
                <div style={{ fontSize: "12px", color: "#047857", marginTop: "2px", lineHeight: "1.4" }}>
                  Employee will be marked as <strong>Present (WFH)</strong> for both Presence and Reports. Office geofencing and Wi-Fi restrictions are waived.
                </div>
              </div>
            </div>
          )}

          {/* Monthly Week Off Rule Card */}
          {status === "WEEK_OFF" && (
            <div
              style={{
                background: "#f0f9ff",
                border: "1px solid #bae6fd",
                borderRadius: "12px",
                padding: "14px 16px",
                marginBottom: "16px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontWeight: 700, fontSize: "13px", color: "#0369a1", display: "flex", alignItems: "center", gap: "6px" }}>
                  🏖️ Monthly Week Off Rule ({quotaSummary?.month_name || "Current Month"})
                </span>
                {quotaSummary && (
                  <span
                    style={{
                      fontSize: "11.5px",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "6px",
                      background: (quotaSummary?.monthly_week_offs?.remaining ?? 0) > 0 ? "#dcfce7" : "#fee2e2",
                      color: (quotaSummary?.monthly_week_offs?.remaining ?? 0) > 0 ? "#15803d" : "#b91c1c",
                      border: (quotaSummary?.monthly_week_offs?.remaining ?? 0) > 0 ? "1px solid #bbf7d0" : "1px solid #fecaca",
                    }}
                  >
                    {quotaSummary.monthly_week_offs.remaining} Remaining
                  </span>
                )}
              </div>
              <div style={{ fontSize: "12.5px", color: "#0c4a6e" }}>
                Monthly Allowed: <strong>{quotaSummary?.monthly_week_offs?.allowed ?? 4} days</strong> • Used: <strong>{quotaSummary?.monthly_week_offs?.used ?? 0} days</strong>
                {quotaSummary?.monthly_week_offs?.is_roster_configured && " (from Monthly Roster)"}
              </div>
              <p style={{ margin: "6px 0 0 0", fontSize: "11px", color: "#0284c7" }}>
                ℹ️ Week Offs are allocated and counted monthly per company roster policy. Timings are waived for week offs.
              </p>
            </div>
          )}

          {/* Yearly Leave Rule Card */}
          {status === "ON_LEAVE" && (
            <div
              style={{
                background: "#fefce8",
                border: "1px solid #fef08a",
                borderRadius: "12px",
                padding: "14px 16px",
                marginBottom: "16px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontWeight: 700, fontSize: "13px", color: "#854d0e", display: "flex", alignItems: "center", gap: "6px" }}>
                  🌴 Yearly Leave Rule ({quotaSummary?.year || new Date().getFullYear()})
                </span>
                {quotaSummary && (
                  <span
                    style={{
                      fontSize: "11.5px",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "6px",
                      background: (quotaSummary?.yearly_leaves?.remaining ?? 0) > 0 ? "#dcfce7" : "#fee2e2",
                      color: (quotaSummary?.yearly_leaves?.remaining ?? 0) > 0 ? "#15803d" : "#b91c1c",
                      border: (quotaSummary?.yearly_leaves?.remaining ?? 0) > 0 ? "1px solid #bbf7d0" : "1px solid #fecaca",
                    }}
                  >
                    {quotaSummary.yearly_leaves.remaining} Remaining
                  </span>
                )}
              </div>
              <div style={{ fontSize: "12.5px", color: "#713f12" }}>
                Annual Allowance: <strong>{quotaSummary?.yearly_leaves?.allowed ?? 12} days</strong> • Used: <strong>{quotaSummary?.yearly_leaves?.used ?? 0} days</strong>
              </div>
              <p style={{ margin: "6px 0 0 0", fontSize: "11px", color: "#a16207" }}>
                ℹ️ Leaves are counted and tracked on an annual basis (12 paid leaves/year). Timings are waived for leaves.
              </p>
            </div>
          )}

          {/* Check-In and Check-Out Time Inputs */}
          {!isTimeExcluded && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                {/* Check-In Time */}
                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <label style={{ fontSize: "12.5px", fontWeight: 700, color: "#166534" }}>
                      <Clock size={13} style={{ verticalAlign: "middle", marginRight: "4px" }} />
                      Check-In Time
                    </label>
                  </div>
                  <input
                    type="time"
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "9px 10px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "#0f172a",
                      boxSizing: "border-box",
                    }}
                  />
                  <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => setCheckInTime(shiftStart)}
                      style={{
                        background: "#eff6ff",
                        color: "#2563eb",
                        border: "1px solid #bfdbfe",
                        borderRadius: "6px",
                        padding: "3px 8px",
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Shift ({shiftStart})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckInTime(getCurrentIstTimeStr())}
                      style={{
                        background: "#f1f5f9",
                        color: "#334155",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        padding: "3px 8px",
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Now
                    </button>
                  </div>
                </div>

                {/* Check-Out Time */}
                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <label style={{ fontSize: "12.5px", fontWeight: 700, color: "#9a3412" }}>
                      <Clock size={13} style={{ verticalAlign: "middle", marginRight: "4px" }} />
                      Check-Out Time
                    </label>
                    {checkOutTime && (
                      <button
                        type="button"
                        onClick={() => setCheckOutTime("")}
                        title="Clear Check-Out Time (Keep shift active)"
                        style={{
                          background: "none",
                          border: "none",
                          color: "#dc2626",
                          fontSize: "11px",
                          fontWeight: 600,
                          cursor: "pointer",
                          padding: 0,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "2px",
                        }}
                      >
                        <RotateCcw size={11} /> Clear
                      </button>
                    )}
                  </div>
                  <input
                    type="time"
                    value={checkOutTime}
                    onChange={(e) => setCheckOutTime(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "9px 10px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "#0f172a",
                      boxSizing: "border-box",
                    }}
                  />
                  <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => setCheckOutTime(shiftEnd)}
                      style={{
                        background: "#fff7ed",
                        color: "#c2410c",
                        border: "1px solid #fed7aa",
                        borderRadius: "6px",
                        padding: "3px 8px",
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Shift ({shiftEnd})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckOutTime(getCurrentIstTimeStr())}
                      style={{
                        background: "#f1f5f9",
                        color: "#334155",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        padding: "3px 8px",
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Now
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Full Shift Preset & Duration Summary */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "8px",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  marginBottom: "18px",
                  fontSize: "12.5px",
                }}
              >
                <span style={{ color: "#1e40af", fontWeight: 600 }}>
                  {calculatedDuration ? (
                    calculatedDuration.invalid ? (
                      <span style={{ color: "#dc2626" }}>⚠️ Check-out must be after Check-in</span>
                    ) : (
                      <>
                        Total Shift Duration: <strong>{calculatedDuration.label}</strong> ({calculatedDuration.hours} hrs)
                      </>
                    )
                  ) : (
                    "Check-Out empty = Employee currently Checked-In (Active Shift)"
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCheckInTime(shiftStart);
                    setCheckOutTime(shiftEnd);
                    setStatus("PRESENT");
                  }}
                  style={{
                    background: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "5px 10px",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Fill Full Shift ({shiftStart} - {shiftEnd})
                </button>
              </div>
            </>
          )}

          {/* Footer Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                background: "#f1f5f9",
                color: "#334155",
                border: "1px solid #cbd5e1",
                padding: "10px 16px",
                borderRadius: "10px",
                fontWeight: 600,
                fontSize: "13.5px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                color: "#ffffff",
                border: "1px solid #60a5fa",
                padding: "10px 20px",
                borderRadius: "10px",
                fontWeight: 700,
                fontSize: "13.5px",
                cursor: saving ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.35)",
              }}
            >
              <CheckCircle2 size={16} />
              {saving ? "Saving..." : isMarkingNew ? "Mark Attendance" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HRAttendanceEditModal;
