import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  Clock,
  Video,
  CheckCircle2,
  AlertCircle,
  FileText,
  CalendarCheck,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  Sparkles,
  BookOpen,
  Filter,
  Check,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { getMyReportsHistory, getMyReportToday } from "../../../services/reportService";
import { useAuth } from "../../../context/AuthContext";
import "./AcademicOperationsPerformance.css";

const AcademicOperationsPerformance = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [todayReport, setTodayReport] = useState(null);
  const [activeTab, setActiveTab] = useState("reports"); // 'reports' | 'classes'
  const [statusFilter, setStatusFilter] = useState("ALL");

  const loadData = async () => {
    setLoading(true);
    try {
      const [historyRes, todayRes] = await Promise.all([
        getMyReportsHistory({ limit: 50 }).catch(() => null),
        getMyReportToday().catch(() => null),
      ]);

      if (historyRes?.data?.reports) {
        setReports(historyRes.data.reports);
      }
      if (todayRes?.data) {
        setTodayReport(todayRes.data);
      }
    } catch (err) {
      console.error("Failed to load operations performance data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute metrics
  const totalHours = reports.reduce(
    (sum, r) => sum + (parseFloat(r.total_hours_worked) || 0),
    0
  );

  const allClasses = reports.flatMap((r) =>
    (r.classes || []).map((c) => ({
      ...c,
      report_date: r.report_date,
      report_status: r.status,
    }))
  );

  const totalClasses = allClasses.length;
  const classesWithVideo = allClasses.filter((c) => !!c.video_recording_url).length;

  const approvedCount = reports.filter((r) => r.status === "HR_APPROVED").length;
  const pendingCount = reports.filter(
    (r) => r.status === "SUBMITTED" || r.status === "TL_REVIEWED"
  ).length;
  const revisionCount = reports.filter((r) => r.status === "REVISION_REQUESTED").length;

  const approvalRate =
    reports.length > 0 ? Math.round((approvedCount / reports.length) * 100) : 0;

  // Filtered reports
  const filteredReports = reports.filter((r) => {
    if (statusFilter === "ALL") return true;
    return r.status === statusFilter;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case "HR_APPROVED":
        return <span className="ops-pill pill-approved">HR Approved</span>;
      case "TL_REVIEWED":
        return <span className="ops-pill pill-tl">TL Reviewed</span>;
      case "REVISION_REQUESTED":
        return <span className="ops-pill pill-revision">Revision Requested</span>;
      default:
        return <span className="ops-pill pill-submitted">Submitted</span>;
    }
  };

  return (
    <div className="ops-perf-container">
      {/* Header */}
      <div className="ops-perf-header">
        <div>
          <h1 className="header-title">
            <TrendingUp className="header-icon" /> Academic & Operations Performance
          </h1>
          <p className="header-subtitle">
            Track your logged work hours, submitted daily reports, class video recordings, and verification feedback.
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn-submit-report"
            onClick={() => navigate("/employee/daily-report")}
          >
            <CalendarCheck size={16} />
            <span>Submit Daily Report</span>
          </button>
          <button
            type="button"
            className="btn-refresh"
            onClick={loadData}
            title="Refresh Performance"
          >
            <RefreshCw size={16} className={loading ? "spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Welcome Banner */}
      <div className="ops-welcome-banner">
        <div className="banner-profile">
          <div className="banner-avatar">
            {user?.full_name?.charAt(0).toUpperCase() || "O"}
          </div>
          <div>
            <h2>{user?.full_name || "Team Member"}</h2>
            <div className="banner-meta">
              <span className="badge-role">{user?.role || "OPERATIONS"}</span>
              <span className="badge-dept">Academic & Operations Department</span>
              <span className="badge-email">{user?.email}</span>
            </div>
          </div>
        </div>

        <div className="banner-score">
          <div className="score-label">
            <ShieldCheck size={18} /> Compliance & Approval Rate
          </div>
          <div className="score-number">{approvalRate}%</div>
          <div className="score-sub">
            {approvedCount} Approved of {reports.length} Total Reports
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="ops-metrics-grid">
        <div className="ops-metric-card blue">
          <div className="card-top">
            <span>Total Logged Hours</span>
            <div className="icon-wrap blue">
              <Clock size={20} />
            </div>
          </div>
          <div className="card-value">{totalHours.toFixed(1)} hrs</div>
          <div className="card-sub">From {reports.length} submitted daily reports</div>
        </div>

        <div className="ops-metric-card indigo">
          <div className="card-top">
            <span>Classes & Video Proofs</span>
            <div className="icon-wrap indigo">
              <Video size={20} />
            </div>
          </div>
          <div className="card-value">{totalClasses}</div>
          <div className="card-sub">
            <strong className="text-emerald-700">{classesWithVideo}</strong> with verified recording URL
          </div>
        </div>

        <div className="ops-metric-card emerald">
          <div className="card-top">
            <span>HR Approved Reports</span>
            <div className="icon-wrap emerald">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="card-value text-emerald-600">{approvedCount}</div>
          <div className="card-sub">Verified & approved by HR</div>
        </div>

        <div className="ops-metric-card amber">
          <div className="card-top">
            <span>Pending Review / Revisions</span>
            <div className="icon-wrap amber">
              <AlertCircle size={20} />
            </div>
          </div>
          <div className="card-value text-amber-600">{pendingCount + revisionCount}</div>
          <div className="card-sub">
            {pendingCount} in review, {revisionCount} revisions
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="ops-tabs-bar">
        <button
          type="button"
          className={`ops-tab-btn ${activeTab === "reports" ? "active" : ""}`}
          onClick={() => setActiveTab("reports")}
        >
          <FileText size={16} />
          <span>Daily Work Reports Ledger ({reports.length})</span>
        </button>
        <button
          type="button"
          className={`ops-tab-btn ${activeTab === "classes" ? "active" : ""}`}
          onClick={() => setActiveTab("classes")}
        >
          <Video size={16} />
          <span>Class Logs & Video Recording Proofs ({totalClasses})</span>
        </button>
      </div>

      {loading ? (
        <div className="ops-loading-box">
          <RefreshCw size={32} className="spin text-blue-600" />
          <p>Loading your verified performance logs...</p>
        </div>
      ) : activeTab === "reports" ? (
        /* TAB 1: REPORTS LEDGER */
        <div className="ops-section-box">
          <div className="ops-filter-bar">
            <div className="filter-title-wrap">
              <Filter size={16} />
              <span>Filter by Status:</span>
            </div>
            <div className="filter-chips">
              {[
                { label: "All Reports", value: "ALL", count: reports.length },
                { label: "HR Approved", value: "HR_APPROVED", count: approvedCount },
                { label: "In Review", value: "SUBMITTED", count: reports.filter((r) => r.status === "SUBMITTED").length },
                { label: "TL Reviewed", value: "TL_REVIEWED", count: reports.filter((r) => r.status === "TL_REVIEWED").length },
                { label: "Needs Revision", value: "REVISION_REQUESTED", count: revisionCount },
              ].map((f) => (
                <button
                  key={f.value}
                  type="button"
                  className={`filter-chip ${statusFilter === f.value ? "active" : ""}`}
                  onClick={() => setStatusFilter(f.value)}
                >
                  <span>{f.label}</span>
                  <span className="chip-badge">{f.count}</span>
                </button>
              ))}
            </div>
          </div>

          {filteredReports.length === 0 ? (
            <div className="ops-empty-state">
              <FileText size={42} className="empty-icon" />
              <h3>No work reports found</h3>
              <p>There are no daily reports matching the selected filter.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Tasks & Deliverables Summary</th>
                    <th>Hours</th>
                    <th>Classes</th>
                    <th>Status</th>
                    <th>Feedback / Reviews</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((rep) => (
                    <tr key={rep.id}>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <div className="font-semibold text-slate-800">
                          {new Date(rep.report_date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                        <span className="text-xs text-slate-500">
                          {new Date(rep.report_date).toLocaleDateString("en-IN", { weekday: "long" })}
                        </span>
                      </td>

                      <td>
                        <div className="task-summary-text">{rep.tasks_summary}</div>
                        {rep.deliverable_links && (
                          <div className="rep-link-item mt-1">
                            <a
                              href={rep.deliverable_links}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                            >
                              <ExternalLink size={11} />
                              <span>View Deliverable Link</span>
                            </a>
                          </div>
                        )}
                        {rep.blockers && (
                          <div className="rep-blocker-note">
                            <strong>Blocker:</strong> {rep.blockers}
                          </div>
                        )}
                      </td>

                      <td>
                        <span className="font-medium text-slate-700">
                          {rep.total_hours_worked || 8} hrs
                        </span>
                      </td>

                      <td>
                        {rep.took_class ? (
                          <div className="flex flex-col gap-1">
                            <span className="pill-class-count">
                              <Video size={12} /> {rep.classes?.length || 1} Class(es)
                            </span>
                            {rep.classes?.[0]?.video_recording_url && (
                              <a
                                href={rep.classes[0].video_recording_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="class-video-link"
                                title="Open video recording proof"
                              >
                                <span>Video Proof</span>
                                <ExternalLink size={10} />
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">No classes</span>
                        )}
                      </td>

                      <td>{getStatusBadge(rep.status)}</td>

                      <td>
                        {rep.hr_feedback ? (
                          <div className="feedback-box hr-fb">
                            <span className="fb-author">HR:</span> {rep.hr_feedback}
                          </div>
                        ) : rep.tl_feedback ? (
                          <div className="feedback-box tl-fb">
                            <span className="fb-author">TL:</span> {rep.tl_feedback}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">No feedback</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* TAB 2: CLASSES & VIDEO RECORDING PROOFS */
        <div className="ops-section-box">
          <div className="classes-header-notice">
            <BookOpen size={18} className="text-indigo-600" />
            <div>
              <h3>Verified Class Logs with Video Recording Proofs</h3>
              <p>
                Each class conducted requires a mandatory video recording URL (Google Drive, Zoom, YouTube, Loom, etc.) verified by HR.
              </p>
            </div>
          </div>

          {allClasses.length === 0 ? (
            <div className="ops-empty-state">
              <Video size={42} className="empty-icon" />
              <h3>No classes conducted yet</h3>
              <p>When you conduct batches and log them in your daily reports, they will appear here with clickable video proofs.</p>
            </div>
          ) : (
            <div className="classes-cards-grid">
              {allClasses.map((cls, idx) => (
                <div key={cls.id || idx} className="class-audit-card">
                  <div className="class-card-top">
                    <span className="batch-badge">{cls.batch_name || "General Batch"}</span>
                    <span className="class-date">
                      {new Date(cls.report_date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <h4 className="class-topic-title">{cls.topic_covered}</h4>

                  {cls.course_name && (
                    <div className="class-course-name">
                      <strong>Course:</strong> {cls.course_name}
                    </div>
                  )}

                  <div className="class-meta-row">
                    {cls.duration_minutes && (
                      <span className="meta-item">
                        <Clock size={13} /> {cls.duration_minutes} mins
                      </span>
                    )}
                    {cls.students_count > 0 && (
                      <span className="meta-item">
                        👥 {cls.students_count} students attended
                      </span>
                    )}
                  </div>

                  <div className="class-card-actions">
                    {cls.video_recording_url ? (
                      <a
                        href={cls.video_recording_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-watch-proof"
                      >
                        <Video size={14} />
                        <span>Watch Video Proof</span>
                        <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span className="btn-no-video">Video Link Missing</span>
                    )}

                    {cls.materials_url && (
                      <a
                        href={cls.materials_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-materials-link"
                      >
                        <span>Materials</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AcademicOperationsPerformance;
