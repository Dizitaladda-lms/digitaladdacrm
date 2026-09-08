import {
  addTimelineEventRepository,
  getLeadTimelineRepository,
} from "../repositories/leadTimeline.repository.js";

/**
 * =====================================================
 * Add Timeline Event
 * =====================================================
 */
export const addTimelineEventService = async ({
  leadId,
  employeeId,
  activityType,
  title,
  description,
  oldValue,
  newValue,
}, clientOrPool) => {

  if (!leadId) {
    throw new Error("Lead ID is required.");
  }

  if (!activityType) {
    throw new Error("Activity Type is required.");
  }

  if (!title) {
    throw new Error("Timeline title is required.");
  }

  return await addTimelineEventRepository({
    leadId,
    employeeId,
    activityType,
    title,
    description,
    oldValue,
    newValue,
  }, clientOrPool);
};

/**
 * =====================================================
 * Get Lead Timeline
 * =====================================================
 */
export const getLeadTimelineService = async (leadId) => {

  if (!leadId) {
    throw new Error("Lead ID is required.");
  }

  return await getLeadTimelineRepository(leadId);
};