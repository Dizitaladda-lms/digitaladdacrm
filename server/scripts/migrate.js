import dotenv from "dotenv";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, resolve, join } from "path";
import pool from "../config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, "../.env") });

const migrationsDir = resolve(__dirname, "../migrations");

const runMigrations = async () => {
  console.log("🚀 Starting database migration runner...");
  const client = await pool.connect();

  try {
    // 1. Ensure migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Fetch list of already executed migrations
    const executedRes = await client.query(
      `SELECT filename FROM _migrations ORDER BY id ASC;`
    );
    const executedSet = new Set(executedRes.rows.map((r) => r.filename));

    // 3. Read all .sql files in migrations directory
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files
      .filter((f) => f.endsWith(".sql"))
      .sort(); // Run in chronological order

    console.log(`📂 Found ${sqlFiles.length} migration file(s) in server/migrations.`);

    let newlyApplied = 0;

    for (const filename of sqlFiles) {
      if (executedSet.has(filename)) {
        console.log(`⏭️  Skipped (already applied): ${filename}`);
        continue;
      }

      const filePath = join(migrationsDir, filename);
      const sqlContent = await fs.readFile(filePath, "utf8");

      console.log(`⏳ Applying: ${filename}...`);

      try {
        await client.query(sqlContent);
        await client.query(
          `INSERT INTO _migrations (filename) VALUES ($1);`,
          [filename]
        );
        console.log(`✅ Applied successfully: ${filename}`);
        newlyApplied++;
      } catch (migrationError) {
        console.error(`❌ Migration failed on: ${filename}`);
        console.error(`Reason:`, migrationError.message);
        throw migrationError;
      }
    }

    console.log(`\n🎉 Migration process complete! ${newlyApplied} new migration(s) applied.`);
  } catch (err) {
    console.error("\n💥 Database migration aborted with error:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

runMigrations();
