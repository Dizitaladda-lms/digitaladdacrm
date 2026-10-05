import React, { useState, useEffect, useMemo } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  RefreshCw,
  Edit,
  Check,
  X,
  User,
  RotateCcw,
  Briefcase,
  Palmtree,
  SunMedium,
  LayoutGrid,
  List,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getHREmployeesRoster,
  reviewEmployeeRoster,
  updateEmployeeRosterByHR,
} from "../../services/rosterService";
import { getDepartments } from "../../services/departmentService";
import { format12hTime } from "../../utils/shiftTiming";
import "./EmployeesRoster.css";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const EmployeesRoster = () => {
  const currentDate = new Date();
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);

  const [data, setData] = useState({ summary: {}, rosters: [] });
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState("TABLE"); // "TABLE" | "MATRIX"

  // Edit / Review Modal state
  const [selectedRoster, setSelectedRoster] = useState(null);
  const [editDays, setEditDays] = useState([]);
  const [reviewRemarks, setReviewRemarks] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [actionId, setActionId] = useState(null);

  const fetchRosters = async () => {
    try {
      setLoading(true);
      const res = await getHREmployeesRoster({
        year,
        month,
        department_id: departmentFilter,
        status: statusFilter,
        search: searchTerm,
      });
      if (res?.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error("Failed to load company rosters:", err);
      toast.error(err.response?.data?.message || "Failed to load employee rosters.");
    } finally {
      setLoading(false);
    }
  };

  const fetchDepts = async () => {
    try {
      const res = await getDepartments();
      if (res?.data) {
        setDepartments(res.data);
      }
    } catch (err) {
      console.log("Departments load error:", err);
    }
  };

  useEffect(() => {
    fetchDepts();
  }, []);

  useEffect(() => {
    fetchRosters();
  }, [year, month, departmentFilter, statusFilter]);

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

  // Open Edit / Review Modal for an employee
  const handleOpenEditModal = (rosterRow) => {
    setSelectedRoster(rosterRow);
    setEditDays(rosterRow.days_data ? JSON.parse(JSON.stringify(rosterRow.days_data)) : []);
    setReviewRemarks(rosterRow.review_remarks || "");
  };

  // Update day in modal
  const handleUpdateModalDay = (dayNum, updates) => {
    setEditDays((prev) =>
      prev.map((d) => (d.day === dayNum ? { ...d, ...updates } : d))
    );
  };

  // Quick 1-click Approve directly from table
  const handleQuickApprove = async (rosterId, empName) => {
    try {
      setActionId(rosterId);
      await reviewEmployeeRoster(rosterId, { status: "APPROVED" });
      toast.success(`Roster for ${empName} approved successfully!`);
      await fetchRosters();
    } catch (err) {
      console.error("Quick approve error:", err);
      toast.error(err.response?.data?.message || "Failed to approve roster.");
    } finally {
      setActionId(null);
    }
  };

  // Save changes from HR Modal
  const handleSaveModalChanges = async (targetStatus = null) => {
    if (!selectedRoster) return;
    try {
      setSavingEdit(true);

      await updateEmployeeRosterByHR(selectedRoster.roster_id || 0, {
        employee_id: selectedRoster.employee_id,
        year,
        month,
        days_data: editDays,
        status: targetStatus || selectedRoster.status || "APPROVED",
        review_remarks: reviewRemarks,
      });

      toast.success(
        targetStatus === "APPROVED"
          ? `Roster updated and APPROVED for ${selectedRoster.employee_name}!`
          : `Roster changes saved successfully for ${selectedRoster.employee_name}!`
      );
      setSelectedRoster(null);
      await fetchRosters();
    } catch (err) {
      console.error("Save HR roster edit error:", err);
      toast.error(err.response?.data?.message || "Failed to save roster changes.");
    } finally {
      setSavingEdit(false);
    }
  };

  // Filtered rows for client search
  const displayedRosters = useMemo(() => {
    if (!searchTerm.trim()) return data.rosters;
    const term = searchTerm.toLowerCase();
    return data.rosters.filter(
      (r) =>
        r.employee_name?.toLowerCase().includes(term) ||
        r.employee_code?.toLowerCase().includes(term) ||
        r.designation?.toLowerCase().includes(term) ||
        r.department_name?.toLowerCase().includes(term)
    );
  }, [data.rosters, searchTerm]);

  // Days count in current month for matrix headers
  const daysInMonth = useMemo(() => {
    return new Date(year, month, 0).getDate();
  }, [year, month]);

  return (
    <div className="hr-roster-container">
      {/* Header */}
      <div className="hr-roster-header">
        <div>
          <h1>
            <CalendarDays size={24} color="#2563EB" />
            Company Employees Roster Management
          </h1>
          <p>
            Review, approve, and customize monthly shift schedules and off days for all employees.
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

      {/* KPI Summary Cards */}
      <div className="hr-roster-kpis">
        <div
          className={`kpi-card ${statusFilter === "ALL" ? "active" : ""}`}
          onClick={() => setStatusFilter("ALL")}
        >
          <div className="kpi-icon-wrap" style={{ background: "#EFF6FF", color: "#2563EB" }}>
            <User size={22} />
          </div>
          <div className="kpi-content">
            <span>Total Staff</span>
            <strong>{data.summary?.total_employees || 0}</strong>
          </div>
        </div>

        <div
          className={`kpi-card ${statusFilter === "SUBMITTED" ? "active" : ""}`}
          onClick={() => setStatusFilter("SUBMITTED")}
        >
          <div className="kpi-icon-wrap" style={{ background: "#FEFCE8", color: "#CA8A04" }}>
            <Clock size={22} />
          </div>
          <div className="kpi-content">
            <span>Pending Review</span>
            <strong style={{ color: "#CA8A04" }}>{data.summary?.total_submitted || 0}</strong>
          </div>
        </div>

        <div
          className={`kpi-card ${statusFilter === "APPROVED" ? "active" : ""}`}
          onClick={() => setStatusFilter("APPROVED")}
        >
          <div className="kpi-icon-wrap" style={{ background: "#DCFCE7", color: "#16A34A" }}>
            <CheckCircle2 size={22} />
          </div>
          <div className="kpi-content">
            <span>Approved</span>
            <strong style={{ color: "#16A34A" }}>{data.summary?.total_approved || 0}</strong>
          </div>
        </div>

        <div
          className={`kpi-card ${statusFilter === "CHANGE_REQUESTED" ? "active" : ""}`}
          onClick={() => setStatusFilter("CHANGE_REQUESTED")}
        >
          <div className="kpi-icon-wrap" style={{ background: "#FAF5FF", color: "#9333EA" }}>
            <RotateCcw size={22} />
          </div>
          <div className="kpi-content">
            <span>Change Requests</span>
            <strong style={{ color: "#9333EA" }}>{data.summary?.total_change_requested || 0}</strong>
          </div>
        </div>

        <div
          className={`kpi-card ${statusFilter === "NOT_SUBMITTED" ? "active" : ""}`}
          onClick={() => setStatusFilter("NOT_SUBMITTED")}
        >
          <div className="kpi-icon-wrap" style={{ background: "#F1F5F9", color: "#64748B" }}>
            <AlertCircle size={22} />
          </div>
          <div className="kpi-content">
            <span>Not Submitted</span>
            <strong style={{ color: "#64748B" }}>{data.summary?.total_not_submitted || 0}</strong>
          </div>
        </div>
      </div>

      {/* Filter & View Mode Bar */}
      <div className="hr-roster-filter-bar">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search employee name, code, designation, department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-selects">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.department_name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="SUBMITTED">Pending Review (Submitted)</option>
            <option value="APPROVED">Approved</option>
            <option value="CHANGE_REQUESTED">Change Requested</option>
            <option value="NOT_SUBMITTED">Not Submitted / Draft</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <div className="view-toggle-btns">
            <button
              className={`view-toggle-btn ${viewMode === "TABLE" ? "active" : ""}`}
              onClick={() => setViewMode("TABLE")}
            >
              <List size={15} /> Directory View
            </button>
            <button
              className={`view-toggle-btn ${viewMode === "MATRIX" ? "active" : ""}`}
              onClick={() => setViewMode("MATRIX")}
            >
              <LayoutGrid size={15} /> Monthly Matrix
            </button>
          </div>

          <button
            onClick={fetchRosters}
            style={{
              padding: "9px 12px",
              borderRadius: "8px",
              border: "1px solid #CBD5E1",
              background: "#F8FAFC",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              color: "#475569",
              fontWeight: 600,
            }}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Roster Display Content */}
      <div className="roster-table-card">
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#64748B", fontWeight: 600 }}>
            <RefreshCw size={24} className="spin" style={{ marginBottom: "8px" }} />
            <p>Loading company rosters for {MONTH_NAMES[month - 1]} {year}...</p>
          </div>
        ) : displayedRosters.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748B" }}>
            <AlertCircle size={36} color="#94A3B8" style={{ marginBottom: "10px" }} />
            <h3>No Employee Rosters Found</h3>
            <p style={{ margin: 0, fontSize: "14px" }}>
              {searchTerm ? "No employees match your search query." : "No roster records found for the selected filters."}
            </p>
          </div>
        ) : viewMode === "TABLE" ? (
          /* ================= Directory Table View ================= */
          <div style={{ overflowX: "auto" }}>
            <table className="roster-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department & Role</th>
                  <th>Shift Timing</th>
                  <th style={{ textAlign: "center" }}>Working Days</th>
                  <th style={{ textAlign: "center" }}>Week Offs</th>
                  <th style={{ textAlign: "center" }}>Leaves</th>
                  <th>Status</th>
                  <th>Notes / Request</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedRosters.map((row) => {
                  const status = row.status || "NOT_SUBMITTED";
                  const isSubmitted = status === "SUBMITTED";
                  const isChangeReq = status === "CHANGE_REQUESTED";

                  return (
                    <tr key={row.employee_id}>
                      <td>
                        <div style={{ fontWeight: "700", color: "#0F172A" }}>{row.employee_name}</div>
                        <div style={{ fontSize: "12px", color: "#2563EB", fontWeight: "600" }}>
                          {row.employee_code || `#${row.employee_id}`}
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: "600", color: "#334155" }}>{row.department_name || "General"}</div>
                        <div style={{ fontSize: "12px", color: "#64748B" }}>{row.designation || row.role}</div>
                      </td>

                      <td>
                        <div style={{ fontSize: "12.5px", fontWeight: "600", color: "#334155" }}>
                          {format12hTime(row.shift_start_time || "10:00")} - {format12hTime(row.shift_end_time || "18:00")}
                        </div>
                        {row.shift_timing_type === "CUSTOM" && (
                          <span style={{ fontSize: "10px", color: "#16A34A", fontWeight: "700" }}>Custom Shift</span>
                        )}
                      </td>

                      <td style={{ textAlign: "center", fontWeight: "700", color: "#16A34A" }}>
                        {row.total_working_days}
                      </td>

                      <td style={{ textAlign: "center", fontWeight: "700", color: "#4F46E5" }}>
                        {row.total_week_offs}
                      </td>

                      <td style={{ textAlign: "center", fontWeight: "700", color: "#D97706" }}>
                        {row.total_leaves}
                      </td>

                      <td>
                        <span className={`badge-status badge-${status}`}>
                          {status === "APPROVED" && <CheckCircle2 size={12} />}
                          {status === "SUBMITTED" && <Clock size={12} />}
                          {status === "CHANGE_REQUESTED" && <RotateCcw size={12} />}
                          {status.replace("_", " ")}
                        </span>
                      </td>

                      <td style={{ maxWidth: "200px" }}>
                        {row.change_request_note ? (
                          <div style={{ fontSize: "12px", color: "#7E22CE", background: "#FAF5FF", padding: "4px 8px", borderRadius: "6px", border: "1px solid #E9D5FF" }}>
                            <strong>Requested:</strong> {row.change_request_note}
                          </div>
                        ) : row.submission_note ? (
                          <div style={{ fontSize: "12px", color: "#475569", fontStyle: "italic" }}>
                            "{row.submission_note}"
                          </div>
                        ) : (
                          <span style={{ color: "#94A3B8", fontSize: "12px" }}>--</span>
                        )}
                      </td>

                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(row)}
                            style={{
                              padding: "6px 12px",
                              borderRadius: "6px",
                              border: "1px solid #CBD5E1",
                              background: "#FFFFFF",
                              color: "#334155",
                              fontWeight: "600",
                              fontSize: "12px",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                            title="Open full calendar to view and edit this employee's days & shift"
                          >
                            <Edit size={13} /> Review & Edit
                          </button>

                          {(isSubmitted || isChangeReq) && row.roster_id && (
                            <button
                              type="button"
                              disabled={actionId === row.roster_id}
                              onClick={() => handleQuickApprove(row.roster_id, row.employee_name)}
                              style={{
                                padding: "6px 12px",
                                borderRadius: "6px",
                                border: "none",
                                background: "#16A34A",
                                color: "#FFFFFF",
                                fontWeight: "700",
                                fontSize: "12px",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <Check size={13} /> Approve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* ================= Monthly Matrix View ================= */
          <div className="matrix-wrap">
            <table className="matrix-table">
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  <th className="emp-header">Employee</th>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((dayNum) => {
                    const d = new Date(year, month - 1, dayNum);
                    const isSun = d.getDay() === 0;
                    return (
                      <th
                        key={dayNum}
                        style={{
                          color: isSun ? "#DC2626" : "#475569",
                          fontWeight: isSun ? 800 : 700,
                          background: isSun ? "#FEF2F2" : "#F8FAFC",
                        }}
                      >
                        {dayNum}
                      </th>
                    );
                  })}
                  <th>Summary</th>
                </tr>
              </thead>
              <tbody>
                {displayedRosters.map((row) => {
                  const daysMap = {};
                  (row.days_data || []).forEach((d) => {
                    daysMap[d.day] = d;
                  });

                  return (
                    <tr key={row.employee_id}>
                      <td className="emp-name-cell">
                        <div
                          onClick={() => handleOpenEditModal(row)}
                          style={{ cursor: "pointer", display: "flex", flexDirection: "column" }}
                          title="Click to view & edit schedule"
                        >
                          <strong style={{ color: "#0F172A", fontSize: "12.5px" }}>{row.employee_name}</strong>
                          <span style={{ fontSize: "11px", color: "#64748B" }}>
                            {row.department_name} • {row.designation}
                          </span>
                        </div>
                      </td>

                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((dayNum) => {
                        const dayObj = daysMap[dayNum] || {};
                        const st = String(dayObj.status || "").toUpperCase();
                        let pillClass = "pill-W";
                        let label = "W";

                        if (st === "WEEK_OFF" || st === "OFF") {
                          pillClass = "pill-O";
                          label = "O";
                        } else if (st === "LEAVE" || st === "PLANNED_LEAVE") {
                          pillClass = "pill-L";
                          label = "L";
                        } else if (st === "HALF_DAY") {
                          pillClass = "pill-H";
                          label = "H";
                        }

                        return (
                          <td key={dayNum}>
                            <span
                              className={`matrix-pill ${pillClass}`}
                              onClick={() => handleOpenEditModal(row)}
                              title={`${row.employee_name} on ${dayNum} ${MONTH_NAMES[month - 1]}: ${st || "Working"} ${dayObj.notes ? `(${dayObj.notes})` : ""}`}
                            >
                              {label}
                            </span>
                          </td>
                        );
                      })}

                      <td style={{ whiteSpace: "nowrap", fontSize: "11.5px" }}>
                        <span style={{ color: "#16A34A", fontWeight: 700 }}>{row.total_working_days}W</span> /{" "}
                        <span style={{ color: "#4F46E5", fontWeight: 700 }}>{row.total_week_offs}O</span> /{" "}
                        <span style={{ color: "#D97706", fontWeight: 700 }}>{row.total_leaves}L</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= HR Review & Direct Edit Modal ================= */}
      {selectedRoster && (
        <div className="hr-modal-overlay">
          <div className="hr-modal-content">
            <div className="hr-modal-header">
              <div>
                <h3 style={{ margin: "0 0 4px 0", fontSize: "18px", color: "#0F172A" }}>
                  Schedule Roster: {selectedRoster.employee_name} ({selectedRoster.employee_code || `#${selectedRoster.employee_id}`})
                </h3>
                <p style={{ margin: 0, fontSize: "13px", color: "#64748B" }}>
                  {MONTH_NAMES[month - 1]} {year} • {selectedRoster.department_name} • {selectedRoster.designation}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRoster(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B" }}
              >
                <X size={22} />
              </button>
            </div>

            <div className="hr-modal-body">
              {/* Employee note or Change Request note notification */}
              {selectedRoster.change_request_note && (
                <div style={{ background: "#FAF5FF", border: "1px solid #E9D5FF", padding: "12px 16px", borderRadius: "10px", marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#7E22CE", fontWeight: "700", fontSize: "13px" }}>
                    <RotateCcw size={16} /> Employee Requested Roster Adjustment:
                  </div>
                  <p style={{ margin: "4px 0 0 0", color: "#581C87", fontSize: "13.5px" }}>
                    "{selectedRoster.change_request_note}"
                  </p>
                </div>
              )}

              {selectedRoster.submission_note && (
                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", padding: "10px 14px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px", color: "#475569" }}>
                  <strong>Employee Submission Note:</strong> "{selectedRoster.submission_note}"
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>
                  Day-by-Day Roster (Click to toggle Working, Week Off, Leave or edit Shift Timing):
                </span>
                <div style={{ display: "flex", gap: "10px", fontSize: "12px", fontWeight: "600" }}>
                  <span style={{ color: "#16A34A" }}>● Work</span>
                  <span style={{ color: "#4F46E5" }}>● Week Off</span>
                  <span style={{ color: "#D97706" }}>● Leave</span>
                </div>
              </div>

              {/* Day Tiles Grid inside Modal */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(135px, 1fr))", gap: "10px", maxHeight: "400px", overflowY: "auto", padding: "2px" }}>
                {editDays.map((d) => {
                  const isSun = d.weekday === "Sun";
                  const status = d.status || "WORKING";

                  return (
                    <div
                      key={d.day}
                      style={{
                        border: status === "WORKING" ? "1.5px solid #86EFAC" : status === "WEEK_OFF" ? "1.5px solid #C7D2FE" : "1.5px solid #FDE68A",
                        background: status === "WORKING" ? "#F0FDF4" : status === "WEEK_OFF" ? "#F5F3FF" : "#FFFBEB",
                        borderRadius: "10px",
                        padding: "8px 10px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <strong style={{ fontSize: "14px", color: "#0F172A" }}>{d.day}</strong>
                        <span style={{ fontSize: "11px", fontWeight: "700", color: isSun ? "#DC2626" : "#64748B" }}>
                          {d.weekday}
                        </span>
                      </div>

                      <div style={{ display: "flex", gap: "3px" }}>
                        <button
                          type="button"
                          onClick={() => handleUpdateModalDay(d.day, { status: "WORKING", shift_start: d.shift_start || "10:00", shift_end: d.shift_end || "18:00" })}
                          style={{
                            flex: 1,
                            fontSize: "10px",
                            fontWeight: "700",
                            padding: "3px 0",
                            borderRadius: "4px",
                            border: "1px solid #CBD5E1",
                            background: status === "WORKING" ? "#16A34A" : "#FFFFFF",
                            color: status === "WORKING" ? "#FFFFFF" : "#334155",
                            cursor: "pointer",
                          }}
                        >
                          Work
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateModalDay(d.day, { status: "WEEK_OFF", shift_start: null, shift_end: null })}
                          style={{
                            flex: 1,
                            fontSize: "10px",
                            fontWeight: "700",
                            padding: "3px 0",
                            borderRadius: "4px",
                            border: "1px solid #CBD5E1",
                            background: status === "WEEK_OFF" ? "#4F46E5" : "#FFFFFF",
                            color: status === "WEEK_OFF" ? "#FFFFFF" : "#334155",
                            cursor: "pointer",
                          }}
                        >
                          Off
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateModalDay(d.day, { status: "LEAVE", shift_start: null, shift_end: null })}
                          style={{
                            flex: 1,
                            fontSize: "10px",
                            fontWeight: "700",
                            padding: "3px 0",
                            borderRadius: "4px",
                            border: "1px solid #CBD5E1",
                            background: status === "LEAVE" ? "#D97706" : "#FFFFFF",
                            color: status === "LEAVE" ? "#FFFFFF" : "#334155",
                            cursor: "pointer",
                          }}
                        >
                          Leave
                        </button>
                      </div>

                      {status === "WORKING" && (
                        <div style={{ display: "flex", alignItems: "center", gap: "2px", fontSize: "10px" }}>
                          <input
                            type="time"
                            value={d.shift_start || "10:00"}
                            onChange={(e) => handleUpdateModalDay(d.day, { shift_start: e.target.value })}
                            style={{ width: "100%", fontSize: "10px", padding: "2px", borderRadius: "4px", border: "1px solid #CBD5E1" }}
                          />
                          <span>-</span>
                          <input
                            type="time"
                            value={d.shift_end || "18:00"}
                            onChange={(e) => handleUpdateModalDay(d.day, { shift_end: e.target.value })}
                            style={{ width: "100%", fontSize: "10px", padding: "2px", borderRadius: "4px", border: "1px solid #CBD5E1" }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* HR Remarks Input */}
              <div style={{ marginTop: "16px" }}>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                  HR Remarks / Review Note (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Schedule approved. Shift swapped for 14th Oct as requested."
                  value={reviewRemarks}
                  onChange={(e) => setReviewRemarks(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>
            </div>

            <div className="hr-modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelectedRoster(null)}
              >
                Cancel
              </button>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={() => handleSaveModalChanges(selectedRoster.status || "APPROVED")}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "8px",
                    border: "1px solid #CBD5E1",
                    background: "#FFFFFF",
                    color: "#334155",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Save Changes Only
                </button>

                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={() => handleSaveModalChanges("APPROVED")}
                  style={{
                    padding: "9px 20px",
                    borderRadius: "8px",
                    border: "none",
                    background: "linear-gradient(135deg, #16A34A 0%, #15803D 100%)",
                    color: "#FFFFFF",
                    fontSize: "13px",
                    fontWeight: "700",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Check size={16} /> Save & Approve Roster
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesRoster;
