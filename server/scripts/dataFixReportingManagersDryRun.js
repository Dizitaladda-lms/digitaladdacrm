import dotenv from "dotenv";
import pool from "../config/db.js";

dotenv.config();

/**
 * DATA AUDIT & DRY-RUN FIX SCRIPT FOR REPORTING MANAGERS
 * This script runs in READ-ONLY mode. It inspects unassigned managers,
 * prepares recommended hierarchy links, and prints the exact SQL statements
 * for user approval before anything is modified in the live database.
 */
async function dryRunReportingManagerAudit() {
  console.log("===============================================================");
  console.log(" DIZITAL ADDA CRM - REPORTING HIERARCHY DATA AUDIT (DRY RUN)  ");
  console.log("===============================================================\n");

  const unassignedRes = await pool.query(`
    SELECT e.id AS employee_id, e.user_id, e.full_name, e.role, e.designation,
           e.department_id, d.department_name, e.reporting_manager_id
    FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE e.is_deleted = FALSE
      AND e.status = 'ACTIVE'
      AND e.reporting_manager_id IS NULL
      AND UPPER(COALESCE(e.role, '')) <> 'SUPER_ADMIN'
    ORDER BY e.id ASC;
  `);

  console.log(`Found ${unassignedRes.rows.length} active employees without reporting managers:\n`);
  console.table(unassignedRes.rows);

  // Proposed hierarchy mapping:
  // 1. Divyanshu Mishra (id: 4, Manager) -> Department Head of Sales (reports to NULL or Super Admin)
  // 2. Rohit Kumar (id: 1, Team Lead) -> reports to Divyanshu Mishra (id: 4)
  // 3. DIVYANSHU MISHRA (id: 2, Counsellor) -> reports to Rohit Kumar (id: 1)
  // 4. Surbhi (id: 3, Counsellor) -> reports to Rohit Kumar (id: 1)

  console.log("\n---------------------------------------------------------------");
  console.log(" RECOMMENDED DATA FIX (DRY-RUN ONLY - NO CHANGES APPLIED YET) ");
  console.log("---------------------------------------------------------------\n");

  const proposedUpdates = [
    {
      employeeId: 1,
      name: "Rohit Kumar (TL)",
      proposedManagerId: 4,
      managerName: "Divyanshu Mishra (Manager)",
      sql: "UPDATE employees SET reporting_manager_id = 4, updated_at = CURRENT_TIMESTAMP WHERE id = 1;",
    },
    {
      employeeId: 2,
      name: "DIVYANSHU MISHRA (Counsellor)",
      proposedManagerId: 1,
      managerName: "Rohit Kumar (TL)",
      sql: "UPDATE employees SET reporting_manager_id = 1, updated_at = CURRENT_TIMESTAMP WHERE id = 2;",
    },
    {
      employeeId: 3,
      name: "Surbhi (Counsellor)",
      proposedManagerId: 1,
      managerName: "Rohit Kumar (TL)",
      sql: "UPDATE employees SET reporting_manager_id = 1, updated_at = CURRENT_TIMESTAMP WHERE id = 3;",
    },
  ];

  console.table(proposedUpdates.map(({ employeeId, name, proposedManagerId, managerName }) => ({
    "Employee ID": employeeId,
    "Employee Name": name,
    "Assigned Manager ID": proposedManagerId,
    "Assigned Manager Name": managerName,
  })));

  console.log("\nSQL statements to execute upon user approval:");
  for (const item of proposedUpdates) {
    console.log(`  ${item.sql}`);
  }

  console.log("\n[DRY RUN COMPLETE] Zero database rows modified. Awaiting user confirmation.\n");
  await pool.end();
}

dryRunReportingManagerAudit().catch((err) => {
  console.error("Dry run audit failed:", err.message);
  process.exit(1);
});
