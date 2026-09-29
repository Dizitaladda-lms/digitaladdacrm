import ApiError from "../utils/ApiError.js";
import pool from "../config/db.js";
import { ensureEmployeeProfileForUser } from "./ensureEmployeeProfile.service.js";
import {
  createAdmissionRepository,
  getAdmissionsRepository,
  collectFeeRepository,
  getAdmissionByIdRepository,
} from "../repositories/admissionRepository.js";

const assertAdmissionOwnership = async (admission, currentUser) => {
  if (currentUser.role === "ADMIN") return;
  const employee = await ensureEmployeeProfileForUser(currentUser.id);
  if (!employee || String(admission.assigned_to) !== String(employee.id)) {
    throw new ApiError(403, "You can only access admissions assigned to you.");
  }
};

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

  if (currentUser.role === "COUNSELLOR" && admissionData.lead_id) {
    const { rows } = await pool.query(
      "SELECT id FROM leads WHERE id = $1 AND assigned_to = $2 AND is_deleted = FALSE",
      [admissionData.lead_id, employeeId]
    );
    if (!rows[0]) {
      throw new ApiError(403, "You can only create admissions for your assigned leads.");
    }
  }

  return await createAdmissionRepository(null, {
    ...admissionData,
    assigned_to: currentUser.role === "COUNSELLOR" ? employeeId : (admissionData.assigned_to || employeeId),
  });
};

/**
 * Collect Fee Installment for an Admission
 */
export const collectFeeService = async (admissionId, installmentData, currentUser) => {
  const admission = await getAdmissionByIdRepository(admissionId);
  if (!admission) {
    throw new ApiError(404, "Admission record not found.");
  }
  await assertAdmissionOwnership(admission, currentUser);

  return await collectFeeRepository(admissionId, installmentData);
};

export const getAdmissionByIdService = async (admissionId, currentUser) => {
  const admission = await getAdmissionByIdRepository(admissionId);
  if (!admission) {
    throw new ApiError(404, "Admission record not found.");
  }
  await assertAdmissionOwnership(admission, currentUser);
  return admission;
};
