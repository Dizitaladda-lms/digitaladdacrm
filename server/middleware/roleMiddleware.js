import ApiError from "../utils/ApiError.js";

const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(
        new ApiError(
          401,
          "Unauthorized"
        )
      );
    }

    const userRole = String(req.user.role || "").trim().toUpperCase();
    const normalizedAllowed = allowedRoles.map((r) => String(r || "").trim().toUpperCase());

    // Allow ADMIN and MANAGER interchangeably for operational routes
    if (normalizedAllowed.includes("MANAGER") && !normalizedAllowed.includes("ADMIN")) {
      normalizedAllowed.push("ADMIN");
    }
    if (normalizedAllowed.includes("ADMIN") && !normalizedAllowed.includes("MANAGER")) {
      normalizedAllowed.push("MANAGER");
    }

    // Super Admin retains access to every Manager/Admin capability; individual
    // routes can still be explicitly limited to SUPER_ADMIN.
    const isSuperAdmin = userRole === "SUPER_ADMIN";

    if (!isSuperAdmin && !normalizedAllowed.includes(userRole)) {
      return next(
        new ApiError(
          403,
          "You are not authorized to perform this action"
        )
      );
    }

    next();
  };
};

export default roleMiddleware;
