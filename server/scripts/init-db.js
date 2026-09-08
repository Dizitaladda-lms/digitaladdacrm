import dotenv from "dotenv";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import pool from "../config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, "../.env") });

import { existsSync } from "fs";

const dizitalAddaSql = resolve(__dirname, "../dizitaladda_crm.sql");
const fallbackSql = resolve(__dirname, "../iem_lms.sql");
const sqlFilePath = existsSync(dizitalAddaSql) ? dizitalAddaSql : fallbackSql;

const run = async () => {
  try {
    const sql = await fs.readFile(sqlFilePath, "utf8");
    const client = await pool.connect();

    try {
      await client.query(sql);
      console.log("✅ Database initialized successfully.");
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("❌ Database initialization failed:", error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

run();

