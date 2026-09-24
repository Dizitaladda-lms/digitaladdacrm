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
} from "lucide-react";
import toast from "react-hot-toast";
import { createEmployee, getEmployees } from "../../services/employeeService";
import { getDepartments } from "../../services/departmentService";
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
  password: "",
  domains: [],
  courses: "",
  auto_assign: true,
};

const initials = (name = "") =>
  name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const Employees = () => {
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(initialForm);

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [routing, setRouting] = useState({ domains: [], assignments: [] });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Performance Modal State
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isPerfModalOpen, setIsPerfModalOpen] = useState(false);

  // Domain Assignment Modal State
  const [domainModalOpen, setDomainModalOpen] = useState(false);
  const [selectedEmployeeForDomain, setSelectedEmployeeForDomain] = useState(null);
  const [assignedDomainIds, setAssignedDomainIds] = useState([]);
  const [domainSaving, setDomainSaving] = useState(false);

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [employeeResponse, departmentResponse, routingResponse] = await Promise.all([
        getEmployees({ limit: 100 }),
        getDepartments(),
        getLeadRoutingSetup(),
      ]);
      setEmployees(employeeResponse?.data?.employees || []);
      setDepartments(departmentResponse?.data || []);
      setRouting(routingResponse?.data || { domains: [], assignments: [] });
    } catch (error) {
      console.error("Failed to load employee data:", error);
      toast.error(error?.response?.data?.message || "Could not load employee data.");
    } finally {
      setLoading(false);
    }
  }, []);

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
    ["Managers & Admins", employees.filter((item) => item.role === "ADMIN").length, "System administrators", UserCog, "orange"],
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

  const submit = async (event) => {
    event.preventDefault();
    if (!form.department_id) return toast.error("Please select a department.");
    try {
      setSaving(true);
      const result = await createEmployee({
        full_name: form.full_name,
        email: form.email,
        mobile: form.mobile,
        department_id: Number(form.department_id),
        designation: form.designation,
        role: "COUNSELLOR",
        password: form.password,
        employment_type: "FULL_TIME",
        status: "ACTIVE",
      });

      const employee = result?.data;

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

      toast.success("Employee created successfully.");
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
            <button className="create-btn" type="button" onClick={() => setFormOpen(true)}>
              <Plus size={18} /> Add Employee
            </button>
          </div>
        </div>
      </section>

      {/* Top 4 Stat Cards */}
      <section className="lead-stats employee-stats">
        {cards.map(([title, value, subtitle, Icon, color]) => (
          <article key={title} className={`lead-stat-card ${color}`}>
            <div className="lead-stat-top">
              <div>
                <span>{title}</span>
                <h2>{loading ? "—" : value}</h2>
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
          <button type="button" onClick={() => setFormOpen(true)}>
            <Plus size={17} /> Add Employee
          </button>
        </div>

        <div className="employee-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Status</th>
                <th>Assigned Domains</th>
                <th>Department</th>
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
                    <span className={`employee-status ${employee.status === "ACTIVE" ? "active" : "inactive"}`}>
                      {employee.status}
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
                  <td>{employee.department_name || "Admissions"}</td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
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
                        title={`Assign domain (Nidads, Nigape, etc.) to ${employee.full_name}`}
                      >
                        <Route size={15} />
                        <span>Assign Domain</span>
                      </button>

                      <button
                        className="view-more-btn"
                        type="button"
                        onClick={() => openPerformanceModal(employee)}
                        style={{ backgroundColor: "#2563EB", color: "#FFFFFF" }}
                      >
                        <TrendingUp size={15} />
                        <span>Performance</span>
                      </button>
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
                    Designation
                    <input
                      value={form.designation}
                      onChange={(event) => setForm({ ...form, designation: event.target.value })}
                      required
                    />
                  </label>
                  <label>
                    Temporary password
                    <input
                      type="password"
                      minLength="8"
                      value={form.password}
                      onChange={(event) => setForm({ ...form, password: event.target.value })}
                      required
                    />
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
