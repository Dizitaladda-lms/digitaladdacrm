import ApiError from "../utils/ApiError.js";
import errorLogger from "../utils/errorLogger.js";

const errorHandler = (
  err,
  req,
  res,
  next
) => {

  console.error("API ERROR:", req.method, req.path, err.code, err.message);

  errorLogger({
    error: err,
    req,
  });

  if (err instanceof ApiError) {
    const response = {
      success: false,
      statusCode: err.statusCode,
      message: err.message,
    };
    if (err.code) {
      response.code = err.code;
    }

    return res.status(err.statusCode).json(response);
  }

  return res.status(500).json({

    success: false,

    statusCode: 500,

    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal Server Error",

  });

};

export default errorHandler;