import React, { useState, useEffect, useMemo } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  Save,
  RotateCcw,
  Sparkles,
  Lock,
  MessageSquare,
  X,
  Briefcase,
  Palmtree,
  SunMedium,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getMyMonthlyRoster,
  saveMyMonthlyRoster,
  requestRosterChange,
} from "../../services/rosterService";
import { format12hTime } from "../../utils/shiftTiming";
import "./MyRoster.css";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MyRoster = () => {
  const currentDate = new Date();
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1); // 1-indexed

  const [rosterData, setRosterData] = useState(null);
  const [days, setDays] = useState([]);
  const [submissionNote, setSubmissionNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Change request modal state
  const [changeModalOpen, setChangeModalOpen] = useState(false);
  const [changeReason, setChangeReason] = useState("");
  const [requestingChange, setRequestingChange] = useState(false);

  const fetchRoster = async () => {
    try {
      setLoading(true);
      const res = await getMyMonthlyRoster(year, month);
      if (res?.data) {
        setRosterData(res.data);
        setDays(res.data.days_data || []);
        setSubmissionNote(res.data.submission_note || "");
      }
    } catch (err) {
      console.error("Failed to load roster:", err);
      toast.error(err.response?.data?.message || "Failed to load monthly roster.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoster();
  }, [year, month]);

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((prev) => prev - 1);
    } else {
      setMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((prev) => prev + 1);
    } else {
      setMonth((prev) => prev + 1);
    }
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
  };

  // Is this roster locked from direct employee edits?
  const isApproved = rosterData?.status === "APPROVED";
  const isSubmitted = rosterData?.status === "SUBMITTED";
  const isLocked = isApproved;

  // Real-time counters
  const counters = useMemo(() => {
    let working = 0;
    let weekOff = 0;
    let leaves = 0;
    let halfDays = 0;

    for (const d of days) {
      const s = String(d.status || "").toUpperCase();
      if (s === "WORKING") working++;
      else if (s === "WEEK_OFF" || s === "OFF") weekOff++;
      else if (s === "LEAVE" || s === "PLANNED_LEAVE") leaves++;
      else if (s === "HALF_DAY") {
        halfDays++;
        working += 0.5;
      }
    }

    return {
      total: days.length,
      working: Math.round(working),
      weekOff,
      leaves,
      halfDays,
    };
  }, [days]);

  // Update a single day
  const handleUpdateDay = (dayNum, updates) => {
    if (isLocked) {
      toast.error("Roster is approved and locked. Please click 'Request Change from HR' to adjust dates.");
      return;
    }
    setDays((prev) =>
      prev.map((d) => (d.day === dayNum ? { ...d, ...updates } : d))
    );
  };

  // Quick preset: All Sundays Off, rest Working
  const handleApplySundaysOff = () => {
    if (isLocked) return;
    const defaultStart = rosterData?.shift_start_time || "10:00";
    const defaultEnd = rosterData?.shift_end_time || "18:00";

    setDays((prev) =>
      prev.map((d) => {
        const isSun = d.weekday === "Sun";
        return {
          ...d,
          status: isSun ? "WEEK_OFF" : "WORKING",
          shift_start: isSun ? null : defaultStart,
          shift_end: isSun ? null : defaultEnd,
          notes: isSun ? "Weekly Sunday Off" : "",
        };
      })
    );
    toast.success("Applied: All Sundays Week Off, Weekdays Working!");
  };

  // Quick preset: Sat & Sun Off (5-day week)
  const handleApplyWeekendOff = () => {
    if (isLocked) return;
    const defaultStart = rosterData?.shift_start_time || "10:00";
    const defaultEnd = rosterData?.shift_end_time || "18:00";

    setDays((prev) =>
      prev.map((d) => {
        const isWeekend = d.weekday === "Sat" || d.weekday === "Sun";
        return {
          ...d,
          status: isWeekend ? "WEEK_OFF" : "WORKING",
          shift_start: isWeekend ? null : defaultStart,
          shift_end: isWeekend ? null : defaultEnd,
          notes: isWeekend ? "Weekend Off" : "",
        };
      })
    );
    toast.success("Applied: Saturday & Sunday Off!");
  };

  // Save as Draft or Submit to HR
  const handleSaveRoster = async (isSubmit = false) => {
    if (isLocked) {
      toast.error("Your roster for this month is already approved and locked.");
      return;
    }

    if (isSubmit) {
      const confirmSubmit = window.confirm(
        `Are you sure you want to submit your ${MONTH_NAMES[month - 1]} ${year} roster to HR?\n\n` +
        `• Working Days: ${counters.working}\n` +
        `• Week Offs: ${counters.weekOff}\n` +
        `• Leaves: ${counters.leaves}\n\n` +
        `Once approved by HR, any changes will require HR assistance.`
      );
      if (!confirmSubmit) return;
    }

    try {
      setSaving(true);
      await saveMyMonthlyRoster({
        year,
        month,
        days_data: days,
        submission_note: submissionNote,
        isSubmit,
      });

      toast.success(
        isSubmit
          ? "🎉 Roster submitted to HR for approval successfully!"
          : "Draft saved successfully."
      );
      await fetchRoster();
    } catch (err) {
      console.error("Save roster error:", err);
      toast.error(err.response?.data?.message || "Failed to save monthly roster.");
    } finally {
      setSaving(false);
    }
  };

  // Submit Change Request to HR
  const handleSubmitChangeRequest = async (e) => {
    e.preventDefault();
    if (!changeReason.trim()) {
      return toast.error("Please explain which dates or shifts need modification.");
    }

    try {
      setRequestingChange(true);
      await requestRosterChange({
        year,
        month,
        reason: changeReason.trim(),
      });
      toast.success("Change request submitted to HR. HR will review and update your roster!");
      setChangeModalOpen(false);
      setChangeReason("");
      await fetchRoster();
    } catch (err) {
      console.error("Change request error:", err);
      toast.error(err.response?.data?.message || "Failed to submit change request.");
    } finally {
      setRequestingChange(false);
    }
  };

  return (
    <div className="my-roster-container">
      {/* Header & Month Selector */}
      <div className="roster-header-card">
        <div className="roster-header-left">
          <h1>
            <CalendarDays size={24} color="#2563EB" />
            Monthly Attendance & Shift Roster
          </h1>
          <p>
            Plan your working days, planned week offs, and leaves for each month and submit to HR.
          </p>
        </div>

        <div className="month-selector-bar">
          <button className="month-nav-btn" onClick={handlePrevMonth} title="Previous Month">
            <ChevronLeft size={18} />
          </button>
          <div className="month-title">
            {MONTH_NAMES[month - 1]} {year}
          </div>
          <button className="month-nav-btn" onClick={handleNextMonth} title="Next Month">
            <ChevronRight size={18} />
          </button>
          <button
            onClick={handleCurrentMonth}
            style={{
              fontSize: "12px",
              fontWeight: "600",
              color: "#2563EB",
              background: "#EFF6FF",
              border: "1px solid #BFDBFE",
              borderRadius: "6px",
              padding: "4px 8px",
              cursor: "pointer",
            }}
          >
            Current Month
          </button>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`roster-status-banner status-${rosterData?.status || "NOT_SUBMITTED"}`}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {isApproved && <CheckCircle2 size={18} />}
          {isSubmitted && <Clock size={18} />}
          {rosterData?.status === "CHANGE_REQUESTED" && <RotateCcw size={18} />}
          {rosterData?.status === "REJECTED" && <AlertCircle size={18} />}
          {(!rosterData?.status || rosterData?.status === "NOT_SUBMITTED" || rosterData?.status === "DRAFT") && <Briefcase size={18} />}

          <div>
            <strong>Status: {rosterData?.status?.replace("_", " ") || "DRAFT"}</strong>
            <span style={{ marginLeft: "8px" }}>
              {isApproved && "— Your roster is approved by HR and active. Edits are locked."}
              {isSubmitted && "— Submitted to HR on " + (rosterData?.submitted_at ? new Date(rosterData.submitted_at).toLocaleDateString() : "recently") + ". Awaiting approval."}
              {rosterData?.status === "CHANGE_REQUESTED" && "— You requested a roster adjustment. HR is reviewing your changes."}
              {rosterData?.status === "REJECTED" && `— Rejected by HR. Remarks: ${rosterData?.review_remarks || "Please review and resubmit."}`}
              {(!rosterData?.status || rosterData?.status === "NOT_SUBMITTED" || rosterData?.status === "DRAFT") && "— Please mark your working days & offs, then submit to HR."}
            </span>
          </div>
        </div>

        {isApproved && (
          <button
            onClick={() => setChangeModalOpen(true)}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              border: "1.5px solid #059669",
              background: "#ffffff",
              color: "#059669",
              fontWeight: "700",
              fontSize: "12.5px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <MessageSquare size={14} /> Request Change from HR
          </button>
        )}
      </div>

      {/* KPI Counters */}
      <div className="roster-summary-grid">
        <div className="roster-summary-card">
          <div className="summary-icon-box" style={{ background: "#EFF6FF", color: "#2563EB" }}>
            <CalendarDays size={20} />
          </div>
          <div className="summary-info">
            <span>Total Days</span>
            <strong>{counters.total}</strong>
          </div>
        </div>

        <div className="roster-summary-card">
          <div className="summary-icon-box" style={{ background: "#DCFCE7", color: "#16A34A" }}>
            <Briefcase size={20} />
          </div>
          <div className="summary-info">
            <span>Planned Working Days</span>
            <strong style={{ color: "#16A34A" }}>{counters.working}</strong>
          </div>
        </div>

        <div className="roster-summary-card">
          <div className="summary-icon-box" style={{ background: "#EEF2FF", color: "#4F46E5" }}>
            <Palmtree size={20} />
          </div>
          <div className="summary-info">
            <span>Planned Week Offs</span>
            <strong style={{ color: "#4F46E5" }}>{counters.weekOff}</strong>
          </div>
        </div>

        <div className="roster-summary-card">
          <div className="summary-icon-box" style={{ background: "#FEF3C7", color: "#D97706" }}>
            <SunMedium size={20} />
          </div>
          <div className="summary-info">
            <span>Planned Leaves</span>
            <strong style={{ color: "#D97706" }}>{counters.leaves}</strong>
          </div>
        </div>
      </div>

      {/* Quick Presets Bar (Active if not locked) */}
      {!isLocked && (
        <div className="quick-fill-bar">
          <div className="quick-fill-label">
            <Sparkles size={16} color="#4F46E5" />
            <span>Quick Schedule Presets:</span>
          </div>

          <div className="preset-buttons">
            <button type="button" className="preset-btn" onClick={handleApplySundaysOff}>
              🌴 All Sundays Off (Standard)
            </button>
            <button type="button" className="preset-btn" onClick={handleApplyWeekendOff}>
              🏖️ Saturday & Sunday Off (5 Days)
            </button>
          </div>
        </div>
      )}

      {/* Days Roster Calendar Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#64748B", fontWeight: 600 }}>
          Loading your {MONTH_NAMES[month - 1]} schedule...
        </div>
      ) : (
        <div className="calendar-days-grid">
          {days.map((d) => {
            const isSun = d.weekday === "Sun";
            const isSat = d.weekday === "Sat";
            const status = d.status || "WORKING";

            return (
              <div
                key={d.day}
                className={`day-roster-card ${
                  status === "WORKING"
                    ? "is-working"
                    : status === "WEEK_OFF"
                    ? "is-week-off"
                    : status === "LEAVE"
                    ? "is-leave"
                    : "is-half-day"
                } ${isSun ? "day-sunday" : ""}`}
              >
                <div className="day-card-header">
                  <span className="day-number-badge">{d.day}</span>
                  <span
                    className="day-weekday-label"
                    style={{
                      color: isSun ? "#DC2626" : isSat ? "#2563EB" : "#475569",
                      fontWeight: isSun || isSat ? 800 : 700,
                    }}
                  >
                    {d.weekday}
                  </span>
                </div>

                {/* Status Toggle Buttons */}
                <div className="day-status-buttons">
                  <button
                    type="button"
                    disabled={isLocked}
                    className={`day-btn-choice ${status === "WORKING" ? "active-working" : ""}`}
                    onClick={() =>
                      handleUpdateDay(d.day, {
                        status: "WORKING",
                        shift_start: d.shift_start || rosterData?.shift_start_time || "10:00",
                        shift_end: d.shift_end || rosterData?.shift_end_time || "18:00",
                      })
                    }
                    title="Mark as Working Day"
                  >
                    Work
                  </button>

                  <button
                    type="button"
                    disabled={isLocked}
                    className={`day-btn-choice ${status === "WEEK_OFF" ? "active-off" : ""}`}
                    onClick={() =>
                      handleUpdateDay(d.day, {
                        status: "WEEK_OFF",
                        shift_start: null,
                        shift_end: null,
                      })
                    }
                    title="Mark as Week Off"
                  >
                    Off
                  </button>

                  <button
                    type="button"
                    disabled={isLocked}
                    className={`day-btn-choice ${status === "LEAVE" ? "active-leave" : ""}`}
                    onClick={() =>
                      handleUpdateDay(d.day, {
                        status: "LEAVE",
                        shift_start: null,
                        shift_end: null,
                      })
                    }
                    title="Mark as Planned Leave"
                  >
                    Leave
                  </button>
                </div>

                {/* Timing (If working) */}
                {status === "WORKING" && (
                  <div className="day-time-row">
                    <Clock size={12} style={{ color: "#64748B", flexShrink: 0 }} />
                    <input
                      type="time"
                      disabled={isLocked}
                      value={d.shift_start || "10:00"}
                      onChange={(e) => handleUpdateDay(d.day, { shift_start: e.target.value })}
                      className="day-time-input"
                      title="Shift Start"
                    />
                    <span>-</span>
                    <input
                      type="time"
                      disabled={isLocked}
                      value={d.shift_end || "18:00"}
                      onChange={(e) => handleUpdateDay(d.day, { shift_end: e.target.value })}
                      className="day-time-input"
                      title="Shift End"
                    />
                  </div>
                )}

                {/* Day Notes */}
                <input
                  type="text"
                  disabled={isLocked}
                  placeholder={status === "WEEK_OFF" ? "Week off" : status === "LEAVE" ? "Reason for leave" : "Note (Optional)"}
                  value={d.notes || ""}
                  onChange={(e) => handleUpdateDay(d.day, { notes: e.target.value })}
                  className="day-notes-input"
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Submit & Save Controls */}
      <div className="roster-submit-footer">
        <div className="submission-note-box">
          <label>Submission Note for HR (Optional):</label>
          <input
            type="text"
            disabled={isLocked}
            placeholder="e.g. Requesting 2nd Saturday off due to family occasion..."
            value={submissionNote}
            onChange={(e) => setSubmissionNote(e.target.value)}
          />
        </div>

        <div className="footer-actions">
          {!isLocked ? (
            <>
              <button
                type="button"
                className="btn-secondary"
                disabled={saving}
                onClick={() => handleSaveRoster(false)}
              >
                <Save size={16} /> Save Draft
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={saving}
                onClick={() => handleSaveRoster(true)}
              >
                <Send size={16} /> {saving ? "Submitting..." : "Submit to HR"}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn-primary"
              onClick={() => setChangeModalOpen(true)}
            >
              <MessageSquare size={16} /> Request Changes from HR
            </button>
          )}
        </div>
      </div>

      {/* Modal: Request Change from HR */}
      {changeModalOpen && (
        <div className="roster-modal-overlay">
          <form className="roster-modal-content" onSubmit={handleSubmitChangeRequest}>
            <div className="roster-modal-header">
              <h3>Request Roster Change from HR</h3>
              <button
                type="button"
                onClick={() => setChangeModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B" }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="roster-modal-body">
              <p style={{ margin: "0 0 14px 0", fontSize: "13.5px", color: "#475569", lineHeight: "1.5" }}>
                Since your <strong>{MONTH_NAMES[month - 1]} {year}</strong> roster has already been approved,
                please write which dates you need changed (e.g. swap an off day, leave on a specific date, or change arrival time). HR will review and apply the adjustment for you.
              </p>

              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                Details of Change Required *
              </label>
              <textarea
                rows={4}
                required
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="e.g. Please change 14th Oct from Working to Off, and I will work on 18th Oct instead..."
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  fontSize: "13.5px",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
            </div>

            <div className="roster-modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setChangeModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={requestingChange}
              >
                {requestingChange ? "Submitting..." : "Send Request to HR"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default MyRoster;
