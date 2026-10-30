import ApiError from "../utils/ApiError.js";
import { findEmployeeByUserIdRepository } from "../repositories/employeeRepository.js";
import {
  createWfhRequestRepository,
  getMyWfhRequestsRepository,
  getPendingHRWfhRequestsRepository,
  decideWfhRequestRepository,
} from "../repositories/wfhRepository.js";

const isValidIsoDate = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());

export const createWfhRequestService = async (payload, user) => {
  const startDate = String(payload?.start_date || "").trim();
  const endDate = String(payload?.end_date || startDate).trim();
  const reason = String(payload?.reason || "").trim();

  if (!isValidIsoDate(startDate) || !isValidIsoDate(endDate)) {
    throw new ApiError(400, "Provide valid start and end dates (YYYY-MM-DD).");
  }

  if (endDate < startDate) {
    throw new ApiError(400, "End date cannot be earlier than start date.");
  }

  if (reason.length < 3 || reason.length > 2000) {
    throw new ApiError(400, "Reason must be between 3 and 2000 characters.");
  }

  const employee = await findEmployeeByUserIdRepository(user.id);
  if (!employee) {
    throw new ApiError(
      403,
      "No employee profile is linked to your account. Contact HR."
    );
  }

  return createWfhRequestRepository({
    userId: user.id,
    employeeId: employee.id,
    departmentId: employee.department_id,
    startDate,
    endDate,
    reason,
  });
};

export const getMyWfhRequestsService = async (user) => {
  return getMyWfhRequestsRepository(user.id);
};

export const getPendingHRWfhRequestsService = async (user) => {
  const role = String(user?.role || "").toUpperCase();
  if (!["HR", "SUPER_ADMIN", "ADMIN", "MANAGER"].includes(role)) {
    throw new ApiError(403, "Only HR and administrators can view pending WFH approvals.");
  }
  return getPendingHRWfhRequestsRepository();
};

export const decideWfhRequestService = async (id, payload, user) => {
  const role = String(user?.role || "").toUpperCase();
  if (!["HR", "SUPER_ADMIN", "ADMIN"].includes(role)) {
    throw new ApiError(403, "Only HR or Super Admin can approve or reject WFH requests.");
  }

  const decision = String(payload?.decision || "").toUpperCase();
  const reason = String(payload?.reason || "").trim();

  if (!/^\d+$/.test(String(id))) {
    throw new ApiError(400, "A valid WFH request ID is required.");
  }

  if (!["APPROVE", "REJECT"].includes(decision)) {
    throw new ApiError(400, "Decision must be either APPROVE or REJECT.");
  }

  if (decision === "REJECT" && reason.length > 2000) {
    throw new ApiError(400, "Rejection reason cannot exceed 2000 characters.");
  }

  const result = await decideWfhRequestRepository({
    id: Number(id),
    user,
    decision,
    reason: reason || null,
  });

  if (!result) throw new ApiError(404, "WFH request not found.");
  if (result.conflict) throw new ApiError(409, "This WFH request has already been reviewed.");

  return result;
};
