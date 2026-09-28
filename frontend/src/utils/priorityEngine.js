/**
 * Automated Lead Priority Engine
 * 
 * Rules:
 * - HIGH Priority: Walked In / WALK_IN_SCHEDULED / QUALIFIED / INTERESTED
 * - MEDIUM Priority: FOLLOW_UP / FOLLOW_UP_REQUIRED
 * - LOW Priority: CONTACTED / NOT_CONTACTED / NEW / PENDING / LOST / REJECTED / ENROLLED / ADMISSION_DONE
 */

export const calculateLeadPriority = (status) => {
  if (!status) return "MEDIUM";

  const normalized = String(status).trim().toUpperCase().replace(/\s+/g, "_");

  // HIGH Priority: INTERESTED, WALK_IN
  const highStatuses = [
    "INTERESTED",
    "WALK_IN",
    "WALKIN",
    "VISITED",
    "WALKED_IN",
    "QUALIFIED",
  ];

  // MEDIUM Priority: FOLLOW_UP
  const mediumStatuses = [
    "FOLLOW_UP",
    "FOLLOW_UP_REQUIRED",
    "FOLLOWUP",
    "CONTACTED",
  ];

  // LOW Priority: ENROLLED, NOT_INTERESTED
  const lowStatuses = [
    "ENROLLED",
    "NOT_INTERESTED",
    "NOTINTERESTED",
    "LOST",
    "REJECTED",
    "ADMISSION_DONE",
  ];

  if (highStatuses.includes(normalized)) {
    return "HIGH";
  }

  if (mediumStatuses.includes(normalized)) {
    return "MEDIUM";
  }

  if (lowStatuses.includes(normalized)) {
    return "LOW";
  }

  return "MEDIUM";
};

export const getPriorityBadgeClass = (priority) => {
  const p = String(priority || "LOW").toUpperCase();
  switch (p) {
    case "HIGH":
    case "URGENT":
      return "priority-badge-high";
    case "MEDIUM":
      return "priority-badge-medium";
    case "LOW":
    default:
      return "priority-badge-low";
  }
};

export const getStatusBadgeClass = (status) => {
  const s = String(status || "NEW").toUpperCase().replace(/[-\s]+/g, "_");
  switch (s) {
    case "INTERESTED":
      return "status-badge-interested";
    case "FOLLOW_UP":
    case "FOLLOW_UP_REQUIRED":
    case "FOLLOWUP":
      return "status-badge-followup";
    case "VISITED":
    case "WALKED_IN":
    case "WALK_IN":
      return "status-badge-visited";
    case "ENROLLED":
    case "ADMISSION_DONE":
    case "ADMITTED":
      return "status-badge-enrolled";
    case "NOT_INTERESTED":
    case "NOTINTERESTED":
    case "LOST":
    case "REJECTED":
      return "status-badge-not-interested";
    case "NEW":
    default:
      return "status-badge-new";
  }
};
