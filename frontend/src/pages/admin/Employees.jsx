import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  LoaderCircle,
  Plus,
  RefreshCw,
  Route,
  Users,
  UserCheck,
  UserCog,
  X,
  TrendingUp,
  Building2,
  Check,
  Trash2,
  Pencil,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  approveEmployeeApprovalRequest,
  createEmployee,
  deleteEmployee,
  getEmployeeApprovalRequests,
  getEmployees,
  rejectEmployeeApprovalRequest,
  updateEmployee,
} from "../../services/employeeService";
import { getDepartments } from "../../services/departmentService";
import { useAuth } from "../../context/AuthContext";
import {
  createDomainCourse,
  createRoutingAssignment,
  getLeadRoutingSetup,
  setEmployeeDomains,
} from "../../services/leadRoutingService";
import EmployeePerformanceModal from "../../components/admin/employees/EmployeePerformanceModal";
import "../../styles/LeadManagement/LeadHeader.css";
import "../../styles/LeadManagement/LeadStats.css";
import "./Employees.css";

const initialForm = {
  full_name: "",
  email: "",
  mobile: "",
  department_id: "",
  designation: "Counsellor",
  role: "COUNSELLOR",
  reporting_manager_id: "",
  password: "",
  domains: [],
  courses: "",
  auto_assign: false,
};

