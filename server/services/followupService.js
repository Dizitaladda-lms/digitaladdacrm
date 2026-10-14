/* ============================================================================
 * FOLLOW-UP SERVICE
 * Business Logic Layer
 * ============================================================================
 */

import { withTransaction } from "../config/db.js";
import ApiError from "../utils/ApiError.js";

import {
  createFollowupRepository,
  updateFollowupRepository,
  softDeleteFollowupRepository,
  restoreFollowupRepository,
  completeFollowupRepository,
  rescheduleFollowupRepository,
  findFollowupByIdRepository,
  getFollowupsRepository,
  getFollowupStatisticsRepository,
  getFollowupTimelineRepository,
  checkPendingFollowupRepository,
  checkFollowupOwnershipRepository,
  bulkCompleteFollowupsRepository,
bulkSoftDeleteFollowupsRepository,
bulkRestoreFollowupsRepository,
bulkAssignFollowupsRepository,
} from "../repositories/followupRepository.js";

import {
  findLeadByIdRepository,
  updateLeadStatusRepository,
} from "../repositories/leadRepository.js";

import {
  findEmployeeByIdRepository,
} from "../repositories/employeeRepository.js";

import {
  createLeadActivityRepository,
} from "../repositories/activityRepository.js";


/* ============================================================================
 * CONSTANTS
 * ============================================================================
 */

const FOLLOWUP_STATUS = Object.freeze({
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  MISSED: "MISSED",
  CANCELLED: "CANCELLED",
});

const FOLLOWUP_PRIORITY = Object.freeze({
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
});

const FOLLOWUP_OUTCOME = Object.freeze({
  INTERESTED: "INTERESTED",
  NOT_INTERESTED: "NOT_INTERESTED",
  CALLBACK: "CALLBACK",
  NO_RESPONSE: "NO_RESPONSE",
  ADMISSION_DONE: "ADMISSION_DONE",
});

const USER_ROLE = Object.freeze({
  ADMIN: "ADMIN",
  COUNSELLOR: "COUNSELLOR",
});

/**
 * Validate employee existence.
 */
async function validateEmployee(employeeId, client = null) {
  if (!employeeId) {
    throw new ApiError(400, "Employee ID is required.");
  }

  const employee = await findEmployeeByIdRepository(employeeId, client);

  if (!employee) {
    throw new ApiError(404, "Employee not found.");
  }

  return employee;
}

/**
 * Validate follow-up existence.
 */
async function validateFollowup(
  followupId,
  client = null,
  includeDeleted = false
) {
  if (!followupId) {
    throw new ApiError(400, "Follow-up ID is required.");
  }

  const followup = await findFollowupByIdRepository(
    followupId,
    client,
    includeDeleted
  );

  if (!followup) {
    throw new ApiError(404, "Follow-up not found.");
  }

  return followup;
}

/**
 * Verify follow-up ownership.
 */
async function verifyOwnership(followupId, currentUser, client = null) {
  if (!currentUser) {
    throw new ApiError(401, "Authentication required.");
  }

  // Admin / Manager / Sales Head bypass
  if (
    currentUser.role === USER_ROLE.ADMIN ||
    ["ADMIN", "MANAGER", "SUPER_ADMIN", "SALES_HEAD"].includes(currentUser.role) ||
    Boolean(currentUser.is_sales_head)
  ) {
    return true;
  }

  if (!currentUser.employee_id) {
    throw new ApiError(401, "Employee information not found.");
  }

  const isOwner = await checkFollowupOwnershipRepository(
    followupId,
    currentUser.employee_id
  );

  if (!isOwner) {
    throw new ApiError(
      403,
      "You are not authorized to perform this action."
    );
  }

  return true;
}

/**
 * Validate pending follow-up.
 */
async function validatePendingFollowup(
  leadId,
  client = null
) {
  if (!leadId) {
    throw new ApiError(
      400,
      "Lead ID is required."
    );
  }

  const hasPendingFollowup =
    await checkPendingFollowupRepository(
      leadId,
      client
    );

  if (hasPendingFollowup) {
    throw new ApiError(
      409,
      "A pending follow-up already exists for this lead."
    );
  }

  return true;
}

