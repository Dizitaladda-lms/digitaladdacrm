import pool from "../config/db.js";

/**
 * =====================================================
 * Health Check
 * =====================================================
 */

export const health = async (req, res) => {

  try {

    await pool.query("SELECT 1");

    return res.status(200).json({

      success: true,

      message: "Server is healthy.",

      data: {

        status: "UP",

        timestamp: new Date().toISOString(),

      },

    });

  } catch (error) {

    return res.status(500).json({

      success: false,

      message: "Health check failed.",

    });

  }

};

/**
 * =====================================================
 * Readiness Check
 * =====================================================
 */

export const readiness = async (req, res) => {

  try {

    await pool.query("SELECT 1");

    return res.status(200).json({

      success: true,

      status: "READY",

    });

  } catch {

    return res.status(503).json({

      success: false,

      status: "NOT_READY",

    });

  }

};

/**
 * =====================================================
 * Liveness Check
 * =====================================================
 */

export const liveness = (req, res) => {

  res.status(200).json({

    success: true,

    status: "ALIVE",

    uptime: process.uptime(),

  });

};
