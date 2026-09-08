/**
 * =====================================================
 * Module : Department
 * Layer  : Service
 * Project: DIZITALADDA CRM
 * =====================================================
 */

import {
  createDepartmentRepository,
  findDepartmentByNameRepository,
  getAllDepartmentsRepository,
} from "../repositories/departmentRepository.js";

/**
 * Create Department
 */
export const createDepartmentService = async (departmentData) => {
  const existingDepartment = await findDepartmentByNameRepository(
    departmentData.department_name
  );

  if (existingDepartment) {
    throw new Error("Department already exists");
  }

  return await createDepartmentRepository(departmentData);
};

/**
 * Get All Departments
 */
export const getAllDepartmentsService = async () => {
  return await getAllDepartmentsRepository();
};