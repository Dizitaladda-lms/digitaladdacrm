import pool from "../config/db.js";
import ROLES from "../constants/roles.js";
import { findEmployeeByUserIdRepository } from "../repositories/employeeRepository.js";
import ApiError from "../utils/ApiError.js";

const MAX_BROADCAST_LEADS = 250;

/**
 * Fetch leads a user is allowed to contact in a bulk broadcast.
 * Counsellors are deliberately limited to leads assigned to their employee
 * profile; this protects the endpoint even if a client submits altered IDs.
 */
export const getAuthorizedBroadcastLeads = async ({ leadIds, currentUser = {} }) => {
  const normalizedIds = [...new Set((leadIds || []).map((id) => Number(id)))];

  if (
    normalizedIds.length === 0 ||
    normalizedIds.some((id) => !Number.isSafeInteger(id) || id <= 0)
  ) {
    throw new ApiError(400, "Please select valid leads to broadcast.");
  }

  if (normalizedIds.length > MAX_BROADCAST_LEADS) {
    throw new ApiError(400, `A broadcast can include at most ${MAX_BROADCAST_LEADS} leads.`);
  }

  const role = String(currentUser.role || "").toUpperCase();
  if (![ROLES.ADMIN, ROLES.COUNSELLOR].includes(role)) {
    throw new ApiError(403, "You are not authorized to send bulk messages.");
  }

  const employee = currentUser.id
    ? await findEmployeeByUserIdRepository(currentUser.id)
    : null;

  if (role === ROLES.COUNSELLOR && !employee) {
    throw new ApiError(403, "Your counsellor profile is not linked. Please contact an admin.");
  }

  const query = `
    SELECT id, full_name, mobile, email, domain, interested_course, preferred_centre, assigned_to
    FROM leads
    WHERE id = ANY($1::bigint[])
      AND is_deleted = FALSE
      ${role === ROLES.COUNSELLOR ? "AND assigned_to = $2" : ""}
  `;
  const values = role === ROLES.COUNSELLOR
    ? [normalizedIds, employee.id]
    : [normalizedIds];
  const { rows } = await pool.query(query, values);

  if (rows.length !== normalizedIds.length) {
    if (role === ROLES.COUNSELLOR) {
      throw new ApiError(403, "You can message only leads assigned to you.");
    }
    throw new ApiError(404, "One or more selected leads are no longer active.");
  }

  return {
    leads: rows,
    employeeId: employee?.id || null,
  };
};
