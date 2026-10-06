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
  CheckCircle2,
  AlertCircle,
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
import { calculateLateArrival, format12hTime } from "../../utils/shiftTiming";
import "../../styles/LeadManagement/LeadHeader.css";
import "../../styles/LeadManagement/LeadStats.css";
import "./Employees.css";

const initialForm = {
  full_name: "",
  employee_code: "",
  email: "",
  mobile: "",
  department_id: "",
  managed_department_ids: [],
  designation: "Counsellor",
  role: "COUNSELLOR",
  reporting_manager_id: "",
  password: "",
  shift_timing_type: "DEFAULT",
  shift_start_time: "10:00",
  shift_end_time: "18:00",
  custom_shift_timings: null,
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
    managed_department_ids: [],
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

  const [attendanceFilter, setAttendanceFilter] = useState("ALL"); // "ALL" | "PRESENT" | "ABSENT"

  const isEmployeeMarkedAttendance = useCallback((emp) => {
    return Boolean(
      emp.today_check_in_time ||
      emp.today_attendance_status === "PRESENT" ||
      emp.today_attendance_status === "LATE" ||
      emp.today_attendance_status === "HALF_DAY"
    );
  }, []);

  const presentEmployees = useMemo(
    () => employees.filter(isEmployeeMarkedAttendance),
    [employees, isEmployeeMarkedAttendance]
  );

  const absentEmployees = useMemo(
    () => employees.filter((emp) => !isEmployeeMarkedAttendance(emp)),
    [employees, isEmployeeMarkedAttendance]
  );

  const displayedEmployees = useMemo(() => {
    if (attendanceFilter === "PRESENT") {
      return presentEmployees;
    }
    if (attendanceFilter === "ABSENT") {
      return absentEmployees;
    }
    return employees;
  }, [employees, attendanceFilter, presentEmployees, absentEmployees]);

  const cards = [
    {
      id: "ALL",
      title: "Total Employees",
      value: employees.length,
      subtitle: attendanceFilter === "ALL" ? "Showing all staff" : "Click to view all",
      Icon: Users,
      color: "blue",
      active: attendanceFilter === "ALL",
      onClick: () => setAttendanceFilter("ALL"),
    },
    {
      id: "PRESENT",
      title: "Attendance Marked",
      value: presentEmployees.length,
      subtitle: attendanceFilter === "PRESENT" ? "● Active filter" : "Present today (Click to view)",
      Icon: CheckCircle2,
      color: "green",
      active: attendanceFilter === "PRESENT",
      onClick: () => setAttendanceFilter((prev) => (prev === "PRESENT" ? "ALL" : "PRESENT")),
    },
    {
      id: "ABSENT",
      title: "Attendance Not Marked",
      value: absentEmployees.length,
      subtitle: attendanceFilter === "ABSENT" ? "● Active filter" : "Not checked in (Click to view)",
      Icon: AlertCircle,
      color: "red",
      active: attendanceFilter === "ABSENT",
      onClick: () => setAttendanceFilter((prev) => (prev === "ABSENT" ? "ALL" : "ABSENT")),
    },
    {
      id: "COUNSELLORS",
      title: "Active Counsellors",
      value: counsellors.filter((item) => item.status === "ACTIVE").length,
      subtitle: "Available for leads",
      Icon: UserCheck,
      color: "purple",
      active: false,
    },
    {
      id: "MANAGERS",
      title: "Manager Admins",
      value: employees.filter((item) => item.role === "MANAGER").length,
      subtitle: "Operational access",
      Icon: UserCog,
      color: "orange",
      active: false,
    },
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
    let parsedCustomTimings = null;
    try {
      parsedCustomTimings = typeof employee.custom_shift_timings === "string"
        ? JSON.parse(employee.custom_shift_timings)
        : employee.custom_shift_timings;
    } catch (e) {
      parsedCustomTimings = null;
    }

    let managedDepts = [];
    if (Array.isArray(employee.managed_department_ids)) {
      managedDepts = employee.managed_department_ids.map(Number).filter(Boolean);
    } else if (typeof employee.managed_department_ids === "string") {
      try {
        managedDepts = JSON.parse(employee.managed_department_ids).map(Number).filter(Boolean);
      } catch (e) {
        managedDepts = [];
      }
    }

    setEditForm({
      full_name: employee.full_name || "",
      employee_code: employee.employee_code || "",
      email: employee.email || "",
      password: "",
      department_id: employee.department_id || "",
      managed_department_ids: managedDepts,
      role: employee.role || "COUNSELLOR",
      designation: employee.designation || "",
      status: employee.status || "ACTIVE",
      reporting_manager_id: employee.reporting_manager_id || "",
      shift_timing_type: employee.shift_timing_type || "DEFAULT",
      shift_start_time: employee.shift_start_time || "10:00",
      shift_end_time: employee.shift_end_time || "18:00",
      custom_shift_timings: parsedCustomTimings || null,
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.department_id) return toast.error("Please select a department.");
    if (!editForm.email || !editForm.email.trim()) return toast.error("Please enter a valid email address.");
    if (editForm.password && editForm.password.trim() && editForm.password.trim().length < 6) {
      return toast.error("New password must be at least 6 characters long.");
    }
    setEditSaving(true);
    try {
      const payload = {
        full_name: editForm.full_name.trim(),
        employee_code: editForm.employee_code?.trim() ? editForm.employee_code.trim().toUpperCase() : undefined,
        email: editForm.email.trim().toLowerCase(),
        department_id: Number(editForm.department_id),
        managed_department_ids: Array.isArray(editForm.managed_department_ids) ? editForm.managed_department_ids : [],
        role: editForm.role,
        designation: editForm.designation,
        status: editForm.status,
        reporting_manager_id: editForm.reporting_manager_id ? Number(editForm.reporting_manager_id) : null,
        shift_timing_type: editForm.shift_timing_type || "DEFAULT",
        shift_start_time: editForm.shift_start_time || "10:00",
        shift_end_time: editForm.shift_end_time || "18:00",
        custom_shift_timings: editForm.custom_shift_timings || null,
      };
      if (editForm.password && editForm.password.trim()) {
        payload.password = editForm.password.trim();
      }
      await updateEmployee(editingEmployee.id, payload);
      toast.success(`${editingEmployee.full_name}'s credentials, shift timing, and profile updated successfully!`);
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
        employee_code: form.employee_code?.trim() ? form.employee_code.trim().toUpperCase() : undefined,
        email: form.email,
        mobile: form.mobile,
        department_id: Number(form.department_id),
        managed_department_ids: Array.isArray(form.managed_department_ids) ? form.managed_department_ids : [],
        designation: form.designation,
        role: form.role || "COUNSELLOR",
        reporting_manager_id: form.reporting_manager_id ? Number(form.reporting_manager_id) : null,
        password: form.password,
        employment_type: form.role === "INTERN" ? "INTERN" : "FULL_TIME",
        status: "ACTIVE",
        shift_timing_type: form.shift_timing_type || "DEFAULT",
        shift_start_time: form.shift_start_time || "10:00",
        shift_end_time: form.shift_end_time || "18:00",
        custom_shift_timings: form.custom_shift_timings || null,
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

      {/* Top Stat Cards */}
      <section className="lead-stats employee-stats">
        {cards.map((card) => {
          const { id, title, value, subtitle, Icon, color, active, onClick } = card;
          const isFilterCard = id === "PRESENT" || id === "ABSENT";
          return (
            <article
              key={title}
              className={`lead-stat-card ${color}`}
              onClick={onClick}
              style={{
                cursor: onClick ? "pointer" : "default",
                transition: "all 0.18s ease",
                border:
                  active && isFilterCard
                    ? id === "PRESENT"
                      ? "2px solid #16a34a"
                      : "2px solid #dc2626"
                    : undefined,
                boxShadow:
                  active && isFilterCard
                    ? id === "PRESENT"
                      ? "0 0 0 3px rgba(22, 163, 74, 0.2), 0 6px 18px rgba(22, 163, 74, 0.15)"
                      : "0 0 0 3px rgba(220, 38, 38, 0.2), 0 6px 18px rgba(220, 38, 38, 0.15)"
                    : undefined,
                transform: active && isFilterCard ? "translateY(-2px)" : undefined,
              }}
              title={onClick ? `Click to filter: ${title}` : undefined}
            >
              <div className="lead-stat-top">
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>{title}</span>
                    {active && isFilterCard && (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "1px 6px",
                          borderRadius: "8px",
                          background: id === "PRESENT" ? "#dcfce7" : "#fee2e2",
                          color: id === "PRESENT" ? "#15803d" : "#b91c1c",
                        }}
                      >
                        FILTERED
                      </span>
                    )}
                  </div>
                  <h2>{loading ? "—" : Number(value || 0).toLocaleString("en-IN")}</h2>
                  <p>{subtitle}</p>
                </div>
                <div className="lead-stat-icon">
                  <Icon size={24} />
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {/* Employee Data Table */}
      <section className="employee-table-card">
        <div className="employee-list-heading">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h2>Employee Directory & Performance</h2>
              {attendanceFilter !== "ALL" && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "4px 10px",
                    borderRadius: "14px",
                    fontSize: "12px",
                    fontWeight: 700,
                    backgroundColor: attendanceFilter === "PRESENT" ? "#DCFCE7" : "#FEE2E2",
                    color: attendanceFilter === "PRESENT" ? "#15803D" : "#B91C1C",
                    border: attendanceFilter === "PRESENT" ? "1px solid #86EFAC" : "1px solid #FECACA",
                  }}
                >
                  {attendanceFilter === "PRESENT" ? (
                    <>
                      <CheckCircle2 size={13} /> Showing Attendance Marked ({presentEmployees.length})
                    </>
                  ) : (
                    <>
                      <AlertCircle size={13} /> Showing Attendance Not Marked ({absentEmployees.length})
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setAttendanceFilter("ALL")}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      marginLeft: "4px",
                      color: "inherit",
                      display: "flex",
                      alignItems: "center",
                    }}
                    title="Clear filter"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
            </div>
            <p>
              {attendanceFilter === "PRESENT"
                ? `Showing ${presentEmployees.length} employees who marked attendance today.`
                : attendanceFilter === "ABSENT"
                ? `Showing ${absentEmployees.length} employees who have NOT marked attendance today.`
                : "View counselling workload, assigned domains, and live conversion statistics."}
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {attendanceFilter !== "ALL" && (
              <button
                type="button"
                onClick={() => setAttendanceFilter("ALL")}
                style={{
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  padding: "8px 14px",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  color: "#334155",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <X size={14} /> Clear Filter ({employees.length} Total)
              </button>
            )}
            {canAddEmployee && (
              <button type="button" onClick={() => setFormOpen(true)}>
                <Plus size={17} /> Add Employee
              </button>
            )}
          </div>
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
              {displayedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
                    <AlertCircle size={32} style={{ color: "#94a3b8", margin: "0 auto 8px auto", display: "block" }} />
                    <p style={{ margin: 0, fontWeight: 600, fontSize: "14px", color: "#0f172a" }}>
                      {attendanceFilter === "PRESENT"
                        ? "No employees have marked attendance today."
                        : attendanceFilter === "ABSENT"
                        ? "All employees have marked attendance today!"
                        : "No employee records found."}
                    </p>
                    {attendanceFilter !== "ALL" && (
                      <button
                        type="button"
                        onClick={() => setAttendanceFilter("ALL")}
                        style={{
                          marginTop: "12px",
                          background: "#2563eb",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          padding: "6px 14px",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Reset Filter & View All ({employees.length})
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                displayedEmployees.map((employee) => (
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
                      {employee.shift_timing_type === "CUSTOM" && (
                        <span
                          title={`Custom Shift: ${format12hTime(employee.shift_start_time || "10:00")} - ${format12hTime(employee.shift_end_time || "18:00")}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "2px",
                            fontSize: "10px",
                            fontWeight: 600,
                            backgroundColor: "#F0FDF4",
                            color: "#15803D",
                            border: "1px solid #BBF7D0",
                            borderRadius: "10px",
                            padding: "1px 6px",
                            width: "fit-content",
                            marginTop: "2px",
                          }}
                        >
                          ⏱️ {format12hTime(employee.shift_start_time || "10:00")} - {format12hTime(employee.shift_end_time || "18:00")}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`employee-status ${employee.status === "ACTIVE" ? "active" : "inactive"}`}>
                      {employee.status}
                    </span>
                  </td>
                  <td>
                    {(() => {
                      const hasAttended = isEmployeeMarkedAttendance(employee);
                      if (!hasAttended) {
                        return (
                          <span
                            style={{
                              display: "inline-block",
                              fontSize: "11px",
                              fontWeight: 700,
                              padding: "3px 8px",
                              borderRadius: "12px",
                              backgroundColor: "#FEE2E2",
                              color: "#B91C1C",
                              border: "1px solid #FECACA",
                            }}
                          >
                            Not Checked In
                          </span>
                        );
                      }

                      const lateInfo = employee.today_check_in_time
                        ? calculateLateArrival(employee.today_check_in_time, employee)
                        : null;
                      const isLate = employee.today_attendance_status === "LATE" || (lateInfo && lateInfo.isLate);

                      const totalMins = Math.round(Number(employee.today_hours || 0) * 60);
                      const h = Math.floor(totalMins / 60);
                      const m = totalMins % 60;
                      const formattedDuration = h > 0 ? `${h}h ${m}m` : `${m}m`;

                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              fontSize: "11px",
                              fontWeight: 700,
                              padding: "3px 8px",
                              borderRadius: "12px",
                              backgroundColor: isLate ? "#FEF3C7" : "#DCFCE7",
                              color: isLate ? "#B45309" : "#15803D",
                              border: isLate ? "1px solid #FDE68A" : "1px solid #BBF7D0",
                              width: "fit-content",
                            }}
                          >
                            {totalMins > 0 ? `Present (${formattedDuration})` : "Present"}
                          </span>
                          {isLate && lateInfo?.formattedLate && (
                            <span
                              title={`Shift: ${lateInfo.shiftLabel} • Expected: ${lateInfo.expectedLabel}`}
                              style={{
                                fontSize: "10px",
                                fontWeight: 700,
                                color: "#B45309",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "2px",
                              }}
                            >
                              ⚠️ Late by {lateInfo.formattedLate}
                            </span>
                          )}
                        </div>
                      );
                    })()}
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
                          title={`Edit profile, email, password, department or role for ${employee.full_name}`}
                        >
                          <Pencil size={14} />
                          <span>Edit</span>
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
              )))}
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
                    Employee ID / Code (Optional)
                    <input
                      value={form.employee_code || ""}
                      onChange={(event) => setForm({ ...form, employee_code: event.target.value.toUpperCase() })}
                      placeholder="e.g. DA-EMP-001 (Leave blank to auto-generate)"
                    />
                    <small style={{ color: "#64748B", fontSize: "11px", display: "block", marginTop: "2px" }}>
                      Leave blank to auto-assign next sequence code.
                    </small>
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

                  {/* Managed Departments for TL / Manager */}
                  {(form.role === "TL" || form.role === "MANAGER" || /lead|manager|head/i.test(form.designation || "")) && (
                    <div style={{
                      gridColumn: "1 / -1",
                      background: "#f0fdf4",
                      border: "1.5px solid #86efac",
                      borderRadius: "10px",
                      padding: "14px",
                      marginTop: "6px",
                      marginBottom: "8px"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                        <Building2 size={16} style={{ color: "#16a34a" }} />
                        <strong style={{ fontSize: "13px", color: "#166534" }}>
                          Managed Departments (TL Oversight & Work Reports)
                        </strong>
                      </div>
                      <p style={{ margin: "0 0 10px 0", fontSize: "12px", color: "#475569", lineHeight: "1.4" }}>
                        Select which department(s) this Team Lead can view and review reports for. Their primary assigned department is automatically included.
                      </p>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "8px" }}>
                        {departments.map((dept) => {
                          const isPrimary = Number(form.department_id) === Number(dept.id);
                          const isChecked = isPrimary || (form.managed_department_ids || []).includes(Number(dept.id));

                          return (
                            <label
                              key={dept.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "7px 10px",
                                borderRadius: "8px",
                                background: isChecked ? "#dcfce7" : "#ffffff",
                                border: isChecked ? "1.5px solid #22c55e" : "1px solid #cbd5e1",
                                fontSize: "12.5px",
                                cursor: isPrimary ? "default" : "pointer",
                                userSelect: "none",
                                color: isChecked ? "#14532d" : "#334155",
                                fontWeight: isChecked ? "600" : "400",
                              }}
                            >
                              <input
                                type="checkbox"
                                disabled={isPrimary}
                                checked={isChecked}
                                onChange={(e) => {
                                  const deptIdNum = Number(dept.id);
                                  const current = form.managed_department_ids || [];
                                  if (e.target.checked) {
                                    setForm({ ...form, managed_department_ids: [...new Set([...current, deptIdNum])] });
                                  } else {
                                    setForm({ ...form, managed_department_ids: current.filter((id) => id !== deptIdNum) });
                                  }
                                }}
                                style={{ accentColor: "#16a34a" }}
                              />
                              <span>{dept.department_name}</span>
                              {isPrimary && (
                                <span style={{ fontSize: "10.5px", background: "#bbf7d0", color: "#166534", padding: "1px 5px", borderRadius: "4px", marginLeft: "auto" }}>
                                  Primary
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

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

                <section style={{ marginTop: "16px", borderTop: "1px solid #E2E8F0", paddingTop: "14px" }}>
                  <h4 style={{ margin: 0, fontSize: "13px", fontWeight: "700", color: "#1E293B", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>⏰</span> Office Shift & Working Hours
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px", marginBottom: "12px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "12.5px", fontWeight: 600, color: "#334155" }}>
                      <input
                        type="radio"
                        name="create_shift_timing_type"
                        value="DEFAULT"
                        checked={form.shift_timing_type !== "CUSTOM"}
                        onChange={() => setForm({ ...form, shift_timing_type: "DEFAULT" })}
                      />
                      Standard Office Timing (Mon-Fri 10:00 AM-6:00 PM, Sat 9:30 AM-5:30 PM, Sun 9:30 AM-2:00 PM)
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "12.5px", fontWeight: 600, color: "#2563EB" }}>
                      <input
                        type="radio"
                        name="create_shift_timing_type"
                        value="CUSTOM"
                        checked={form.shift_timing_type === "CUSTOM"}
                        onChange={() => setForm({ ...form, shift_timing_type: "CUSTOM" })}
                      />
                      Custom Shift Timing (Early / Flexible Shift)
                    </label>
                  </div>

                  {form.shift_timing_type === "CUSTOM" && (
                    <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "12px", marginBottom: "10px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>
                          Shift Start Time *
                          <input
                            type="time"
                            value={form.shift_start_time || "10:00"}
                            onChange={(e) => setForm({ ...form, shift_start_time: e.target.value })}
                            style={{ marginTop: "4px", width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #CBD5E1" }}
                          />
                        </label>

                        <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>
                          Shift End Time *
                          <input
                            type="time"
                            value={form.shift_end_time || "18:00"}
                            onChange={(e) => setForm({ ...form, shift_end_time: e.target.value })}
                            style={{ marginTop: "4px", width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #CBD5E1" }}
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </section>
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
                <span>HR & Operations Management</span>
                <h2>Edit Employee & Credentials</h2>
                <p>
                  Update {editingEmployee.full_name}'s login email, password, department, and system access role.
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
                  💡 <strong>HR & Admin Notice:</strong> You can update this employee's official login email and reset their password. Leave the password field blank if you do not wish to change it.
                </div>

                <div className="employee-form-grid">
                  <label>
                    Full Name *
                    <input
                      value={editForm.full_name}
                      onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                      required
                    />
                  </label>

                  <label>
                    Employee ID / Code *
                    <input
                      value={editForm.employee_code || ""}
                      onChange={(e) => setEditForm({ ...editForm, employee_code: e.target.value.toUpperCase() })}
                      placeholder="e.g. DA-EMP-001"
                      required
                    />
                    <small style={{ color: "#64748B", fontSize: "11px", display: "block", marginTop: "2px" }}>
                      Unique employee identification code used across the system.
                    </small>
                  </label>

                  <label>
                    Official Login Email *
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      placeholder="e.g. employee@dizitaladda.com"
                      autoComplete="off"
                      required
                    />
                  </label>

                  <label>
                    Change / Reset Password (Optional)
                    <input
                      type="password"
                      value={editForm.password}
                      onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                      placeholder="Leave blank to keep existing password"
                      autoComplete="new-password"
                    />
                    <small style={{ color: "#64748B", fontSize: "11px", display: "block", marginTop: "2px" }}>
                      Enter 6+ characters only if you want to reset their login password.
                    </small>
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

                <section style={{ marginTop: "20px", borderTop: "1px solid #E2E8F0", paddingTop: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#1E293B", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>⏰</span> Office Shift & Working Hours
                      </h4>
                      <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748B" }}>
                        Configure this employee's shift schedule. Attendance late tracking will strictly evaluate against these timings.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "14px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600, color: "#334155" }}>
                      <input
                        type="radio"
                        name="shift_timing_type"
                        value="DEFAULT"
                        checked={editForm.shift_timing_type !== "CUSTOM"}
                        onChange={() => setEditForm({ ...editForm, shift_timing_type: "DEFAULT" })}
                      />
                      Standard Office Timing (Mon-Fri 10:00 AM-6:00 PM, Sat 9:30 AM-5:30 PM, Sun 9:30 AM-2:00 PM)
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600, color: "#2563EB" }}>
                      <input
                        type="radio"
                        name="shift_timing_type"
                        value="CUSTOM"
                        checked={editForm.shift_timing_type === "CUSTOM"}
                        onChange={() => setEditForm({ ...editForm, shift_timing_type: "CUSTOM" })}
                      />
                      Custom Shift Timing (Early / Flexible Shift for this employee)
                    </label>
                  </div>

                  {editForm.shift_timing_type === "CUSTOM" && (
                    <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "14px", marginBottom: "8px" }}>
                      <div style={{ marginBottom: "12px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Quick Shift Presets:
                        </span>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "6px" }}>
                          {[
                            { label: "🌅 Early Shift (09:00 AM - 05:00 PM)", start: "09:00", end: "17:00" },
                            { label: "🌤️ Morning Shift (09:30 AM - 05:30 PM)", start: "09:30", end: "17:30" },
                            { label: "🏢 Standard Shift (10:00 AM - 06:00 PM)", start: "10:00", end: "18:00" },
                            { label: "🌆 Evening Shift (11:00 AM - 07:00 PM)", start: "11:00", end: "19:00" },
                          ].map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => setEditForm({ ...editForm, shift_start_time: preset.start, shift_end_time: preset.end })}
                              style={{
                                fontSize: "12px",
                                padding: "4px 10px",
                                borderRadius: "8px",
                                border: (editForm.shift_start_time === preset.start && editForm.shift_end_time === preset.end)
                                  ? "1.5px solid #2563EB"
                                  : "1px solid #CBD5E1",
                                backgroundColor: (editForm.shift_start_time === preset.start && editForm.shift_end_time === preset.end)
                                  ? "#EFF6FF"
                                  : "#FFFFFF",
                                color: (editForm.shift_start_time === preset.start && editForm.shift_end_time === preset.end)
                                  ? "#1D4ED8"
                                  : "#334155",
                                cursor: "pointer",
                                fontWeight: (editForm.shift_start_time === preset.start && editForm.shift_end_time === preset.end)
                                  ? "700"
                                  : "500",
                              }}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>
                          Shift Start Time *
                          <input
                            type="time"
                            value={editForm.shift_start_time || "10:00"}
                            onChange={(e) => setEditForm({ ...editForm, shift_start_time: e.target.value })}
                            required={editForm.shift_timing_type === "CUSTOM"}
                            style={{ marginTop: "4px", width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #CBD5E1" }}
                          />
                          <small style={{ color: "#64748B", fontSize: "11px", display: "block", marginTop: "2px" }}>
                            Expected arrival: {format12hTime(editForm.shift_start_time || "10:00")}. Check-in after this is marked <strong>LATE</strong>.
                          </small>
                        </label>

                        <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>
                          Shift End Time *
                          <input
                            type="time"
                            value={editForm.shift_end_time || "18:00"}
                            onChange={(e) => setEditForm({ ...editForm, shift_end_time: e.target.value })}
                            required={editForm.shift_timing_type === "CUSTOM"}
                            style={{ marginTop: "4px", width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #CBD5E1" }}
                          />
                          <small style={{ color: "#64748B", fontSize: "11px", display: "block", marginTop: "2px" }}>
                            Expected departure: {format12hTime(editForm.shift_end_time || "18:00")}.
                          </small>
                        </label>
                      </div>
                    </div>
                  )}
                </section>
              </section>
            </div>

            <footer>
              <button type="button" onClick={() => setEditModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" disabled={editSaving}>
                {editSaving ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />}
                {editSaving ? "Saving Changes..." : "Save Changes"}
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
