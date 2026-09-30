import React, { useState, useEffect } from "react";
import {
  FileText,
  History,
  Calendar,
  Clock,
  Video,
  Eye,
  CheckCircle2,
  AlertCircle,
  Filter,
} from "lucide-react";
import DailyReportForm from "../../components/reports/DailyReportForm";
import ReportDetailsModal from "../../components/reports/ReportDetailsModal";
import { getMyReportsHistory } from "../../services/reportService";
import "./MyDailyReport.css";

const MyDailyReport = () => {
  const [activeTab, setActiveTab] = useState("form"); // "form" | "history"
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");

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

  return (
    <div className="daily-report-page">
      {/* Page Header */}
      <div className="page-top-bar">
        <div>
          <h1 className="page-heading">Day-wise Work & Training Reporting</h1>
          <p className="page-subheading">
            Submit your daily work summary, tasks, deliverables, and class video proof links.
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
              <h3 className="history-title">My Past Daily Reports</h3>
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
                <option value="SUBMITTED">Submitted</option>
                <option value="TL_REVIEWED">TL Verified</option>
                <option value="HR_APPROVED">HR Approved</option>
                <option value="REVISION_REQUESTED">Revision Needed</option>
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
                    <th>TL Review</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {historyList.map((row) => (
                    <tr key={row.id}>
                      <td className="date-cell">
                        <Calendar size={13} />
                        <strong>{row.report_date}</strong>
                      </td>
                      <td>
                        <span className="hours-pill">
                          <Clock size={12} /> {row.total_hours_worked || 8} hrs
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
                          {row.status?.replace("_", " ")}
                        </span>
                      </td>
                      <td>
                        {row.tl_feedback ? (
                          <span className="tl-feedback-preview" title={row.tl_feedback}>
                            {row.tl_name ? `${row.tl_name}: ` : ""}{row.tl_feedback}
                          </span>
                        ) : (
                          <span className="text-muted">Pending review</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="view-report-btn"
                          onClick={() => setSelectedReport(row)}
                          title="View Full Report"
                        >
                          <Eye size={14} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
