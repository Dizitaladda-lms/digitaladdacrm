import pool from "../config/db.js";

/**
 * ============================================================================
 * READ-ONLY HIERARCHY & REPORT AUDIT SCRIPT
 * ============================================================================
 * Audits the PostgreSQL database for hierarchy breaks, orphaned nodes,
 * circular references, inactive managers, cross-department mismatches,
 * and stuck daily work reports.
 *
 * READ-ONLY: Executes ZERO INSERT/UPDATE/DELETE statements.
 */

async function runAudit() {
  console.log("=================================================================");
  console.log("🔍 STARTING READ-ONLY CRM HIERARCHY & REPORT DATA AUDIT");
  console.log("=================================================================\n");

  const client = await pool.connect();

  try {
    // 1. Active employees (except SUPER_ADMIN) with NULL manager
    console.log("1️⃣  ACTIVE EMPLOYEES (EXCEPT SUPER_ADMIN) WITH NULL MANAGER:");
    const nullManagerRes = await client.query(`
      SELECT e.id, e.employee_code, e.full_name, e.role, e.designation, d.department_name, u.role AS user_role
      FROM employees e
      LEFT JOIN users u ON u.id = e.user_id
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE e.is_deleted = FALSE 
        AND e.status = 'ACTIVE'
        AND e.reporting_manager_id IS NULL
        AND UPPER(COALESCE(u.role, e.role, '')) NOT IN ('SUPER_ADMIN')
        AND LOWER(COALESCE(e.designation, '')) NOT LIKE '%superadmin%'
      ORDER BY e.department_id, e.id;
    `);
    console.table(nullManagerRes.rows);
    console.log(`Found: ${nullManagerRes.rows.length} employee(s) without reporting manager.\n`);

    // 2. Self-referencing or Circular Manager Chains
    console.log("2️⃣  SELF-REFERENCING OR CIRCULAR MANAGER CHAINS:");
    const circularRes = await client.query(`
      WITH RECURSIVE manager_walk AS (
        SELECT id, reporting_manager_id, full_name, ARRAY[id]::bigint[] AS path, FALSE AS is_cycle
        FROM employees
        WHERE is_deleted = FALSE AND reporting_manager_id IS NOT NULL
        UNION ALL
        SELECT parent.id, parent.reporting_manager_id, parent.full_name, 
               w.path || parent.id,
               parent.id = ANY(w.path) AS is_cycle
        FROM employees parent
        JOIN manager_walk w ON w.reporting_manager_id = parent.id
        WHERE parent.is_deleted = FALSE AND NOT (w.is_cycle)
      )
      SELECT DISTINCT id, full_name, reporting_manager_id, path
      FROM manager_walk
      WHERE is_cycle = TRUE OR id = reporting_manager_id;
    `);
    console.table(circularRes.rows);
    console.log(`Found: ${circularRes.rows.length} circular/self-referencing manager relationship(s).\n`);

    // 3. Managers who are Inactive or Deleted
    console.log("3️⃣  EMPLOYEES WHOSE MANAGER IS INACTIVE OR DELETED:");
    const inactiveManagerRes = await client.query(`
      SELECT 
        e.id AS employee_id, e.full_name AS employee_name, e.role AS employee_role,
        m.id AS manager_id, m.full_name AS manager_name, m.status AS manager_status, m.is_deleted AS manager_deleted,
        u_m.is_active AS manager_user_active, u_m.is_deleted AS manager_user_deleted
      FROM employees e
      JOIN employees m ON e.reporting_manager_id = m.id
      LEFT JOIN users u_m ON u_m.id = m.user_id
      WHERE e.is_deleted = FALSE
        AND (
          m.is_deleted = TRUE 
          OR m.status <> 'ACTIVE'
          OR u_m.is_active = FALSE
          OR u_m.is_deleted = TRUE
        );
    `);
    console.table(inactiveManagerRes.rows);
    console.log(`Found: ${inactiveManagerRes.rows.length} employee(s) under inactive/deleted managers.\n`);

    // 4. Employees whose Manager is in a Different Department
    console.log("4️⃣  CROSS-DEPARTMENT REPORTING (EMPLOYEE & MANAGER IN DIFFERENT DEPARTMENTS):");
    const crossDeptRes = await client.query(`
      SELECT 
        e.id AS employee_id, e.full_name AS employee_name, d_e.department_name AS employee_dept,
        m.id AS manager_id, m.full_name AS manager_name, d_m.department_name AS manager_dept,
        m.managed_department_ids
      FROM employees e
      JOIN employees m ON e.reporting_manager_id = m.id
      LEFT JOIN departments d_e ON d_e.id = e.department_id
      LEFT JOIN departments d_m ON d_m.id = m.department_id
      WHERE e.is_deleted = FALSE 
        AND m.is_deleted = FALSE
        AND e.department_id IS NOT NULL 
        AND m.department_id IS NOT NULL
        AND e.department_id <> m.department_id
        AND NOT (m.managed_department_ids IS NOT NULL AND m.managed_department_ids @> to_jsonb(e.department_id::bigint));
    `);
    console.table(crossDeptRes.rows);
    console.log(`Found: ${crossDeptRes.rows.length} employee(s) with cross-department managers.\n`);

    // 5. Reports where Current Approver != Actual Current Hierarchy Approver
    console.log("5️⃣  REPORTS WITH MISALIGNED OR NULL CURRENT APPROVER:");
    const misalignedReportsRes = await client.query(`
      SELECT 
        r.id AS report_id, r.user_id AS submitter_user_id, u_sub.full_name AS submitter_name,
        r.report_date, r.status, r.current_status, r.current_approval_level,
        r.current_level_user_id, u_curr.full_name AS current_level_user_name,
        e_sub.reporting_manager_id, m.user_id AS manager_user_id, m.full_name AS manager_name
      FROM daily_work_reports r
      JOIN users u_sub ON u_sub.id = r.user_id
      LEFT JOIN employees e_sub ON e_sub.user_id = u_sub.id
      LEFT JOIN employees m ON e_sub.reporting_manager_id = m.id
      LEFT JOIN users u_curr ON u_curr.id = r.current_level_user_id
      WHERE r.status NOT IN ('SUPER_ADMIN_APPROVED', 'REVISION_REQUESTED')
        AND COALESCE(r.current_status, 'PENDING') NOT IN ('APPROVED', 'REJECTED')
        AND (
          r.current_level_user_id IS NULL
          OR (m.user_id IS NOT NULL AND r.current_approval_level = 2 AND r.current_level_user_id <> m.user_id)
        )
      ORDER BY r.report_date DESC, r.id DESC
      LIMIT 25;
    `);
    console.table(misalignedReportsRes.rows);
    console.log(`Found: ${misalignedReportsRes.rows.length} pending report(s) with misaligned current approvers.\n`);

    // 6. Reports Stuck in a Status Where Nobody in the Chain Can See or Act on Them
    console.log("6️⃣  STUCK REPORTS (PENDING IN REPORT_APPROVALS BUT UNMATCHED IN CURRENT_LEVEL_USER_ID):");
    const stuckReportsRes = await client.query(`
      SELECT 
        r.id AS report_id, r.report_date, r.user_id, u.full_name AS author,
        r.status, r.current_status, r.current_approval_level, r.current_level_user_id,
        (SELECT COUNT(*) FROM report_approvals ra WHERE ra.report_id = r.id) AS total_approval_steps,
        (SELECT COUNT(*) FROM report_approvals ra WHERE ra.report_id = r.id AND ra.status = 'PENDING') AS pending_steps
      FROM daily_work_reports r
      JOIN users u ON u.id = r.user_id
      WHERE r.status NOT IN ('SUPER_ADMIN_APPROVED')
        AND COALESCE(r.current_status, 'PENDING') = 'PENDING'
        AND (
          r.current_level_user_id IS NULL
          OR NOT EXISTS (SELECT 1 FROM users approver WHERE approver.id = r.current_level_user_id AND approver.is_active = TRUE)
        )
      LIMIT 25;
    `);
    console.table(stuckReportsRes.rows);
    console.log(`Found: ${stuckReportsRes.rows.length} stuck report(s).\n`);

  } catch (error) {
    console.error("❌ Audit Error:", error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

runAudit();
