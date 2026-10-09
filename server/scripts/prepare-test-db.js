import dotenv from "dotenv";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverRoot = resolve(__dirname, "..");

dotenv.config({ path: resolve(serverRoot, ".env.test"), override: false });

const connectionString = process.env.DATABASE_URL;
let databaseName = "";

if (connectionString) {
  try {
    databaseName = new URL(connectionString).pathname.replace(/^\//, "");
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL URL before preparing the test database.");
  }
}

if (databaseName !== "test_db" && !/(^|[_-])test$/i.test(databaseName)) {
  console.log("Skipping test database migrations: DATABASE_URL is not a dedicated test database.");
  process.exit(0);
}

console.log(`Applying pending migrations to the dedicated test database "${databaseName}"...`);
const migration = spawnSync(
  process.execPath,
  [resolve(__dirname, "migrate.js")],
  { cwd: serverRoot, env: process.env, stdio: "inherit" }
);

if (migration.error) throw migration.error;
if (migration.status !== 0) {
  process.exit(migration.status ?? 1);
}