const initials = (name = "") =>
  name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const Employees = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const canManageRouting = ["SUPER_ADMIN", "MANAGER", "ADMIN"].includes(user?.role);
  const canAddEmployee = isSuperAdmin || user?.role === "HR" || user?.role === "MANAGER" || user?.role === "ADMIN";

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(initialForm);

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [routing, setRouting] = useState({ domains: [], assignments: [] });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approvalRequests, setApprovalRequests] = useState([]);
  const [approvalActionId, setApprovalActionId] = useState(null);

  // Performance Modal State
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isPerfModalOpen, setIsPerfModalOpen] = useState(false);

  // Domain Assignment Modal State
  const [domainModalOpen, setDomainModalOpen] = useState(false);
  const [selectedEmployeeForDomain, setSelectedEmployeeForDomain] = useState(null);
  const [assignedDomainIds, setAssignedDomainIds] = useState([]);
  const [domainSaving, setDomainSaving] = useState(false);

  // Edit Department & Profile Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    department_id: "",
    role: "COUNSELLOR",
    designation: "",
    status: "ACTIVE",
    reporting_manager_id: "",
  });
  const [editSaving, setEditSaving] = useState(false);

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [employeeResponse, departmentResponse, routingResponse, approvalResponse] = await Promise.all([
        getEmployees({ limit: 100 }),
        getDepartments(),
        getLeadRoutingSetup(),
        isSuperAdmin ? getEmployeeApprovalRequests() : Promise.resolve(null),
      ]);
      setEmployees(employeeResponse?.data?.employees || []);
      setDepartments(departmentResponse?.data || []);
      setRouting(routingResponse?.data || { domains: [], assignments: [] });
      setApprovalRequests(approvalResponse?.data || []);
    } catch (error) {
      console.error("Failed to load employee data:", error);
      toast.error(error?.response?.data?.message || "Could not load employee data.");
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  const domainsFor = (employee) => {
    if (!employee) return [];
    const fromAssignments = routing.assignments
      .filter((item) => Number(item.employee_id) === Number(employee.id) && item.is_active)
      .map((item) => item.domain_name);

    let fromAssignedDomains = [];
    if (Array.isArray(employee.assigned_domains)) {
      fromAssignedDomains = employee.assigned_domains;
    } else if (typeof employee.assigned_domains === "string") {
      try {
        fromAssignedDomains = JSON.parse(employee.assigned_domains);
      } catch {}
    }

    const fromDirect = employee.domain ? [employee.domain] : [];

    return [...new Set([...fromAssignments, ...fromAssignedDomains, ...fromDirect].filter(Boolean))];
  };

  const routedIds = new Set(
    routing.assignments.filter((item) => item.auto_assign && item.is_active).map((item) => item.employee_id)
  );

  const counsellors = employees.filter((employee) => employee.role === "COUNSELLOR");

  const cards = [
    ["Total Employees", employees.length, "From database", Users, "blue"],
    ["Active Counsellors", counsellors.filter((item) => item.status === "ACTIVE").length, "Available for assignments", UserCheck, "green"],
    ["Auto-routing Enabled", routedIds.size, "Mapped to domain & course", Route, "purple"],
    ["Manager Admins", employees.filter((item) => item.role === "MANAGER").length, "Operational management access", UserCog, "orange"],
  ];

  const toggleDomain = (id) =>
    setForm((current) => ({
      ...current,
      domains: current.domains.includes(id)
        ? current.domains.filter((item) => item !== id)
        : [...current.domains, id],
    }));

  const openPerformanceModal = (employee) => {
    setSelectedEmployee(employee);
    setIsPerfModalOpen(true);
  };

  const openDomainModal = (employee) => {
    setSelectedEmployeeForDomain(employee);
    // Get domain IDs currently assigned to this employee
    const currentDomainIds = routing.assignments
      .filter((item) => Number(item.employee_id) === Number(employee.id) && item.is_active)
      .map((item) => Number(item.domain_id));

    // Also match by employee.domain or assigned_domains if routing assignments were empty
    let fallbackIds = [];
    if (currentDomainIds.length === 0) {
      const empDomains = domainsFor(employee);
      fallbackIds = routing.domains
        .filter((d) => empDomains.some((name) => name.toLowerCase() === d.name.toLowerCase()))
        .map((d) => Number(d.id));
    }

    setAssignedDomainIds([...new Set([...currentDomainIds, ...fallbackIds])]);
    setDomainModalOpen(true);
  };

  const toggleEmployeeDomain = (domainId) => {
    setAssignedDomainIds((prev) =>
      prev.includes(domainId) ? prev.filter((id) => id !== domainId) : [...prev, domainId]
    );
  };

  const handleSaveDomains = async (e) => {
    e.preventDefault();
    if (!selectedEmployeeForDomain) return;
    try {
      setDomainSaving(true);
      const domainNames = routing.domains
        .filter((d) => assignedDomainIds.includes(Number(d.id)))
        .map((d) => d.name);

      await setEmployeeDomains(selectedEmployeeForDomain.id, {
        domain_ids: assignedDomainIds,
        domain_names: domainNames,
      });

      toast.success(`Domains updated successfully for ${selectedEmployeeForDomain.full_name}.`);
      setDomainModalOpen(false);
      await load();
    } catch (err) {
      console.error("Failed to update employee domains:", err);
      toast.error(err?.response?.data?.message || "Could not update employee domains.");
    } finally {
      setDomainSaving(false);
    }
  };

  const handleDeleteEmployee = async (employee) => {
    if (!window.confirm(`Are you sure you want to remove ${employee.full_name} (${employee.employee_code || employee.designation}) from the CRM? This will revoke their system access.`)) {
      return;
    }
    try {
      await deleteEmployee(employee.id);
      toast.success(`${employee.full_name} has been removed successfully.`);
      await load();
    } catch (err) {
      console.error("Failed to delete employee:", err);
      toast.error(err?.response?.data?.message || "Could not remove employee.");
    }
  };

  const openEditModal = (employee) => {
    setEditingEmployee(employee);
    setEditForm({
      full_name: employee.full_name || "",
      department_id: employee.department_id || "",
      role: employee.role || "COUNSELLOR",
      designation: employee.designation || "",
      status: employee.status || "ACTIVE",
      reporting_manager_id: employee.reporting_manager_id || "",
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.department_id) return toast.error("Please select a department.");
    setEditSaving(true);
    try {
      await updateEmployee(editingEmployee.id, {
        full_name: editForm.full_name,
        department_id: Number(editForm.department_id),
        role: editForm.role,
        designation: editForm.designation,
        status: editForm.status,
        reporting_manager_id: editForm.reporting_manager_id ? Number(editForm.reporting_manager_id) : null,
      });
      toast.success(`${editingEmployee.full_name}'s department and role updated successfully!`);
      setEditModalOpen(false);
      await load();
    } catch (err) {
      console.error("Failed to update employee:", err);
      toast.error(err?.response?.data?.message || "Could not update employee.");
    } finally {
      setEditSaving(false);
    }
  };

  const handleApproveEmployeeRequest = async (request) => {
    try {
      setApprovalActionId(request.id);
      await approveEmployeeApprovalRequest(request.id);
      toast.success(`${request.employee_data.full_name} was approved and added.`);
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not approve employee request.");
    } finally {
      setApprovalActionId(null);
    }
  };

  const handleRejectEmployeeRequest = async (request) => {
    if (!window.confirm(`Reject the employee request for ${request.employee_data.full_name}?`)) return;
    try {
      setApprovalActionId(request.id);
      await rejectEmployeeApprovalRequest(request.id);
      toast.success("Employee request rejected.");
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not reject employee request.");
    } finally {
      setApprovalActionId(null);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.department_id) return toast.error("Please select a department.");
    try {
      setSaving(true);
      const employeePayload = {
        full_name: form.full_name,
        email: form.email,
        mobile: form.mobile,
        department_id: Number(form.department_id),
        designation: form.designation,
        role: form.role || "COUNSELLOR",
        reporting_manager_id: form.reporting_manager_id ? Number(form.reporting_manager_id) : null,
        password: form.password,
        employment_type: form.role === "INTERN" ? "INTERN" : "FULL_TIME",
        status: "ACTIVE",
      };
      if (String(user?.role || "").toUpperCase() === "HR") {
        employeePayload.routing_assignments = form.domains.map((domainId) => ({
          domain_id: domainId,
          auto_assign: form.auto_assign,
        }));
      }
      const result = await createEmployee(employeePayload);

      const approvalRequired = Boolean(result?.data?.approvalRequired);
      const employee = approvalRequired ? null : result?.data;

      // Assign domains directly via setEmployeeDomains
      if (employee && form.domains.length > 0) {
        const domainNames = routing.domains
          .filter((d) => form.domains.includes(Number(d.id)))
          .map((d) => d.name);

        await setEmployeeDomains(employee.id, {
          domain_ids: form.domains,
          domain_names: domainNames,
        });
      }

      // Also create course-specific routing if courses specified
      const courses = form.courses.split(",").map((item) => item.trim()).filter(Boolean);
      if (employee && courses.length > 0 && form.domains.length > 0) {
        let setup = (await getLeadRoutingSetup()).data;
        for (const domainId of form.domains) {
          let domain = setup.domains.find((item) => Number(item.id) === Number(domainId));
          for (const courseName of courses) {
            let course = domain?.courses?.find((item) => item.name.toLowerCase() === courseName.toLowerCase());
            if (!course) {
              await createDomainCourse({ domain_id: domainId, name: courseName });
              setup = (await getLeadRoutingSetup()).data;
              domain = setup.domains.find((item) => Number(item.id) === Number(domainId));
              course = domain?.courses?.find((item) => item.name.toLowerCase() === courseName.toLowerCase());
            }
            if (course && form.auto_assign) {
              await createRoutingAssignment({
                employee_id: employee.id,
                domain_id: domainId,
                course_id: course.id,
                auto_assign: true,
              });
            }
          }
        }
      }

      toast.success(
        approvalRequired
          ? "Employee request sent to the Super Admin for approval."
          : "Employee created successfully."
      );
      setForm(initialForm);
      setFormOpen(false);
      await load();
    } catch (error) {
      console.error("Failed to create employee:", error);
      toast.error(error?.response?.data?.message || "Could not save employee.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="employees-page">
      {/* Header Banner */}
      <section className="lead-header">
        <div className="lead-header-left">
          <span className="lead-badge">Team Management</span>
          <h1>Employees & Performance Scorecards</h1>
          <p>Track counselling workload, conversion performance, domain routing & assignment.</p>
        </div>
        <div className="lead-header-right">
          <div className="lead-date-card">
            <CalendarDays size={18} />
            <div>
              <span>Today</span>
              <strong>{today}</strong>
            </div>
          </div>
          <div className="lead-header-actions">
            <button className="refresh-btn" type="button" onClick={load} disabled={loading}>
              <RefreshCw size={17} className={loading ? "spin" : ""} /> Refresh
            </button>
            {canAddEmployee && (
              <button className="create-btn" type="button" onClick={() => setFormOpen(true)}>
                <Plus size={18} /> Add Employee
              </button>
            )}
          </div>
        </div>
      </section>

      {isSuperAdmin && (
        <section className="employee-table-card" style={{ marginBottom: "20px" }}>
          <div className="employee-list-heading">
            <div>
              <h2>Employee Approval Requests</h2>
              <p>HR-submitted employees stay out of the directory until approved.</p>
            </div>
            <strong>{approvalRequests.length} pending</strong>
          </div>
          {approvalRequests.length ? (
            <div className="employee-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Requested Employee</th>
                    <th>Department</th>
                    <th>Role</th>
                    <th>Requested By</th>
                    <th style={{ textAlign: "right" }}>Review</th>
                  </tr>
                </thead>
                <tbody>
                  {approvalRequests.map((request) => {
                    const employeeData = request.employee_data || {};
                    const department = departments.find(
                      (item) => Number(item.id) === Number(employeeData.department_id)
                    );
                    const busy = approvalActionId === request.id;
                    return (
                      <tr key={request.id}>
                        <td>
                          <strong>{employeeData.full_name}</strong>
                          <small style={{ display: "block" }}>{employeeData.email}</small>
                        </td>
                        <td>{department?.department_name || "Department unavailable"}</td>
                        <td>{employeeData.role}</td>
                        <td>{request.requester_name || "HR"}</td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "8px" }}>
                            <button
                              type="button"
                              className="view-more-btn"
                              disabled={busy}
                              onClick={() => handleApproveEmployeeRequest(request)}
                            >
                              <Check size={15} /> Approve
                            </button>
                            <button
                              type="button"
                              className="view-more-btn"
                              disabled={busy}
                              onClick={() => handleRejectEmployeeRequest(request)}
                            >
                              <X size={15} /> Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ padding: "16px 20px", color: "#64748B" }}>No pending employee requests.</p>
          )}
        </section>
      )}

      {/* Top 4 Stat Cards */}
      <section className="lead-stats employee-stats">
        {cards.map(([title, value, subtitle, Icon, color]) => (
          <article key={title} className={`lead-stat-card ${color}`}>
            <div className="lead-stat-top">
              <div>
                <span>{title}</span>
                <h2>{loading ? "—" : Number(value || 0).toLocaleString("en-IN")}</h2>
                <p>{subtitle}</p>
              </div>
              <div className="lead-stat-icon">
                <Icon size={24} />
              </div>
            </div>
          </article>
        ))}
      </section>

      {/* Employee Data Table */}
      <section className="employee-table-card">
        <div className="employee-list-heading">
          <div>
            <h2>Employee Directory & Performance</h2>
            <p>View counselling workload, assigned domains, and live conversion statistics.</p>
          </div>
          {canAddEmployee && (
            <button type="button" onClick={() => setFormOpen(true)}>
              <Plus size={17} /> Add Employee
            </button>
          )}
        </div>

        <div className="employee-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Role / Access</th>
                <th>Status</th>
                <th>Today's Attendance</th>
                <th>Assigned Domains</th>
                <th>Department & Mentor</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id}>
                  <td>
                    <div className="employee-identity">
                      <span>{initials(employee.full_name)}</span>
                      <div>
                        <strong>{employee.full_name}</strong>
                        <small>{employee.email}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          width: "fit-content",
                          padding: "3px 8px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: 700,
                          letterSpacing: "0.02em",
                          backgroundColor:
                            employee.role === "HR"
                              ? "#FCE7F3"
                              : employee.role === "TRAINER"
                              ? "#FEF3C7"
                              : employee.role === "TL"
                              ? "#EDE9FE"
                              : employee.role === "INTERN"
                              ? "#E0F2FE"
                              : employee.role === "MANAGER" || employee.role === "ADMIN"
                              ? "#DCFCE7"
                              : "#F1F5F9",
                          color:
                            employee.role === "HR"
                              ? "#9D174D"
                              : employee.role === "TRAINER"
                              ? "#B45309"
                              : employee.role === "TL"
                              ? "#6D28D9"
                              : employee.role === "INTERN"
                              ? "#0369A1"
                              : employee.role === "MANAGER" || employee.role === "ADMIN"
                              ? "#15803D"
                              : "#334155",
                        }}
                      >
                        {employee.role || "COUNSELLOR"}
                      </span>
                      <small style={{ color: "#64748B", fontSize: "11px" }}>{employee.designation}</small>
                    </div>
                  </td>
                  <td>
                    <span className={`employee-status ${employee.status === "ACTIVE" ? "active" : "inactive"}`}>
                      {employee.status}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        display: "inline-block",
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: "12px",
                        backgroundColor: employee.today_attendance_status === "PRESENT" ? "#DCFCE7" : "#FEE2E2",
                        color: employee.today_attendance_status === "PRESENT" ? "#15803D" : "#B91C1C",
                      }}
                    >
                      {employee.today_attendance_status === "PRESENT"
                        ? `Present (${employee.today_hours || 0} hrs)`
                        : "Not Checked In"}
                    </span>
                  </td>
                  <td>
                    <div className="domain-tags">
                      {domainsFor(employee).length ? (
                        domainsFor(employee).map((domain) => (
                          <span
                            key={domain}
                            style={{
                              backgroundColor: "#EEF2FF",
                              color: "#4338CA",
                              fontWeight: 600,
                              borderRadius: "6px",
                              padding: "4px 8px",
                            }}
                          >
                            {domain}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: "#94A3B8", fontStyle: "italic", fontSize: "12px" }}>
                          No domain (General)
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div>
                      <strong>{employee.department_name || "Admissions"}</strong>
                      {employee.reporting_manager_name && (
                        <div style={{ fontSize: "11px", color: "#0F766E", marginTop: "2px", fontWeight: 500 }}>
                          Dept Head / Mentor: {employee.reporting_manager_name}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                      {canManageRouting && (
                        <button
                          className="view-more-btn"
                          type="button"
                          onClick={() => openDomainModal(employee)}
                          style={{
                            backgroundColor: "#F0FDFA",
                            color: "#0F766E",
                            border: "1px solid #99F6E4",
                            fontWeight: 600,
                          }}
                          title={`Assign domain to ${employee.full_name}`}
                        >
                          <Route size={15} />
                          <span>Assign Domain</span>
                        </button>
                      )}

                      {canAddEmployee && (
                        <button
                          className="view-more-btn"
                          type="button"
                          onClick={() => openEditModal(employee)}
                          style={{
                            backgroundColor: "#F8FAFC",
                            color: "#334155",
                            border: "1px solid #CBD5E1",
                            fontWeight: 600,
                          }}
                          title={`Change department or role for ${employee.full_name}`}
                        >
                          <Pencil size={14} />
                          <span>Change Dept</span>
                        </button>
                      )}

                      <button
                        className="view-more-btn"
                        type="button"
                        onClick={() => openPerformanceModal(employee)}
                        style={{ backgroundColor: "#4F46E5", color: "#FFFFFF" }}
                      >
                        <TrendingUp size={15} />
                        <span>Performance</span>
                      </button>

                      {isSuperAdmin && (
                        <button
                          className="view-more-btn"
                          type="button"
                          onClick={() => handleDeleteEmployee(employee)}
                          style={{
                            backgroundColor: "#FEF2F2",
                            color: "#DC2626",
                            border: "1px solid #FECACA",
                            fontWeight: 600,
                          }}
                          title={`Remove ${employee.full_name} from CRM`}
                        >
                          <Trash2 size={14} />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && !employees.length && (
            <div className="employee-empty-state">
              <Users size={32} />
              <h3>No employees found</h3>
              <p>Add your first employee to begin.</p>
            </div>
          )}
        </div>
      </section>

      {/* Add Employee Modal */}
      {formOpen && (
        <div className="employee-modal-overlay">
          <form className="employee-modal" onSubmit={submit}>
            <header>
              <div>
                <span>New team member</span>
                <h2>Add Employee</h2>
                <p>Map this counsellor to domains and courses for automatic routing.</p>
              </div>
              <button type="button" onClick={() => setFormOpen(false)}>
                <X size={20} />
              </button>
            </header>
            <div className="employee-modal-body">
              <section>
                <h3>Employee details</h3>
                <div className="employee-form-grid">
                  <label>
                    Full name
                    <input
                      value={form.full_name}
                      onChange={(event) => setForm({ ...form, full_name: event.target.value })}
                      required
                    />
                  </label>
                  <label>
                    Work email
                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) => setForm({ ...form, email: event.target.value })}
                      required
                    />
                  </label>
                  <label>
                    Mobile number
                    <input
                      value={form.mobile}
                      onChange={(event) => setForm({ ...form, mobile: event.target.value })}
                      pattern="[6-9][0-9]{9}"
                      required
                    />
                  </label>
                  <label>
                    Department
                    <select
                      value={form.department_id}
                      onChange={(event) => setForm({ ...form, department_id: event.target.value })}
                      required
                    >
                      <option value="">Select department</option>
                      {departments.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.department_name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Role / System Access
                    <select
                      value={form.role}
                      onChange={(event) => {
                        const newRole = event.target.value;
                        let defaultDesig = form.designation;
                        if (newRole === "HR") defaultDesig = "HR Manager";
                        else if (newRole === "TRAINER") defaultDesig = "Faculty Trainer";
                        else if (newRole === "TL") defaultDesig = "Team Lead";
                        else if (newRole === "INTERN") defaultDesig = "Intern";
                        else if (newRole === "COUNSELLOR") defaultDesig = "Counsellor";
                        else if (newRole === "EMPLOYEE") defaultDesig = "Executive";
                        setForm({ ...form, role: newRole, designation: defaultDesig });
                      }}
                      required
                    >
                      <option value="COUNSELLOR">Counsellor (Admissions / Sales)</option>
                      <option value="HR">HR (Human Resources & Operations)</option>
                      <option value="TRAINER">Trainer (Faculty / Classes & Training)</option>
                      <option value="TL">Team Lead (TL / Supervisor)</option>
                      <option value="EMPLOYEE">Employee (Staff / Dev / Design / Marketing)</option>
                      <option value="INTERN">Intern</option>
                    </select>
                  </label>

                  <label>
                    Department Head / Reporting Manager (Optional)
                    <select
                      value={form.reporting_manager_id}
                      onChange={(event) => setForm({ ...form, reporting_manager_id: event.target.value })}
                    >
                      <option value="">Select Department Head / Manager / TL</option>
                      {employees
                        .map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.full_name} ({emp.designation || emp.role})
                          </option>
                        ))}
                    </select>
                    <small style={{ color: "#64748B", fontSize: "11px", display: "block", marginTop: "2px" }}>
                      Daily work reports submitted by this employee will first route to this Department Head for Tier-1 approval.
                    </small>
                  </label>
                  <label>
                    Temporary password
                    <input
                      type="password"
                      minLength="8"
                      autoComplete="new-password"
                      value={form.password}
                      onChange={(event) => setForm({ ...form, password: event.target.value })}
                      placeholder="Minimum 8 characters"
                      required
                    />
                  </label>

                  <label className="full-span">
                    Designation (Choose suggestion or type manually)
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", margin: "6px 0", maxWidth: "100%" }}>
                      {[
                        "Full Stack Developer",
                        "Frontend Developer",
                        "Backend Developer",
                        "Faculty Trainer",
                        "Senior Academic Trainer",
                        "Admissions Counsellor",
                        "Senior Admissions Counsellor",
                        "Graphic Designer",
                        "Video Editor",
                        "Operations Executive",
                        "HR Executive",
                        "Team Lead",
                      ].map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setForm({ ...form, designation: item })}
                          style={{
                            fontSize: "11px",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            border: form.designation === item ? "1.5px solid #2563EB" : "1px solid #E2E8F0",
                            backgroundColor: form.designation === item ? "#EFF6FF" : "#F8FAFC",
                            color: form.designation === item ? "#1D4ED8" : "#475569",
                            cursor: "pointer",
                            fontWeight: form.designation === item ? "700" : "500",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                    <input
                      list="designation-suggestions"
                      value={form.designation}
                      onChange={(event) => setForm({ ...form, designation: event.target.value })}
                      placeholder="e.g. Full Stack Developer (or type custom designation)"
                      required
                    />
                    <datalist id="designation-suggestions">
                      <option value="Full Stack Developer" />
                      <option value="Frontend Developer" />
                      <option value="Backend Developer" />
                      <option value="Software Developer" />
                      <option value="Web Developer" />
                      <option value="Faculty Trainer" />
                      <option value="Senior Academic Trainer" />
                      <option value="Admissions Counsellor" />
                      <option value="Senior Admissions Counsellor" />
                      <option value="Graphic Designer" />
                      <option value="Video Editor" />
                      <option value="Digital Marketing Executive" />
                      <option value="Operations Executive" />
                      <option value="HR Manager" />
                      <option value="HR Executive" />
                      <option value="Team Lead" />
                    </datalist>
                  </label>
                </div>
              </section>

              <section className="routing-section">
                <div className="routing-heading">
                  <Route size={19} />
                  <div>
                    <h3>Lead routing assignment</h3>
                    <p>Select which brand/domain leads (e.g. Nidads, Nigape) should route to this employee.</p>
                  </div>
                </div>
                <div className="domain-checklist">
                  {routing.domains.map((domain) => (
                    <label key={domain.id}>
                      <input
                        type="checkbox"
                        checked={form.domains.includes(domain.id)}
                        onChange={() => toggleDomain(domain.id)}
                      />
                      <span>{domain.name}</span>
                    </label>
                  ))}
                </div>
                <label className="courses-field">
                  Courses handled (Optional)
                  <textarea
                    value={form.courses}
                    onChange={(event) => setForm({ ...form, courses: event.target.value })}
                    placeholder="Data Science, Digital Marketing, Cyber Security"
                  />
                  <small>Leave empty to handle ALL courses under selected domains.</small>
                </label>
              </section>
            </div>
            <footer>
              <button type="button" onClick={() => setFormOpen(false)}>
                Cancel
              </button>
              <button type="submit" disabled={saving}>
                {saving ? <LoaderCircle className="spin" size={17} /> : <Plus size={17} />}
                {saving ? "Saving..." : "Save Employee"}
              </button>
            </footer>
          </form>
        </div>
      )}

      {/* Assign Domain Modal for Existing Employees */}
      {domainModalOpen && selectedEmployeeForDomain && (
        <div className="employee-modal-overlay">
          <form className="employee-modal" onSubmit={handleSaveDomains} style={{ maxWidth: "560px" }}>
            <header>
              <div>
                <span>Domain Routing</span>
                <h2>Assign Domains</h2>
                <p>
                  Assign leads from specific websites to <strong>{selectedEmployeeForDomain.full_name}</strong>.
                </p>
              </div>
              <button type="button" onClick={() => setDomainModalOpen(false)}>
                <X size={20} />
              </button>
            </header>

            <div className="employee-modal-body">
              <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", padding: "14px 16px", borderRadius: "10px" }}>
                <p style={{ margin: 0, fontSize: "13px", color: "#475569", lineHeight: "1.5" }}>
                  💡 When a new lead is submitted on <strong>Nidads</strong>, it will automatically go to counsellors assigned to Nidads.
                  When submitted on <strong>Nigape</strong>, it routes directly to Nigape counsellors via balanced round-robin.
                </p>
              </div>

              <section>
                <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#1E293B", marginBottom: "12px" }}>
                  Select Brand / Website Domains:
                </h3>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
                  {routing.domains.map((domain) => {
                    const isChecked = assignedDomainIds.includes(Number(domain.id));
                    return (
                      <label
                        key={domain.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "10px 14px",
                          borderRadius: "10px",
                          border: isChecked ? "2px solid #0D9488" : "1px solid #E2E8F0",
                          backgroundColor: isChecked ? "#F0FDFA" : "#FFFFFF",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleEmployeeDomain(Number(domain.id))}
                          style={{ width: "16px", height: "16px", accentColor: "#0D9488" }}
                        />
                        <span style={{ fontWeight: isChecked ? 700 : 500, fontSize: "13px", color: isChecked ? "#0F766E" : "#334155" }}>
                          {domain.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </section>
            </div>

            <footer>
              <button type="button" onClick={() => setDomainModalOpen(false)}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={domainSaving}
                style={{ backgroundColor: "#0D9488", borderColor: "#0D9488", color: "#FFFFFF" }}
              >
                {domainSaving ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />}
                {domainSaving ? "Saving..." : "Save Domains"}
              </button>
            </footer>
          </form>
        </div>
      )}

      {/* Change Department & Edit Employee Modal (For HR & Super Admin) */}
      {editModalOpen && editingEmployee && (
        <div className="employee-modal-overlay">
          <form className="employee-modal" onSubmit={handleSaveEdit}>
            <header>
              <div>
                <span>HR & Operations Access Control</span>
                <h2>Change Department & Role</h2>
                <p>
                  Update {editingEmployee.full_name}'s department and access role. The role controls their system permissions.
                </p>
              </div>
              <button type="button" onClick={() => setEditModalOpen(false)}>
                <X size={20} />
              </button>
            </header>

            <div className="employee-modal-body">
              <section>
                <div
                  style={{
                    backgroundColor: "#EFF6FF",
                    border: "1px solid #BFDBFE",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    marginBottom: "16px",
                    fontSize: "12px",
                    color: "#1E40AF",
                    lineHeight: 1.4,
                  }}
                >
                  💡 <strong>Access Control Notice:</strong> Department changes update organizational assignment. Changing the role updates permissions on the linked login account.
                </div>

                <div className="employee-form-grid">
                  <label>
                    Full Name
                    <input
                      value={editForm.full_name}
                      onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                      required
                    />
                  </label>

                  <label>
                    Assigned Department *
                    <select
                      value={editForm.department_id}
                      onChange={(e) => setEditForm({ ...editForm, department_id: e.target.value })}
                      required
                    >
                      <option value="">Select Department</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.department_name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Role / System Access Level *
                    <select
                      value={editForm.role}
                      onChange={(e) => {
                        const newRole = e.target.value;
                        let defaultDesig = editForm.designation;
                        if (newRole === "HR") defaultDesig = "HR Manager";
                        else if (newRole === "TRAINER") defaultDesig = "Faculty Trainer";
                        else if (newRole === "TL") defaultDesig = "Team Lead";
                        else if (newRole === "INTERN") defaultDesig = "Intern";
                        else if (newRole === "COUNSELLOR") defaultDesig = "Counsellor";
                        else if (newRole === "EMPLOYEE") defaultDesig = "Executive";
                        setEditForm({ ...editForm, role: newRole, designation: defaultDesig });
                      }}
                      required
                    >
                      <option value="COUNSELLOR">Counsellor (Admissions / Sales)</option>
                      <option value="HR">HR (Human Resources & Operations)</option>
                      <option value="TRAINER">Trainer (Faculty / Classes & Training)</option>
                      <option value="TL">Team Lead (TL / Supervisor)</option>
                      <option value="EMPLOYEE">Employee (Staff / Dev / Design / Marketing)</option>
                      <option value="INTERN">Intern</option>
                      {isSuperAdmin && <option value="MANAGER">Manager / Department Head</option>}
                    </select>
                  </label>

                  <label>
                    Status
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    >
                      <option value="ACTIVE">Active (Can Login)</option>
                      <option value="INACTIVE">Inactive (Suspended)</option>
                    </select>
                  </label>

                  <label>
                    Department Head / Reporting Manager (Optional)
                    <select
                      value={editForm.reporting_manager_id}
                      onChange={(e) => setEditForm({ ...editForm, reporting_manager_id: e.target.value })}
                    >
                      <option value="">Select Department Head / Manager / TL</option>
                      {employees
                        .filter((emp) => emp.id !== editingEmployee.id)
                        .map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.full_name} ({emp.designation || emp.role})
                          </option>
                        ))}
                    </select>
                    <small style={{ color: "#64748B", fontSize: "11px", display: "block", marginTop: "2px" }}>
                      Daily work reports submitted by this employee will first route to this Department Head for Tier-1 approval.
                    </small>
                  </label>

                  <label style={{ gridColumn: "1 / -1" }}>
                    Designation (Select suggestion or type custom)
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", margin: "6px 0" }}>
                      {[
                        "Full Stack Developer",
                        "Frontend Developer",
                        "Backend Developer",
                        "Faculty Trainer",
                        "Senior Academic Trainer",
                        "Admissions Counsellor",
                        "Senior Admissions Counsellor",
                        "Graphic Designer",
                        "Video Editor",
                        "Operations Executive",
                        "HR Executive",
                        "Team Lead",
                      ].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setEditForm({ ...editForm, designation: d })}
                          style={{
                            fontSize: "11px",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            border: editForm.designation === d ? "1.5px solid #2563EB" : "1px solid #E2E8F0",
                            backgroundColor: editForm.designation === d ? "#EFF6FF" : "#F8FAFC",
                            color: editForm.designation === d ? "#1D4ED8" : "#475569",
                            cursor: "pointer",
                            fontWeight: editForm.designation === d ? "700" : "500",
                          }}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                    <input
                      list="edit-designation-suggestions"
                      value={editForm.designation}
                      onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                      placeholder="e.g. Full Stack Developer"
                      required
                    />
                    <datalist id="edit-designation-suggestions">
                      <option value="Full Stack Developer" />
                      <option value="Frontend Developer" />
                      <option value="Backend Developer" />
                      <option value="Software Developer" />
                      <option value="Web Developer" />
                      <option value="Faculty Trainer" />
                      <option value="Senior Academic Trainer" />
                      <option value="Admissions Counsellor" />
                      <option value="Senior Admissions Counsellor" />
                      <option value="Graphic Designer" />
                      <option value="Video Editor" />
                      <option value="Digital Marketing Executive" />
                      <option value="Operations Executive" />
                      <option value="HR Manager" />
                      <option value="HR Executive" />
                      <option value="Team Lead" />
                    </datalist>
                  </label>
                </div>
              </section>
            </div>

            <footer>
              <button type="button" onClick={() => setEditModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" disabled={editSaving}>
                {editSaving ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />}
                {editSaving ? "Saving Changes..." : "Update Department & Role"}
              </button>
            </footer>
          </form>
        </div>
      )}

      {/* Connected Employee Performance Scorecard Modal */}
      <EmployeePerformanceModal
        employee={selectedEmployee}
        isOpen={isPerfModalOpen}
        onClose={() => setIsPerfModalOpen(false)}
      />
    </section>
  );
};

export default Employees;
