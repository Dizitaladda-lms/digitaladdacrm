/**
 * Lead Priority Automation Service
 * 
 * Rules:
 * 1. HIGH: High-intent / Actionable statuses (INTERESTED, VISITED, QUALIFIED, WALK_IN_SCHEDULED, WALKED_IN)
 * 2. MEDIUM: Follow-up statuses (FOLLOW_UP, FOLLOW_UP_REQUIRED)
 * 3. LOW: Enrolled, Not Interested, New, Contacted, Lost (ENROLLED, NOT_INTERESTED, NEW, CONTACTED, LOST, REJECTED, ADMISSION_DONE, COMPLETED)
 */

export const calculateLeadPriority = ({ status }) => {
  const normStatus = (status || "").toUpperCase();

  // HIGH Priority: INTERESTED, WALK_IN
  if (
    [
      "INTERESTED",
      "WALK_IN",
      "WALKIN",
      "VISITED",
      "QUALIFIED",
    ].includes(normStatus)
  ) {
    return "HIGH";
  }

  // MEDIUM Priority: FOLLOW_UP
  if (
    [
      "FOLLOW_UP",
      "FOLLOW_UP_REQUIRED",
      "FOLLOWUP",
      "CONTACTED",
    ].includes(normStatus)
  ) {
    return "MEDIUM";
  }

  // LOW Priority: ENROLLED, NOT_INTERESTED
  if (
    [
      "ENROLLED",
      "NOT_INTERESTED",
      "NEW",
      "PENDING",
      "LOST",
      "REJECTED",
      "ADMISSION_DONE",
      "COMPLETED",
    ].includes(normStatus)
  ) {
    return "LOW";
  }

  return "MEDIUM";
};
