import React from "react";
import {
  X,
  Calendar,
  Clock,
  CheckCircle,
  Video,
  ExternalLink,
  User,
  Building,
  AlertCircle,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import "./ReportDetailsModal.css";

const ReportDetailsModal = ({ report, onClose, onReviewAsTL, onReviewAsHR, userRole }) => {
  if (!report) return null;

  const isTL = userRole === "TL" || userRole === "MANAGER" || userRole === "SUPER_ADMIN";
  const isHR = userRole === "HR" || userRole === "SUPER_ADMIN";

  return (
    <div className="report-modal-overlay" onClick={onClose}>
      <div className="report-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="report-modal-header">
          <div className="modal-header-info">
            <span className="modal-eyebrow">
              {report.department_name || "Operations"} • {report.role_type || "Staff"}
            </span>
            <h2 className="modal-title">
              {report.user_name || "Employee"} — Daily Work Report
            </h2>
            <div className="modal-meta-row">
              <span className="meta-tag">
                <Calendar size={13} /> {report.report_date}
              </span>
              <span className="meta-tag">
                <Clock size={13} /> {report.total_hours_worked || 8} Hours
              </span>
              <span className={`status-badge status-${(report.status || "SUBMITTED").toLowerCase()}`}>
                {report.status?.replace("_", " ")}
              </span>
            </div>
          </div>

          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="report-modal-body">
          {/* Work Title */}
          {report.work_title && (
            <div className="modal-section highlight-box">
              <h4 className="section-label">Primary Daily Focus</h4>
              <p className="focus-text">{report.work_title}</p>
            </div>
          )}

          {/* Tasks Completed */}
          <div className="modal-section">
            <h4 className="section-label">Tasks & Work Completed</h4>
            <div className="tasks-box">
              {report.tasks_summary?.split("\n").map((line, i) => (
                <p key={i} className="task-line">{line}</p>
              ))}
            </div>
          </div>

          {/* Deliverable Links */}
          {report.deliverable_links && (
            <div className="modal-section">
              <h4 className="section-label">Deliverable Links & Proofs</h4>
              <div className="links-pill-container">
                {report.deliverable_links.split(",").map((link, idx) => {
                  const trimmed = link.trim();
                  if (!trimmed) return null;
                  return (
                    <a
                      key={idx}
                      href={trimmed.startsWith("http") ? trimmed : `https://${trimmed}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="deliverable-link-pill"
                    >
                      <ExternalLink size={13} /> {trimmed}
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Class / Lecture Sessions with Video Proof Links */}
          {report.took_class && report.classes && report.classes.length > 0 && (
            <div className="modal-section">
              <div className="classes-section-badge">
                <Sparkles size={16} />
                <span>Class Sessions & Video Recordings Proof ({report.classes.length})</span>
              </div>

              <div className="classes-list-grid">
                {report.classes.map((cls, idx) => (
                  <div key={cls.id || idx} className="class-detail-card">
                    <div className="class-card-top">
                      <span className="batch-pill">{cls.batch_name}</span>
                      <span className="duration-pill">
                        <Clock size={12} /> {cls.duration_minutes || 60} mins
                      </span>
                      {cls.students_count > 0 && (
                        <span className="students-pill">
                          <User size={12} /> {cls.students_count} Students
                        </span>
                      )}
                    </div>

                    <h4 className="class-topic-title">
                      {cls.topic_covered}
                    </h4>

                    {cls.course_name && (
                      <p className="class-course-name">
                        <Building size={13} /> {cls.course_name}
                      </p>
                    )}

                    {/* Direct Video Link Box */}
                    <div className="video-proof-box">
                      <div className="video-proof-left">
                        <Video size={18} className="video-icon" />
                        <div>
                          <strong>Class Recording Link</strong>
                          <span className="video-url-truncate">{cls.video_recording_url}</span>
                        </div>
                      </div>

                      <a
                        href={cls.video_recording_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="play-video-btn"
                        title="Open Video Recording in New Tab"
                      >
                        <ExternalLink size={14} /> Open Recording
                      </a>
                    </div>

                    {cls.materials_url && (
                      <div className="materials-box">
                        <a
                          href={cls.materials_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="materials-link"
                        >
                          <ExternalLink size={12} /> Class Materials / Slides
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Blockers & Plan */}
          {(report.blockers || report.next_day_plan) && (
            <div className="modal-meta-grid">
              {report.blockers && (
                <div className="meta-card blocker-card">
                  <h4 className="meta-card-label">
                    <AlertCircle size={14} /> Blockers / Dependencies
                  </h4>
                  <p>{report.blockers}</p>
                </div>
              )}
              {report.next_day_plan && (
                <div className="meta-card plan-card">
                  <h4 className="meta-card-label">
                    <CheckCircle size={14} /> Plan for Tomorrow
                  </h4>
                  <p>{report.next_day_plan}</p>
                </div>
              )}
            </div>
          )}

          {/* Review History */}
          {(report.tl_feedback || report.hr_feedback) && (
            <div className="reviews-section">
              <h4 className="section-label">
                <MessageSquare size={15} /> Reviews & Approvals
              </h4>

              {report.tl_feedback && (
                <div className="review-comment-card tl-review">
                  <div className="review-author">
                    <strong>Team Lead Verification: {report.tl_name || "TL"}</strong>
                    <span>{report.tl_reviewed_at ? new Date(report.tl_reviewed_at).toLocaleDateString() : ""}</span>
                  </div>
                  <p>{report.tl_feedback}</p>
                </div>
              )}

              {report.hr_feedback && (
                <div className="review-comment-card hr-review">
                  <div className="review-author">
                    <strong>HR Final Approval: {report.hr_name || "HR Team"}</strong>
                    <span>{report.hr_reviewed_at ? new Date(report.hr_reviewed_at).toLocaleDateString() : ""}</span>
                  </div>
                  <p>{report.hr_feedback}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer / Review Actions */}
        <div className="report-modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>

          {isTL && onReviewAsTL && report.status === "SUBMITTED" && (
            <button
              className="btn-primary"
              onClick={() => onReviewAsTL(report)}
            >
              Verify as Team Lead
            </button>
          )}

          {isHR && onReviewAsHR && report.status !== "HR_APPROVED" && (
            <button
              className="btn-success"
              onClick={() => onReviewAsHR(report)}
            >
              Approve Report as HR
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportDetailsModal;
