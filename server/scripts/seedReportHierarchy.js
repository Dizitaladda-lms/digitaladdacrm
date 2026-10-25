import "dotenv/config";
import bcrypt from "bcryptjs";
import pool, { withTransaction } from "../config/db.js";
import initializeDatabase from "../config/dbInit.js";

/**
 * Seeds a complete 6-Level Role Hierarchy for Report Approval Testing:
 *
 * Level 6: Super Admin      (superadmin.hierarchy@dizitaladda.com)
 * Level 5: HR               (hr.hierarchy@dizitaladda.com)          -> reports_to Super Admin
 * Level 4: Department Head  (depthead.dm@dizitaladda.com)           -> reports_to HR
 *          Department Head  (depthead.web@dizitaladda.com)          -> reports_to HR
 * Level 3: Team Lead (TL 1) (tl1.dm@dizitaladda.com)                -> reports_to Dept Head (DM)
 *          Team Lead (TL 2) (tl2.dm@dizitaladda.com)                -> reports_to Dept Head (DM)
 * Level 2: Sub-TL 1         (subtl1.dm@dizitaladda.com)             -> reports_to TL 1
 *          Sub-TL 2         (subtl2.dm@dizitaladda.com)             -> reports_to TL 2
 * Level 1: Intern 1         (intern1.dm@dizitaladda.com)            -> reports_to Sub-TL 1
 *          Intern 2         (intern2.dm@dizitaladda.com)            -> reports_to Sub-TL 2
 */
