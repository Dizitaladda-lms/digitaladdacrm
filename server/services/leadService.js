import pool from "../config/db.js";
import ApiError from "../utils/ApiError.js";
import auditLogger from "../utils/auditLogger.js";

import ROLES from "../constants/roles.js";

import {
  getNextLeadCodeRepository,
  createLeadRepository,
  findLeadByEmailRepository,
  findLeadByMobileRepository,
  findLeadByIdRepository,
  getLeadsRepository,
  updateLeadRepository,
  deleteLeadRepository,
  restoreLeadRepository,
} from "../repositories/leadRepository.js";

import {
  getLeadStatisticsRepository,
  assignLeadRepository,
  updateLeadStatusRepository,
  assignBulkLeadsRepository,
} from "../repositories/leadRepository.js";

import {
  findEmployeeByIdRepository,
  findEmployeeByUserIdRepository,
} from "../repositories/employeeRepository.js";

import {
  createAssignmentHistoryRepository,
} from "../repositories/leadAssignmentRepository.js";

import {
  addLeadNoteRepository,
  getLeadNotesRepository,
  getLeadTimelineRepository,
} from "../repositories/leadRepository.js";

import {
  addTimelineEventService,
} from "../services/leadTimeline.service.js";

import TIMELINE_ACTIVITY from "../constants/timelineActivity.js";

/**
 * =====================================================
 * Ownership Guard Helpers
 *
 * CONFIRMED (via employeeRepository.js): `employees` has
 * its own primary key, separate from `users.id`, bridged
 * by `employees.user_id`. `leads.assigned_to` stores
 * `employees.id`, NOT `users.id`. `currentUser.id`
 * (attached by authMiddleware) is a `users.id`.
 *
 * These two IDs must never be compared directly - doing
 * so was a bug in an earlier version of this fix. Every
 * Counsellor-scoped check must first resolve the current
 * user's employee record via findEmployeeByUserIdRepository
 * before comparing against assigned_to.
 * =====================================================
 */

const resolveEmployeeIdForCounsellor = async (currentUser) => {

  if (currentUser.role !== ROLES.COUNSELLOR) {

    return null;

  }

  const employee =
    await findEmployeeByUserIdRepository(currentUser.id);

  if (!employee) {

    // A Counsellor-role user account with no linked
    // employee record is a data-integrity problem, not
    // a normal "no leads yet" case - fail closed and
    // loudly rather than silently returning an empty list.
    throw new ApiError(
      403,
      "No employee profile is linked to this account. Contact an administrator."
    );

  }

  return employee.id;

};

const assertLeadOwnership = async (lead, currentUser) => {

  if (currentUser.role !== ROLES.COUNSELLOR) {

    return;

  }

  const employeeId =
    await resolveEmployeeIdForCounsellor(currentUser);

  if (String(lead.assigned_to) !== String(employeeId)) {

    throw new ApiError(
      403,
      "You do not have permission to access this lead."
    );

  }

};

/**
 * =====================================================
 * Create Lead
 * =====================================================
 */

export const createLeadService = async (
  leadData,
  currentUser,
  req
) => {

  const client = await pool.connect();

  try {

    await client.query("BEGIN");

    /* Duplicate Email */

    if (leadData.email) {

      const existingEmail =
        await findLeadByEmailRepository(
          leadData.email
        );

      if (existingEmail) {

        throw new ApiError(
          409,
          "Lead email already exists."
        );

      }

    }

    /* Duplicate Mobile */

    const existingMobile =
      await findLeadByMobileRepository(
        leadData.mobile
      );

    if (existingMobile) {

      throw new ApiError(
        409,
        "Lead mobile already exists."
      );

    }

    /* Generate Lead Code */

    const sequence =
      await getNextLeadCodeRepository(client);

    const leadCode =
      `${process.env.LEAD_CODE_PREFIX || "LEAD"}${String(sequence).padStart(6, "0")}`;

    /* Create Lead */

    const lead =
      await createLeadRepository(
        client,
        {

          ...leadData,

          lead_code: leadCode,

          created_by: currentUser.id,

        }
      );

    await addTimelineEventService({
      leadId: lead.id,
      employeeId: lead.assigned_to || null,
      activityType: TIMELINE_ACTIVITY.LEAD_CREATED,
      title: "Lead Created",
      description: `Lead ${lead.full_name} created successfully.`,
    }, client);

    auditLogger({

      action: "LEAD_CREATED",

      module: "LEAD",

      userId: currentUser.id,

      role: currentUser.role,

      entityId: lead.id,

      requestId: req.requestId,

      ip: req.ip,

    });

    await client.query("COMMIT");

    return lead;

  } catch (error) {

    await client.query("ROLLBACK");

    throw error;

  } finally {

    client.release();

  }

};

