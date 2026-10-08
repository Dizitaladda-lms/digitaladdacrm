import ApiError from "../utils/ApiError.js";

const DEVICE_ADMIN_ROLES = new Set(["ADMIN", "HR", "SUPER_ADMIN"]);

const deviceAdminMiddleware = (req, _res, next) => {
  if (!DEVICE_ADMIN_ROLES.has(String(req.user?.role || "").toUpperCase())) {
    return next(new ApiError(403, "Only HR or an administrator may manage employee devices."));
  }
  return next();
};

export default deviceAdminMiddleware;
