import ApiError from "../utils/ApiError.js";
import { findEmployeeByUserIdRepository } from "../repositories/employeeRepository.js";
import {
  findRosterByIdRepository,
  findEmployeeRosterByMonthRepository,
  upsertEmployeeRosterRepository,
  updateRosterStatusRepository,
  updateRosterByHRRepository,
  requestRosterChangeRepository,
  getAllEmployeesRosterForMonthRepository,
} from "../repositories/rosterRepository.js";

/**
 * Generates default roster template days for a month
 */
export const generateDefaultMonthDays = (year, month, employee = null) => {
  const y = Number(year);
  const m = Number(month); // 1-indexed (1 to 12)
  const daysInMonth = new Date(y, m, 0).getDate();

  const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const days = [];

  const defaultStartTime = employee?.shift_start_time || "10:00";
  const defaultEndTime = employee?.shift_end_time || "18:00";

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(y, m - 1, day);
    const dayOfWeek = d.getDay(); // 0 is Sun, 6 is Sat
    const weekday = weekdayNames[dayOfWeek];
    const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const isSunday = dayOfWeek === 0;

    days.push({
      day,
      date: dateStr,
      weekday,
      status: isSunday ? "WEEK_OFF" : "WORKING",
      shift_start: isSunday ? null : defaultStartTime,
      shift_end: isSunday ? null : defaultEndTime,
      notes: isSunday ? "Regular Sunday Off" : "",
    });
  }

  return days;
};

/**
 * Calculates day counters from days_data array
 */
export const calculateRosterCounters = (daysData = []) => {
  let total_working_days = 0;
  let total_week_offs = 0;
  let total_leaves = 0;
  let total_half_days = 0;

  for (const d of daysData) {
    const s = String(d.status || "").toUpperCase();
    if (s === "WORKING") {
      total_working_days++;
    } else if (s === "WEEK_OFF" || s === "OFF") {
      total_week_offs++;
    } else if (s === "LEAVE" || s === "PLANNED_LEAVE") {
      total_leaves++;
    } else if (s === "HALF_DAY") {
      total_half_days++;
      total_working_days += 0.5;
    }
  }

  return {
    total_working_days: Math.round(total_working_days),
    total_week_offs,
    total_leaves,
    total_half_days,
  };
};

/**
 * Helper to get linked employee record
 */
const getEmployeeForUser = async (currentUser) => {
  const employee = await findEmployeeByUserIdRepository(currentUser.id);
  if (!employee) {
    throw new ApiError(403, "No employee profile is linked to your user account.");
  }
  return employee;
};

/**
 * Get personal monthly roster
 */
export const getMyMonthlyRosterService = async (currentUser, yearParam, monthParam) => {
  const employee = await getEmployeeForUser(currentUser);

  const now = new Date();
  const year = Number(yearParam) || now.getFullYear();
  const month = Number(monthParam) || now.getMonth() + 1;

  let roster = await findEmployeeRosterByMonthRepository(employee.id, year, month);

  if (!roster) {
    const defaultDays = generateDefaultMonthDays(year, month, employee);
    const counters = calculateRosterCounters(defaultDays);

    return {
      id: null,
      employee_id: employee.id,
      employee_name: employee.full_name,
      employee_code: employee.employee_code,
      designation: employee.designation,
      role: employee.role,
      department_name: employee.department_name,
      shift_timing_type: employee.shift_timing_type || "DEFAULT",
      shift_start_time: employee.shift_start_time || "10:00",
      shift_end_time: employee.shift_end_time || "18:00",
      year,
      month,
      status: "NOT_SUBMITTED",
      total_working_days: counters.total_working_days,
      total_week_offs: counters.total_week_offs,
      total_leaves: counters.total_leaves,
      total_half_days: counters.total_half_days,
      days_data: defaultDays,
      submission_note: null,
      submitted_at: null,
      reviewed_by_name: null,
      reviewed_at: null,
      review_remarks: null,
      change_request_note: null,
    };
  }

  // Parse days_data if string
  let parsedDays = roster.days_data;
  if (typeof parsedDays === "string") {
    try {
      parsedDays = JSON.parse(parsedDays);
    } catch (e) {
      parsedDays = [];
    }
  }

  return {
    ...roster,
    days_data: parsedDays,
  };
};

/**
 * Save or Submit Personal Monthly Roster
 */
export const saveMyMonthlyRosterService = async (currentUser, payload = {}) => {
  const employee = await getEmployeeForUser(currentUser);
  const { year, month, days_data, submission_note, isSubmit } = payload;

  if (!year || !month) {
    throw new ApiError(400, "Year and month are required.");
  }
  if (!Array.isArray(days_data) || days_data.length === 0) {
    throw new ApiError(400, "Days roster data is required.");
  }

  const existing = await findEmployeeRosterByMonthRepository(employee.id, Number(year), Number(month));

  const counters = calculateRosterCounters(days_data);
  const targetStatus = isSubmit ? "SUBMITTED" : "DRAFT";
  const submittedAt = isSubmit ? new Date() : (existing?.submitted_at || null);

  const updated = await upsertEmployeeRosterRepository({
    employee_id: employee.id,
    year: Number(year),
    month: Number(month),
    status: targetStatus,
    total_working_days: counters.total_working_days,
    total_week_offs: counters.total_week_offs,
    total_leaves: counters.total_leaves,
    total_half_days: counters.total_half_days,
    days_data,
    submission_note: submission_note || existing?.submission_note || null,
    submitted_at: submittedAt,
  });

  return updated;
};

