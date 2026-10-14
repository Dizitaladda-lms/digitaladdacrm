import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ClipboardList,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Search,
  User,
  Trash2,
  CheckSquare,
  UsersRound,
  X,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getTasks,
  createTask,
  updateTaskStatus,
  deleteTask,
  getAssignableMembers,
} from "../../services/taskService";
import { useAuth } from "../../context/AuthContext";
import "./DepartmentHeadTasks.css";

const DepartmentHeadTasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [assignableMembers, setAssignableMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [memberFilter, setMemberFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assigned_to_id: "",
    priority: "MEDIUM",
    due_date: "",
  });

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getTasks({
        scope: "assigned_by_me",
        status: statusFilter || undefined,
        assignedToId: memberFilter || undefined,
        search: searchQuery || undefined,
        limit: 100,
      });
      setTasks(res?.data?.tasks || []);
    } catch (err) {
      console.error("Failed to fetch assigned tasks:", err);
      toast.error(err?.response?.data?.message || "Could not fetch delegated tasks.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, memberFilter, searchQuery]);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await getAssignableMembers();
      setAssignableMembers(res?.data || []);
    } catch (err) {
      console.error("Failed to load assignable team members:", err);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Statistics
  const stats = useMemo(() => {
    const total = tasks.length;
    const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
    const revision = tasks.filter((t) => t.status === "REVISION_REQUESTED").length;
    const completed = tasks.filter((t) => t.status === "COMPLETED").length;
    const pending = tasks.filter((t) => t.status === "PENDING").length;
    return { total, inProgress, revision, completed, pending };
  }, [tasks]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Please enter a task title.");
      return;
    }
    if (!formData.assigned_to_id) {
      toast.error("Please select a team member.");
      return;
    }

    try {
      setSubmitting(true);
      await createTask({
        ...formData,
        due_date: formData.due_date || null,
      });
      toast.success("Task assigned successfully to team member!");
      setShowModal(false);
      setFormData({
        title: "",
        description: "",
        assigned_to_id: "",
        priority: "MEDIUM",
        due_date: "",
      });
      fetchTasks();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to assign task.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await updateTaskStatus(taskId, { status: newStatus });
      toast.success(`Task status updated to ${newStatus.replace("_", " ")}.`);
      fetchTasks();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update task status.");
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this assigned task?")) return;
    try {
      await deleteTask(taskId);
      toast.success("Task deleted successfully.");
      fetchTasks();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete task.");
    }
  };

  return (
    <div className="dept-tasks-page">
      {/* Header Banner */}
      <div className="dept-tasks-banner">
        <div>
          <span className="dept-tasks-pill">
            <UsersRound size={13} /> Team Task Delegation
          </span>
          <h1 className="dept-tasks-heading">Tasks Assigned by Department Head</h1>
          <p className="dept-tasks-subtext">
            Assign work instructions, set deadlines, and track completion progress for employees under your department.
          </p>
        </div>

        <button
          type="button"
          className="btn-assign-new"
          onClick={() => setShowModal(true)}
        >
          <Plus size={18} /> Assign New Task
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="dept-tasks-stats">
        <button
          type="button"
          className={`stat-card-clickable all ${statusFilter === "" ? "active" : ""}`}
          onClick={() => setStatusFilter("")}
        >
          <div className="stat-icon-wrap">
            <ClipboardList size={22} />
          </div>
          <div>
            <div className="stat-num">{stats.total}</div>
            <div className="stat-label">All Delegated</div>
          </div>
        </button>

        <button
          type="button"
          className={`stat-card-clickable pending ${statusFilter === "PENDING" ? "active" : ""}`}
          onClick={() => setStatusFilter(statusFilter === "PENDING" ? "" : "PENDING")}
        >
          <div className="stat-icon-wrap">
            <Clock size={22} />
          </div>
          <div>
            <div className="stat-num">{stats.pending}</div>
            <div className="stat-label">Pending Start</div>
          </div>
        </button>

        <button
          type="button"
          className={`stat-card-clickable progress ${statusFilter === "IN_PROGRESS" ? "active" : ""}`}
          onClick={() => setStatusFilter(statusFilter === "IN_PROGRESS" ? "" : "IN_PROGRESS")}
        >
          <div className="stat-icon-wrap">
            <Clock size={22} />
          </div>
          <div>
            <div className="stat-num">{stats.inProgress}</div>
            <div className="stat-label">In Progress</div>
          </div>
        </button>

        <button
          type="button"
          className={`stat-card-clickable completed ${statusFilter === "COMPLETED" ? "active" : ""}`}
          onClick={() => setStatusFilter(statusFilter === "COMPLETED" ? "" : "COMPLETED")}
        >
          <div className="stat-icon-wrap">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="stat-num">{stats.completed}</div>
            <div className="stat-label">Completed</div>
          </div>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="dept-tasks-filters">
        <div className="search-input-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by task title, description, or employee name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-dropdown-wrap">
          <label className="filter-label" htmlFor="member-filter">
            Employee:
          </label>
          <select
            id="member-filter"
            className="filter-select"
            value={memberFilter}
            onChange={(e) => setMemberFilter(e.target.value)}
          >
            <option value="">All Team Members</option>
            {assignableMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name} ({m.designation || m.department_name || "Employee"})
              </option>
            ))}
          </select>
        </div>

        <div className="filter-dropdown-wrap">
          <label className="filter-label" htmlFor="status-filter">
            Status:
          </label>
          <select
            id="status-filter"
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

      {/* Tasks Grid */}
      <div className="dept-tasks-grid">
        {tasks.map((task) => (
          <div key={task.id} className={`task-item-card ${task.status?.toLowerCase()}`}>
            <div>
              <div className="card-top-bar">
                <span className={`priority-badge ${task.priority?.toLowerCase()}`}>
                  {task.priority}
                </span>
                <span className={`status-chip ${task.status?.toLowerCase()}`}>
                  {task.status?.replace("_", " ")}
                </span>
              </div>

              <h3 className="card-title">{task.title}</h3>

              {task.description && <p className="card-desc">{task.description}</p>}

              <div className="card-assigned-meta">
                <div className="assignee-info">
                  <User size={14} />
                  <span>
                    <strong>{task.assigned_to_name}</strong>
                    {task.assigned_to_designation ? ` • ${task.assigned_to_designation}` : ""}
                  </span>
                </div>
                {task.due_date && (
                  <div className="due-info">
                    <Calendar size={13} />
                    <span>{new Date(task.due_date).toLocaleDateString("en-IN")}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="card-actions">
              <select
                className="status-select-action"
                value={task.status}
                onChange={(e) => handleStatusChange(task.id, e.target.value)}
              >
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="REVISION_REQUESTED">Revision Requested</option>
                <option value="COMPLETED">Completed</option>
              </select>

              <button
                type="button"
                className="btn-delete-task"
                onClick={() => handleDelete(task.id)}
                title="Delete this task"
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        ))}

        {!loading && tasks.length === 0 && (
          <div className="empty-dept-tasks">
            <ClipboardList size={40} />
            <h3>No Delegated Tasks Found</h3>
            <p>You haven't assigned any tasks matching the current filters. Click "+ Assign New Task" to delegate work.</p>
          </div>
        )}
      </div>

      {/* Assign New Task Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-content-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Assign Work / Task to Team Member</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="modal-form">
              <div className="form-group">
                <label className="form-label" htmlFor="task-assignee">
                  Assign To Team Member *
                </label>
                <select
                  id="task-assignee"
                  className="form-select"
                  value={formData.assigned_to_id}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, assigned_to_id: e.target.value }))
                  }
                  required
                >
                  <option value="">-- Select Employee --</option>
                  {assignableMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.designation || m.department_name || "Employee"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="task-title">
                  Task Title *
                </label>
                <input
                  id="task-title"
                  type="text"
                  className="form-input"
                  placeholder="e.g., SEO Keyword Research for Batch A"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="task-description">
                  Task Instructions / Description
                </label>
                <textarea
                  id="task-description"
                  className="form-textarea"
                  rows={3}
                  placeholder="Provide specific guidelines, links, or expectations for the employee..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="task-priority">
                    Priority
                  </label>
                  <select
                    id="task-priority"
                    className="form-select"
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, priority: e.target.value }))
                    }
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="task-due-date">
                    Due Date
                  </label>
                  <input
                    id="task-due-date"
                    type="date"
                    className="form-input"
                    value={formData.due_date}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, due_date: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={submitting}
                >
                  <CheckSquare size={16} />
                  {submitting ? "Assigning..." : "Assign Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentHeadTasks;
