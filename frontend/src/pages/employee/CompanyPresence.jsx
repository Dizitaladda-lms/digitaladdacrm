import { useEffect, useMemo, useState } from "react";
import { Building2, CalendarDays, Clock, Edit3, RefreshCw, Search, UserCheck, Users } from "lucide-react";
import toast from "react-hot-toast";
import {
  getCompanyPresence,
  setEmployeePresenceStatus,
  setEmployeeWorkMode,
} from "../../services/attendanceService";
import HRAttendanceEditModal from "../../components/attendance/HRAttendanceEditModal";
import { useAuth } from "../../context/AuthContext";
import "./CompanyPresence.css";

const STATUS_LABELS = {
  PRESENT: "Present",
  ABSENT: "Absent",
  ON_LEAVE: "On leave",
};

const fetchPresence = async () => {
  const response = await getCompanyPresence();
  return Array.isArray(response?.data) ? response.data : [];
};

const CompanyPresence = () => {
  const { user } = useAuth();
  const role = String(user?.role || "").toUpperCase();
  const canManagePresence =
    ["HR", "ADMIN", "MANAGER", "SUPER_ADMIN", "SALES_HEAD"].includes(role) ||
    Boolean(user?.is_department_head) ||
    Boolean(user?.is_head) ||
    Boolean(user?.is_sales_head);
  const canEditAttendanceTime = ["HR", "ADMIN", "SUPER_ADMIN"].includes(role);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    fetchPresence()
      .then((rows) => {
        if (isCurrent) setEmployees(rows);
      })
      .catch((error) => {
        console.error("Failed to load company presence:", error);
        toast.error(error?.response?.data?.message || "Company presence could not be loaded.");
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      setEmployees(await fetchPresence());
    } catch (error) {
      console.error("Failed to refresh company presence:", error);
      toast.error(error?.response?.data?.message || "Company presence could not be refreshed.");
    } finally {
      setLoading(false);
    }
  };

  const departments = useMemo(
    () => [...new Set(employees.map((employee) => employee.department_name).filter(Boolean))].sort(),
    [employees]
  );

  const counts = useMemo(
    () => employees.reduce(
      (total, employee) => {
        const status = String(employee.attendance_status || "").toUpperCase();
        if (status === "PRESENT") total.present += 1;
        else if (status === "ON_LEAVE") total.leave += 1;
        else total.absent += 1;
        if (String(employee.work_mode).toUpperCase() === "WFH") total.wfh += 1;
        return total;
      },
      { present: 0, absent: 0, leave: 0, wfh: 0 }
    ),
    [employees]
  );

  const filteredEmployees = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return employees.filter((employee) => {
      const status = String(employee.attendance_status || "ABSENT").toUpperCase();
      const matchesStatus =
        statusFilter === "ALL"
          ? true
          : statusFilter === "WFH"
          ? String(employee.work_mode || "").toUpperCase() === "WFH"
          : status === statusFilter;
      const matchesDepartment =
        departmentFilter === "ALL" || employee.department_name === departmentFilter;
      const matchesQuery =
        !normalizedQuery ||
        [employee.full_name, employee.employee_code, employee.designation, employee.department_name]
          .some((value) => String(value || "").toLowerCase().includes(normalizedQuery));
      return matchesStatus && matchesDepartment && matchesQuery;
    });
  }, [employees, query, statusFilter, departmentFilter]);

  const handleWorkModeChange = async (employee, workMode) => {
    try {
      setSavingId(employee.employee_id);
      await setEmployeeWorkMode(employee.employee_id, workMode);
      setEmployees((current) => current.map((item) => (
        item.employee_id === employee.employee_id ? { ...item, work_mode: workMode } : item
      )));
      toast.success(`${employee.full_name} marked ${workMode === "WFH" ? "WFH" : "Office"}.`);
    } catch (error) {
      console.error("Failed to update employee work mode:", error);
      toast.error(error?.response?.data?.message || "Work mode could not be updated.");
    } finally {
      setSavingId(null);
    }
  };

  const handlePresenceStatusChange = async (employee, status) => {
    try {
      setSavingId(employee.employee_id);
      await setEmployeePresenceStatus(employee.employee_id, status);
      setEmployees((current) => current.map((item) => (
        item.employee_id === employee.employee_id
          ? { ...item, attendance_status: status === "ON_LEAVE" ? "ON_LEAVE" : item.attendance_status }
          : item
      )));
      toast.success(
        status === "ON_LEAVE"
          ? `${employee.full_name} marked on leave for today.`
          : `Leave override cleared for ${employee.full_name}.`
      );
      await handleRefresh();
    } catch (error) {
      console.error("Failed to update employee leave status:", error);
      toast.error(error?.response?.data?.message || "Leave status could not be updated.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <main className="company-presence">
      <header className="company-presence__header">
        <div>
          <p className="company-presence__eyebrow"><Building2 size={15} /> Company overview</p>
          <h1>Employee Presence</h1>
          <p className="company-presence__subtitle">
            Aaj ka present, absent aur leave status, saath mein office/WFH mode.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {canEditAttendanceTime && (
            <button
              type="button"
              onClick={() => {
                setEditingEmployee(null);
                setShowEditModal(true);
              }}
              style={{
                background: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                padding: "9px 14px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <UserCheck size={15} /> Mark / Edit Attendance
            </button>
          )}
          <div className="company-presence__today">
            <CalendarDays size={16} />
            {new Date().toLocaleDateString("en-IN", {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </div>
        </div>
      </header>

      <section className="company-presence__stats" aria-label="Attendance summary">
        <div
          className="presence-stat presence-stat--present"
          onClick={() => setStatusFilter((prev) => (prev === "PRESENT" ? "ALL" : "PRESENT"))}
          role="button"
          tabIndex={0}
          title="Click to filter Present employees"
          style={{
            cursor: "pointer",
            outline: statusFilter === "PRESENT" ? "2px solid #16a34a" : undefined,
          }}
        >
          <span>Present</span>
          <strong>{counts.present}</strong>
        </div>
        <div
          className="presence-stat presence-stat--absent"
          onClick={() => setStatusFilter((prev) => (prev === "ABSENT" ? "ALL" : "ABSENT"))}
          role="button"
          tabIndex={0}
          title="Click to filter Absent employees"
          style={{
            cursor: "pointer",
            outline: statusFilter === "ABSENT" ? "2px solid #dc2626" : undefined,
          }}
        >
          <span>Absent</span>
          <strong>{counts.absent}</strong>
        </div>
        <div
          className="presence-stat presence-stat--leave"
          onClick={() => setStatusFilter((prev) => (prev === "ON_LEAVE" ? "ALL" : "ON_LEAVE"))}
          role="button"
          tabIndex={0}
          title="Click to filter On Leave employees"
          style={{
            cursor: "pointer",
            outline: statusFilter === "ON_LEAVE" ? "2px solid #d97706" : undefined,
          }}
        >
          <span>On leave</span>
          <strong>{counts.leave}</strong>
        </div>
        <div
          className="presence-stat presence-stat--wfh"
          onClick={() => setStatusFilter((prev) => (prev === "WFH" ? "ALL" : "WFH"))}
          role="button"
          tabIndex={0}
          title="Click to filter Working From Home employees"
          style={{
            cursor: "pointer",
            outline: statusFilter === "WFH" ? "2px solid #2563eb" : undefined,
          }}
        >
          <span>Working from home</span>
          <strong>{counts.wfh}</strong>
        </div>
      </section>

      <section className="company-presence__panel">
        <div className="company-presence__toolbar">
          <label className="company-presence__search">
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, employee code or role"
              aria-label="Search employees"
            />
          </label>
          <select
            value={departmentFilter}
            onChange={(event) => setDepartmentFilter(event.target.value)}
            aria-label="Filter by department"
          >
            <option value="ALL">All departments</option>
            {departments.map((department) => <option key={department} value={department}>{department}</option>)}
          </select>
          <button
            type="button"
            className="company-presence__refresh"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? "company-presence__spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="company-presence__filters" role="group" aria-label="Filter by attendance status">
          {[
            ["ALL", `Everyone (${employees.length})`],
            ["PRESENT", `Present (${counts.present})`],
            ["ABSENT", `Absent (${counts.absent})`],
            ["ON_LEAVE", `On leave (${counts.leave})`],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={statusFilter === value ? "is-active" : ""}
              onClick={() => setStatusFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="company-presence__empty"><RefreshCw className="company-presence__spin" size={22} /> Loading presence…</div>
        ) : filteredEmployees.length === 0 ? (
          <div className="company-presence__empty"><Users size={22} /> No employees match these filters.</div>
        ) : (
          <div className="company-presence__table-wrap">
            <table className="company-presence__table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Attendance</th>
                  <th>Check-In / Out</th>
                  <th>Work mode</th>
                  {canManagePresence && <th>HR action</th>}
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee) => {
                  const attendanceStatus = String(employee.attendance_status || "ABSENT").toUpperCase();
                  const workMode = String(employee.work_mode || "OFFICE").toUpperCase();
                  const isIntern =
                    String(employee.employment_type || "").toUpperCase() === "INTERN" ||
                    String(employee.role || "").toUpperCase() === "INTERN" ||
                    /intern/i.test(String(employee.designation || ""));
                  const checkInFormatted = employee.check_in_time
                    ? new Date(employee.check_in_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                    : "--";
                  const checkOutFormatted = employee.check_out_time
                    ? new Date(employee.check_out_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                    : "--";
                  return (
                    <tr key={employee.employee_id}>
                      <td>
                        <div className="company-presence__person">
                          <span className="company-presence__avatar">
                            {String(employee.full_name || "E").slice(0, 1).toUpperCase()}
                          </span>
                          <span>
                            <strong>{employee.full_name || "Employee"}</strong>
                            <small>{employee.employee_code || `#${employee.employee_id}`} · {isIntern ? "Intern" : (employee.designation || "Employee")}</small>
                          </span>
                        </div>
                      </td>
                      <td>{employee.department_name || "General"}</td>
                      <td><span className={`presence-badge presence-badge--${attendanceStatus.toLowerCase()}`}>{STATUS_LABELS[attendanceStatus] || "Absent"}</span></td>
                      <td>
                        <div style={{ fontSize: "12.5px", fontWeight: 600, color: "#334155", display: "flex", alignItems: "center", gap: "6px" }}>
                          <Clock size={13} style={{ color: "#64748b" }} />
                          <span style={{ color: employee.check_in_time ? "#166534" : "#94a3b8" }}>{checkInFormatted}</span>
                          <span style={{ color: "#cbd5e1" }}>→</span>
                          <span style={{ color: employee.check_out_time ? "#9a3412" : "#94a3b8" }}>{checkOutFormatted}</span>
                        </div>
                      </td>
                      <td><span className={`workmode-badge workmode-badge--${workMode.toLowerCase()}`}>{workMode === "WFH" ? "WFH" : "Office"}</span></td>
                      {canManagePresence && (
                        <td>
                          <div className="company-presence__actions" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            {canEditAttendanceTime && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingEmployee(employee);
                                  setShowEditModal(true);
                                }}
                                style={{
                                  background: employee.check_in_time ? "#eff6ff" : "#2563eb",
                                  color: employee.check_in_time ? "#1d4ed8" : "#ffffff",
                                  border: employee.check_in_time ? "1px solid #bfdbfe" : "1px solid #2563eb",
                                  padding: "6px 10px",
                                  borderRadius: "8px",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                              >
                                {employee.check_in_time ? (
                                  <>
                                    <Edit3 size={12} /> Edit Time
                                  </>
                                ) : (
                                  <>
                                    <UserCheck size={12} /> Mark Present
                                  </>
                                )}
                              </button>
                            )}
                            <select
                              value={workMode}
                              onChange={(event) => handleWorkModeChange(employee, event.target.value)}
                              disabled={savingId === employee.employee_id}
                              aria-label={`Set work mode for ${employee.full_name}`}
                            >
                              <option value="OFFICE">Office</option>
                              <option value="WFH">WFH</option>
                            </select>
                            <select
                              value={employee.presence_override === "ON_LEAVE" ? "ON_LEAVE" : "AUTO"}
                              onChange={(event) => handlePresenceStatusChange(employee, event.target.value)}
                              disabled={savingId === employee.employee_id}
                              aria-label={`Set leave status for ${employee.full_name}`}
                            >
                              <option value="AUTO">Automatic status</option>
                              <option value="ON_LEAVE">On leave today</option>
                            </select>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <HRAttendanceEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingEmployee(null);
        }}
        onSaved={handleRefresh}
        initialRecord={editingEmployee}
        employeesList={employees}
      />
    </main>
  );
};

export default CompanyPresence;
