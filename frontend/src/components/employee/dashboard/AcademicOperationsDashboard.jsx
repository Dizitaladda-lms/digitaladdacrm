import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  CalendarCheck,
  Video,
  CheckCircle2,
  AlertCircle,
  FileText,
  ExternalLink,
  ArrowRight,
  TrendingUp,
  Sparkles,
  BookOpen,
  MessageSquare,
} from "lucide-react";
import { getMyReportToday, getMyReportsHistory } from "../../../services/reportService";
import { useAuth } from "../../../context/AuthContext";
import "./AcademicOperationsDashboard.css";

const AcademicOperationsDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [todayReport, setTodayReport] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const [todayRes, historyRes] = await Promise.all([
          getMyReportToday().catch(() => null),
          getMyReportsHistory({ limit: 10 }).catch(() => null),
        ]);

        if (todayRes?.data) {
          setTodayReport(todayRes.data);
        }
        if (historyRes?.data?.reports) {
          setHistory(historyRes.data.reports);
        }
      } catch (err) {
        console.error("Failed to load operations dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Compute metrics from history
  const totalHours = history.reduce((sum, r) => sum + (parseFloat(r.total_hours_worked) || 0), 0);
  const totalClasses = history.reduce((sum, r) => sum + (r.classes?.length || (r.took_class ? 1 : 0)), 0);
  const approvedCount = history.filter((r) => r.status === "HR_APPROVED").length;
  const pendingCount = history.filter((r) => r.status === "SUBMITTED" || r.status === "TL_REVIEWED").length;

  const isTrainer = user?.role === "TRAINER";

  const getStatusBadge = (status) => {
    switch (status) {
      case "HR_APPROVED":
        return <span className="status-pill status-approved">HR Approved</span>;
      case "TL_REVIEWED":
        return <span className="status-pill status-tl">TL Reviewed</span>;
      case "REVISION_REQUESTED":
        return <span className="status-pill status-revision">Revision Requested</span>;
      default:
        return <span className="status-pill status-submitted">Submitted</span>;
    }
  };

  return (
    <div className="academic-ops-dashboard">
      {/* Header Banner */}
      <div className="ops-header-banner">
        <div className="ops-header-content">
          <div className="ops-role-badge">
            <Sparkles size={14} />
            <span>{user?.role || "ACADEMIC & OPERATIONS"} DEPARTMENT</span>
          </div>
          <h1>Welcome, {user?.full_name || "Team Member"}</h1>
          <p>
            Track your daily performance, class logs with video proof, and report approval status.
          </p>
        </div>
        <div className="ops-header-actions">
          <button
            type="button"
            className="ops-btn-primary"
            onClick={() => navigate("/employee/daily-report")}
          >
            <CalendarCheck size={18} />
            <span>Submit Daily Report</span>
          </button>
          <button
            type="button"
            className="ops-btn-secondary"
            onClick={() => navigate("/employee/performance")}
          >
            <TrendingUp size={18} />
            <span>My Performance</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="ops-kpi-grid">
        <div className="ops-kpi-card">
          <div className="ops-kpi-icon icon-hours">
            <Clock size={24} />
          </div>
          <div className="ops-kpi-info">
            <span className="ops-kpi-label">Logged Hours</span>
            <span className="ops-kpi-value">{totalHours.toFixed(1)} hrs</span>
            <span className="ops-kpi-hint">Past recent reports</span>
          </div>
        </div>

        <div className="ops-kpi-card">
          <div className="ops-kpi-icon icon-classes">
            <Video size={24} />
          </div>
          <div className="ops-kpi-info">
            <span className="ops-kpi-label">{isTrainer ? "Classes Taken" : "Tasks Delivered"}</span>
            <span className="ops-kpi-value">{totalClasses}</span>
            <span className="ops-kpi-hint">With verified recording proof</span>
          </div>
        </div>

        <div className="ops-kpi-card">
          <div className="ops-kpi-icon icon-approved">
            <CheckCircle2 size={24} />
          </div>
          <div className="ops-kpi-info">
            <span className="ops-kpi-label">Approved Reports</span>
            <span className="ops-kpi-value">{approvedCount}</span>
            <span className="ops-kpi-hint">Verified by HR</span>
          </div>
        </div>

        <div className="ops-kpi-card">
          <div className="ops-kpi-icon icon-pending">
            <AlertCircle size={24} />
          </div>
          <div className="ops-kpi-info">
            <span className="ops-kpi-label">In Review / Pending</span>
            <span className="ops-kpi-value">{pendingCount}</span>
            <span className="ops-kpi-hint">Under TL / HR verification</span>
          </div>
        </div>
      </div>

      {/* Today's Status Banner */}
      <div className="today-report-section">
        {todayReport ? (
          <div className="today-status-card today-submitted">
            <div className="today-status-header">
              <div className="today-badge-wrap">
                <CheckCircle2 size={20} className="text-emerald-600" />
                <span className="today-title">Today's Report Submitted</span>
                {getStatusBadge(todayReport.status)}
              </div>
              <button
                type="button"
                className="edit-report-link"
                onClick={() => navigate("/employee/daily-report")}
              >
                <span>Edit Today's Report</span>
                <ArrowRight size={16} />
              </button>
            </div>
            <div className="today-details-grid">
              <div>
                <span className="detail-label">Hours Logged</span>
                <span className="detail-value">{todayReport.total_hours_worked || 8} hrs</span>
              </div>
              <div>
                <span className="detail-label">Classes Conducted</span>
                <span className="detail-value">
                  {todayReport.classes?.length || (todayReport.took_class ? 1 : 0)} Class(es)
                </span>
              </div>
              <div>
                <span className="detail-label">Tasks Summary</span>
                <span className="detail-value truncate-text">
                  {todayReport.tasks_summary || "Work logged"}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="today-status-card today-pending">
            <div className="today-pending-content">
              <div className="pending-icon-box">
                <CalendarCheck size={28} />
              </div>
              <div>
                <h3 className="pending-heading">Today's Work Report Pending</h3>
                <p className="pending-sub">
                  Please submit your daily tasks summary and lecture video recording proofs before the end of the day.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn-submit-today"
              onClick={() => navigate("/employee/daily-report")}
            >
              <CalendarCheck size={18} />
              <span>Submit Today's Report</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Recent Classes & Recent Reports */}
      <div className="ops-main-grid">
        {/* Classes Feed (Crucial for Trainers!) */}
        <div className="ops-grid-col">
          <div className="ops-panel-card">
            <div className="ops-panel-header">
              <div className="panel-header-title">
                <BookOpen size={20} className="text-blue-600" />
                <h2>Classes Conducted & Video Proof</h2>
              </div>
            </div>

            <div className="ops-panel-body">
              {loading ? (
                <div className="panel-loading">Loading class logs...</div>
              ) : (
                (() => {
                  const allClasses = history
                    .flatMap((r) =>
                      (r.classes || []).map((c) => ({
                        ...c,
                        report_date: r.report_date,
                      }))
                    )
                    .slice(0, 6);

                  if (allClasses.length === 0) {
                    return (
                      <div className="panel-empty">
                        <Video size={36} className="empty-icon" />
                        <p>No class records logged recently.</p>
                        <span className="empty-hint">Classes added in daily reports will show here.</span>
                      </div>
                    );
                  }

                  return (
                    <div className="classes-feed-list">
                      {allClasses.map((cls, idx) => (
                        <div key={cls.id || idx} className="class-feed-item">
                          <div className="class-feed-left">
                            <span className="class-batch-badge">{cls.batch_name || "Batch"}</span>
                            <h4 className="class-topic">{cls.topic_covered || "Lecture Topic"}</h4>
                            <div className="class-meta">
                              <span>{cls.report_date}</span>
                              {cls.duration_minutes && <span>• {cls.duration_minutes} mins</span>}
                            </div>
                          </div>
                          <div className="class-feed-right">
                            {cls.video_recording_url ? (
                              <a
                                href={cls.video_recording_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="video-proof-badge"
                                title="Open lecture video recording"
                              >
                                <Video size={14} />
                                <span>Watch Video Proof</span>
                                <ExternalLink size={12} />
                              </a>
                            ) : (
                              <span className="video-proof-missing">No Link</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        </div>

        {/* Recent Reports History */}
        <div className="ops-grid-col">
          <div className="ops-panel-card">
            <div className="ops-panel-header">
              <div className="panel-header-title">
                <FileText size={20} className="text-indigo-600" />
                <h2>Recent Daily Reports</h2>
              </div>
              <button
                type="button"
                className="view-all-link"
                onClick={() => navigate("/employee/performance")}
              >
                <span>View Full History</span>
                <ArrowRight size={14} />
              </button>
            </div>

            <div className="ops-panel-body">
              {loading ? (
                <div className="panel-loading">Loading report history...</div>
              ) : history.length === 0 ? (
                <div className="panel-empty">
                  <FileText size={36} className="empty-icon" />
                  <p>No reports submitted yet.</p>
                  <span className="empty-hint">Submit your first daily work report above.</span>
                </div>
              ) : (
                <div className="reports-history-list">
                  {history.slice(0, 5).map((rep) => (
                    <div key={rep.id} className="report-history-item">
                      <div className="report-item-top">
                        <span className="report-date-badge">
                          {new Date(rep.report_date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        {getStatusBadge(rep.status)}
                      </div>

                      <p className="report-item-tasks">{rep.tasks_summary}</p>

                      <div className="report-item-footer">
                        <span className="footer-metric">
                          <Clock size={13} /> {rep.total_hours_worked || 8} hrs
                        </span>
                        {rep.took_class && (
                          <span className="footer-metric text-blue-600">
                            <Video size={13} /> {rep.classes?.length || 1} Class(es)
                          </span>
                        )}
                        {(rep.tl_feedback || rep.hr_feedback) && (
                          <span className="footer-feedback-pill" title={rep.hr_feedback || rep.tl_feedback}>
                            <MessageSquare size={12} /> Feedback Given
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcademicOperationsDashboard;