/**
 * Validate Lead Assignment
 */
function validateLeadAssignment(lead, employeeId) {

  if (!lead) {
    throw new ApiError(404, "Lead not found.");
  }

  if (!employeeId) {
    throw new ApiError(400, "Employee ID is required.");
  }

  if (Number(lead.assigned_to) !== Number(employeeId)) {
    throw new ApiError(
      400,
      "This lead is not assigned to the selected employee."
    );
  }

  return true;
}

/**
 * Synchronize lead status based on follow-up outcome.
 */
async function syncLeadStatus(
  leadId,
  outcome,
  updatedBy,
  client = null
) {
  if (!leadId) {
    throw new ApiError(400, "Lead ID is required.");
  }

  if (!updatedBy) {
    throw new ApiError(400, "Updated by is required.");
  }

  const statusMap = {
    [FOLLOWUP_OUTCOME.INTERESTED]: "QUALIFIED",
    [FOLLOWUP_OUTCOME.CALLBACK]: "FOLLOW_UP",
    [FOLLOWUP_OUTCOME.NO_RESPONSE]: "FOLLOW_UP",
    [FOLLOWUP_OUTCOME.NOT_INTERESTED]: "LOST",
    [FOLLOWUP_OUTCOME.ADMISSION_DONE]: "ADMISSION_DONE",
  };

  const leadStatus = statusMap[outcome];

  if (!leadStatus) {
    throw new ApiError(
      400,
      "Invalid follow-up outcome."
    );
  }

  return await updateLeadStatusRepository(
    client,
    leadId,
    leadStatus,
    updatedBy
  );
}

async function validateLead(leadId, client = null) {
  if (!leadId) {
    throw new ApiError(400, "Lead ID is required.");
  }

  const lead = await findLeadByIdRepository(leadId);

  if (!lead) {
    throw new ApiError(404, "Lead not found.");
  }

  return lead;
}

/**
 * Create activity log.
 */
async function createActivityLog(
  activity,
  client = null
) {
  const {
    leadId,
    action,
    description = null,
    createdBy,
  } = activity;

  if (!leadId) {
    throw new ApiError(400, "Lead ID is required.");
  }

  if (!action) {
    throw new ApiError(400, "Activity action is required.");
  }

  if (!createdBy) {
    throw new ApiError(400, "Created by is required.");
  }

  return await createLeadActivityRepository(
  client,
  {
    lead_id: leadId,
    activity: action,
    description,
    performed_by: createdBy,
  }
);
}

async function validateBulkFollowupIds(followupIds) {

  if (!Array.isArray(followupIds) || followupIds.length === 0) {
    throw new ApiError(
      400,
      "At least one follow-up ID is required."
    );
  }

  const uniqueIds = [...new Set(followupIds)];

  return uniqueIds;
}

/**
 * ============================================================================
 * Create Follow-up
 * ============================================================================
 */
export async function createFollowupService(
  payload,
  currentUser
) {
  return await withTransaction(async (client) => {

    const lead = await validateLead(
      payload.lead_id,
      client
    );

    await validateEmployee(
      payload.employee_id,
      client
    );

    const isSalesHeadOrAdmin =
      ["ADMIN", "MANAGER", "SUPER_ADMIN", "SALES_HEAD"].includes(currentUser.role) ||
      Boolean(currentUser.is_sales_head);

    if (!isSalesHeadOrAdmin) {
      validateLeadAssignment(
        lead,
        payload.employee_id
      );
    }

    await validatePendingFollowup(
      payload.lead_id,
      client
    );

    const followupData = {
      ...payload,
      status: FOLLOWUP_STATUS.PENDING,
      created_by: currentUser.id,
    };

    const followup = await createFollowupRepository(
      client,
      followupData
    );

    await createActivityLog(
      {
        leadId: payload.lead_id,
        action: "FOLLOWUP_CREATED",
        description: "Follow-up created successfully.",
        createdBy: currentUser.id,
      },
      client
    );

    return followup;
  });
}

