import app from "./app.js";
import pool from "./config/db.js";
import { initDatabaseSchema } from "./config/dbInit.js";
import logger from "./utils/logger.js";

const PORT = process.env.PORT || 5000;

let server;

const startServer = async () => {
  try {
    await initDatabaseSchema();

    server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Database initialization failed on startup.", {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};

startServer();

/**
 * =====================================================
 * Graceful Shutdown
 * =====================================================
 */

const gracefulShutdown = async (signal) => {

  logger.info(`${signal} received. Shutting down server...`);

  if (!server) {
    try {
      await pool.end();
      logger.info("✅ Database disconnected.");
      process.exit(0);
      return;
    } catch (error) {
      logger.error(error);
      process.exit(1);
      return;
    }
  }

  server.close(async () => {

    try {

      await pool.end();

      logger.info("✅ Database disconnected.");

      logger.info("✅ Server stopped successfully.");

      process.exit(0);

    } catch (error) {

      logger.error(error);

      process.exit(1);

    }

  });

};

/**
 * Ctrl + C
 */

process.on("SIGINT", () => {
  gracefulShutdown("SIGINT");
});

/**
 * Docker / Render
 */

process.on("SIGTERM", () => {
  gracefulShutdown("SIGTERM");
});

/**
 * Unhandled Promise
 */

process.on("unhandledRejection", (error) => {

  logger.error(error);

  gracefulShutdown("UNHANDLED_REJECTION");

});

/**
 * Unexpected Exception
 */

process.on("uncaughtException", (error) => {

  logger.error(error);

  gracefulShutdown("UNCAUGHT_EXCEPTION");

});