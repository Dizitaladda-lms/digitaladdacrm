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
} from "lucide-react";
import toast from "react-hot-toast";
import { getTeamReports, reviewReportAsTL } from "../../services/reportService";
import ReportDetailsModal from "../../components/reports/ReportDetailsModal";
import "./TeamReports.css";

const TeamReports = () => {
  const [reports, setReports] = useState([]);
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
      if (res?.data?.reports) {
        setReports(res.data.reports);
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

  // Metrics
  const totalReports = reports.length;
  const directInternsCount = reports.filter((r) => r.is_direct_intern || r.role_type === "INTERN").length;
  const classesLogged = reports.filter((r) => r.took_class).length;
  const pendingReview = reports.filter((r) => r.status === "SUBMITTED").length;
  const verifiedCount = reports.filter((r) => r.status === "TL_REVIEWED" || r.status === "HR_APPROVED").length;

  return (
    <div className="team-reports-page">
      {/* Header */}
      <div className="team-reports-header">
        <div>
          <span className="team-eyebrow">Team Leadership Workspace</span>
          <h1 className="team-heading">Team Daily Reports & Video Proof Verification</h1>
          <p className="team-subheading">
            Review and verify daily work, task progress, and class video recording links for your team members and interns.
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
            <option value="TL_REVIEWED">TL Verified</option>
            <option value="HR_APPROVED">HR Approved</option>
            <option value="REVISION_REQUESTED">Revision Requested</option>
          </select>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="team-stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrap blue">
            <Users size={20} />
          </div>
          <div>
            <span className="stat-label">Reports Submitted</span>
            <strong className="stat-number">{totalReports}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap amber">
            <AlertCircle size={20} />
          </div>
          <div>
            <span className="stat-label">Pending TL Review</span>
            <strong className="stat-number">{pendingReview}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap orange">
            <Video size={20} />
          </div>
          <div>
            <span className="stat-label">Classes Conducted</span>
            <strong className="stat-number">{classesLogged}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap green">
            <CheckCircle size={20} />
          </div>
          <div>
            <span className="stat-label">Verified Reports</span>
            <strong className="stat-number">{verifiedCount}</strong>
          </div>
        </div>
      </div>

      {/* Reports Table Card */}
      <div className="team-table-card">
        <div className="team-table-top">
          <h3 className="team-table-title">
            Department Submissions for {selectedDate}
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