/**
 * ============================================================================
 * Get All Follow-ups
 *
 * SECURITY FIX (see audit notes):
 * Previously took no currentUser at all - every
 * Counsellor could list every follow-up in the system,
 * not just their own, via GET /followups. Now forces
 * filters.employeeId to the requesting Counsellor's own
 * employee_id, overriding anything sent by the client.
 * Admins are unaffected and see everything, matching the
 * pattern already used for leads.
 *
 * Relies on currentUser.employee_id, which is now
 * resolved centrally in authMiddleware.js (see that
 * file's audit notes) rather than looked up again here.
 * ============================================================================
 */
import { ensureEmployeeProfileForUser } from "./ensureEmployeeProfile.service.js";

export async function getAllFollowupsService(
  filters = {},
  currentUser
) {
  const scopedFilters = { ...filters };

  if (currentUser && (currentUser.role === USER_ROLE.COUNSELLOR || currentUser.role === "COUNSELLOR")) {
    let empId = currentUser.employee_id;
    if (!empId && currentUser.id) {
      const emp = await ensureEmployeeProfileForUser(currentUser.id);
      empId = emp ? emp.id : null;
    }

    if (empId) {
      scopedFilters.employeeId = empId;
    }
  }

  return await getFollowupsRepository(
    scopedFilters
  );
}


/**
 * ============================================================================
 * Get Follow-up By ID
 * ============================================================================
 */
export async function getFollowupByIdService(
  followupId,
  currentUser
) {

  const followup = await validateFollowup(
    followupId
  );

  await verifyOwnership(
    followupId,
    currentUser
  );

  return followup;

}

/**
 * ============================================================================
 * Update Follow-up
 * ============================================================================
 */
export async function updateFollowupService(
  followupId,
  payload,
  currentUser
) {
  return await withTransaction(async (client) => {

    const followup = await validateFollowup(
      followupId,
      client,
      true
    );

    await validateEmployee(
      payload.employee_id,
      client
    );

    await verifyOwnership(
      followupId,
      currentUser,
      client
    );

    const updateData = {
      ...payload,
      updated_by: currentUser.id,
    };

    const updatedFollowup =
      await updateFollowupRepository(
        client,
        followupId,
        updateData
      );

    await createActivityLog(
      {
        leadId: followup.lead_id,
        action: "FOLLOWUP_UPDATED",
        description: "Follow-up updated successfully.",
        createdBy: currentUser.id,
      },
      client
    );

    return updatedFollowup;
  });
}

/**
 * ============================================================================
 * Reschedule Follow-up
 * ============================================================================
 */
export async function rescheduleFollowupService(
  followupId,
  payload,
  currentUser
) {
  return await withTransaction(async (client) => {

    const followup = await validateFollowup(
      followupId,
      client
    );

    await verifyOwnership(
      followupId,
      currentUser,
      client
    );

    if (followup.status !== FOLLOWUP_STATUS.PENDING) {
      throw new ApiError(
        400,
        "Only pending follow-ups can be rescheduled."
      );
    }

    if (!payload.next_followup_at) {
      throw new ApiError(
        400,
        "Next follow-up date is required."
      );
    }

    const nextFollowupDate = new Date(
      payload.next_followup_at
    );

    if (Number.isNaN(nextFollowupDate.getTime())) {
      throw new ApiError(
        400,
        "Invalid next follow-up date."
      );
    }

    if (nextFollowupDate <= new Date()) {
      throw new ApiError(
        400,
        "Next follow-up date must be in the future."
      );
    }

    const updatedFollowup =
      await rescheduleFollowupRepository(
        client,
        followupId,
        payload.next_followup_at,
        payload.remarks,
        currentUser.id
      );

    await createActivityLog(
      {
        leadId: followup.lead_id,
        action: "FOLLOWUP_RESCHEDULED",
        description: `Follow-up rescheduled to ${payload.next_followup_at}.`,
        createdBy: currentUser.id,
      },
      client
    );

    return updatedFollowup;

  });
}

/**
 * ============================================================================
 * Delete Follow-up
 * ============================================================================
 */
