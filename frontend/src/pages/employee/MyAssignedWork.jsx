import React, { useState, useEffect, useCallback } from "react";
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Calendar,
  Building,
  UserCheck,
  CheckSquare,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import { getTasks, updateTaskStatus } from "../../services/taskService";
import { getReportById } from "../../services/reportService";
import ReportDetailsModal from "../../components/reports/ReportDetailsModal";
import { useAuth } from "../../context/AuthContext";
import "./MyAssignedWork.css";

const MyAssignedWork = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const [inspectedReport, setInspectedReport] = useState(null);

  const fetchMyTasks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getTasks({
        assignedToId: user?.id,
        status: statusFilter || undefined,
        limit: 50,
      });
      setTasks(res?.data?.tasks || []);
    } catch (err) {
      console.error("Failed to fetch assigned tasks:", err);
      toast.error(err?.response?.data?.message || "Could not fetch assigned work.");
    } finally {
      setLoading(false);
    }
  }, [user?.id, statusFilter]);

  useEffect(() => {
    fetchMyTasks();
  }, [fetchMyTasks]);

  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      await updateTaskStatus(taskId, { status: newStatus });
      toast.success(
        newStatus === "COMPLETED"
          ? "Task marked as COMPLETED! 🎉"
          : `Task status set to ${newStatus.replace("_", " ")}.`
      );
      fetchMyTasks();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update status.");
    }
  };

  const handleOpenReport = async (reportId) => {
    try {
      const res = await getReportById(reportId);
      if (res?.data) {
        setInspectedReport(res.data);
      }
    } catch (err) {
      toast.error("Could not load attached daily report.");
    }
  };

  return (
    <div className="my-assigned-work-page">
      {/* Header Banner */}
      <div className="assigned-work-banner">
        <div className="banner-text-content">
          <span className="banner-pill">My Work Assignments</span>
          <h1 className="banner-heading">Work Assigned by Admin & Dept Heads</h1>
          <p className="banner-subtext">
            View project assignments, instructions from Super Admin/Dept Head, and requested report changes.
          </p>
        </div>

        <div className="banner-filter-wrap">
          <label className="filter-label" htmlFor="work-status-filter">Filter Status:</label>
          <select
            id="work-status-filter"
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="REVISION_REQUESTED">Revision Requested</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      <div className="assigned-tasks-list">
        {tasks.map((task) => (
          <div key={task.id} className={`task-card ${task.status?.toLowerCase()}`}>
            <div className="task-card-header">
              <div className="task-header-left">
                <span className={`priority-tag ${task.priority?.toLowerCase()}`}>
                  {task.priority} Priority
                </span>
                <span className={`status-badge ${task.status?.toLowerCase()}`}>
                  {task.status?.replace("_", " ")}
                </span>
              </div>
              {task.due_date && (
                <span className="due-date-pill">
                  <Calendar size={13} /> Due: {new Date(task.due_date).toLocaleDateString("en-IN")}
                </span>
              )}
            </div>

            <h3 className="task-title">{task.title}</h3>

            {task.description && (
              <div className="task-description-box">
                <p>{task.description}</p>
              </div>
            )}

            {task.revision_feedback && (
              <div className="revision-feedback-box">
                <strong><AlertCircle size={14} /> Required Changes / Feedback:</strong>
                <p>{task.revision_feedback}</p>
              </div>
            )}

            <div className="task-card-footer">
              <div className="assigned-by-info">
                <UserCheck size={14} />
                <span>Assigned by <strong>{task.assigned_by_name || "Admin"}</strong> ({task.department_name || "General"})</span>
              </div>

              <div className="task-card-actions">
                {task.report_id && (
                  <button
                    type="button"
                    className="view-report-btn"
                    onClick={() => handleOpenReport(task.report_id)}
                  >
                    <FileText size={14} /> View Attached Report
                  </button>
                )}

                {task.status !== "COMPLETED" && (
                  <>
                    {task.status !== "IN_PROGRESS" && (
                      <button
                        type="button"
                        className="status-btn progress"
                        onClick={() => handleUpdateStatus(task.id, "IN_PROGRESS")}
                      >
                        Start Work (In Progress)
                      </button>
                    )}
                    <button
                      type="button"
                      className="status-btn complete"
                      onClick={() => handleUpdateStatus(task.id, "COMPLETED")}
                    >
                      <CheckSquare size={14} /> Mark Completed
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        {!loading && tasks.length === 0 && (
          <div className="empty-tasks-state">
            <ClipboardList size={36} />
            <h3>No assigned work tasks</h3>
            <p>You have no pending project assignments or report revision requests.</p>
          </div>
        )}
      </div>

      {inspectedReport && (
        <ReportDetailsModal
          report={inspectedReport}
          userRole={user?.role}
          onClose={() => setInspectedReport(null)}
        />
      )}
    </div>
  );
};

export default MyAssignedWork;
