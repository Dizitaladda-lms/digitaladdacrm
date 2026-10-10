import React, { useState, useEffect } from "react";
import {
  FileText,
  History,
  Calendar,
  Clock,
  Video,
  Eye,
  AlertCircle,
  Filter,
  Edit3,
  Send,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import DailyReportForm from "../../components/reports/DailyReportForm";
import ReportDetailsModal from "../../components/reports/ReportDetailsModal";
import ApprovalTimeline from "../../components/reports/ApprovalTimeline";
import { getMyReportsHistory, resubmitReport } from "../../services/reportService";
import { formatWorkHours } from "../../utils/shiftTiming";
import "./MyDailyReport.css";

const MyDailyReport = () => {
  const [activeTab, setActiveTab] = useState("form"); // "form" | "history"
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");

  // Edit & Resubmit Modal State (for Rejected reports)
  const [editingReport, setEditingReport] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editLinks, setEditLinks] = useState("");
  const [editBlockers, setEditBlockers] = useState("");
  const [editNextPlan, setEditNextPlan] = useState("");
  const [resubmitting, setResubmitting] = useState(false);

  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await getMyReportsHistory({
        status: statusFilter || undefined,
        limit: 30,
      });
      if (res?.data?.reports) {
        setHistoryList(res.data.reports);
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history") {
      loadHistory();
    }
  }, [activeTab, statusFilter]);

  const handleOpenResubmitModal = (report) => {
    setEditingReport(report);
    setEditTitle(report.work_title || "");
    setEditSummary(report.tasks_summary || "");
    setEditLinks(report.deliverable_links || "");
    setEditBlockers(report.blockers || "");
    setEditNextPlan(report.next_day_plan || "");
  };

  const handleResubmitSubmit = async (e) => {
    e.preventDefault();
    if (!editingReport) return;
    if (!editSummary.trim()) {
      return toast.error("Tasks summary is required.");
    }
    try {
      setResubmitting(true);
      await resubmitReport(editingReport.id, {
        work_title: editTitle,
        tasks_summary: editSummary.trim(),
        deliverable_links: editLinks,
        blockers: editBlockers,
        next_day_plan: editNextPlan,
      });
      toast.success("Report updated and resubmitted to your reporting manager for approval!");
      setEditingReport(null);
      loadHistory();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to resubmit report.");
    } finally {
      setResubmitting(false);
    }
  };

  return (
    <div className="daily-report-page">
      {/* Page Header */}
      <div className="page-top-bar">
        <div>
          <h1 className="page-heading">Day-wise Work & Training Reporting</h1>
          <p className="page-subheading">
            Submit your daily work summary, tasks, deliverables, and track hierarchical approval status.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="tab-pill-group">
          <button
            className={`tab-pill ${activeTab === "form" ? "active" : ""}`}
            onClick={() => setActiveTab("form")}
          >
            <FileText size={16} />
            <span>Today's Report Form</span>
          </button>
          <button
            className={`tab-pill ${activeTab === "history" ? "active" : ""}`}
            onClick={() => setActiveTab("history")}
          >
            <History size={16} />
            <span>My Submission History</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === "form" ? (
        <DailyReportForm
          onSuccess={() => {
            // switch to history or stay on form with success indicator
          }}
        />
      ) : (
        <div className="history-container-card">
          <div className="history-header">
            <div className="history-header-left">
              <h3 className="history-title">My Past Daily Reports & Approval Timeline</h3>
              <span className="history-count-badge">{historyList.length} Records</span>
            </div>

            <div className="history-filter">
              <Filter size={14} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="history-status-select"
              >
                <option value="">All Statuses</option>
                <option value="SUBMITTED">Submitted / Pending</option>
                <option value="TL_REVIEWED">TL / Dept Head Verified</option>
                <option value="HR_APPROVED">HR Approved</option>
                <option value="SUPER_ADMIN_APPROVED">Super Admin Final Approved</option>
                <option value="REVISION_REQUESTED">Rejected / Revision Needed</option>
              </select>
            </div>
          </div>

          {historyLoading ? (
            <div className="history-loading">Loading your report history...</div>
          ) : historyList.length === 0 ? (
            <div className="history-empty">
              <AlertCircle size={32} />
              <h4>No daily reports found</h4>
              <p>You haven't submitted any daily reports matching this filter yet.</p>
              <button
                className="go-to-form-btn"
                onClick={() => setActiveTab("form")}
              >
                Submit Today's Report
              </button>
            </div>
          ) : (
            <div className="history-table-wrap">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Hours</th>
                    <th>Tasks Summary</th>
                    <th>Classes Taken</th>
                    <th>Status</th>
                    <th>Hierarchical Approval Timeline</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {historyList.map((row) => {
                    const isRejected =
                      row.status === "REVISION_REQUESTED" ||
                      row.current_status === "REJECTED";

                    return (
                      <tr key={row.id}>
                        <td className="date-cell">
                          <Calendar size={13} />
                          <strong>{row.report_date}</strong>
                        </td>
                        <td>
                          <span className="hours-pill" title={`${Number(row.total_hours_worked || 0).toFixed(2)} decimal hrs`}>
                            <Clock size={12} /> {formatWorkHours(row.total_hours_worked)}
                          </span>
                        </td>
                        <td className="tasks-cell">
                          <span className="tasks-truncated" title={row.tasks_summary}>
                            {row.work_title || row.tasks_summary}
                          </span>
                        </td>
                        <td>
                          {row.took_class ? (
                            <span className="class-badge-active">
                              <Video size={12} /> {row.classes_count || row.classes?.length || 1} Class (Video Proof)
                            </span>
                          ) : (
                            <span className="class-badge-none">—</span>
                          )}
                        </td>
                        <td>
                          <span className={`status-pill pill-${(row.status || "SUBMITTED").toLowerCase()}`}>
                            {isRejected
                              ? "REJECTED / REVISION"
                              : row.status?.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td>
                          <ApprovalTimeline report={row} compact />
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                            <button
                              className="view-report-btn"
                              onClick={() => setSelectedReport(row)}
                              title="View Full Report & Approval Timeline"
                            >
                              <Eye size={14} /> View
                            </button>

                            {isRejected && (
                              <button
                                className="view-report-btn"
                                onClick={() => handleOpenResubmitModal(row)}
                                style={{
                                  background: "#dc2626",
                                  color: "#fff",
                                  borderColor: "#dc2626",
                                  fontWeight: 700,
                                }}
                                title="Edit and resubmit rejected report"
                              >
                                <Edit3 size={13} /> Edit & Resubmit
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
          )}
        </div>
      )}

      {/* Edit & Resubmit Rejected Report Modal */}
      {editingReport && (
        <div
          className="report-modal-overlay"
          onClick={() => setEditingReport(null)}
          style={{ zIndex: 1100 }}
        >
          <div
            className="report-modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "620px" }}
          >
            <div className="report-modal-header">
              <div className="modal-header-info">
                <span className="modal-eyebrow" style={{ color: "#dc2626" }}>
                  Rejected Report — Edit & Resubmit
                </span>
                <h2 className="modal-title">
                  Resubmit Report ({editingReport.report_date})
                </h2>
              </div>
              <button className="modal-close-btn" onClick={() => setEditingReport(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleResubmitSubmit} className="report-modal-body">
              {editingReport.rejection_reason && (
                <div
                  style={{
                    padding: "10px 14px",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "8px",
                    color: "#991b1b",
                    fontSize: "13px",
                    marginBottom: "14px",
                  }}
                >
                  <strong>Reviewer Remarks:</strong> {editingReport.rejection_reason}
                </div>
              )}

              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                  Work Title / Primary Focus
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g., Campaign Optimization & Lead Generation"
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                  }}
                />
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                  Tasks & Work Summary *
                </label>
                <textarea
                  rows={5}
                  required
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  placeholder="Describe your updated work summary addressing the reviewer's remarks..."
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                  }}
                />
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                  Deliverable Links (comma-separated)
                </label>
                <input
                  type="text"
                  value={editLinks}
                  onChange={(e) => setEditLinks(e.target.value)}
                  placeholder="https://docs.google.com/..."
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                    Blockers
                  </label>
                  <input
                    type="text"
                    value={editBlockers}
                    onChange={(e) => setEditBlockers(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                    Next Day Plan
                  </label>
                  <input
                    type="text"
                    value={editNextPlan}
                    onChange={(e) => setEditNextPlan(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", paddingTop: "8px" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setEditingReport(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={resubmitting}
                  style={{
                    background: "#2563eb",
                    color: "#fff",
                    border: "none",
                    padding: "9px 16px",
                    borderRadius: "8px",
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    cursor: "pointer",
                  }}
                >
                  <Send size={14} />
                  {resubmitting ? "Resubmitting..." : "Update & Resubmit Report"}
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
          onClose={() => setSelectedReport(null)}
        />
      )}
    </div>
  );
};

export default MyDailyReport;