/**
 * =====================================================
 * Get All Leads
 *
 * SECURITY: When the requesting user is a Counsellor,
 * the assigned_to filter is force-set to their own ID,
 * overriding anything the client sent in the query
 * string. This is intentional - a Counsellor must never
 * be able to list another Counsellor's leads by
 * tampering with the query params.
 * =====================================================
 */

export const getAllLeadsService = async (
  filters,
  currentUser
) => {

  const scopedFilters = { ...filters };

  const employeeId =
    await resolveEmployeeIdForCounsellor(currentUser);

  if (employeeId !== null) {

    scopedFilters.assigned_to = employeeId;

  }

  return await getLeadsRepository(
    scopedFilters
  );

};

/**
 * =====================================================
 * Get Lead By ID
 *
 * SECURITY: throws 403 if a Counsellor requests a lead
 * not assigned to them. See assertLeadOwnership above
 * for the caveat on ID-space assumptions.
 * =====================================================
 */

export const getLeadByIdService = async (
  id,
  currentUser
) => {

  const lead =
    await findLeadByIdRepository(id);

  if (!lead) {

    throw new ApiError(
      404,
      "Lead not found."
    );

  }

  await assertLeadOwnership(lead, currentUser);

  return lead;

};

/**
 * =====================================================
 * Update Lead
 * =====================================================
 */

