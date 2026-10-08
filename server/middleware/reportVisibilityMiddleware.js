import ApiError from "../utils/ApiError.js";
import { getReportVisibilityScope } from "../services/reportVisibilityPolicy.js";

const reportVisibilityMiddleware = async (req, _res, next) => {
  try {
    if (!req.user) throw new ApiError(401, "Authentication is required.");
    req.reportVisibility = await getReportVisibilityScope(req.user);
    return next();
  } catch (error) {
    return next(error);
  }
};

export default reportVisibilityMiddleware;
