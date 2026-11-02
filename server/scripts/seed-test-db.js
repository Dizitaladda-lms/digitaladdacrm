import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import pool from "../config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// 1. Strict production guard
if (process.env.NODE_ENV === "production") {
  console.error("❌ Refusing to seed test database in production environment (NODE_ENV=production).");
  process.exit(1);
}

// 2. Strict password requirement from environment (no hardcoded fallback)
const seedPassword = process.env.SEED_TEST_PASSWORD;
if (!seedPassword) {
  console.error("❌ Error: SEED_TEST_PASSWORD environment variable is required to seed test users.");
  console.error("   Example: SEED_TEST_PASSWORD='TestPassword#2026' node server/scripts/seed-test-db.js");
  process.exit(1);
}

const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || "ci-admin@example.com";
const TEST_COUNSELLOR_EMAIL = process.env.TEST_COUNSELLOR_EMAIL || "ci-counsellor@example.com";

async function seed() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Ensure code sequences exist
    await client.query(`CREATE SEQUENCE IF NOT EXISTS employee_code_seq START WITH 1001;`);
    await client.query(`CREATE SEQUENCE IF NOT EXISTS campaign_code_seq START WITH 1001;`);
    await client.query(`CREATE SEQUENCE IF NOT EXISTS lead_code_seq START WITH 1001;`);

    // Ensure departments exist for test employee assignments
    await client.query(`
      INSERT INTO departments (id, department_name, description, status)
      VALUES (1, 'Admissions & Sales', 'Admissions & Student Counselling', TRUE)
      ON CONFLICT (id) DO NOTHING;
    `);

    // Dynamically generate bcrypt hash at runtime using cost 12
    const hashedPassword = await bcrypt.hash(seedPassword, 12);

    // 1. Ensure test admin exists
    const adminCheck = await client.query(
      `SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND is_deleted = FALSE;`,
      [TEST_ADMIN_EMAIL]
    );

    let adminUserId;
    if (adminCheck.rows.length === 0) {
      const insertAdmin = await client.query(
        `INSERT INTO users (full_name, email, password, role, is_active, is_deleted, email_verified, must_change_password, created_at, updated_at)
         VALUES ($1, LOWER($2), $3, 'ADMIN', TRUE, FALSE, TRUE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id;`,
        ["CI Admin", TEST_ADMIN_EMAIL, hashedPassword]
      );
      adminUserId = insertAdmin.rows[0].id;
      console.log(`✅ Created test admin: ${TEST_ADMIN_EMAIL}`);
    } else {
      adminUserId = adminCheck.rows[0].id;
      await client.query(
        `UPDATE users SET password = $1, is_active = TRUE, is_deleted = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $2;`,
        [hashedPassword, adminUserId]
      );
      console.log(`ℹ️  Test admin already exists (password refreshed): ${TEST_ADMIN_EMAIL}`);
    }

    // Ensure test admin has employee profile
    await client.query(
      `INSERT INTO employees (user_id, employee_code, full_name, email, mobile, department_id, designation, role, status)
       VALUES ($1, 'EMP1001', 'CI Admin', LOWER($2), '9999900001', 1, 'System Administrator', 'ADMIN', 'ACTIVE')
       ON CONFLICT (user_id) DO NOTHING;`,
      [adminUserId, TEST_ADMIN_EMAIL]
    );

    // 2. Ensure test counsellor exists
    const counsellorCheck = await client.query(
      `SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND is_deleted = FALSE;`,
      [TEST_COUNSELLOR_EMAIL]
    );

    let counsellorUserId;
    if (counsellorCheck.rows.length === 0) {
      const insertCounsellor = await client.query(
        `INSERT INTO users (full_name, email, password, role, is_active, is_deleted, email_verified, must_change_password, created_at, updated_at)
         VALUES ($1, LOWER($2), $3, 'COUNSELLOR', TRUE, FALSE, TRUE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id;`,
        ["CI Counsellor", TEST_COUNSELLOR_EMAIL, hashedPassword]
      );
      counsellorUserId = insertCounsellor.rows[0].id;
      console.log(`✅ Created test counsellor: ${TEST_COUNSELLOR_EMAIL}`);
    } else {
      counsellorUserId = counsellorCheck.rows[0].id;
      await client.query(
        `UPDATE users SET password = $1, is_active = TRUE, is_deleted = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $2;`,
        [hashedPassword, counsellorUserId]
      );
      console.log(`ℹ️  Test counsellor already exists (password refreshed): ${TEST_COUNSELLOR_EMAIL}`);
    }

    // Ensure test counsellor has employee profile
    await client.query(
      `INSERT INTO employees (user_id, employee_code, full_name, email, mobile, department_id, designation, role, status)
       VALUES ($1, 'EMP1002', 'CI Counsellor', LOWER($2), '9999900002', 1, 'Senior Counsellor', 'COUNSELLOR', 'ACTIVE')
       ON CONFLICT (user_id) DO NOTHING;`,
      [counsellorUserId, TEST_COUNSELLOR_EMAIL]
    );

    await client.query("COMMIT");
    console.log("🎉 Test database seeded successfully.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Seeding failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

seed();
