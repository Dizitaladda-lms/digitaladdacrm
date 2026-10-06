import React, { useState } from "react";
import toast from "react-hot-toast";
import { requestReportRevision } from "../../services/taskService";
import { formatWorkHours } from "../../utils/shiftTiming";
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
  RotateCcw,
  Send,
  LoaderCircle,
  Users,
} from "lucide-react";
import "./ReportDetailsModal.css";

const ReportDetailsModal = ({ report, onClose, onReviewAsTL, onReviewAsHR, onReviewAsSuperAdmin, userRole }) => {
  const [showRevisionBox, setShowRevisionBox] = useState(false);
  const [revisionFeedback, setRevisionFeedback] = useState("");
  const [requestingRevision, setRequestingRevision] = useState(false);

  if (!report) return null;

  const savedBlockers = report.blockers || "";
  const legacyInternsIndex = savedBlockers.indexOf("INTERNS_REPORT:");
  const blockersText = legacyInternsIndex >= 0
    ? savedBlockers.slice(0, legacyInternsIndex).trim()
    : savedBlockers;
  const internsWorkSummary = report.interns_work_summary || (
    legacyInternsIndex >= 0
      ? savedBlockers.slice(legacyInternsIndex + "INTERNS_REPORT:".length).trim()
      : ""
  );

  const renderFormattedSummary = (value) => {
    const lines = value.split("\n");
    return lines.map((line, lineIndex) => {
    const isHeading = line.startsWith("## ");
    const text = isHeading ? line.slice(3) : line;
    const formattedText = text.split(/(\*\*.*?\*\*)/g).map((part, partIndex) =>
      part.startsWith("**") && part.endsWith("**")
        ? <strong key={partIndex}>{part.slice(2, -2)}</strong>
        : part
    );

    return (
      <React.Fragment key={lineIndex}>
        {isHeading ? <strong>{formattedText}</strong> : formattedText}
        {lineIndex < lines.length - 1 && <br />}
      </React.Fragment>
    );
    });
  };

  const isSuperAdmin = userRole === "SUPER_ADMIN";
  const isHR = userRole === "HR" || isSuperAdmin;
  const isTL = userRole === "TL" || userRole === "MANAGER" || isHR;

  const handleSendRevision = async (e) => {
    e.preventDefault();
    if (!revisionFeedback.trim()) return toast.error("Please enter revision instructions.");
    try {
      setRequestingRevision(true);
      await requestReportRevision(report.id, {
        feedback: revisionFeedback.trim(),
      });
      toast.success("Revision requested! Report attached and assigned to employee tasks. 🔁");
      setShowRevisionBox(false);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not request revision.");
    } finally {
      setRequestingRevision(false);
    }
  };

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
              <span className="meta-tag" title={`${Number(report.total_hours_worked || 0).toFixed(2)} decimal hrs`}>
                <Clock size={13} /> {formatWorkHours(report.total_hours_worked)}
              </span>
              <span className={`status-badge status-${(report.status || "SUBMITTED").toLowerCase()}`}>
                {report.status === "SUBMITTED"
                  ? "Pending Dept Head Approval"
                  : report.status === "HEAD_APPROVED" || report.status === "TL_REVIEWED"
                  ? "Approved by Dept Head (Pending HR)"
                  : report.status === "HR_APPROVED"
                  ? "Approved by HR (Pending Super Admin)"
                  : report.status === "SUPER_ADMIN_APPROVED"
                  ? "Final Approved by Super Admin"
                  : report.status?.replace("_", " ")}
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
                          <span className="video-url-truncate">
                            {cls.video_recording_url || "Not added yet"}
                          </span>
                        </div>
                      </div>

                      {cls.video_recording_url && (
                        <a
                          href={cls.video_recording_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="play-video-btn"
                          title="Open Video Recording in New Tab"
                        >
                          <ExternalLink size={14} /> Open Recording
                        </a>
                      )}
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
          {(blockersText || internsWorkSummary || report.next_day_plan) && (
            <div className="modal-meta-grid">
              {internsWorkSummary && (
                <div className="meta-card interns-summary-card">
                  <h4 className="meta-card-label">
                    <Users size={14} /> Interns Work Summary &amp; Team Progress
                  </h4>
                  <p className="report-rich-text">{renderFormattedSummary(internsWorkSummary)}</p>
                </div>
              )}
              {blockersText && (
                <div className="meta-card blocker-card">
                  <h4 className="meta-card-label">
                    <AlertCircle size={14} /> Blockers / Dependencies
                  </h4>
                  <p>{blockersText}</p>
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
          {(report.tl_feedback || report.hr_feedback || report.super_admin_feedback) && (
            <div className="reviews-section">
              <h4 className="section-label">
                <MessageSquare size={15} /> Reviews & Approval Log
              </h4>

              {report.tl_feedback && (
                <div className="review-comment-card tl-review">
                  <div className="review-author">
                    <strong>Department Head Approval: {report.tl_name || "Dept Head"}</strong>
                    <span>{report.tl_reviewed_at ? new Date(report.tl_reviewed_at).toLocaleDateString() : ""}</span>
                  </div>
                  <p>{report.tl_feedback}</p>
                </div>
              )}

              {report.hr_feedback && (
                <div className="review-comment-card hr-review">
                  <div className="review-author">
                    <strong>HR Approval: {report.hr_name || "HR Team"}</strong>
                    <span>{report.hr_reviewed_at ? new Date(report.hr_reviewed_at).toLocaleDateString() : ""}</span>
                  </div>
                  <p>{report.hr_feedback}</p>
                </div>
              )}

              {report.super_admin_feedback && (
                <div className="review-comment-card hr-review" style={{ backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }}>
                  <div className="review-author">
                    <strong style={{ color: "#1D4ED8" }}>Super Admin Final Approval: {report.super_admin_name || "Super Admin"}</strong>
                    <span>{report.super_admin_reviewed_at ? new Date(report.super_admin_reviewed_at).toLocaleDateString() : ""}</span>
                  </div>
                  <p style={{ color: "#1E3A8A" }}>{report.super_admin_feedback}</p>
                </div>
              )}
            </div>
          )}

          {/* Request Revision Form (Inline) */}
          {showRevisionBox && (
            <form onSubmit={handleSendRevision} style={{ marginTop: "16px", padding: "16px", backgroundColor: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: "10px" }}>
              <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#BE123C", display: "flex", alignItems: "center", gap: "6px" }}>
                <RotateCcw size={15} /> Request Changes & Re-assign Work:
              </h4>
              <textarea
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #FDA4AF", outline: "none", fontSize: "13px", minHeight: "70px" }}
                placeholder="Describe project changes or work required from employee / department head..."
                value={revisionFeedback}
                onChange={(e) => setRevisionFeedback(e.target.value)}
                required
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "10px" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowRevisionBox(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ backgroundColor: "#E11D48", borderColor: "#E11D48", color: "#FFFFFF" }}
                  disabled={requestingRevision}
                >
                  {requestingRevision ? <LoaderCircle className="spin" size={14} /> : <Send size={14} />}
                  {requestingRevision ? "Sending..." : "Send Revision Request"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer / Review Actions */}
        <div className="report-modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>

          {isTL && !showRevisionBox && (
            <button
              type="button"
              className="btn-secondary"
              style={{ backgroundColor: "#FFF1F2", color: "#BE123C", borderColor: "#FECDD3", fontWeight: 600 }}
              onClick={() => setShowRevisionBox(true)}
            >
              <RotateCcw size={14} /> Request Changes / Revision
            </button>
          )}

          {isTL && onReviewAsTL && report.status === "SUBMITTED" && (
            <button
              className="btn-primary"
              onClick={() => onReviewAsTL(report)}
            >
              Approve as Department Head
            </button>
          )}

          {isHR && onReviewAsHR && (report.status === "HEAD_APPROVED" || report.status === "TL_REVIEWED" || report.status === "SUBMITTED") && report.status !== "HR_APPROVED" && report.status !== "SUPER_ADMIN_APPROVED" && (
            <button
              className="btn-success"
              onClick={() => onReviewAsHR(report)}
            >
              Approve as HR
            </button>
          )}

          {isSuperAdmin && onReviewAsSuperAdmin && report.status !== "SUPER_ADMIN_APPROVED" && (
            <button
              className="btn-primary"
              style={{ backgroundColor: "#4F46E5", borderColor: "#4F46E5", color: "#FFFFFF" }}
              onClick={() => onReviewAsSuperAdmin(report)}
            >
              Final Approval as Super Admin
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportDetailsModal;
