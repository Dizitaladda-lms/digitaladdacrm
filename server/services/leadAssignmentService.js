import pool from "../config/db.js";

import ApiError from "../utils/ApiError.js";

import {
  findLeadByIdRepository,
  assignLeadRepository,
} from "../repositories/leadRepository.js";

import {
  findEmployeeByIdRepository,
} from "../repositories/employeeRepository.js";

import {
  createAssignmentHistoryRepository,
} from "../repositories/leadAssignmentRepository.js";

import {
  addTimelineEventService,
} from "./leadTimeline.service.js";

import {
  getLeadAssignmentsRepository,
  getAssignmentCountRepository,
} from "../repositories/leadAssignmentRepository.js";

import TIMELINE_ACTIVITY from "../constants/timelineActivity.js";

import auditLogger from "../utils/auditLogger.js";
import assertSalesHeadAssignmentTarget from "../utils/assertSalesHeadAssignmentTarget.js";

/**
 * =====================================================
 * Assign Lead Service (Production V2)
 * =====================================================
 */
export const assignLeadService = async (
  leadId,
  employeeId,
  assignedBy,
  remarks = null,
  assignmentType = null,
  priority = null,
  assignedByRole = null
) => {

  const client = await pool.connect();

  try {

    /* ================================
       Check Lead
    ================================= */
    const lead = await findLeadByIdRepository(leadId);

    if (!lead) {
      throw new ApiError(
        404,
        "Lead not found."
      );
    }

    /* ================================
       Check Employee
    ================================= */
    const employee = await findEmployeeByIdRepository(employeeId);

    if (!employee) {
      throw new ApiError(
        404,
        "Counsellor not found."
      );
    }
    assertSalesHeadAssignmentTarget(assignedByRole, employee);

    /* ================================
       Prevent Duplicate Assignment
    ================================= */
    if (
      Number(lead.assigned_to) === Number(employeeId)
    ) {
      throw new ApiError(
        409,
        "Lead is already assigned to this counsellor."
      );
    }

    await client.query("BEGIN");

    /* ================================
       Update Lead
    ================================= */
    const updatedLead =
      await assignLeadRepository(
        client,
        leadId,
        employeeId
      );

    /* ================================
       Save Assignment History
    ================================= */
    const formattedRemarks = [
      remarks,
      assignmentType ? `Type: ${assignmentType}` : null,
      priority ? `Priority: ${priority}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    await createAssignmentHistoryRepository(
      client,
      {
        lead_id: leadId,
        assigned_by: assignedBy,
        assigned_to: employeeId,
        previous_assigned_to:
          lead.assigned_to,
        remarks: formattedRemarks || null,
      }
    );

    await addTimelineEventService({
      leadId,
      employeeId,
      activityType: TIMELINE_ACTIVITY.LEAD_ASSIGNED,
      title: "Lead Assigned",
      description: `Lead assigned to ${employee.full_name}.`,
    });

    auditLogger({
      action: "LEAD_ASSIGNED",
      module: "LEAD",
      userId: assignedBy,
      role: employee.role || null,
      entityId: leadId,
      requestId: null,
      ip: null,
    });

    await client.query("COMMIT");

    return updatedLead;

  } catch (error) {

    await client.query("ROLLBACK");

    throw error;

  } finally {

    client.release();

  }

};

export const getLeadAssignmentHistoryService = async (
  leadId,
  page = 1,
  limit = 20
) => {

  const assignments =
    await getLeadAssignmentsRepository(
      leadId,
      page,
      limit
    );

  const totalRecords =
    await getAssignmentCountRepository(
      leadId
    );

  return {

    assignments,

    pagination: {

      page: Number(page),

      limit: Number(limit),

      totalRecords,

      totalPages: Math.ceil(
        totalRecords / limit
      ),

    },

  };

};

/**
 * =====================================================
 * Reassign Lead Service
 * =====================================================
 */
export const reassignLeadService = async (
  leadId,
  employeeId,
  assignedBy,
  remarks = null,
  assignmentType = null,
  priority = null,
  assignedByRole = null
) => {

  // Existing assign service ko reuse karo
  return await assignLeadService(
    leadId,
    employeeId,
    assignedBy,
    remarks,
    assignmentType,
    priority,
    assignedByRole
  );

};