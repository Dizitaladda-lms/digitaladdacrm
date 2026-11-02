class ApiError extends Error {
  constructor(
    statusCode,
    message = "Internal Server Error",
    code = null
  ) {
    super(message);

    this.success = false;
    this.statusCode = statusCode;
    if (code) {
      this.code = code;
    }

    Error.captureStackTrace(this, this.constructor);
  }
}

export default ApiError;