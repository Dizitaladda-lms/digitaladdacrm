import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();
if (!process.env.DATABASE_URL) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  dotenv.config({ path: path.resolve(__dirname, "../.env") });
}

import pkg from "pg";
import logger from "../utils/logger.js";
const { Pool } = pkg;

const rawConnectionString = process.env.DATABASE_URL || "";
const normalizedConnectionString = rawConnectionString
  .replace(/^DATABASE_URL\s*=\s*/, "")
  .trim()
  .replace(/^['"]|['"]$/g, "");

if (!normalizedConnectionString) {
  throw new Error("❌ DATABASE_URL is missing in environment variables.");
}

const isNeonOrCloud =
  normalizedConnectionString.includes("neon.tech") ||
  normalizedConnectionString.includes("pooler.supabase") ||
  process.env.DB_SSL === "true" ||
  process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: normalizedConnectionString,
  ssl: isNeonOrCloud ? { rejectUnauthorized: false } : undefined,
  max: process.env.VERCEL ? 3 : 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000,
});

pool.on("error", (error) => {
  logger.error("PostgreSQL pool client error; connection will be replaced.", {
    error: error.message,
    stack: error.stack,
  });
});

// In local development, verify connection once
if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  pool
    .connect()
    .then((client) => {
      console.log("✅ PostgreSQL (Neon) Connected Successfully");
      client.release();
    })
    .catch((err) => {
      console.error("❌ PostgreSQL Connection Error:", err.message);
    });
}

export async function query(text, params) {
  return pool.query(text, params);
}

export async function withTransaction(callback) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await callback(client);

    await client.query("COMMIT");

    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export default pool;
