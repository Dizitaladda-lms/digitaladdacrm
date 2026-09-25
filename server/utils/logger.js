import winston from "winston";

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const isProduction = process.env.NODE_ENV === "production";

const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp(),
      isProduction
        ? winston.format.json()
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
              const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
              return `[${timestamp}] [${level}]: ${stack || message}${metaStr}`;
            })
          )
    ),
  }),
];

// In serverless environments (e.g. Vercel, AWS Lambda), the filesystem is read-only.
// File-based logging is only enabled for local development outside serverless.
if (!isServerless && !isProduction) {
  try {
    transports.push(
      new winston.transports.File({
        filename: "logs/error.log",
        level: "error",
      }),
      new winston.transports.File({
        filename: "logs/combined.log",
      })
    );
  } catch (err) {
    console.warn("Winston file transport initialization skipped:", err.message);
  }
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({
      stack: true,
    }),
    winston.format.json()
  ),
  defaultMeta: {
    service: "DizitalAdda-CRM-Backend",
  },
  transports,
});

export default logger;