export const seedReportHierarchy = async () => {
  await initializeDatabase();
  const passwordHash = await bcrypt.hash("Pass@123", 10);

  return await withTransaction(async (client) => {
    // 1. Ensure Departments
    const upsertDepartment = async (name, description) => {
      const existing = await client.query(
        `SELECT id, department_name FROM departments WHERE LOWER(department_name) = LOWER($1) LIMIT 1;`,
        [name]
      );
      if (existing.rows[0]) return existing.rows[0];
      const inserted = await client.query(
        `INSERT INTO departments (department_name, description, status)
         VALUES ($1, $2, TRUE)
         RETURNING id, department_name;`,
        [name, description]
      );
      return inserted.rows[0];
    };

    const dmDept = await upsertDepartment("Digital Marketing", "SEO, Paid Ads & Social Media");
    const webDept = await upsertDepartment("Web Development", "Full-Stack Engineering & Training");

    // 2. Helper to upsert user + employee linked in reporting hierarchy
    const upsertHierarchyNode = async ({
      code,
      fullName,
      email,
      mobile,
      userRole,
      empRole,
      designation,
      employmentType = "FULL_TIME",
      departmentId,
      managerUser = null,
    }) => {
      const userRes = await client.query(
        `INSERT INTO users (full_name, email, phone, password_hash, role, reports_to, department_id, is_active, is_deleted)
         VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, FALSE)
         ON CONFLICT (email) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           role = EXCLUDED.role,
           reports_to = EXCLUDED.reports_to,
           department_id = EXCLUDED.department_id,
           is_active = TRUE,
           is_deleted = FALSE,
           updated_at = CURRENT_TIMESTAMP
         RETURNING id, full_name, email, role, reports_to, department_id;`,
        [
          fullName,
          email,
          mobile,
          passwordHash,
          userRole,
          managerUser?.userId || null,
          departmentId || null,
        ]
      );
      const user = userRes.rows[0];

      const empRes = await client.query(
        `INSERT INTO employees (
           employee_code, user_id, full_name, email, mobile,
           department_id, role, designation, employment_type,
           reporting_manager_id, status, is_deleted
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ACTIVE', FALSE)
         ON CONFLICT (email) DO UPDATE SET
           user_id = EXCLUDED.user_id,
           full_name = EXCLUDED.full_name,
           department_id = EXCLUDED.department_id,
           role = EXCLUDED.role,
           designation = EXCLUDED.designation,
           employment_type = EXCLUDED.employment_type,
           reporting_manager_id = EXCLUDED.reporting_manager_id,
           status = 'ACTIVE',
           is_deleted = FALSE,
           updated_at = CURRENT_TIMESTAMP
         RETURNING id, user_id, employee_code, role, designation, reporting_manager_id, department_id;`,
        [
          code,
          user.id,
          fullName,
          email,
          mobile,
          departmentId || null,
          empRole,
          designation,
          employmentType,
          managerUser?.employeeId || null,
        ]
      );
      const emp = empRes.rows[0];

      return {
        userId: Number(user.id),
        employeeId: Number(emp.id),
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        designation: emp.designation,
        departmentId: emp.department_id,
        reportsToUserId: user.reports_to ? Number(user.reports_to) : null,
        reportingManagerEmployeeId: emp.reporting_manager_id ? Number(emp.reporting_manager_id) : null,
      };
    };

    // Level 6: Super Admin
    const superAdmin = await upsertHierarchyNode({
      code: "HIER-SA-01",
      fullName: "Vikram Singh (Super Admin)",
      email: "superadmin.hierarchy@dizitaladda.com",
      mobile: "9900000001",
      userRole: "SUPER_ADMIN",
      empRole: "SUPER_ADMIN",
      designation: "Founder & Super Admin",
      departmentId: dmDept.id,
      managerUser: null,
    });

    // Level 5: HR
    const hr = await upsertHierarchyNode({
      code: "HIER-HR-01",
      fullName: "Neha Sharma (HR Head)",
      email: "hr.hierarchy@dizitaladda.com",
      mobile: "9900000002",
      userRole: "HR",
      empRole: "HR",
      designation: "HR Manager",
      departmentId: dmDept.id,
      managerUser: superAdmin,
    });

    // Level 4: Department Heads
    const deptHeadDM = await upsertHierarchyNode({
      code: "HIER-DH-01",
      fullName: "Rajesh Verma (Dept Head - DM)",
      email: "depthead.dm@dizitaladda.com",
      mobile: "9900000003",
      userRole: "DEPARTMENT_HEAD",
      empRole: "DEPARTMENT_HEAD",
      designation: "Department Head - Digital Marketing",
      departmentId: dmDept.id,
      managerUser: hr,
    });

    const deptHeadWeb = await upsertHierarchyNode({
      code: "HIER-DH-02",
      fullName: "Ananya Gupta (Dept Head - Web)",
      email: "depthead.web@dizitaladda.com",
      mobile: "9900000004",
      userRole: "DEPARTMENT_HEAD",
      empRole: "DEPARTMENT_HEAD",
      designation: "Department Head - Web Development",
      departmentId: webDept.id,
      managerUser: hr,
    });

    // Level 3: Team Leads (TL 1 & TL 2)
    const tl1 = await upsertHierarchyNode({
      code: "HIER-TL-01",
      fullName: "Amit Kumar (Team Lead 1)",
      email: "tl1.dm@dizitaladda.com",
      mobile: "9900000005",
      userRole: "TL",
      empRole: "TL",
      designation: "Team Lead - Performance Marketing",
      departmentId: dmDept.id,
      managerUser: deptHeadDM,
    });

    const tl2 = await upsertHierarchyNode({
      code: "HIER-TL-02",
      fullName: "Priya Nair (Team Lead 2)",
      email: "tl2.dm@dizitaladda.com",
      mobile: "9900000006",
      userRole: "TL",
      empRole: "TL",
      designation: "Team Lead - SEO & Content",
      departmentId: dmDept.id,
      managerUser: deptHeadDM,
    });

    // Level 2: Sub-TLs (Sub-TL 1 under TL 1, Sub-TL 2 under TL 2)
    const subTl1 = await upsertHierarchyNode({
      code: "HIER-STL-01",
      fullName: "Rohan Mehta (Sub-TL 1)",
      email: "subtl1.dm@dizitaladda.com",
      mobile: "9900000007",
      userRole: "SUB_TL",
      empRole: "SUB_TL",
      designation: "Sub-Team Lead - Ads",
      departmentId: dmDept.id,
      managerUser: tl1,
    });

    const subTl2 = await upsertHierarchyNode({
      code: "HIER-STL-02",
      fullName: "Sneha Joshi (Sub-TL 2)",
      email: "subtl2.dm@dizitaladda.com",
      mobile: "9900000008",
      userRole: "SUB_TL",
      empRole: "SUB_TL",
      designation: "Sub-Team Lead - SEO",
      departmentId: dmDept.id,
      managerUser: tl2,
    });

    // Level 1: Interns (Intern 1 under Sub-TL 1, Intern 2 under Sub-TL 2)
    const intern1 = await upsertHierarchyNode({
      code: "HIER-INT-01",
      fullName: "Aarav Patel (Intern 1)",
      email: "intern1.dm@dizitaladda.com",
      mobile: "9900000009",
      userRole: "INTERN",
      empRole: "INTERN",
      designation: "Digital Marketing Intern",
      employmentType: "INTERN",
      departmentId: dmDept.id,
      managerUser: subTl1,
    });

    const intern2 = await upsertHierarchyNode({
      code: "HIER-INT-02",
      fullName: "Kavya Reddy (Intern 2)",
      email: "intern2.dm@dizitaladda.com",
      mobile: "9900000010",
      userRole: "INTERN",
      empRole: "INTERN",
      designation: "SEO Intern",
      employmentType: "INTERN",
      departmentId: dmDept.id,
      managerUser: subTl2,
    });

    return {
      departments: { dmDept, webDept },
      users: {
        superAdmin,
        hr,
        deptHeadDM,
        deptHeadWeb,
        tl1,
        tl2,
        subTl1,
        subTl2,
        intern1,
        intern2,
      },
    };
  });
};

// Allow running directly via `node scripts/seedReportHierarchy.js`
if (process.argv[1] && process.argv[1].endsWith("seedReportHierarchy.js")) {
  seedReportHierarchy()
    .then((seeded) => {
      console.log("✅ 6-Level Report Hierarchy Seeded Successfully (Password for all: Pass@123)");
      console.table(
        Object.entries(seeded.users).map(([key, u]) => ({
          Key: key,
          UserId: u.userId,
          Name: u.fullName,
          Email: u.email,
          Role: u.role,
          ReportsToUserId: u.reportsToUserId,
        }))
      );
      return pool.end();
    })
    .catch((err) => {
      console.error("❌ Failed to seed report hierarchy:", err);
      process.exit(1);
    });
}