export async function deleteFollowupService(
  followupId,
  currentUser
) {
  return await withTransaction(async (client) => {

    const followup = await validateFollowup(
      followupId,
      client
    );

    await verifyOwnership(
      followupId,
      currentUser,
      client
    );

    if (followup.status === FOLLOWUP_STATUS.COMPLETED) {
      throw new ApiError(
        400,
        "Completed follow-ups cannot be deleted."
      );
    }

    const deletedFollowup =
      await softDeleteFollowupRepository(
        client,
        followupId,
        currentUser.id
      );

    await createActivityLog(
      {
        leadId: followup.lead_id,
        action: "FOLLOWUP_DELETED",
        description: "Follow-up deleted successfully.",
        createdBy: currentUser.id,
      },
      client
    );

    return deletedFollowup;

  });
}

/**
 * ============================================================================
 * Restore Follow-up
 * ============================================================================
 */
export async function restoreFollowupService(
  followupId,
  currentUser
) {
  return await withTransaction(async (client) => {

    const followup = await validateFollowup(
      followupId,
      client,
      true
    );

    if (!followup.is_deleted) {
      throw new ApiError(
        400,
        "Follow-up is already active."
      );
    }

    await verifyOwnership(
      followupId,
      currentUser,
      client
    );

    const restoredFollowup =
      await restoreFollowupRepository(
        client,
        followupId,
        currentUser.id
      );

    await createActivityLog(
      {
        leadId: followup.lead_id,
        action: "FOLLOWUP_RESTORED",
        description: "Follow-up restored successfully.",
        createdBy: currentUser.id,
      },
      client
    );

    return restoredFollowup;

  });
}

/**
 * ============================================================================
 * Get Follow-up Statistics
 * ============================================================================
 */
export async function getFollowupStatisticsService() {

  const statistics =
    await getFollowupStatisticsRepository();

  return statistics;

}

/**
 * ============================================================================
 * Get Lead Timeline
 * ============================================================================
 */
export async function getLeadTimelineService(
  leadId
) {

  await validateLead(
    leadId
  );

  const timeline =
    await getFollowupTimelineRepository(
      leadId
    );

  return timeline;

}

/**
 * ============================================================================
 * Complete Follow-up
 * ============================================================================
 */
export async function completeFollowupService(
  followupId,
  payload,
  currentUser
) {
  return await withTransaction(async (client) => {

    const followup = await validateFollowup(
      followupId,
      client
    );

    await verifyOwnership(
      followupId,
      currentUser,
      client
    );

    if (followup.status !== FOLLOWUP_STATUS.PENDING) {
      throw new ApiError(
        400,
        "Only pending follow-ups can be completed."
      );
    }

    if (!payload.outcome) {
      throw new ApiError(
        400,
        "Follow-up outcome is required."
      );
    }

    const completedFollowup =
      await completeFollowupRepository(
        client,
        followupId,
        payload.outcome,
        payload.remarks,
        currentUser.id
      );

    await syncLeadStatus(
      followup.lead_id,
      payload.outcome,
      currentUser.id,
      client
    );

    await createActivityLog(
      {
        leadId: followup.lead_id,
        action: "FOLLOWUP_COMPLETED",
        description: "Follow-up completed successfully.",
        createdBy: currentUser.id,
      },
      client
    );

    return completedFollowup;

  });
}

export async function bulkCompleteFollowupsService(
  payload,
  currentUser
) {
  return await withTransaction(async (client) => {

    const followupIds =
      await validateBulkFollowupIds(payload.followupIds);

    if (!payload.outcome) {
      throw new ApiError(
        400,
        "Follow-up outcome is required."
      );
    }

    const successfulIds = [];
    const failedIds = [];

    for (const followupId of followupIds) {

      try {

        const followup = await validateFollowup(
          followupId,
          client
        );

        await verifyOwnership(
          followupId,
          currentUser,
          client
        );

        if (followup.status === FOLLOWUP_STATUS.COMPLETED) {
          failedIds.push({
            id: followupId,
            reason: "Already completed."
          });
          continue;
        }

        await completeFollowupRepository(
          client,
          followupId,
          payload.outcome,
          payload.remarks,
          currentUser.id
        );

        await syncLeadStatus(
          followup.lead_id,
          payload.outcome,
          currentUser.id,
          client
        );

        await createActivityLog(
          {
            leadId: followup.lead_id,
            action: "FOLLOWUP_BULK_COMPLETED",
            description: "Bulk follow-up completed.",
            createdBy: currentUser.id,
          },
          client
        );

        successfulIds.push(followupId);

      } catch (error) {

        failedIds.push({
          id: followupId,
          reason: error.message,
        });

      }

    }

    return {
      processed: successfulIds.length,
      failed: failedIds.length,
      successfulIds,
      failedIds,
    };

  });
}

