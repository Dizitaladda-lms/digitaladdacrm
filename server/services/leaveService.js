import ApiError from "../utils/ApiError.js";
import {
  createLeaveRequestRepository,
  decideLeaveRequestRepository,
  findDepartmentHeadRepository,
  findEmployeeLeaveDetailsRepository,
  getMyLeaveRequestsRepository,
  getPendingDepartmentHeadLeaveRequestsRepository,
  getPendingHRLeaveRequestsRepository,
  isDepartmentHeadRepository,
} from "../repositories/leaveRepository.js";

const isDepartmentHead = (user) => {
  const role = String(user?.employee_role || user?.role || "").toUpperCase();
  const designation = String(user?.designation || "").toLowerCase();
  return ["MANAGER", "ADMIN"].includes(role)
    || designation.includes("department head")
    || designation.includes("head of department");
};

const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

export const createLeaveRequestService = async (payload, user) => {
  const leaveType = String(payload?.leave_type || "").toUpperCase();
  const startDate = String(payload?.start_date || "");
  const endDate = String(payload?.end_date || "");
  const reason = String(payload?.reason || "").trim();
  if (!["PLANNED", "URGENT"].includes(leaveType)) {
    throw new ApiError(400, "Choose planned or urgent leave.");
  }
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    throw new ApiError(400, "Enter a valid leave start and end date.");
  }
  if (endDate < startDate) {
    throw new ApiError(400, "The leave end date cannot be before the start date.");
  }
  if (leaveType === "PLANNED" && startDate <= new Date().toISOString().slice(0, 10)) {
    throw new ApiError(400, "Planned leave must start on a future date.");
  }
  if (reason.length < 3 || reason.length > 2000) {
    throw new ApiError(400, "Please provide a reason between 3 and 2000 characters.");
  }

  const employee = await findEmployeeLeaveDetailsRepository(user.id);
  if (!employee) {
    throw new ApiError(400, "An active employee profile is required to raise a leave request.");
  }
  if (!employee.department_id) {
    throw new ApiError(400, "Your employee profile must have a department before raising leave.");
  }

  if (leaveType === "PLANNED") {
    const departmentHead = await findDepartmentHeadRepository(employee.department_id, user.id);
    if (!departmentHead) {
      throw new ApiError(409, "No department head is configured for your department. Contact HR.");
    }
  }

  return createLeaveRequestRepository({
    userId: user.id,
    employeeId: employee.id,
    departmentId: employee.department_id,
    leaveType,
    startDate,
    endDate,
    reason,
    status: leaveType === "PLANNED" ? "PENDING_DEPARTMENT_HEAD" : "PENDING_HR_APPROVAL",
  });
};

export const getMyLeaveRequestsService = (user) => getMyLeaveRequestsRepository(user.id);

export const getPendingLeaveApprovalsService = async (user) => {
  const role = String(user?.role || "").toUpperCase();
  if (["HR", "SUPER_ADMIN"].includes(role)) {
    return getPendingHRLeaveRequestsRepository();
  }
  if (
    isDepartmentHead(user)
    || await isDepartmentHeadRepository(user.id)
  ) {
    return getPendingDepartmentHeadLeaveRequestsRepository(user.id);
  }
  return [];
};

export const decideLeaveRequestService = async (id, payload, user) => {
  const decision = String(payload?.decision || "").toUpperCase();
  const reason = String(payload?.reason || "").trim();
  if (!/^\d+$/.test(String(id))) {
    throw new ApiError(400, "A valid leave request ID is required.");
  }
  if (!["APPROVE", "REJECT"].includes(decision)) {
    throw new ApiError(400, "Choose approve or reject.");
  }
  if (decision === "REJECT" && reason.length > 2000) {
    throw new ApiError(400, "Rejection reason cannot exceed 2000 characters.");
  }

  const result = await decideLeaveRequestRepository({
    id: Number(id),
    user,
    decision,
    reason: reason || null,
  });
  if (!result) throw new ApiError(404, "Leave request not found.");
  if (result.forbidden) throw new ApiError(403, "You are not authorized to review this leave request.");
  if (result.conflict) throw new ApiError(409, "This leave request has already been reviewed.");
  return result;
};
