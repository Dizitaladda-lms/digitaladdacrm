/**
 * =====================================================
 * Module : Department
 * Layer  : Controller
 * Project: DIZITALADDA CRM
 * =====================================================
 */

import {
  createDepartmentService,
  getAllDepartmentsService,
} from "../services/departmentService.js";

/**
 * Create Department
 */
export const createDepartment = async (req, res) => {
  try {
    const department = await createDepartmentService(req.body);

    return res.status(201).json({
      success: true,
      message: "Department Created Successfully",
      data: department,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get All Departments
 */
export const getAllDepartments = async (req, res) => {
  try {
    const departments = await getAllDepartmentsService();

    return res.status(200).json({
      success: true,
      message: "Departments Fetched Successfully",
      data: departments,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};