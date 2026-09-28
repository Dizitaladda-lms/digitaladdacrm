import ApiError from "../utils/ApiError.js";
import { ensureEmployeeProfileForUser } from "./ensureEmployeeProfile.service.js";
import {
  createAdmissionRepository,
  getAdmissionsRepository,
  collectFeeRepository,
  getAdmissionByIdRepository,
} from "../repositories/admissionRepository.js";

/**
 * Get Admissions for logged-in Counsellor / Admin
 */
export const getAdmissionsService = async (currentUser, filters) => {
  const scopedFilters = { ...filters };

  if (currentUser.role === "COUNSELLOR" || currentUser.role === "EMPLOYEE") {
    const employee = await ensureEmployeeProfileForUser(currentUser.id);
    if (employee) {
      scopedFilters.employeeId = employee.id;
    }
  }

  return await getAdmissionsRepository(scopedFilters);
};

/**
 * Create a new Admission record
 */
export const createAdmissionService = async (admissionData, currentUser) => {
  let employeeId = null;
  if (currentUser) {
    const employee = await ensureEmployeeProfileForUser(currentUser.id);
    if (employee) employeeId = employee.id;
  }

  return await createAdmissionRepository(null, {
    ...admissionData,
    assigned_to: admissionData.assigned_to || employeeId,
  });
};

/**
 * Collect Fee Installment for an Admission
 */
export const collectFeeService = async (admissionId, installmentData) => {
  const admission = await getAdmissionByIdRepository(admissionId);
  if (!admission) {
    throw new ApiError(404, "Admission record not found.");
  }

  return await collectFeeRepository(admissionId, installmentData);
};

export const getAdmissionByIdService = async (admissionId) => {
  const admission = await getAdmissionByIdRepository(admissionId);
  if (!admission) {
    throw new ApiError(404, "Admission record not found.");
  }
  return admission;
};
