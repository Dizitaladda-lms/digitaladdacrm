import bcrypt from "bcryptjs";
import pool from "../../config/db.js";

const requiredTables = ["refresh_tokens", "password_resets", "users"];

export const isTestDatabase = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return false;
  try {
    const databaseName = new URL(connectionString).pathname.replace(/^\//, "");
    return databaseName === "test_db" || /(^|[_-])test$/i.test(databaseName);
  } catch {
    return false;
  }
};

const assertTestDatabase = () => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL must be set before running tests.");
  }

  let databaseName;
  try {
    databaseName = new URL(connectionString).pathname.replace(/^\//, "");
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL URL.");
  }

  if (!isTestDatabase()) {
    throw new Error(
      `Refusing to run destructive tests against database "${databaseName}". Use test_db or a database name ending in _test.`
    );
  }
};

export const resetAuthTables = async () => {
  assertTestDatabase();

  const tableResult = await pool.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = ANY($1::text[])`,
    [requiredTables]
  );

  const presentTables = new Set(tableResult.rows.map(({ tablename }) => tablename));
  const missingTables = requiredTables.filter((table) => !presentTables.has(table));

  if (missingTables.length) {
    throw new Error(
      `Test database schema is incomplete. Missing: ${missingTables.join(", ")}. Run the CRM schema and migrations against the test database first.`
    );
  }

  await pool.query(
    "TRUNCATE TABLE refresh_tokens, password_resets, users RESTART IDENTITY CASCADE"
  );
};

export const createTestUser = async ({
  fullName = "Test Counsellor",
  email = "counsellor@test.com",
  plaintextPassword = "ValidPassword123!",
  role = "COUNSELLOR",
  isActive = true,
} = {}) => {
  const password = await bcrypt.hash(plaintextPassword, 10);

  const { rows } = await pool.query(
    `INSERT INTO users (full_name, email, password, role, is_active, is_deleted)
     VALUES ($1, $2, $3, $4, $5, FALSE)
     RETURNING id, full_name, email, role, is_active`,
    [fullName, email, password, role, isActive]
  );

  return { ...rows[0], plaintextPassword };
};

export const closeTestPool = async () => {
  await pool.end();
};
