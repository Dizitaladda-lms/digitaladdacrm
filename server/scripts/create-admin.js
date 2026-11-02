import path from "path";
import { fileURLToPath } from "url";
import readline from "readline";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure server/.env is loaded regardless of current working directory
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import pool from "../config/db.js";
import { hashSecurePassword } from "../utils/passwordUtils.js";

const askQuestion = (query) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    });
  });
};

function parseArgs() {
  const args = process.argv.slice(2);
  let name = process.env.ADMIN_NAME || "";
  let email = process.env.ADMIN_EMAIL || "";
  let password = process.env.ADMIN_PASSWORD || "";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--email" || arg === "-e") {
      email = args[++i] || "";
    } else if (arg === "--password" || arg === "-p") {
      password = args[++i] || "";
    } else if (arg === "--name" || arg === "-n") {
      name = args[++i] || "";
    } else if (!email && arg.includes("@")) {
      email = arg;
    } else if (email && !password) {
      password = arg;
    } else if (!name) {
      name = arg;
    }
  }

  return { name: name.trim(), email: email.trim(), password: password.trim() };
}

function validatePasswordPolicy(password) {
  if (!password || password.length < 12) {
    return "Password must be at least 12 characters long.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter (A-Z).";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter (a-z).";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number (0-9).";
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must contain at least one special symbol (!@#$%^&*...).";
  }
  return null;
}

async function createOrUpdateAdmin() {
  let { name, email, password } = parseArgs();

  console.log("\n==============================================");
  console.log("    🛡️  DIZITAL ADDA CRM - CREATE ADMIN USER    ");
  console.log("==============================================\n");

  if (!email && process.stdin.isTTY) {
    email = (await askQuestion("📧 Enter Admin Email: ")).trim();
  }
  if (!email || !email.includes("@")) {
    console.error("❌ Error: A valid email address is required (pass via --email, ADMIN_EMAIL env, or CLI prompt).");
    process.exit(1);
  }

  if (!name) {
    if (process.stdin.isTTY) {
      name = (await askQuestion("👤 Enter Full Name (default: 'Admin User'): ")).trim();
    }
    if (!name) name = "Admin User";
  }

  if (!password && process.stdin.isTTY) {
    password = (await askQuestion("🔑 Enter Password (min 12 chars, upper, lower, digit, symbol): ")).trim();
  }

  const policyError = validatePasswordPolicy(password);
  if (policyError) {
    console.error(`❌ Password Policy Violation: ${policyError}`);
    console.error("   Requirement: Minimum 12 characters, including uppercase, lowercase, digit, and symbol.");
    process.exit(1);
  }

  console.log(`\n⏳ Processing admin user for: ${email}...`);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Ensure users table has must_change_password column
    await client.query(`
      ALTER TABLE IF EXISTS users
      ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
    `);

    // Ensure departments table has default department
    await client.query(`
      INSERT INTO departments (id, department_name, description, status)
      VALUES (1, 'Admissions & Sales', 'Admissions & Student Counselling', TRUE)
      ON CONFLICT (id) DO NOTHING;
    `);

    // Check if user already exists
    const existingRes = await client.query(
      "SELECT id, full_name, email, role, is_active, is_deleted FROM users WHERE LOWER(email) = LOWER($1)",
      [email]
    );

    // Hash password with bcrypt cost 12 and secret pepper
    const hashedPassword = await hashSecurePassword(password);

    let userId;
    let userName = name;

    if (existingRes.rows.length > 0) {
      const existingUser = existingRes.rows[0];
      userId = existingUser.id;
      userName = name || existingUser.full_name;
      console.log(`⚠️ User found (ID: ${userId}, current role: ${existingUser.role}). Promoting to ADMIN...`);

      const updateRes = await client.query(
        `UPDATE users
         SET full_name = COALESCE($1, full_name),
             password = $2,
             role = 'ADMIN',
             is_active = TRUE,
             is_deleted = FALSE,
             email_verified = TRUE,
             must_change_password = TRUE,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING id, full_name, email, role, is_active, must_change_password;`,
        [userName, hashedPassword, userId]
      );

      console.log("\n✅ SUCCESS! Existing user updated to ADMIN:");
      console.log(`   - ID:                   ${updateRes.rows[0].id}`);
      console.log(`   - Name:                 ${updateRes.rows[0].full_name}`);
      console.log(`   - Email:                ${updateRes.rows[0].email}`);
      console.log(`   - Role:                 ${updateRes.rows[0].role}`);
      console.log(`   - Must Change Password: ${updateRes.rows[0].must_change_password}`);
    } else {
      const insertRes = await client.query(
        `INSERT INTO users (
           full_name, email, password, role, is_active, is_deleted,
           email_verified, must_change_password, created_at, updated_at
         )
         VALUES ($1, LOWER($2), $3, 'ADMIN', TRUE, FALSE, TRUE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id, full_name, email, role, is_active, must_change_password;`,
        [userName, email, hashedPassword]
      );
      userId = insertRes.rows[0].id;

      console.log("\n✅ SUCCESS! New ADMIN created successfully:");
      console.log(`   - ID:                   ${insertRes.rows[0].id}`);
      console.log(`   - Name:                 ${insertRes.rows[0].full_name}`);
      console.log(`   - Email:                ${insertRes.rows[0].email}`);
      console.log(`   - Role:                 ${insertRes.rows[0].role}`);
      console.log(`   - Status:               Active & Verified`);
      console.log(`   - Must Change Password: ${insertRes.rows[0].must_change_password}`);
    }

    // Ensure corresponding employee profile exists for CRM dashboard & report operations
    const empCode = `EMP${String(userId).padStart(6, "0")}`;
    await client.query(
      `INSERT INTO employees (user_id, employee_code, full_name, email, mobile, department_id, designation, role, status)
       VALUES ($1, $2, $3, LOWER($4), $5, 1, 'System Administrator', 'ADMIN', 'ACTIVE')
       ON CONFLICT (user_id) DO UPDATE SET
         role = 'ADMIN',
         status = 'ACTIVE',
         is_deleted = FALSE,
         updated_at = CURRENT_TIMESTAMP;`,
      [userId, empCode, userName, email, `999${String(userId).padStart(7, "0")}`]
    ).catch(() => {});

    await client.query("COMMIT");

    console.log("\n🔒 Security Notice: The must_change_password flag is set to TRUE.");
    console.log("   The admin must update their password upon first logging into the CRM.\n");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\n❌ Database Error:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

createOrUpdateAdmin();
