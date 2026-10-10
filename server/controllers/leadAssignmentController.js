import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import {
  assignLeadService,
  reassignLeadService,
  getLeadAssignmentHistoryService,
} from "../services/leadAssignmentService.js";

/**
 * Assign Lead to Counsellor / Employee
 */
export const assignLead = asyncHandler(async (req, res) => {
  const leadId = req.params.leadId || req.params.id;
  const employeeId =
    req.body.employee_id ||
    req.body.employeeId ||
    req.body.assignedTo ||
    req.body.assigned_to;
  const remarks = req.body.remarks || req.body.note || null;
  const assignmentType =
    req.body.assignment_type || req.body.assignmentType || null;
  const priority = req.body.priority || null;

  const updatedLead = await assignLeadService(
    leadId,
    employeeId,
    req.user.id,
    remarks,
    assignmentType,
    priority,
    req.user.role
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedLead, "Lead assigned successfully."));
});

/**
 * Reassign Lead to another Counsellor / Employee
 */
export const reassignLead = asyncHandler(async (req, res) => {
  const leadId = req.params.leadId || req.params.id;
  const employeeId =
    req.body.employee_id ||
    req.body.employeeId ||
    req.body.assignedTo ||
    req.body.assigned_to;
  const remarks = req.body.remarks || req.body.note || null;
  const assignmentType =
    req.body.assignment_type || req.body.assignmentType || null;
  const priority = req.body.priority || null;

  const updatedLead = await reassignLeadService(
    leadId,
    employeeId,
    req.user.id,
    remarks,
    assignmentType,
    priority,
    req.user.role
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedLead, "Lead reassigned successfully."));
});

/**
 * Get Lead Assignment History
 */
export const getLeadAssignmentHistory = asyncHandler(async (req, res) => {
  const leadId = req.params.leadId || req.params.id;
  const { page = 1, limit = 20 } = req.query;

  const result = await getLeadAssignmentHistoryService(leadId, page, limit);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        result,
        "Lead assignment history fetched successfully."
      )
    );
});