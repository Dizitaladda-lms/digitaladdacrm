import { useEffect, useState, useCallback } from "react";
import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Briefcase,
  Mail,
  Phone,
  Shield,
  X,
  AlertCircle,
  UserCheck,
  TrendingUp,
  GraduationCap,
  Clock,
  IndianRupee,
  Calendar,
  Layers,
  ArrowUpRight,
  Eye,
  Download,
} from "lucide-react";
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  restoreEmployee,
  getEmployeeStatistics,
  getEmployeePerformance,
} from "../../services/employeeService";
import { exportToCSV } from "../../utils/exportCsv";
import axiosInstance from "../../api/axiosInstance";
import "./EmployeeManagement.css";

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    counsellors: 0,
    managers: 0,
  });

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Performance Drawer State
  const [isPerfDrawerOpen, setIsPerfDrawerOpen] = useState(false);
  const [selectedPerfEmp, setSelectedPerfEmp] = useState(null);
  const [perfLoading, setPerfLoading] = useState(false);
  const [perfData, setPerfData] = useState(null);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    mobile: "",
    designation: "",
    department_id: "",
    role: "COUNSELLOR",
    employment_type: "FULL_TIME",
    status: "ACTIVE",
    joining_date: new Date().toISOString().split("T")[0],
    password: "",
  });

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (roleFilter) params.role = roleFilter;
      if (deptFilter) params.department_id = deptFilter;

      const res = await getEmployees(params);
      const raw = res?.data?.employees || res?.data?.data?.employees || res?.data?.data || res?.data || res?.employees || [];
      const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.employees) ? raw.employees : []);
      setEmployees(list);
    } catch (err) {
      console.error("Error fetching employees:", err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, roleFilter, deptFilter]);

  const fetchStats = async () => {
    try {
      const res = await getEmployeeStatistics();
      if (res.data) {
        setStats({
          totalEmployees: res.data.total_employees || res.data.totalEmployees || 0,
          activeEmployees: res.data.active_employees || res.data.activeEmployees || 0,
          counsellors: res.data.counsellors || 0,
          managers: res.data.managers || 0,
        });
      }
    } catch (err) {
      console.error("Error fetching employee stats:", err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await axiosInstance.get("/departments");
      const deptList = res.data?.data?.departments || res.data?.departments || res.data || [];
      setDepartments(Array.isArray(deptList) ? deptList : []);
    } catch (err) {
      console.error("Error fetching departments:", err);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchStats();
    fetchDepartments();
  }, [fetchEmployees]);

  const handleOpenCreateModal = () => {
    setEditingEmployee(null);
    setFormData({
      full_name: "",
      email: "",
      mobile: "",
      designation: "",
      department_id: departments[0]?.id || "",
      role: "COUNSELLOR",
      employment_type: "FULL_TIME",
      status: "ACTIVE",
      joining_date: new Date().toISOString().split("T")[0],
      password: "",
    });
    setFormError("");
    setFormSuccess("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (emp) => {
    setEditingEmployee(emp);
    setFormData({
      full_name: emp.full_name || "",
      email: emp.email || "",
      mobile: emp.mobile || "",
      designation: emp.designation || "",
      department_id: emp.department_id || "",
      role: emp.role || "COUNSELLOR",
      employment_type: emp.employment_type || "FULL_TIME",
      status: emp.status || "ACTIVE",
      joining_date: emp.joining_date ? emp.joining_date.split("T")[0] : new Date().toISOString().split("T")[0],
      password: "",
    });
    setFormError("");
    setFormSuccess("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    setSubmitting(true);

    try {
      if (editingEmployee) {
        await updateEmployee(editingEmployee.id, formData);
        setFormSuccess("Employee updated successfully!");
      } else {
        await createEmployee(formData);
        setFormSuccess("Employee created successfully!");
      }

      setTimeout(() => {
        setIsModalOpen(false);
        fetchEmployees();
        fetchStats();
      }, 1000);
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to save employee.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to deactivate/delete ${name}?`)) {
      try {
        await deleteEmployee(id);
        fetchEmployees();
        fetchStats();
      } catch (err) {
        alert(err.response?.data?.message || "Failed to delete employee.");
      }
    }
  };

  const handleRestore = async (id) => {
    try {
      await restoreEmployee(id);
      fetchEmployees();
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to restore employee.");
    }
  };

  // Open Performance Drawer
  const handleOpenPerformance = async (emp) => {
    setSelectedPerfEmp(emp);
    setIsPerfDrawerOpen(true);
    setPerfLoading(true);
    setPerfData(null);

    try {
      const res = await getEmployeePerformance(emp.id);
      setPerfData(res?.data || res);
    } catch (err) {
      console.error("Error loading performance:", err);
    } finally {
      setPerfLoading(false);
    }
  };

  const safeEmployees = Array.isArray(employees) ? employees : [];

  // Export Staff Directory to CSV
  const handleExportStaff = () => {
    if (!safeEmployees.length) {
      alert("No employee records available to export.");
      return;
    }

    const columns = [
      { label: "Employee Code", key: (r) => r.employee_code || `#${r.id}` },
      { label: "Full Name", key: "full_name" },
      { label: "Role", key: "role" },
      { label: "Designation", key: (r) => r.designation || "N/A" },
      { label: "Department", key: (r) => r.department_name || "Admissions" },
      { label: "Email Address", key: "email" },
      { label: "Mobile Number", key: "mobile" },
      { label: "Employment Type", key: "employment_type" },
      { label: "Status", key: "status" },
      { label: "Joining Date", key: (r) => r.joining_date ? String(r.joining_date).slice(0, 10) : "" },
      { label: "Address / City", key: (r) => r.address || "" },
    ];

    exportToCSV(safeEmployees, columns, "dizitaladda_employee_directory");
  };

  return (
    <div className="employee-mgmt-container">
      {/* Header */}
      <div className="employee-mgmt-header">
        <div>
          <h1 className="header-title">Staff & Counsellor Management</h1>
          <p className="header-subtitle">Manage CRM employees, roles, counsellors, and track week-wise performance</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button className="btn-secondary" onClick={handleExportStaff} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #CBD5E1', cursor: 'pointer', fontWeight: 600, color: '#1E293B' }} title="Export Staff Directory to CSV">
            <Download size={18} />
            <span>Export Staff</span>
          </button>
          <button className="btn-primary" onClick={handleOpenCreateModal}>
            <UserPlus size={18} />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="emp-stats-grid">
        <div
          className={`emp-stat-card active-emp-card ${statusFilter === "" && roleFilter === "" ? "selected" : ""}`}
          onClick={() => { setStatusFilter(""); setRoleFilter(""); }}
          role="button"
          tabIndex={0}
          title="Click to view all staff"
        >
          <div className="stat-icon-wrapper blue">
            <Users size={22} />
          </div>
          <div>
            <div className="stat-label">Total Staff</div>
            <div className="stat-value">{stats.totalEmployees || safeEmployees.length}</div>
          </div>
        </div>

        <div
          className={`emp-stat-card active-emp-card ${statusFilter === "ACTIVE" ? "selected" : ""}`}
          onClick={() => { setStatusFilter("ACTIVE"); setRoleFilter(""); }}
          role="button"
          tabIndex={0}
          title="Click to filter Active employees"
        >
          <div className="stat-icon-wrapper green">
            <UserCheck size={22} />
          </div>
          <div>
            <div className="stat-label">Active Employees</div>
            <div className="stat-value">{stats.activeEmployees || (Array.isArray(safeEmployees) ? safeEmployees.filter(e => e.status === "ACTIVE").length : 0)}</div>
          </div>
        </div>

        <div
          className={`emp-stat-card active-emp-card ${roleFilter === "COUNSELLOR" ? "selected" : ""}`}
          onClick={() => { setRoleFilter("COUNSELLOR"); setStatusFilter(""); }}
          role="button"
          tabIndex={0}
          title="Click to filter Counsellors"
        >
          <div className="stat-icon-wrapper purple">
            <Shield size={22} />
          </div>
          <div>
            <div className="stat-label">Counsellors</div>
            <div className="stat-value">{stats.counsellors || (Array.isArray(safeEmployees) ? safeEmployees.filter(e => e.role === "COUNSELLOR").length : 0)}</div>
          </div>
        </div>

        <div
          className={`emp-stat-card active-emp-card ${roleFilter === "MANAGER" ? "selected" : ""}`}
          onClick={() => { setRoleFilter("MANAGER"); setStatusFilter(""); }}
          role="button"
          tabIndex={0}
          title="Click to filter Managers"
        >
          <div className="stat-icon-wrapper orange">
            <Briefcase size={22} />
          </div>
          <div>
            <div className="stat-label">Managers</div>
            <div className="stat-value">{stats.managers || (Array.isArray(safeEmployees) ? safeEmployees.filter(e => e.role === "MANAGER").length : 0)}</div>
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="emp-filters-card">
        <div className="search-input-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by name, email, code or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-controls">
          <select
            className="filter-dropdown"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
          </select>

          <select
            className="filter-dropdown"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All Roles</option>
            <option value="COUNSELLOR">Counsellor</option>
            <option value="MANAGER">Manager</option>
            <option value="ADMIN">Admin</option>
          </select>

          <select
            className="filter-dropdown"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.department_name}</option>
            ))}
          </select>

          <button className="btn-refresh" onClick={fetchEmployees} title="Refresh Staff List">
            <RefreshCw size={16} className={loading ? "spin" : ""} />
          </button>
        </div>
      </div>

      {/* Employees Table */}
      <div className="emp-table-card">
        {loading ? (
          <div className="loading-state">
            <RefreshCw size={32} className="spin text-blue-600" />
            <p>Loading staff records...</p>
          </div>
        ) : safeEmployees.length === 0 ? (
          <div className="empty-state">
            <Users size={48} className="empty-icon" />
            <h3>No Staff Found</h3>
            <p>Try adjusting your search filters or click 'Add Employee' to register staff.</p>
          </div>
        ) : (
          <table className="emp-table">
            <thead>
              <tr>
                <th>Employee Details</th>
                <th>Contact</th>
                <th>Role & Designation</th>
                <th>Department</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {safeEmployees.map((emp) => (
                <tr key={emp.id} className={emp.is_deleted ? "row-deleted" : ""}>
                  <td>
                    <div className="emp-profile-cell">
                      <div className="emp-avatar">
                        {emp.full_name ? emp.full_name.charAt(0).toUpperCase() : "U"}
                      </div>
                      <div>
                        <div className="emp-name">{emp.full_name}</div>
                        <div className="emp-code">{emp.employee_code || `EMP-${emp.id}`}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="contact-cell">
                      <span><Mail size={14} /> {emp.email}</span>
                      <span><Phone size={14} /> {emp.mobile}</span>
                    </div>
                  </td>
                  <td>
                    <div className="role-cell">
                      <span className={`role-badge ${emp.role?.toLowerCase()}`}>
                        {emp.role}
                      </span>
                      {emp.designation && <span className="designation-text">{emp.designation}</span>}
                    </div>
                  </td>
                  <td>{emp.department_name || emp.Department?.department_name || "General"}</td>
                  <td>
                    <span className={`status-pill ${emp.status?.toLowerCase()}`}>
                      {emp.status === "ACTIVE" ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                      {emp.status}
                    </span>
                  </td>
                  <td>
                    <div className="actions-cell">
                      {/* View More / Performance Button */}
                      <button
                        className="btn-view-perf"
                        onClick={() => handleOpenPerformance(emp)}
                        title="View Detailed Performance & Week-Wise Reports"
                      >
                        <TrendingUp size={14} />
                        <span>Performance</span>
                      </button>

                      <button className="action-btn edit" onClick={() => handleOpenEditModal(emp)} title="Edit Employee">
                        <Edit2 size={15} />
                      </button>
                      {emp.is_deleted ? (
                        <button className="action-btn restore" onClick={() => handleRestore(emp.id)} title="Restore Employee">
                          <RefreshCw size={15} />
                        </button>
                      ) : (
                        <button className="action-btn delete" onClick={() => handleDelete(emp.id, emp.full_name)} title="Deactivate/Delete">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ============================================================
          PERFORMANCE & WEEK-WISE ANALYTICS DRAWER
          ============================================================ */}
      {isPerfDrawerOpen && selectedPerfEmp && (
        <div className="perf-drawer-overlay">
          <div className="perf-drawer">
            {/* Drawer Header */}
            <div className="perf-drawer-header">
              <div className="perf-header-info">
                <div className="perf-avatar-large">
                  {selectedPerfEmp.full_name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="perf-emp-name">{selectedPerfEmp.full_name}</h2>
                  <div className="perf-emp-meta">
                    <span className="code-pill">{selectedPerfEmp.employee_code || `EMP-${selectedPerfEmp.id}`}</span>
                    <span className="role-pill">{selectedPerfEmp.role}</span>
                    <span className="desig-pill">{selectedPerfEmp.designation || "Counsellor"}</span>
                  </div>
                </div>
              </div>
              <button className="btn-close-drawer" onClick={() => setIsPerfDrawerOpen(false)}>
                <X size={22} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="perf-drawer-body">
              {perfLoading ? (
                <div className="perf-loading">
                  <RefreshCw size={32} className="spin text-blue-600" />
                  <p>Calculating lead statistics and week-wise breakdown...</p>
                </div>
              ) : !perfData ? (
                <div className="perf-empty">
                  <AlertCircle size={40} className="text-amber-500" />
                  <p>No performance data available for this staff member.</p>
                </div>
              ) : (
                <>
                  {/* Summary Cards */}
                  <div className="perf-stats-grid">
                    <div className="perf-metric-card blue">
                      <div className="metric-header">
                        <span>Assigned Leads</span>
                        <Users size={18} />
                      </div>
                      <div className="metric-val">{perfData.summary?.total_assigned || 0}</div>
                      <div className="metric-sub">Total allocated to counsellor</div>
                    </div>

                    <div className="perf-metric-card amber">
                      <div className="metric-header">
                        <span>Pending Leads</span>
                        <Clock size={18} />
                      </div>
                      <div className="metric-val">{perfData.summary?.pending_leads || 0}</div>
                      <div className="metric-sub">In Follow-up / New stage</div>
                    </div>

                    <div className="perf-metric-card green">
                      <div className="metric-header">
                        <span>Completed / Closed</span>
                        <CheckCircle2 size={18} />
                      </div>
                      <div className="metric-val">{perfData.summary?.completed_leads || 0}</div>
                      <div className="metric-sub">Processed leads</div>
                    </div>

                    <div className="perf-metric-card purple">
                      <div className="metric-header">
                        <span>Admissions Enrolled</span>
                        <GraduationCap size={18} />
                      </div>
                      <div className="metric-val">{perfData.summary?.enrolled_count || 0}</div>
                      <div className="metric-badge">
                        ?? {perfData.summary?.conversion_rate || "0.0"}% Conversion
                      </div>
                    </div>

                    <div className="perf-metric-card orange">
                      <div className="metric-header">
                        <span>Fees Collected</span>
                        <IndianRupee size={18} />
                      </div>
                      <div className="metric-val">
                        ?{Number(perfData.summary?.total_fees_collected || 0).toLocaleString("en-IN")}
                      </div>
                      <div className="metric-sub">Directly generated revenue</div>
                    </div>
                  </div>

                  {/* Week-Wise Analytics Table */}
                  <div className="perf-section">
                    <div className="section-title-box">
                      <Calendar size={18} className="text-blue-600" />
                      <div>
                        <h3>Week-Wise Performance Breakdown</h3>
                        <p>Track weekly productivity, leads completed, and enrollments achieved</p>
                      </div>
                    </div>

                    {!perfData.week_wise || perfData.week_wise.length === 0 ? (
                      <p className="no-records">No weekly activity records found.</p>
                    ) : (
                      <div className="perf-table-wrapper">
                        <table className="perf-table">
                          <thead>
                            <tr>
                              <th>Week / Dates</th>
                              <th>Assigned</th>
                              <th>Completed</th>
                              <th>Pending</th>
                              <th>Enrolled</th>
                              <th>Fees Collected (?)</th>
                              <th>Completion Rate</th>
                            </tr>
                          </thead>
                          <tbody>
                            {perfData.week_wise.map((w, idx) => {
                              const assigned = Number(w.assigned_count || 0);
                              const completed = Number(w.completed_count || 0);
                              const pending = Number(w.pending_count || 0);
                              const enrolled = Number(w.enrolled_count || 0);
                              const fees = Number(w.fees_collected || 0);
                              const rate = assigned > 0 ? Math.min(100, Math.round((completed / assigned) * 100)) : 0;

                              return (
                                <tr key={idx}>
                                  <td>
                                    <div className="week-name">{w.week_name}</div>
                                    <div className="week-dates">{w.week_label}</div>
                                  </td>
                                  <td>
                                    <span className="num-pill blue">{assigned}</span>
                                  </td>
                                  <td>
                                    <span className="num-pill green">{completed}</span>
                                  </td>
                                  <td>
                                    <span className="num-pill amber">{pending}</span>
                                  </td>
                                  <td>
                                    <span className="num-pill purple">?? {enrolled}</span>
                                  </td>
                                  <td>
                                    <strong className="fees-text">
                                      ?{fees.toLocaleString("en-IN")}
                                    </strong>
                                  </td>
                                  <td>
                                    <div className="week-progress-wrap">
                                      <div className="week-progress-bar">
                                        <div
                                          className={`week-progress-fill ${rate >= 70 ? "green" : rate >= 40 ? "blue" : "amber"}`}
                                          style={{ width: `${rate}%` }}
                                        ></div>
                                      </div>
                                      <span className="progress-pct">{rate}%</span>
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

                  {/* Recent Assigned Leads */}
                  <div className="perf-section">
                    <div className="section-title-box">
                      <Layers size={18} className="text-purple-600" />
                      <div>
                        <h3>Recent Leads Assigned to {selectedPerfEmp.full_name}</h3>
                        <p>Latest active student inquiries being handled</p>
                      </div>
                    </div>

                    {!perfData.recent_leads || perfData.recent_leads.length === 0 ? (
                      <p className="no-records">No recent leads assigned to this employee.</p>
                    ) : (
                      <div className="perf-leads-grid">
                        {perfData.recent_leads.map((l) => (
                          <div key={l.id} className="perf-lead-item">
                            <div className="lead-top">
                              <div className="lead-name-text">{l.full_name}</div>
                              <span className={`status-badge-mini ${l.status?.toLowerCase()}`}>
                                {l.status}
                              </span>
                            </div>
                            <div className="lead-course-text">{l.interested_course || "Program Inquiry"}</div>
                            <div className="lead-contact-text">
                              <Phone size={12} /> {l.mobile}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit / Create Employee Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="emp-modal">
            <div className="modal-header">
              <h2>{editingEmployee ? "Edit Employee Details" : "Create New Employee"}</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="form-alert error">
                <AlertCircle size={18} />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="form-alert success">
                <CheckCircle2 size={18} />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="emp-modal-form">
              <div className="form-grid">
                <div className="form-field">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="e.g. Anish Sharma"
                  />
                </div>

                <div className="form-field">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="anish@dizitaladda.com"
                  />
                </div>

                <div className="form-field">
                  <label>Mobile Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="+91 9876543210"
                  />
                </div>

                <div className="form-field">
                  <label>Designation</label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    placeholder="e.g. Senior Admissions Counsellor"
                  />
                </div>

                <div className="form-field">
                  <label>Role *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="COUNSELLOR">Counsellor</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Employment Type</label>
                  <select
                    value={formData.employment_type}
                    onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                  >
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="INTERN">Intern</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Department</label>
                  <select
                    value={formData.department_id}
                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.department_name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="ON_LEAVE">On Leave</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>

                {!editingEmployee && (
                  <div className="form-field full-width">
                    <label>Login Password (Optional - default: Welcome@1234)</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Enter custom password or leave blank for Welcome@1234"
                    />
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? "Saving..." : editingEmployee ? "Update Employee" : "Create Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;