export async function bulkDeleteFollowupsService(
  payload,
  currentUser
) {
  return await withTransaction(async (client) => {

    const followupIds =
      await validateBulkFollowupIds(payload.followupIds);

    const successfulIds = [];
    const failedIds = [];

    for (const followupId of followupIds) {

      try {

        const followup = await validateFollowup(
          followupId,
          client
        );

        await verifyOwnership(
          followupId,
          currentUser,
          client
        );

        if (followup.is_deleted) {
          failedIds.push({
            id: followupId,
            reason: "Already deleted."
          });
          continue;
        }

        if (followup.status === FOLLOWUP_STATUS.COMPLETED) {
          failedIds.push({
            id: followupId,
            reason: "Completed follow-up cannot be deleted."
          });
          continue;
        }

        await softDeleteFollowupRepository(
          client,
          followupId,
          currentUser.id
        );

        await createActivityLog(
          {
            leadId: followup.lead_id,
            action: "FOLLOWUP_BULK_DELETED",
            description: "Bulk follow-up deleted.",
            createdBy: currentUser.id,
          },
          client
        );

        successfulIds.push(followupId);

      } catch (error) {

        failedIds.push({
          id: followupId,
          reason: error.message,
        });

      }

    }

    return {
      processed: successfulIds.length,
      failed: failedIds.length,
      successfulIds,
      failedIds,
    };

  });
}

export async function bulkRestoreFollowupsService(
  payload,
  currentUser
) {
  return await withTransaction(async (client) => {

    const followupIds =
      await validateBulkFollowupIds(payload.followupIds);

    const successfulIds = [];
    const failedIds = [];

    for (const followupId of followupIds) {

      try {

        const followup = await validateFollowup(
          followupId,
          client,
          true
        );

        await verifyOwnership(
          followupId,
          currentUser,
          client
        );

        if (!followup.is_deleted) {
          failedIds.push({
            id: followupId,
            reason: "Follow-up is already active."
          });
          continue;
        }

        await restoreFollowupRepository(
          client,
          followupId,
          currentUser.id
        );

        await createActivityLog(
          {
            leadId: followup.lead_id,
            action: "FOLLOWUP_BULK_RESTORED",
            description: "Bulk follow-up restored.",
            createdBy: currentUser.id,
          },
          client
        );

        successfulIds.push(followupId);

      } catch (error) {

        failedIds.push({
          id: followupId,
          reason: error.message,
        });

      }

    }

    return {
      processed: successfulIds.length,
      failed: failedIds.length,
      successfulIds,
      failedIds,
    };

  });
}

export async function bulkAssignFollowupsService(
  payload,
  currentUser
) {
  return await withTransaction(async (client) => {

    const followupIds =
      await validateBulkFollowupIds(payload.followupIds);

    await validateEmployee(
      payload.employeeId,
      client
    );

    const successfulIds = [];
    const failedIds = [];

    for (const followupId of followupIds) {

      try {

        const followup = await validateFollowup(
          followupId,
          client
        );

        await verifyOwnership(
          followupId,
          currentUser,
          client
        );

        if (followup.employee_id == payload.employeeId) {
          failedIds.push({
            id: followupId,
            reason: "Already assigned."
          });
          continue;
        }

        await updateFollowupRepository(
          client,
          followupId,
          {
            employee_id: payload.employeeId,
            updated_by: currentUser.id,
          }
        );

        await createActivityLog(
          {
            leadId: followup.lead_id,
            action: "FOLLOWUP_BULK_ASSIGNED",
            description: "Bulk follow-up assigned.",
            createdBy: currentUser.id,
          },
          client
        );

        successfulIds.push(followupId);

      } catch (error) {

        failedIds.push({
          id: followupId,
          reason: error.message,
        });

      }

    }

    return {
      processed: successfulIds.length,
      failed: failedIds.length,
      successfulIds,
      failedIds,
    };

  });
}