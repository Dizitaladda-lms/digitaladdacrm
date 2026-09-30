import React, { useState, useEffect } from "react";
import {
  FileBarChart2,
  Users,
  Video,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building,
  Calendar,
  Filter,
  ExternalLink,
  MessageCircle,
  Search,
  Eye,
  CheckCheck,
  Sparkles,
  Send,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getHROverview,
  getAllCompanyReports,
  getClassesAuditFeed,
  reviewReportAsHR,
} from "../../services/reportService";
import DailyReportForm from "../../components/reports/DailyReportForm";
import ReportDetailsModal from "../../components/reports/ReportDetailsModal";
import { useAuth } from "../../context/AuthContext";
import "./OperationsDashboard.css";

const OperationsDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "all-reports" | "classes-audit" | "my-report"
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // Overview Data
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  // All Reports Data
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [tookClassFilter, setTookClassFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Classes Audit Data
  const [classesList, setClassesList] = useState([]);
  const [classesLoading, setClassesLoading] = useState(false);

  // Modals & HR Review
  const [selectedReport, setSelectedReport] = useState(null);
  const [reviewingReport, setReviewingReport] = useState(null);
  const [hrFeedback, setHrFeedback] = useState("");
  const [hrStatus, setHrStatus] = useState("HR_APPROVED");
  const [savingHRReview, setSavingHRReview] = useState(false);

  // Load Overview
  const fetchOverview = async () => {
    try {
      setOverviewLoading(true);
      const res = await getHROverview(selectedDate);
      if (res?.data) {
        setOverview(res.data);
      }
    } catch (err) {
      console.error("Failed to load HR overview:", err);
      toast.error("Could not load compliance overview.");
    } finally {
      setOverviewLoading(false);
    }
  };

  // Load All Reports
  const fetchAllReports = async () => {
    try {
      setReportsLoading(true);
      const res = await getAllCompanyReports({
        date: selectedDate || undefined,
        departmentId: deptFilter || undefined,
        status: statusFilter || undefined,
        roleType: roleFilter || undefined,
        tookClass: tookClassFilter || undefined,
        search: searchQuery || undefined,
      });
      if (res?.data?.reports) {
        setReports(res.data.reports);
      }
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setReportsLoading(false);
    }
  };

  // Load Classes Audit
  const fetchClassesAudit = async () => {
    try {
      setClassesLoading(true);
      const res = await getClassesAuditFeed({
        date: selectedDate || undefined,
        departmentId: deptFilter || undefined,
        search: searchQuery || undefined,
      });
      if (res?.data?.classes) {
        setClassesList(res.data.classes);
      }
    } catch (err) {
      console.error("Failed to load class audits:", err);
    } finally {
      setClassesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "overview") fetchOverview();
    else if (activeTab === "all-reports") fetchAllReports();
    else if (activeTab === "classes-audit") fetchClassesAudit();
  }, [activeTab, selectedDate, deptFilter, statusFilter, roleFilter, tookClassFilter]);

  const handleOpenHRReview = (report) => {
    setReviewingReport(report);
    setHrFeedback(report.hr_feedback || "");
    setHrStatus(report.status === "REVISION_REQUESTED" ? "REVISION_REQUESTED" : "HR_APPROVED");
  };

  const handleSaveHRReview = async (e) => {
    e.preventDefault();
    if (!reviewingReport) return;

    try {
      setSavingHRReview(true);
      await reviewReportAsHR(reviewingReport.id, {
        feedback: hrFeedback,
        status: hrStatus,
      });
      toast.success("Report approved by HR! ✅");
      setReviewingReport(null);
      setSelectedReport(null);
      if (activeTab === "all-reports") fetchAllReports();
      else if (activeTab === "overview") fetchOverview();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit HR review.");
    } finally {
      setSavingHRReview(false);
    }
  };

  const handleWhatsAppNudge = (emp) => {
    if (!emp.mobile) {
      toast.error("Employee mobile number not available.");
      return;
    }
    const cleanNumber = String(emp.mobile).replace(/\D/g, "");
    const formatted = cleanNumber.startsWith("91") ? cleanNumber : `91${cleanNumber}`;
    const text = encodeURIComponent(
      `Hello ${emp.full_name}, this is a gentle reminder from HR & Operations at Dizital Adda. Please submit your Daily Work Report for today (${selectedDate}) along with any class lecture video recordings on the CRM portal. Thank you!`
    );
    window.open(`https://wa.me/${formatted}?text=${text}`, "_blank");
  };

  return (
    <div className="operations-dashboard-page">
      {/* Top Header */}
      <div className="ops-header-card">
        <div className="ops-header-left">
          <span className="ops-badge">Company Operations & Learning Intelligence</span>
          <h1 className="ops-title">Operations & HR Reporting Hub</h1>
          <p className="ops-subtitle">
            Master control room for department reporting, class lecture video proofs, TL reviews, and HR compliance.
          </p>
        </div>

        {/* Global Date Selector */}
        <div className="ops-header-date">
          <Calendar size={16} />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="ops-date-picker"
          />
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="ops-tabs-bar">
        <button
          className={`ops-tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <Building size={16} />
          <span>HR Compliance Overview</span>
        </button>

        <button
          className={`ops-tab-btn ${activeTab === "all-reports" ? "active" : ""}`}
          onClick={() => setActiveTab("all-reports")}
        >
          <FileBarChart2 size={16} />
          <span>All Daily Reports</span>
        </button>

        <button
          className={`ops-tab-btn ${activeTab === "classes-audit" ? "active" : ""}`}
          onClick={() => setActiveTab("classes-audit")}
        >
          <Video size={16} />
          <span>Class Video Audit Proofs</span>
        </button>

        <button
          className={`ops-tab-btn ${activeTab === "my-report" ? "active" : ""}`}
          onClick={() => setActiveTab("my-report")}
        >
          <Send size={16} />
          <span>Submit My Daily Report</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & COMPLIANCE */}
      {activeTab === "overview" && (
        <div className="overview-tab-content">
          {overviewLoading ? (
            <div className="ops-loading">Loading company compliance metrics...</div>
          ) : overview ? (
            <>
              {/* Stat Cards */}
              <div className="ops-stat-grid">
                <div className="ops-stat-box blue">
                  <div className="stat-box-icon"><Users size={22} /></div>
                  <div>
                    <span className="stat-box-label">Total Staff</span>
                    <strong className="stat-box-val">{overview.totalStaff}</strong>
                    <span className="stat-box-sub">Active in CRM</span>
                  </div>
                </div>

                <div className="ops-stat-box green">
                  <div className="stat-box-icon"><CheckCircle2 size={22} /></div>
                  <div>
                    <span className="stat-box-label">Submitted Today</span>
                    <strong className="stat-box-val">{overview.submittedToday}</strong>
                    <span className="stat-box-sub">{overview.approvedCount} HR Approved</span>
                  </div>
                </div>

                <div className="ops-stat-box red">
                  <div className="stat-box-icon"><AlertCircle size={22} /></div>
                  <div>
                    <span className="stat-box-label">Pending Submission</span>
                    <strong className="stat-box-val">{overview.pendingToday}</strong>
                    <span className="stat-box-sub">Awaiting report</span>
                  </div>
                </div>

                <div className="ops-stat-box orange">
                  <div className="stat-box-icon"><Video size={22} /></div>
                  <div>
                    <span className="stat-box-label">Classes Conducted</span>
                    <strong className="stat-box-val">{overview.totalClassesToday}</strong>
                    <span className="stat-box-sub">{overview.totalVideoProofs} Video proofs verified</span>
                  </div>
                </div>

                <div className="ops-stat-box purple">
                  <div className="stat-box-icon"><Clock size={22} /></div>
                  <div>
                    <span className="stat-box-label">Total Work Hours</span>
                    <strong className="stat-box-val">{overview.totalHoursLogged} hrs</strong>
                    <span className="stat-box-sub">{overview.totalClassMinutes} mins of lectures</span>
                  </div>
                </div>
              </div>

              {/* Department Breakdown */}
              <div className="ops-dept-card">
                <h3 className="section-card-title">Department-wise Submissions ({overview.date})</h3>
                <div className="dept-grid">
                  {overview.departments?.map((dept) => (
                    <div key={dept.id} className="dept-item-card">
                      <div className="dept-card-top">
                        <strong className="dept-title">{dept.department_name}</strong>
                        <span className="dept-sub-badge">
                          {dept.submitted_count} / {dept.total_employees} Reported
                        </span>
                      </div>
                      <div className="dept-meter-wrap">
                        <div
                          className="dept-meter-fill"
                          style={{
                            width: `${
                              dept.total_employees > 0
                                ? Math.min(100, Math.round((dept.submitted_count / dept.total_employees) * 100))
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      {parseInt(dept.classes_taken, 10) > 0 && (
                        <span className="dept-class-indicator">
                          <Video size={12} /> {dept.classes_taken} Classes taken
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Pending Employees List */}
              {overview.pendingEmployees && overview.pendingEmployees.length > 0 && (
                <div className="ops-pending-card">
                  <div className="pending-card-top">
                    <div>
                      <h3 className="section-card-title">Pending Staff Submissions Today</h3>
                      <p className="pending-desc">
                        These employees have not submitted their day-wise report yet. Send a 1-click WhatsApp reminder.
                      </p>
                    </div>
                    <span className="pending-counter">
                      {overview.pendingEmployees.length} Staff Pending
                    </span>
                  </div>

                  <div className="table-responsive">
                    <table className="pending-table">
                      <thead>
                        <tr>
                          <th>Staff Member</th>
                          <th>Department</th>
                          <th>Designation</th>
                          <th>Mobile</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview.pendingEmployees.map((emp) => (
                          <tr key={emp.id}>
                            <td>
                              <strong>{emp.full_name}</strong>
                              <span className="text-muted block-code">{emp.email}</span>
                            </td>
                            <td>{emp.department_name || "General"}</td>
                            <td>{emp.designation || emp.employment_type || "Staff"}</td>
                            <td>{emp.mobile || "—"}</td>
                            <td>
                              <button
                                className="whatsapp-nudge-btn"
                                onClick={() => handleWhatsAppNudge(emp)}
                                title="Send WhatsApp Reminder"
                              >
                                <MessageCircle size={14} /> Send Reminder
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* TAB 2: ALL COMPANY REPORTS */}
      {activeTab === "all-reports" && (
        <div className="all-reports-tab-content">
          {/* Filters Bar */}
          <div className="all-reports-filters">
            <div className="search-wrap">
              <Search size={15} />
              <input
                type="text"
                placeholder="Search staff name or work keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchAllReports()}
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="ops-select"
            >
              <option value="">All Roles</option>
              <option value="TRAINER">Trainers</option>
              <option value="EMPLOYEE">Employees</option>
              <option value="INTERN">Interns</option>
              <option value="TL">Team Leads</option>
              <option value="HR">HR Staff</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="ops-select"
            >
              <option value="">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="TL_REVIEWED">TL Reviewed</option>
              <option value="HR_APPROVED">HR Approved</option>
              <option value="REVISION_REQUESTED">Revision Needed</option>
            </select>

            <select
              value={tookClassFilter}
              onChange={(e) => setTookClassFilter(e.target.value)}
              className="ops-select"
            >
              <option value="">Classes: All</option>
              <option value="true">Took Classes (With Video Proof)</option>
            </select>

            <button className="ops-filter-btn" onClick={fetchAllReports}>
              <Filter size={14} /> Apply Filters
            </button>
          </div>

          {/* Table */}
          <div className="all-reports-table-card">
            {reportsLoading ? (
              <div className="ops-loading">Loading company reports...</div>
            ) : reports.length === 0 ? (
              <div className="ops-empty">
                <AlertCircle size={32} />
                <h4>No reports found for selected criteria</h4>
                <p>Try clearing filters or changing the report date.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="ops-table">
                  <thead>
                    <tr>
                      <th>Staff Member</th>
                      <th>Dept & Role</th>
                      <th>Hours</th>
                      <th>Work Summary</th>
                      <th>Classes & Video</th>
                      <th>TL Review</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <strong>{row.user_name}</strong>
                          <span className="text-muted block-code">
                            {row.employee_code || row.user_email}
                          </span>
                        </td>
                        <td>
                          <span className={`role-pill role-${(row.role_type || "EMPLOYEE").toLowerCase()}`}>
                            {row.role_type || "STAFF"}
                          </span>
                          <span className="text-muted block-code">{row.department_name}</span>
                        </td>
                        <td>
                          <span className="hours-pill">
                            <Clock size={12} /> {row.total_hours_worked || 8}h
                          </span>
                        </td>
                        <td className="summary-col">
                          <span className="summary-truncate" title={row.tasks_summary}>
                            {row.work_title || row.tasks_summary}
                          </span>
                        </td>
                        <td>
                          {row.took_class ? (
                            <div className="video-badge">
                              <Video size={12} />
                              <span>{row.classes?.length || 1} Class</span>
                            </div>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td>
                          {row.tl_feedback ? (
                            <span className="tl-feedback-col" title={row.tl_feedback}>
                              {row.tl_feedback}
                            </span>
                          ) : (
                            <span className="text-muted">None</span>
                          )}
                        </td>
                        <td>
                          <span className={`status-pill pill-${(row.status || "SUBMITTED").toLowerCase()}`}>
                            {row.status?.replace("_", " ")}
                          </span>
                        </td>
                        <td>
                          <div className="actions-cell">
                            <button
                              className="action-btn view"
                              onClick={() => setSelectedReport(row)}
                            >
                              <Eye size={13} /> View
                            </button>
                            {row.status !== "HR_APPROVED" && (
                              <button
                                className="action-btn approve"
                                onClick={() => handleOpenHRReview(row)}
                              >
                                <CheckCheck size={13} /> Approve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CLASSES & VIDEO AUDIT */}
      {activeTab === "classes-audit" && (
        <div className="classes-audit-content">
          <div className="audit-banner">
            <Sparkles size={20} />
            <div>
              <h3>Class Lecture & Video Recording Proof Audit</h3>
              <p>
                Direct access to lecture recordings across all batches, courses, and trainers for quality audit and compliance verification.
              </p>
            </div>
          </div>

          {classesLoading ? (
            <div className="ops-loading">Loading class recordings...</div>
          ) : classesList.length === 0 ? (
            <div className="ops-empty">
              <Video size={32} />
              <h4>No class sessions logged for this date</h4>
              <p>Trainers will appear here as soon as they submit class video links.</p>
            </div>
          ) : (
            <div className="classes-audit-grid">
              {classesList.map((cls) => (
                <div key={cls.id} className="audit-card">
                  <div className="audit-card-top">
                    <span className="audit-batch">{cls.batch_name}</span>
                    <span className="audit-duration">
                      <Clock size={12} /> {cls.duration_minutes || 60} mins
                    </span>
                    {cls.students_count > 0 && (
                      <span className="audit-students">
                        <Users size={12} /> {cls.students_count} Students
                      </span>
                    )}
                  </div>

                  <h4 className="audit-topic">{cls.topic_covered}</h4>

                  <div className="audit-trainer-info">
                    <div className="audit-avatar">
                      {cls.trainer_avatar ? (
                        <img src={cls.trainer_avatar} alt={cls.trainer_name} />
                      ) : (
                        cls.trainer_name?.slice(0, 2).toUpperCase() || "TR"
                      )}
                    </div>
                    <div>
                      <strong>{cls.trainer_name}</strong>
                      <span>{cls.department_name || "Trainer"} • {cls.report_date}</span>
                    </div>
                  </div>

                  {/* Direct Recording Play Button */}
                  <div className="audit-video-action">
                    <div className="recording-label">
                      <Video size={16} />
                      <span>Class Recording Proof</span>
                    </div>
                    <a
                      href={cls.video_recording_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="audit-play-btn"
                    >
                      <ExternalLink size={14} /> Open Recording
                    </a>
                  </div>

                  {cls.materials_url && (
                    <a
                      href={cls.materials_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="audit-materials-link"
                    >
                      <ExternalLink size={12} /> View Slides / Materials
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SUBMIT MY OWN REPORT (For HR / Admin / Trainer) */}
      {activeTab === "my-report" && (
        <div className="my-report-tab-content">
          <DailyReportForm
            onSuccess={() => {
              toast.success("Your report has been submitted to the operations ledger.");
              setActiveTab("overview");
              fetchOverview();
            }}
          />
        </div>
      )}

      {/* HR Review Modal */}
      {reviewingReport && (
        <div className="review-modal-overlay" onClick={() => setReviewingReport(null)}>
          <div className="review-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="review-modal-header">
              <div>
                <span className="modal-eyebrow">HR Final Review</span>
                <h3>Approve Report: {reviewingReport.user_name}</h3>
                <span className="modal-date-tag">{reviewingReport.report_date}</span>
              </div>
              <button
                className="close-review-btn"
                onClick={() => setReviewingReport(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveHRReview} className="review-form">
              <div className="report-snippet-box">
                <strong>Tasks Logged:</strong>
                <p>{reviewingReport.tasks_summary}</p>
                {reviewingReport.tl_feedback && (
                  <p className="tl-note">
                    <strong>TL Note:</strong> {reviewingReport.tl_feedback}
                  </p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">HR Review Decision</label>
                <select
                  className="form-select"
                  value={hrStatus}
                  onChange={(e) => setHrStatus(e.target.value)}
                >
                  <option value="HR_APPROVED">Approve & Sign Off Report (HR Approved)</option>
                  <option value="REVISION_REQUESTED">Request Changes from Employee/TL</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">HR Notes / Acknowledgement</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Acknowledged and recorded for payroll & attendance..."
                  value={hrFeedback}
                  onChange={(e) => setHrFeedback(e.target.value)}
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
                  className="btn-success"
                  disabled={savingHRReview}
                >
                  {savingHRReview ? "Saving Approval..." : "Confirm HR Approval"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Inspection Modal */}
      {selectedReport && (
        <ReportDetailsModal
          report={selectedReport}
          userRole="HR"
          onClose={() => setSelectedReport(null)}
          onReviewAsHR={(rep) => handleOpenHRReview(rep)}
        />
      )}
    </div>
  );
};

export default OperationsDashboard;