/**
 * Request Edit/Change to HR for an Approved Roster
 */
export const requestRosterChangeService = async (currentUser, payload = {}) => {
  const employee = await getEmployeeForUser(currentUser);
  const { year, month, reason } = payload;

  if (!year || !month) {
    throw new ApiError(400, "Year and month are required.");
  }

  const existing = await findEmployeeRosterByMonthRepository(employee.id, Number(year), Number(month));
  if (!existing) {
    throw new ApiError(404, "No roster found for this month.");
  }

  return await requestRosterChangeRepository(existing.id, reason || "Employee requested roster adjustments.");
};

/**
 * Get All Employees Roster for HR
 */
export const getHREmployeesRosterService = async (currentUser, query = {}) => {
  const isAuthorized = ["HR", "SUPER_ADMIN", "ADMIN", "MANAGER"].includes(currentUser.role);
  if (!isAuthorized) {
    throw new ApiError(403, "You are not authorized to view the company roster.");
  }

  const now = new Date();
  const year = Number(query.year) || now.getFullYear();
  const month = Number(query.month) || now.getMonth() + 1;
  const { department_id, status, search } = query;

  const rows = await getAllEmployeesRosterForMonthRepository({
    year,
    month,
    department_id,
    status,
    search,
  });

  // Calculate high-level summary KPIs
  let total_employees = rows.length;
  let total_submitted = 0;
  let total_approved = 0;
  let total_not_submitted = 0;
  let total_change_requested = 0;

  const sanitizedRows = rows.map((row) => {
    let daysData = row.days_data;
    if (typeof daysData === "string") {
      try {
        daysData = JSON.parse(daysData);
      } catch (e) {
        daysData = [];
      }
    } else if (!daysData || daysData.length === 0) {
      // If employee has not submitted, generate standard default template days so HR can preview or edit on their behalf!
      daysData = generateDefaultMonthDays(year, month, row);
    }

    const st = String(row.status || "").toUpperCase();
    if (st === "APPROVED") total_approved++;
    else if (st === "SUBMITTED") total_submitted++;
    else if (st === "CHANGE_REQUESTED") total_change_requested++;
    else total_not_submitted++;

    return {
      ...row,
      days_data: daysData,
    };
  });

  return {
    year,
    month,
    summary: {
      total_employees,
      total_submitted,
      total_approved,
      total_not_submitted,
      total_change_requested,
    },
    rosters: sanitizedRows,
  };
};

/**
 * HR Reviews Roster (Approve or Reject)
 */
export const reviewRosterService = async (currentUser, rosterId, payload = {}) => {
  const isAuthorized = ["HR", "SUPER_ADMIN", "ADMIN", "MANAGER"].includes(currentUser.role);
  if (!isAuthorized) {
    throw new ApiError(403, "You are not authorized to approve or reject employee rosters.");
  }

  const { status, review_remarks } = payload;
  const targetStatus = String(status || "").toUpperCase();

  if (!["APPROVED", "REJECTED"].includes(targetStatus)) {
    throw new ApiError(400, "Review status must be either APPROVED or REJECTED.");
  }

  const updated = await updateRosterStatusRepository(rosterId, {
    status: targetStatus,
    reviewed_by: currentUser.id,
    review_remarks: review_remarks || null,
  });

  if (!updated) {
    throw new ApiError(404, "Roster record not found.");
  }

  return updated;
};

/**
 * HR Directly Edits an Employee's Roster
 * (Directly fulfills: "agagr kisi ko edit karwana hoga to vo hr se karwaga kab vo ayga or kab vo off leaga")
 */
export const updateRosterByHRService = async (currentUser, rosterIdOrEmpId, payload = {}) => {
  const isAuthorized = ["HR", "SUPER_ADMIN", "ADMIN", "MANAGER"].includes(currentUser.role);
  if (!isAuthorized) {
    throw new ApiError(403, "You are not authorized to edit employee rosters.");
  }

  const { employee_id, year, month, days_data, status, review_remarks } = payload;

  if (!Array.isArray(days_data) || days_data.length === 0) {
    throw new ApiError(400, "Days roster data is required.");
  }

  const counters = calculateRosterCounters(days_data);

  // If roster record already exists by ID
  let roster = null;
  if (rosterIdOrEmpId && !isNaN(Number(rosterIdOrEmpId)) && Number(rosterIdOrEmpId) > 0) {
    roster = await findRosterByIdRepository(Number(rosterIdOrEmpId));
  }

  if (roster) {
    return await updateRosterByHRRepository(roster.id, {
      days_data,
      total_working_days: counters.total_working_days,
      total_week_offs: counters.total_week_offs,
      total_leaves: counters.total_leaves,
      total_half_days: counters.total_half_days,
      status: status || roster.status || "APPROVED",
      review_remarks: review_remarks || roster.review_remarks || "Updated by HR",
      reviewed_by: currentUser.id,
    });
  }

  // If roster didn't exist yet in DB (e.g. employee hadn't submitted yet and HR creates/edits for them)
  if (!employee_id || !year || !month) {
    throw new ApiError(400, "Employee ID, year, and month are required to create a new roster entry.");
  }

  return await upsertEmployeeRosterRepository({
    employee_id: Number(employee_id),
    year: Number(year),
    month: Number(month),
    status: status || "APPROVED",
    total_working_days: counters.total_working_days,
    total_week_offs: counters.total_week_offs,
    total_leaves: counters.total_leaves,
    total_half_days: counters.total_half_days,
    days_data,
    submission_note: "Created / Set by HR",
    submitted_at: new Date(),
  });
};
