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

    // Super Admin retains access to every Manager/Admin capability; individual
    // routes can still be explicitly limited to SUPER_ADMIN.
    const isSuperAdmin = req.user.role === "SUPER_ADMIN";

    if (!isSuperAdmin && !allowedRoles.includes(req.user.role)) {
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
