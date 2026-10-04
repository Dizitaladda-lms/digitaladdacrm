import React, { useState, useEffect } from "react";
import {
  Users,
  Calendar,
  Clock,
  Video,
  CheckCircle,
  AlertCircle,
  Filter,
  Eye,
  CheckCheck,
  Search,
  PhoneCall,
  GraduationCap,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import { getTeamReports, reviewReportAsTL } from "../../services/reportService";
import ReportDetailsModal from "../../components/reports/ReportDetailsModal";
import { useAuth } from "../../context/AuthContext";
import "./TeamReports.css";

const TeamReports = () => {
  const { user } = useAuth();
  const isSalesDept = user?.role === "COUNSELLOR" || user?.role === "SUPER_ADMIN" || (user?.department_name && /sales/i.test(user.department_name));

  const [reports, setReports] = useState([]);
  const [salesMetrics, setSalesMetrics] = useState({
    kpi: { totalLeads: 0, totalCalls: 0, connectedCalls: 0, totalAdmissions: 0, totalRevenue: 0 },
    counsellors: [],
  });
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [statusFilter, setStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [reviewingReport, setReviewingReport] = useState(null);
  const [tlFeedback, setTlFeedback] = useState("");
  const [reviewStatus, setReviewStatus] = useState("TL_REVIEWED");
  const [savingReview, setSavingReview] = useState(false);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await getTeamReports({
        date: selectedDate || undefined,
        status: statusFilter || undefined,
        roleType: roleFilter || undefined,
      });
      if (res?.data) {
        if (res.data.reports) setReports(res.data.reports);
        if (res.data.salesMetrics) setSalesMetrics(res.data.salesMetrics);
      }
    } catch (err) {
      console.error("Failed to fetch team reports:", err);
      toast.error(err.response?.data?.message || "Could not fetch team reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [selectedDate, statusFilter, roleFilter]);

  const handleOpenReview = (report) => {
    setReviewingReport(report);
    setTlFeedback(report.tl_feedback || "");
    setReviewStatus(report.status === "REVISION_REQUESTED" ? "REVISION_REQUESTED" : "TL_REVIEWED");
  };

  const handleSaveReview = async (e) => {
    e.preventDefault();
    if (!reviewingReport) return;

    try {
      setSavingReview(true);
      await reviewReportAsTL(reviewingReport.id, {
        feedback: tlFeedback,
        status: reviewStatus,
      });
      toast.success("Team member report reviewed & status updated! ✅");
      setReviewingReport(null);
      setSelectedReport(null);
      fetchReports();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit review.");
    } finally {
      setSavingReview(false);
    }
  };

  // KPI Metrics calculation for Non-Sales vs Sales
  const kpi = salesMetrics.kpi || { totalLeads: 0, totalCalls: 0, connectedCalls: 0, totalAdmissions: 0, totalRevenue: 0 };
  const counsellors = salesMetrics.counsellors || [];

  const totalHoursLogged = reports.reduce((sum, r) => sum + (parseFloat(r.total_hours_worked) || 0), 0);
  const totalClassesTook = reports.reduce((sum, r) => sum + (r.classes?.length || (r.took_class ? 1 : 0)), 0);
  const approvedReportsCount = reports.filter((r) => r.status === "HR_APPROVED" || r.status === "HEAD_APPROVED" || r.status === "TL_REVIEWED").length;

  return (
    <div className="team-reports-page">
      {/* Header */}
      <div className="team-reports-header">
        <div>
          <span className="team-eyebrow">
            {isSalesDept ? "Sales Department Workspace" : "Operations & Academic Team Workspace"}
          </span>
          <h1 className="team-heading">
            {isSalesDept ? "Sales Team Performance & Work Reports" : "Department Team Performance & Reports"}
          </h1>
          <p className="team-subheading">
            {isSalesDept
              ? "Live team analytics, call activity, enrolment conversions, and daily work report verifications."
              : "Real-time employee work logs, class video recording proofs, shift hours, and report approvals."}
          </p>
        </div>

        {/* Filters */}
        <div className="team-filters-bar">
          <div className="filter-input-wrap">
            <Calendar size={15} />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="filter-date-input"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Roles (Employees & Interns)</option>
            <option value="EMPLOYEE">Employees Only</option>
            <option value="INTERN">Interns Only</option>
            <option value="TRAINER">Trainers Only</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Statuses</option>
            <option value="SUBMITTED">Pending Review</option>
            <option value="TL_REVIEWED">Approved by Dept Head</option>
            <option value="HR_APPROVED">HR Approved</option>
            <option value="REVISION_REQUESTED">Revision Requested</option>
          </select>
        </div>
      </div>

      {/* DYNAMIC TOP 4 KPI SUMMARY CARDS BASED ON DEPARTMENT */}
      {isSalesDept ? (
        <div className="team-stats-grid">
          <div className="stat-card">
            <div className="stat-icon-wrap blue">
              <Users size={20} />
            </div>
            <div>
              <span className="stat-label">Assigned Leads & Calls</span>
              <strong className="stat-number">
                {kpi.totalLeads} <span style={{ fontSize: "14px", fontWeight: 500, color: "#64748b" }}>/ {kpi.totalCalls} calls</span>
              </strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrap amber">
              <PhoneCall size={20} />
            </div>
            <div>
              <span className="stat-label">Connected Calls</span>
              <strong className="stat-number">{kpi.connectedCalls}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrap green">
              <GraduationCap size={20} />
            </div>
            <div>
              <span className="stat-label">Admissions Closed</span>
              <strong className="stat-number">{kpi.totalAdmissions}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrap orange">
              <TrendingUp size={20} />
            </div>
            <div>
              <span className="stat-label">Fee Revenue Collected</span>
              <strong className="stat-number">
                ₹ {Number(kpi.totalRevenue || 0).toLocaleString("en-IN")}
              </strong>
            </div>
          </div>
        </div>
      ) : (
        <div className="team-stats-grid">
          <div className="stat-card">
            <div className="stat-icon-wrap blue">
              <Users size={20} />
            </div>
            <div>
              <span className="stat-label">Total Submissions Logged</span>
              <strong className="stat-number">{reports.length}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrap amber">
              <Clock size={20} />
            </div>
            <div>
              <span className="stat-label">Shift Hours Logged</span>
              <strong className="stat-number">{totalHoursLogged.toFixed(1)} hrs</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrap purple">
              <Video size={20} />
            </div>
            <div>
              <span className="stat-label">Classes & Video Proofs</span>
              <strong className="stat-number">{totalClassesTook}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrap green">
              <CheckCircle size={20} />
            </div>
            <div>
              <span className="stat-label">Verified & Approved</span>
              <strong className="stat-number">{approvedReportsCount}</strong>
            </div>
          </div>
        </div>
      )}

      {/* COUNSELLOR SALES BREAKDOWN TABLE */}
      <div className="team-table-card" style={{ marginBottom: "28px" }}>
        <div className="team-table-top">
          <div>
            <h3 className="team-table-title">Sales Counsellors Breakdown</h3>
            <p style={{ margin: "2px 0 0 0", color: "#64748b", fontSize: "13px" }}>
              Individual counsellor call activity, today's attendance, admissions, and conversion metrics.
            </p>
          </div>
          <span className="team-count-tag">{counsellors.length} Active Counsellors</span>
        </div>

        <div className="table-responsive">
          <table className="team-reports-table">
            <thead>
              <tr>
                <th>Counsellor</th>
                <th>Today Attendance</th>
                <th>Assigned Leads</th>
                <th>Calls / Connected</th>
                <th>Admissions</th>
                <th>Revenue (₹)</th>
                <th>Conversion Rate</th>
              </tr>
            </thead>
            <tbody>
              {counsellors.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>
                    No sales counsellors found for the selected filter.
                  </td>
                </tr>
              ) : (
                counsellors.map((c) => (
                  <tr key={c.employee_id}>
                    <td>
                      <div className="member-info-cell">
                        <div className="member-avatar">
                          {c.employee_name?.slice(0, 2).toUpperCase() || "CN"}
                        </div>
                        <div>
                          <strong>{c.employee_name}</strong>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                            <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#2563eb", background: "#eff6ff", padding: "1px 5px", borderRadius: "4px", border: "1px solid #bfdbfe" }}>
                              {c.designation || c.role || "Counsellor"}
                            </span>
                            <span className="member-code">{c.employee_code || c.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: "12px",
                          backgroundColor: c.today_attendance_status === "PRESENT" ? "#DCFCE7" : "#FEE2E2",
                          color: c.today_attendance_status === "PRESENT" ? "#15803D" : "#B91C1C",
                        }}
                      >
                        {c.today_attendance_status === "PRESENT"
                          ? `Present (${c.today_hours || 0}h)`
                          : "Not Checked In"}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: "#2563EB" }}>{c.assigned_leads_count}</strong>
                    </td>
                    <td>
                      <span>
                        <strong>{c.total_calls_count}</strong> <span style={{ color: "#64748b" }}>({c.connected_calls_count} connected)</span>
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: "#16A34A" }}>{c.admissions_count}</span>
                    </td>
                    <td>
                      <strong style={{ color: "#4F46E5" }}>
                        ₹ {Number(c.total_revenue || 0).toLocaleString("en-IN")}
                      </strong>
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: "6px",
                          background: Number(c.conversion_rate) > 0 ? "#EEF2FF" : "#F1F5F9",
                          color: Number(c.conversion_rate) > 0 ? "#4338CA" : "#64748B",
                        }}
                      >
                        {c.conversion_rate}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DAILY WORK REPORTS TABLE */}
      <div className="team-table-card">
        <div className="team-table-top">
          <h3 className="team-table-title">
            Department Daily Submissions for {selectedDate}
          </h3>
          <span className="team-count-tag">{reports.length} Submissions</span>
        </div>

        {loading ? (
          <div className="team-loading">Loading team submissions...</div>
        ) : reports.length === 0 ? (
          <div className="team-empty">
            <AlertCircle size={32} />
            <h4>No reports submitted for this date</h4>
            <p>Try picking another date or clear active filters.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="team-reports-table">
              <thead>
                <tr>
                  <th>Team Member</th>
                  <th>Role / Dept</th>
                  <th>Hours</th>
                  <th>Work Summary</th>
                  <th>Classes & Video Proof</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="member-info-cell">
                        <div className="member-avatar">
                          {row.user_avatar ? (
                            <img src={row.user_avatar} alt={row.user_name} />
                          ) : (
                            row.user_name?.slice(0, 2).toUpperCase() || "EM"
                          )}
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <strong>{row.user_name}</strong>
                            {row.is_direct_intern && (
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: 700,
                                  backgroundColor: "#E0F2FE",
                                  color: "#0369A1",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                }}
                              >
                                Assigned Intern
                              </span>
                            )}
                          </div>
                          <span className="member-code">{row.employee_code || row.user_email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="role-dept-cell">
                        <span className={`role-tag role-${(row.role_type || "EMPLOYEE").toLowerCase()}`}>
                          {row.role_type || "EMPLOYEE"}
                        </span>
                        <span className="dept-label">{row.department_name}</span>
                        {row.mentor_name && row.role_type === "INTERN" && !row.is_direct_intern && (
                          <span style={{ fontSize: "11px", color: "#64748B" }}>
                            Mentor: {row.mentor_name}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="hours-badge">
                        <Clock size={12} /> {row.total_hours_worked || 8}h
                      </span>
                    </td>
                    <td className="summary-cell">
                      <span className="summary-text" title={row.tasks_summary}>
                        {row.work_title || row.tasks_summary}
                      </span>
                    </td>
                    <td>
                      {row.took_class ? (
                        <div className="class-proof-tag">
                          <Video size={13} />
                          <span>{row.classes?.length || 1} Class (Video Attached)</span>
                        </div>
                      ) : (
                        <span className="no-class-text">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-pill pill-${(row.status || "SUBMITTED").toLowerCase()}`}>
                        {row.status?.replace("_", " ")}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons-wrap">
                        <button
                          className="action-btn view-btn"
                          onClick={() => setSelectedReport(row)}
                          title="View Full Report"
                        >
                          <Eye size={14} /> View
                        </button>

                        <button
                          className="action-btn verify-btn"
                          onClick={() => handleOpenReview(row)}
                          title="Review / Verify"
                        >
                          <CheckCheck size={14} /> Review
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewingReport && (
        <div className="review-modal-overlay" onClick={() => setReviewingReport(null)}>
          <div className="review-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="review-modal-header">
              <div>
                <span className="modal-eyebrow">Team Lead Action</span>
                <h3>Verify Report: {reviewingReport.user_name}</h3>
                <span className="modal-date-tag">{reviewingReport.report_date}</span>
              </div>
              <button
                className="close-review-btn"
                onClick={() => setReviewingReport(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveReview} className="review-form">
              {/* Report Summary Snippet */}
              <div className="report-snippet-box">
                <strong>Tasks Logged:</strong>
                <p>{reviewingReport.tasks_summary}</p>
                {reviewingReport.took_class && reviewingReport.classes?.length > 0 && (
                  <div className="snippet-classes">
                    <strong>Class Video Proofs:</strong>
                    {reviewingReport.classes.map((cls, i) => (
                      <div key={i} className="snippet-class-item">
                        <span>{cls.batch_name} — {cls.topic_covered}</span>
                        <a
                          href={cls.video_recording_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="snippet-video-link"
                        >
                          <Video size={13} /> Open Recording Proof
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Review Decision</label>
                <select
                  className="form-select"
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value)}
                >
                  <option value="TL_REVIEWED">Verify / Approve Team Member Report</option>
                  <option value="REVISION_REQUESTED">Request Changes / Needs Revision</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Team Lead Feedback / Comments</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Great work on the Meta Ads module / Please provide the complete Zoom recording link..."
                  value={tlFeedback}
                  onChange={(e) => setTlFeedback(e.target.value)}
                />
              </div>

              <div className="review-form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setReviewingReport(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={savingReview}
                >
                  {savingReview ? "Saving Review..." : "Confirm & Update Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedReport && (
        <ReportDetailsModal
          report={selectedReport}
          userRole="TL"
          onClose={() => setSelectedReport(null)}
          onReviewAsTL={(rep) => handleOpenReview(rep)}
        />
      )}
    </div>
  );
};

export default TeamReports;
