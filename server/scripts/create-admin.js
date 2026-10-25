import path from "path";
import { fileURLToPath } from "url";
import readline from "readline";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure server/.env is loaded regardless of current working directory
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import bcrypt from "bcryptjs";
import pool from "../config/db.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

function parseArgs() {
  const args = process.argv.slice(2);
  let name = "";
  let email = "";
  let password = "";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--email" || arg === "-e") {
      email = args[++i];
    } else if (arg === "--password" || arg === "-p") {
      password = args[++i];
    } else if (arg === "--name" || arg === "-n") {
      name = args[++i];
    } else if (!email && arg.includes("@")) {
      email = arg;
    } else if (email && !password) {
      password = arg;
    } else if (!name) {
      name = arg;
    }
  }

  return { name, email, password };
}

async function createOrUpdateAdmin() {
  let { name, email, password } = parseArgs();

  console.log("\n==============================================");
  console.log("    🛡️  DIZITAL ADDA CRM - CREATE ADMIN USER    ");
  console.log("==============================================\n");

  if (!email) {
    email = (await askQuestion("📧 Enter Admin Email: ")).trim();
  }
  if (!email || !email.includes("@")) {
    console.error("❌ Error: A valid email address is required.");
    rl.close();
    process.exit(1);
  }

  if (!name) {
    name = (await askQuestion("👤 Enter Full Name (default: 'Admin User'): ")).trim();
    if (!name) name = "Admin User";
  }

  if (!password) {
    password = (await askQuestion("🔑 Enter Password (min 6 characters): ")).trim();
  }
  if (!password || password.length < 6) {
    console.error("❌ Error: Password must be at least 6 characters long.");
    rl.close();
    process.exit(1);
  }

  rl.close();

  console.log(`\n⏳ Processing admin user for: ${email}...`);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Check if user already exists
    const existingRes = await client.query(
      "SELECT id, full_name, email, role, is_active, is_deleted FROM users WHERE LOWER(email) = LOWER($1)",
      [email]
    );

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    if (existingRes.rows.length > 0) {
      const existingUser = existingRes.rows[0];
      console.log(`⚠️ User found (ID: ${existingUser.id}, current role: ${existingUser.role}). Updating to ADMIN...`);

      const updateRes = await client.query(
        `UPDATE users
         SET full_name = COALESCE($1, full_name),
             password = $2,
             role = 'ADMIN',
             is_active = TRUE,
             is_deleted = FALSE,
             email_verified = TRUE,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING id, full_name, email, role, is_active`,
        [name || existingUser.full_name, hashedPassword, existingUser.id]
      );

      await client.query("COMMIT");
      console.log("\n✅ SUCCESS! Existing user updated to ADMIN:");
      console.log(`   - ID:        ${updateRes.rows[0].id}`);
      console.log(`   - Name:      ${updateRes.rows[0].full_name}`);
      console.log(`   - Email:     ${updateRes.rows[0].email}`);
      console.log(`   - Role:      ${updateRes.rows[0].role}`);
      console.log(`   - Password:  [Updated to your new password]`);
    } else {
      const insertRes = await client.query(
        `INSERT INTO users (full_name, email, password, role, is_active, is_deleted, email_verified, created_at, updated_at)
         VALUES ($1, LOWER($2), $3, 'ADMIN', TRUE, FALSE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id, full_name, email, role, is_active`,
        [name, email, hashedPassword]
      );

      await client.query("COMMIT");
      console.log("\n✅ SUCCESS! New ADMIN created successfully:");
      console.log(`   - ID:        ${insertRes.rows[0].id}`);
      console.log(`   - Name:      ${insertRes.rows[0].full_name}`);
      console.log(`   - Email:     ${insertRes.rows[0].email}`);
      console.log(`   - Role:      ${insertRes.rows[0].role}`);
      console.log(`   - Status:    Active & Verified`);
    }

    console.log("\n🚀 You can now log in at the CRM login page with these credentials!\n");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\n❌ Database Error:", err.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

createOrUpdateAdmin();
