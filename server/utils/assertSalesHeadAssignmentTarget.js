import ApiError from "./ApiError.js";

const assertSalesHeadAssignmentTarget = (role, employee) => {
  if (
    String(role || "").toUpperCase() === "SALES_HEAD" &&
    (
      String(employee?.role || "").toUpperCase() !== "COUNSELLOR" ||
      String(employee?.status || "").toUpperCase() !== "ACTIVE"
    )
  ) {
    throw new ApiError(403, "Sales Heads can assign leads only to active counsellors.");
  }
};

export default assertSalesHeadAssignmentTarget;