export const updateLeadService = async (
  id,
  leadData,
  currentUser,
  req
) => {

  const client = await pool.connect();

  try {

    await client.query("BEGIN");

    const lead =
      await findLeadByIdRepository(id);

    if (!lead) {

      throw new ApiError(
        404,
        "Lead not found."
      );

    }

    /* Duplicate Email */

    if (
      leadData.email &&
      leadData.email !== lead.email
    ) {

      const existingEmail =
        await findLeadByEmailRepository(
          leadData.email
        );

      if (existingEmail) {

        throw new ApiError(
          409,
          "Lead email already exists."
        );

      }

    }

    /* Duplicate Mobile */

    if (
      leadData.mobile &&
      leadData.mobile !== lead.mobile
    ) {

      const existingMobile =
        await findLeadByMobileRepository(
          leadData.mobile
        );

      if (existingMobile) {

        throw new ApiError(
          409,
          "Lead mobile already exists."
        );

      }

    }

    const updatedLead =
      await updateLeadRepository(
        client,
        id,
        {
          ...lead,
          ...leadData,
          updated_by: currentUser.id,
        }
      );

    auditLogger({

      action: "LEAD_UPDATED",

      module: "LEAD",

      userId: currentUser.id,

      role: currentUser.role,

      entityId: id,

      requestId: req.requestId,

      ip: req.ip,

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

/**
 * =====================================================
 * Soft Delete Lead
 * =====================================================
 */

export const deleteLeadService = async (
  id,
  currentUser,
  req
) => {

  const client = await pool.connect();

  try {

    await client.query("BEGIN");

    const lead =
      await findLeadByIdRepository(id);

    if (!lead) {

      throw new ApiError(
        404,
        "Lead not found."
      );

    }

    const deletedLead =
      await deleteLeadRepository(
        client,
        id,
        currentUser.id
      );

    auditLogger({

      action: "LEAD_DELETED",

      module: "LEAD",

      userId: currentUser.id,

      role: currentUser.role,

      entityId: id,

      requestId: req.requestId,

      ip: req.ip,

    });

    await client.query("COMMIT");

    return deletedLead;

  } catch (error) {

    await client.query("ROLLBACK");

    throw error;

  } finally {

    client.release();

  }

};

/**
 * =====================================================
 * Restore Lead
 * =====================================================
 */

export const restoreLeadService = async (
  id,
  currentUser,
  req
) => {

  const client = await pool.connect();

  try {

    await client.query("BEGIN");

    const restoredLead =
      await restoreLeadRepository(
        client,
        id,
        currentUser.id
      );

    if (!restoredLead) {

      throw new ApiError(
        404,
        "Lead not found."
      );

    }

    auditLogger({

      action: "LEAD_RESTORED",

      module: "LEAD",

      userId: currentUser.id,

      role: currentUser.role,

      entityId: id,

      requestId: req.requestId,

      ip: req.ip,

    });

    await client.query("COMMIT");

    return restoredLead;

  } catch (error) {

    await client.query("ROLLBACK");

    throw error;

  } finally {

    client.release();

  }

};

/**
 * =====================================================
 * Lead Statistics
 *
 * NOTE: getLeadStatisticsRepository is currently global
 * (no scoping parameter). currentUser is accepted here
 * so per-counsellor statistics can be added later, but
 * today this still returns company-wide numbers to
 * anyone who can reach the route - the route itself
 * needs a role check (see leadRoutes.js audit notes)
 * until per-user stats queries are built.
 * =====================================================
 */

export const getLeadStatisticsService = async (currentUser) => {

  return await getLeadStatisticsRepository();

};

/**
 * =====================================================
 * Assign Lead
 * =====================================================
 */

export const assignLeadService = async (
  leadId,
  employeeId,
  currentUser,
  req,
  remarks = null,
  assignmentType = null,
  priority = null
) => {

  const client = await pool.connect();

  try {

    await client.query("BEGIN");

    const lead =
      await findLeadByIdRepository(leadId);

    if (!lead) {

      throw new ApiError(
        404,
        "Lead not found."
      );

    }

    const employee =
      await findEmployeeByIdRepository(employeeId);

    if (!employee) {

      throw new ApiError(
        404,
        "Employee not found."
      );

    }

    const updatedLead =
      await assignLeadRepository(
        client,
        leadId,
        employeeId,
        currentUser.id
      );

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
        assigned_by: currentUser.id,
        assigned_to: employeeId,
        previous_assigned_to: lead.assigned_to,
        remarks: formattedRemarks || null,
      }
    );

    await addTimelineEventService({
      leadId,
      employeeId,
      activityType: TIMELINE_ACTIVITY.LEAD_ASSIGNED,
      title: "Lead Assigned",
      description: `Lead assigned to ${employee.full_name}.`,
    }, client);

    auditLogger({
      action: "LEAD_ASSIGNED",
      module: "LEAD",
      userId: currentUser.id,
      role: currentUser.role,
      entityId: leadId,
      requestId: req.requestId,
      ip: req.ip,
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

/**
 * =====================================================
 * Update Lead Status
 * =====================================================
 */

export const updateLeadStatusService = async (
  leadId,
  status,
  feedback,
  currentUser,
  req
) => {

  const client = await pool.connect();

  try {

    await client.query("BEGIN");

    const lead =
      await findLeadByIdRepository(leadId);

    if (!lead) {

      throw new ApiError(
        404,
        "Lead not found."
      );

    }

    if (
      status === "REJECTED" &&
      (!feedback || !feedback.trim())
    ) {
      throw new ApiError(
        400,
        "Feedback is required when rejecting a lead."
      );
    }

    const updatedLead =
      await updateLeadStatusRepository(
        client,
        leadId,
        status,
        feedback,
        currentUser.id
      );

    await addTimelineEventService({
      leadId,
      employeeId: lead.assigned_to,
      activityType: TIMELINE_ACTIVITY.STATUS_CHANGED,
      title: "Lead Status Updated",
      description:
        status === "REJECTED"
          ? `Lead rejected. Reason: ${feedback}`
          : `Status changed from ${lead.status} to ${status}.`,
      oldValue: lead.status,
      newValue: status,
    }, client);

    auditLogger({

      action: "LEAD_STATUS_UPDATED",

      module: "LEAD",

      userId: currentUser.id,

      role: currentUser.role,

      entityId: leadId,

      requestId: req.requestId,

      ip: req.ip,

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

/**
 * =====================================================
 * Add Lead Note
 * =====================================================
 */

export const addLeadNoteService = async (
  leadId,
  note,
  currentUser,
  req
) => {

  const client = await pool.connect();

  try {

    await client.query("BEGIN");

    const lead =
      await findLeadByIdRepository(leadId);

    if (!lead) {

      throw new ApiError(
        404,
        "Lead not found."
      );

    }

    const newNote =
      await addLeadNoteRepository(

        client,

        leadId,

        note,

        currentUser.id

      );

    await addTimelineEventService({
      leadId,
      employeeId: currentUser.id,
      activityType: TIMELINE_ACTIVITY.NOTE_ADDED,
      title: "Lead Note Added",
      description: note,
    }, client);

    auditLogger({

      action: "LEAD_NOTE_ADDED",

      module: "LEAD",

      userId: currentUser.id,

      role: currentUser.role,

      entityId: leadId,

      requestId: req.requestId,

      ip: req.ip,

    });

    await client.query("COMMIT");

    return newNote;

  } catch (error) {

    await client.query("ROLLBACK");

    throw error;

  } finally {

    client.release();

  }

};

/**
 * =====================================================
 * Get Lead Notes
 *
 * SECURITY: ownership-checked for Counsellor role,
 * same as getLeadByIdService.
 * =====================================================
 */

export const getLeadNotesService = async (
  leadId,
  currentUser
) => {

  const lead =
    await findLeadByIdRepository(leadId);

  if (!lead) {

    throw new ApiError(
      404,
      "Lead not found."
    );

  }

  await assertLeadOwnership(lead, currentUser);

  return await getLeadNotesRepository(
    leadId
  );

};

/**
 * =====================================================
 * Get Lead Timeline
 *
 * SECURITY: ownership-checked for Counsellor role,
 * same as getLeadByIdService.
 * =====================================================
 */

export const getLeadTimelineService = async (
  leadId,
  currentUser
) => {

  const lead =
    await findLeadByIdRepository(
      leadId
    );

  if (!lead) {

    throw new ApiError(
      404,
      "Lead not found."
    );

  }

  await assertLeadOwnership(lead, currentUser);

  return await getLeadTimelineRepository(
    leadId
  );

};

// =====================================================
// Bulk Assign Leads Service
//
// NOTE: req is now accepted and its requestId/ip are
// threaded into the audit log, matching every other
// action in this file. Previously this call hardcoded
// requestId: null, ip: null, which meant bulk
// assignment - the single most consequential action
// available, since it touches many leads at once - had
// the weakest audit trail of any write operation.
// =====================================================

export const assignBulkLeadsService = async (
  payload,
  currentUser,
  req
) => {

  const client = await pool.connect();

  try {

    await client.query("BEGIN");

    const {
      lead_ids,
      employee_id,
      remarks = null,
      assignment_type = null,
      priority = null,
    } = payload;

    const existingLeadsResult = await client.query(
      `SELECT id, assigned_to FROM leads WHERE id = ANY($1::bigint[]) AND is_deleted = FALSE;`,
      [lead_ids]
    );

    const previousAssignments = Object.fromEntries(
      existingLeadsResult.rows.map((row) => [
        String(row.id),
        row.assigned_to,
      ])
    );

    const result = await assignBulkLeadsRepository(
      client,
      {
        lead_ids,
        employee_id,
        updated_by: currentUser.id,
      }
    );

    const formattedRemarks = [
      remarks,
      assignment_type ? `Type: ${assignment_type}` : null,
      priority ? `Priority: ${priority}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    await Promise.all(
      result.leads.map((lead) =>
        createAssignmentHistoryRepository(
          client,
          {
            lead_id: lead.id,
            assigned_by: currentUser.id,
            assigned_to: employee_id,
            previous_assigned_to:
              previousAssignments[String(lead.id)] || null,
            remarks: formattedRemarks || null,
          }
        )
      )
    );

    await Promise.all(
      result.leads.map((lead) =>
        addTimelineEventService({
          leadId: lead.id,
          employeeId: employee_id,
          activityType: TIMELINE_ACTIVITY.LEAD_ASSIGNED,
          title: "Lead Assigned",
          description: `Lead assigned to employee ID ${employee_id}.`,
        }, client)
      )
    );

    auditLogger({
      action: "LEAD_BULK_ASSIGNED",
      module: "LEAD",
      userId: currentUser.id,
      role: currentUser.role,
      entityId: null,
      requestId: req?.requestId || null,
      ip: req?.ip || null,
    });

    await client.query("COMMIT");

    return result;

  } catch (error) {

    await client.query("ROLLBACK");

    throw error;

  } finally {

    client.release();

  }

};