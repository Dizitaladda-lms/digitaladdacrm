import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  CheckCircle2,
  Video,
  Plus,
  Trash2,
  ExternalLink,
  AlertCircle,
  FileText,
  Send,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import { submitDailyReport, getMyReportToday } from "../../services/reportService";
import "./DailyReportForm.css";

const emptyClassItem = () => ({
  batch_name: "",
  course_name: "",
  topic_covered: "",
  class_time_start: "",
  class_time_end: "",
  duration_minutes: 60,
  students_count: 0,
  video_recording_url: "",
  materials_url: "",
  remarks: "",
});

const DailyReportForm = ({ initialDate, onSuccess }) => {
  const [reportDate, setReportDate] = useState(
    initialDate || new Date().toISOString().split("T")[0]
  );
  const [workTitle, setWorkTitle] = useState("");
  const [tasksSummary, setTasksSummary] = useState("");
  const [totalHours, setTotalHours] = useState(8.0);
  const [workStatus, setWorkStatus] = useState("COMPLETED");
  const [deliverableLinks, setDeliverableLinks] = useState("");
  const [blockers, setBlockers] = useState("");
  const [nextDayPlan, setNextDayPlan] = useState("");
  const [tookClass, setTookClass] = useState(false);
  const [classes, setClasses] = useState([emptyClassItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [existingReport, setExistingReport] = useState(null);
  const [fetchingExisting, setFetchingExisting] = useState(false);

  // Load existing report for selected date if already submitted
  useEffect(() => {
    let isMounted = true;
    const loadExisting = async () => {
      try {
        setFetchingExisting(true);
        const res = await getMyReportToday(reportDate);
        if (isMounted && res?.data) {
          const rep = res.data;
          setExistingReport(rep);
          setWorkTitle(rep.work_title || "");
          setTasksSummary(rep.tasks_summary || "");
          setTotalHours(parseFloat(rep.total_hours_worked) || 8.0);
          setWorkStatus(rep.work_status || "COMPLETED");
          setDeliverableLinks(rep.deliverable_links || "");
          setBlockers(rep.blockers || "");
          setNextDayPlan(rep.next_day_plan || "");
          setTookClass(Boolean(rep.took_class));
          if (rep.classes && rep.classes.length > 0) {
            setClasses(rep.classes);
          } else {
            setClasses([emptyClassItem()]);
          }
        } else if (isMounted) {
          setExistingReport(null);
        }
      } catch (err) {
        console.error("Failed to load report for date:", err);
      } finally {
        if (isMounted) setFetchingExisting(false);
      }
    };

    loadExisting();
    return () => {
      isMounted = false;
    };
  }, [reportDate]);

  const handleAddClass = () => {
    setClasses((prev) => [...prev, emptyClassItem()]);
  };

  const handleRemoveClass = (index) => {
    if (classes.length === 1) {
      setClasses([emptyClassItem()]);
      setTookClass(false);
      return;
    }
    setClasses((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClassChange = (index, field, value) => {
    setClasses((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!tasksSummary.trim()) {
      toast.error("Please enter a summary of the tasks completed today.");
      return;
    }

    if (tookClass) {
      if (classes.length === 0) {
        toast.error("Please add at least one class session details.");
        return;
      }

      for (let i = 0; i < classes.length; i++) {
        const cls = classes[i];
        if (!cls.batch_name.trim()) {
          toast.error(`Class #${i + 1}: Batch / Course name is required.`);
          return;
        }
        if (!cls.topic_covered.trim()) {
          toast.error(`Class #${i + 1}: Topic covered is required.`);
          return;
        }
        if (!cls.video_recording_url.trim()) {
          toast.error(
            `Class #${i + 1}: Video recording link (Google Drive, Zoom, YouTube) is mandatory as proof of class.`
          );
          return;
        }
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        report_date: reportDate,
        work_title: workTitle,
        tasks_summary: tasksSummary,
        total_hours_worked: parseFloat(totalHours) || 8.0,
        work_status: workStatus,
        deliverable_links: deliverableLinks,
        blockers: blockers,
        next_day_plan: nextDayPlan,
        took_class: tookClass,
        classes: tookClass ? classes : [],
      };

      const res = await submitDailyReport(payload);
      toast.success(
        existingReport
          ? "Daily report updated successfully! 🚀"
          : "Daily report submitted successfully! 🚀"
      );
      setExistingReport(res.data);
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to submit daily work report."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="daily-report-card">
      <div className="report-card-header">
        <div className="report-header-left">
          <div className="report-icon-badge">
            <FileText size={22} />
          </div>
          <div>
            <h2 className="report-card-title">Daily Work & Class Reporting</h2>
            <p className="report-card-subtitle">
              Log your day-wise work summary, tasks, deliverables, and class video proof links.
            </p>
          </div>
        </div>

        {existingReport && (
          <div className="report-status-pill">
            <CheckCircle2 size={15} />
            <span>
              Submitted ({existingReport.status.replace("_", " ")})
            </span>
          </div>
        )}
      </div>

      {fetchingExisting && (
        <div className="report-loading-strip">Loading today's report data...</div>
      )}

      <form onSubmit={handleSubmit} className="daily-report-form">
        {/* Row 1: Date, Total Hours, Status */}
        <div className="report-form-grid-3">
          <div className="form-group">
            <label className="form-label">
              <Calendar size={15} /> Report Date <span className="req">*</span>
            </label>
            <input
              type="date"
              className="form-input"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Clock size={15} /> Total Hours Logged <span className="req">*</span>
            </label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="24"
              className="form-input"
              value={totalHours}
              onChange={(e) => setTotalHours(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Work Progress Status</label>
            <select
              className="form-select"
              value={workStatus}
              onChange={(e) => setWorkStatus(e.target.value)}
            >
              <option value="COMPLETED">Completed All Planned Tasks</option>
              <option value="IN_PROGRESS">In Progress (Continuing Tomorrow)</option>
              <option value="BLOCKED">Facing Dependency / Blocked</option>
            </select>
          </div>
        </div>

        {/* Work Title */}
        <div className="form-group">
          <label className="form-label">
            Daily Focus / Work Title <span className="optional">(Optional Summary)</span>
          </label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g., Conducted Batch 14 Meta Ads Session & Optimized Client Google Campaigns"
            value={workTitle}
            onChange={(e) => setWorkTitle(e.target.value)}
          />
        </div>

        {/* Tasks Summary */}
        <div className="form-group">
          <label className="form-label">
            Tasks Completed Today <span className="req">*</span>
          </label>
          <textarea
            className="form-textarea"
            rows={4}
            placeholder={`1. Handled 35 lead follow-ups and scheduled 4 walk-ins.\n2. Conducted 2 hours digital marketing class on Google Search Ads.\n3. Reviewed design creatives for upcoming webinar.`}
            value={tasksSummary}
            onChange={(e) => setTasksSummary(e.target.value)}
            required
          />
        </div>

        {/* Deliverables & Links */}
        <div className="form-group">
          <label className="form-label">
            Deliverable Links / Work Evidence <span className="optional">(Drive, Sheet, GitHub, Figma, etc.)</span>
          </label>
          <input
            type="text"
            className="form-input"
            placeholder="https://docs.google.com/spreadsheets/d/... or https://github.com/..."
            value={deliverableLinks}
            onChange={(e) => setDeliverableLinks(e.target.value)}
          />
        </div>

        {/* Team Lead: Interns & Subordinates Work Summary */}
        <div className="form-group" style={{ background: "#f0f9ff", padding: "16px", borderRadius: "10px", border: "1px solid #bae6fd", marginBottom: "20px" }}>
          <label className="form-label" style={{ color: "#0369a1", fontWeight: 700, fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
            👥 Interns Work Summary & Team Progress <span className="optional">(Team Lead Report)</span>
          </label>
          <p style={{ margin: "2px 0 10px 0", fontSize: "12.5px", color: "#0284c7" }}>
            TLs can record the daily work performed by interns under their supervision.
          </p>
          <textarea
            className="form-textarea"
            rows={3}
            placeholder={`• Intern Rahul: Completed 20 lead research profiles and design mockups.\n• Intern Priya: Compiled weekly attendance and lead follow-up sheets.`}
            value={blockers ? (blockers.includes("INTERNS_REPORT:") ? blockers.split("INTERNS_REPORT:")[1]?.trim() : "") : ""}
            onChange={(e) => {
              const val = e.target.value;
              const cleanBlockers = blockers ? blockers.split("INTERNS_REPORT:")[0]?.trim() : "";
              setBlockers(val ? `${cleanBlockers ? cleanBlockers + "\n" : ""}INTERNS_REPORT: ${val}` : cleanBlockers);
            }}
          />
        </div>

        {/* ── Class / Lecture Sessions Toggle ──────────────── */}
        <div className="class-toggle-panel">
          <div className="toggle-info">
            <div className="toggle-icon-wrap">
              <Video size={20} />
            </div>
            <div>
              <h3 className="toggle-title">
                Did you conduct any classes or training sessions today?
              </h3>
              <p className="toggle-subtitle">
                Trainers, mentors, and staff taking sessions must provide class details and <strong>video recording proof links</strong>.
              </p>
            </div>
          </div>

          <label className="custom-switch">
            <input
              type="checkbox"
              checked={tookClass}
              onChange={(e) => {
                setTookClass(e.target.checked);
                if (e.target.checked && classes.length === 0) {
                  setClasses([emptyClassItem()]);
                }
              }}
            />
            <span className="slider round"></span>
          </label>
        </div>

        {/* ── Class Details Subform (Shown when tookClass is true) ── */}
        {tookClass && (
          <div className="classes-container">
            <div className="classes-header">
              <div className="classes-header-title">
                <Sparkles size={16} />
                <span>Class Sessions & Video Proof Logs ({classes.length})</span>
              </div>
              <button
                type="button"
                className="add-class-btn"
                onClick={handleAddClass}
              >
                <Plus size={15} /> Add Another Class
              </button>
            </div>

            {classes.map((cls, idx) => (
              <div key={idx} className="class-session-card">
                <div className="session-card-top">
                  <span className="session-index-badge">Class #{idx + 1}</span>
                  {classes.length > 1 && (
                    <button
                      type="button"
                      className="remove-class-btn"
                      onClick={() => handleRemoveClass(idx)}
                      title="Remove this class"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                <div className="class-grid-2">
                  <div className="form-group">
                    <label className="form-label">
                      Batch Name / Code <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g., DA-B14 Morning / DM-Weekend"
                      value={cls.batch_name}
                      onChange={(e) =>
                        handleClassChange(idx, "batch_name", e.target.value)
                      }
                      required={tookClass}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Course / Program Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g., Masters in Digital Marketing"
                      value={cls.course_name}
                      onChange={(e) =>
                        handleClassChange(idx, "course_name", e.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Topic / Module Covered <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., Google Ads Conversion Tracking & Tag Manager Setup"
                    value={cls.topic_covered}
                    onChange={(e) =>
                      handleClassChange(idx, "topic_covered", e.target.value)
                    }
                    required={tookClass}
                  />
                </div>

                <div className="class-grid-3">
                  <div className="form-group">
                    <label className="form-label">Class Timings</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g., 10:00 AM - 12:00 PM"
                      value={cls.class_time_start}
                      onChange={(e) =>
                        handleClassChange(idx, "class_time_start", e.target.value)
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Duration (Minutes)</label>
                    <input
                      type="number"
                      min="15"
                      max="480"
                      className="form-input"
                      value={cls.duration_minutes}
                      onChange={(e) =>
                        handleClassChange(idx, "duration_minutes", e.target.value)
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Students Attended</label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      placeholder="e.g., 22"
                      value={cls.students_count}
                      onChange={(e) =>
                        handleClassChange(idx, "students_count", e.target.value)
                      }
                    />
                  </div>
                </div>

                {/* Mandatory Video Recording Link */}
                <div className="form-group video-link-group">
                  <label className="form-label highlight-label">
                    <Video size={16} /> Class Video Recording Link (Mandatory Proof) <span className="req">*</span>
                  </label>
                  <div className="input-with-action">
                    <input
                      type="url"
                      className="form-input video-input"
                      placeholder="https://drive.google.com/file/d/... or Zoom / YouTube unlisted link"
                      value={cls.video_recording_url}
                      onChange={(e) =>
                        handleClassChange(idx, "video_recording_url", e.target.value)
                      }
                      required={tookClass}
                    />
                    {cls.video_recording_url && (
                      <a
                        href={cls.video_recording_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="test-link-btn"
                        title="Verify Video Link in New Tab"
                      >
                        <ExternalLink size={15} /> Test Link
                      </a>
                    )}
                  </div>
                  <span className="field-hint">
                    Upload recording to Google Drive / YouTube (unlisted) / Zoom Cloud and paste the shareable link.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Class Notes / Slides URL (Optional)</label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://docs.google.com/presentation/d/..."
                    value={cls.materials_url}
                    onChange={(e) =>
                      handleClassChange(idx, "materials_url", e.target.value)
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Row: Blockers & Tomorrow's Plan */}
        <div className="report-form-grid-2">
          <div className="form-group">
            <label className="form-label">
              <AlertCircle size={15} /> Blockers / Challenges Faced <span className="optional">(Optional)</span>
            </label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Any issues, software bugs, pending approvals..."
              value={blockers}
              onChange={(e) => setBlockers(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Plan for Tomorrow <span className="optional">(Optional)</span>
            </label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Key priorities and scheduled tasks for tomorrow..."
              value={nextDayPlan}
              onChange={(e) => setNextDayPlan(e.target.value)}
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div className="report-form-footer">
          <button
            type="submit"
            className="submit-report-btn"
            disabled={submitting}
          >
            {submitting ? (
              <span>Submitting Report...</span>
            ) : (
              <>
                <Send size={16} />
                <span>
                  {existingReport ? "Update Today's Report" : "Submit Daily Work Report"}
                </span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DailyReportForm;
