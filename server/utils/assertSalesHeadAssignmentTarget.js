import ApiError from "./ApiError.js";

const ALLOWED_TARGET_ROLES = ["COUNSELLOR", "SALES_HEAD", "MANAGER", "ADMIN"];

const assertSalesHeadAssignmentTarget = (role, employee) => {
  const normRole = String(role || "").toUpperCase();
  if (normRole !== "SALES_HEAD") {
    return;
  }

  const targetRole = String(employee?.role || "").toUpperCase();
  const targetStatus = String(employee?.status || "").toUpperCase();

  if (!ALLOWED_TARGET_ROLES.includes(targetRole) || targetStatus !== "ACTIVE") {
    throw new ApiError(403, "Sales Heads can assign leads only to active counsellors.");
  }
};

export default assertSalesHeadAssignmentTarget;
