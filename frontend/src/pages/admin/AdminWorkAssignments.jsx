import React, { useState, useEffect, useCallback } from "react";
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  FileText,
  User,
  Trash2,
  Edit3,
  Calendar,
  Send,
  LoaderCircle,
  Building,
} from "lucide-react";
import toast from "react-hot-toast";
import { getTasks, createTask, updateTaskStatus, deleteTask } from "../../services/taskService";
import { getEmployees } from "../../services/employeeService";
import { getDepartments } from "../../services/departmentService";
import { getReportById } from "../../services/reportService";
import ReportDetailsModal from "../../components/reports/ReportDetailsModal";
import { useAuth } from "../../context/AuthContext";
import "./AdminWorkAssignments.css";

const AdminWorkAssignments = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  // Assign Task Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    assigned_to_id: "",
    department_id: "",
    priority: "MEDIUM",
    due_date: "",
  });

  // Report Details Modal
  const [inspectedReport, setInspectedReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [tasksRes, empRes, deptRes] = await Promise.all([
        getTasks({
          search: search || undefined,
          status: statusFilter || undefined,
          departmentId: deptFilter || undefined,
          limit: 100,
        }),
        getEmployees({ limit: 100 }),
        getDepartments(),
      ]);

      setTasks(tasksRes?.data?.tasks || []);
      setEmployees(empRes?.data?.employees || []);
      setDepartments(deptRes?.data || []);
    } catch (err) {
      console.error("Failed to load work assignments data:", err);
      toast.error(err?.response?.data?.message || "Could not load tasks.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, deptFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return toast.error("Please enter a task title.");
    if (!taskForm.assigned_to_id) return toast.error("Please select an employee/head.");

    try {
      setSavingTask(true);
      await createTask({
        title: taskForm.title,
        description: taskForm.description,
        assigned_to_id: Number(taskForm.assigned_to_id),
        department_id: taskForm.department_id ? Number(taskForm.department_id) : null,
        priority: taskForm.priority,
        due_date: taskForm.due_date || null,
      });

      toast.success("Work task assigned successfully! 🚀");
      setCreateModalOpen(false);
      setTaskForm({
        title: "",
        description: "",
        assigned_to_id: "",
        department_id: "",
        priority: "MEDIUM",
        due_date: "",
      });
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not assign task.");
    } finally {
      setSavingTask(false);
    }
  };

  const handleStatusChange = async (task, newStatus) => {
    try {
      await updateTaskStatus(task.id, { status: newStatus });
      toast.success(`Task status updated to ${newStatus.replace("_", " ")}.`);
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update status.");
    }
  };

  const handleDeleteTask = async (task) => {
    if (!window.confirm(`Are you sure you want to delete the task "${task.title}"?`)) return;
    try {
      await deleteTask(task.id);
      toast.success("Task deleted successfully.");
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not delete task.");
    }
  };

  const handleOpenLinkedReport = async (reportId) => {
    try {
      setLoadingReport(true);
      const res = await getReportById(reportId);
      if (res?.data) {
        setInspectedReport(res.data);
      }
    } catch (err) {
      toast.error("Could not load attached daily report.");
    } finally {
      setLoadingReport(false);
    }
  };

  // KPIs
  const totalCount = tasks.length;
  const pendingCount = tasks.filter((t) => t.status === "PENDING").length;
  const inProgressCount = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const revisionCount = tasks.filter((t) => t.status === "REVISION_REQUESTED").length;
  const completedCount = tasks.filter((t) => t.status === "COMPLETED").length;

  return (
    <div className="work-assignments-page">
      {/* Banner */}
      <section className="assignments-header-banner">
        <div>
          <span className="banner-eyebrow">Work & Project Task Management</span>
          <h1 className="banner-title">Work Assigned by Admin</h1>
          <p className="banner-sub">
            Assign project work to employees and department heads, request report revisions, and track progress.
          </p>
        </div>
        <div className="banner-actions">
          <button
            type="button"
            className="assign-btn"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus size={18} /> Assign New Work
          </button>
        </div>
      </section>

      {/* KPI Cards */}
      <section className="task-stats-grid">
        <div className="task-stat-card">
          <div className="stat-icon-wrapper blue">
            <ClipboardList size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Work Assigned</span>
            <strong className="stat-value">{totalCount}</strong>
          </div>
        </div>

        <div className="task-stat-card">
          <div className="stat-icon-wrapper amber">
            <Clock size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Pending / In Progress</span>
            <strong className="stat-value">{pendingCount + inProgressCount}</strong>
          </div>
        </div>

        <div className="task-stat-card">
          <div className="stat-icon-wrapper purple">
            <AlertCircle size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Revisions Requested</span>
            <strong className="stat-value">{revisionCount}</strong>
          </div>
        </div>

        <div className="task-stat-card">
          <div className="stat-icon-wrapper green">
            <CheckCircle2 size={22} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Completed Tasks</span>
            <strong className="stat-value">{completedCount}</strong>
          </div>
        </div>
      </section>

      {/* Table & Controls Card */}
      <section className="task-table-card">
        <div className="table-controls-bar">
          <div className="search-box">
            <Search size={16} color="#64748B" />
            <input
              placeholder="Search by title or employee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-dropdowns">
            <select
              className="filter-select"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.department_name}
                </option>
              ))}
            </select>

            <select
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

            <select
              className="filter-select"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        {/* Tasks Table */}
        <div className="tasks-table-wrap">
          <table className="tasks-table">
            <thead>
              <tr>
                <th>Task & Project Work</th>
                <th>Assigned To</th>
                <th>Assigned By</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Due Date</th>
                <th>Attached Report</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td style={{ maxWidth: "260px" }}>
                    <strong style={{ color: "#0F172A", display: "block" }}>{task.title}</strong>
                    {task.description && (
                      <small style={{ color: "#64748B", display: "block", fontSize: "11px", marginTop: "2px" }}>
                        {task.description.length > 70
                          ? task.description.substring(0, 70) + "..."
                          : task.description}
                      </small>
                    )}
                  </td>
                  <td>
                    <div>
                      <strong>{task.assigned_to_name}</strong>
                      <small style={{ color: "#0F766E", display: "block", fontSize: "11px" }}>
                        {task.department_name || "General"} • {task.assigned_to_designation || "Staff"}
                      </small>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: "12px", color: "#475569", fontWeight: 500 }}>
                      {task.assigned_by_name || "Admin"}
                    </span>
                  </td>
                  <td>
                    <span className={`priority-pill ${(task.priority || "MEDIUM").toLowerCase()}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td>
                    <select
                      className={`task-status-pill ${(task.status || "PENDING").toLowerCase()}`}
                      value={task.status}
                      onChange={(e) => handleStatusChange(task, e.target.value)}
                      style={{ cursor: "pointer", border: "none", outline: "none" }}
                    >
                      <option value="PENDING">Pending</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="REVISION_REQUESTED">Revision Requested</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </td>
                  <td>
                    <span style={{ fontSize: "12px", color: "#64748B" }}>
                      {task.due_date ? new Date(task.due_date).toLocaleDateString("en-IN") : "No Due Date"}
                    </span>
                  </td>
                  <td>
                    {task.report_id ? (
                      <button
                        type="button"
                        className="report-link-pill"
                        onClick={() => handleOpenLinkedReport(task.report_id)}
                      >
                        <FileText size={12} /> View Report
                      </button>
                    ) : (
                      <span style={{ color: "#94A3B8", fontSize: "12px", fontStyle: "italic" }}>
                        Direct Task
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      type="button"
                      onClick={() => handleDeleteTask(task)}
                      style={{
                        backgroundColor: "#FEF2F2",
                        color: "#DC2626",
                        border: "1px solid #FECACA",
                        borderRadius: "8px",
                        padding: "4px 8px",
                        cursor: "pointer",
                      }}
                      title="Delete Task"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && tasks.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px", color: "#64748B" }}>
              <ClipboardList size={32} />
              <h4 style={{ margin: "8px 0 0 0" }}>No work tasks assigned yet</h4>
              <p style={{ margin: 0, fontSize: "13px" }}>Click "Assign New Work" to delegate project tasks.</p>
            </div>
          )}
        </div>
      </section>

      {/* Create Task Modal */}
      {createModalOpen && (
        <div className="task-modal-overlay">
          <div className="task-modal-box">
            <header className="task-modal-header">
              <h3>Assign New Work / Project Task</h3>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                style={{ border: "none", background: "none", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </header>

            <form onSubmit={handleCreateSubmit}>
              <div className="task-modal-body">
                <div className="task-field-group">
                  <label>Task Title / Project Focus *</label>
                  <input
                    placeholder="e.g. Design LMS Marketing Banner, Fix Biometric Sync, Submit Monthly Report"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    required
                  />
                </div>

                <div className="task-field-group">
                  <label>Assign To (Employee / Department Head) *</label>
                  <select
                    value={taskForm.assigned_to_id}
                    onChange={(e) => {
                      const empId = e.target.value;
                      const emp = employees.find((x) => String(x.id) === String(empId));
                      setTaskForm({
                        ...taskForm,
                        assigned_to_id: empId,
                        department_id: emp?.department_id || taskForm.department_id,
                      });
                    }}
                    required
                  >
                    <option value="">Select Employee or Department Head</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.user_id || emp.id}>
                        {emp.full_name} ({emp.designation || emp.role} — {emp.department_name || "General"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="task-field-group">
                  <label>Target Department</label>
                  <select
                    value={taskForm.department_id}
                    onChange={(e) => setTaskForm({ ...taskForm, department_id: e.target.value })}
                  >
                    <option value="">Select Department (Optional)</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.department_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="task-field-group">
                    <label>Priority</label>
                    <select
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>

                  <div className="task-field-group">
                    <label>Due Date</label>
                    <input
                      type="date"
                      value={taskForm.due_date}
                      onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="task-field-group">
                  <label>Detailed Instructions / Changes Required</label>
                  <textarea
                    placeholder="Provide detailed instructions or project requirements..."
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  />
                </div>
              </div>

              <footer className="task-modal-footer">
                <button
                  type="button"
                  className="filter-select"
                  onClick={() => setCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="assign-btn"
                  disabled={savingTask}
                >
                  {savingTask ? <LoaderCircle className="spin" size={16} /> : <Send size={16} />}
                  {savingTask ? "Assigning..." : "Assign Work"}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* Linked Report Inspection Modal */}
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

export default AdminWorkAssignments;
