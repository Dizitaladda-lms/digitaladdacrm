import ApiError from "../utils/ApiError.js";
import {
  getCompanyPresenceRepository,
  setEmployeePresenceStatusRepository,
  setEmployeeWorkModeRepository,
} from "../repositories/employeePresenceRepository.js";

const WORK_MODE_ADMIN_ROLES = new Set(["HR", "ADMIN", "MANAGER", "SUPER_ADMIN"]);

export const getCompanyPresenceService = async () => getCompanyPresenceRepository();

export const setEmployeeWorkModeService = async (employeeId, workMode, currentUser) => {
  if (!WORK_MODE_ADMIN_ROLES.has(String(currentUser?.role || "").toUpperCase())) {
    throw new ApiError(403, "Only HR or an administrator can set an employee's work mode.");
  }

  const normalizedEmployeeId = Number(employeeId);
  if (!Number.isInteger(normalizedEmployeeId) || normalizedEmployeeId <= 0) {
    throw new ApiError(400, "Invalid employee id.");
  }

  const normalizedWorkMode = String(workMode || "").trim().toUpperCase();
  if (!["OFFICE", "WFH"].includes(normalizedWorkMode)) {
    throw new ApiError(400, "Work mode must be OFFICE or WFH.");
  }

  const result = await setEmployeeWorkModeRepository(
    normalizedEmployeeId,
    normalizedWorkMode,
    currentUser.id
  );
  if (!result) {
    throw new ApiError(404, "Active employee not found.");
  }
  return result;
};

export const setEmployeePresenceStatusService = async (employeeId, status, currentUser) => {
  if (!WORK_MODE_ADMIN_ROLES.has(String(currentUser?.role || "").toUpperCase())) {
    throw new ApiError(403, "Only HR or an administrator can update an employee's leave status.");
  }

  const normalizedEmployeeId = Number(employeeId);
  if (!Number.isInteger(normalizedEmployeeId) || normalizedEmployeeId <= 0) {
    throw new ApiError(400, "Invalid employee id.");
  }

  const normalizedStatus = String(status || "").trim().toUpperCase();
  if (!["AUTO", "ON_LEAVE"].includes(normalizedStatus)) {
    throw new ApiError(400, "Presence status must be AUTO or ON_LEAVE.");
  }

  const result = await setEmployeePresenceStatusRepository(
    normalizedEmployeeId,
    normalizedStatus,
    currentUser.id
  );
  if (!result) {
    throw new ApiError(404, "Active employee not found.");
  }
  return result;
};
