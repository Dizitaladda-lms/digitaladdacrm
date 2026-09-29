import pool from "../config/db.js";
import { findEmployeeByUserIdRepository } from "../repositories/employeeRepository.js";

/**
 * Standalone Ensure Employee Profile Service
 * Solves circular ESM dependencies and safely provisions employee records.
 */
export const ensureEmployeeProfileForUser = async (userId) => {
  if (!userId) return null;

  try {
    // 1. Direct active employee lookup by user_id
    let employee = await findEmployeeByUserIdRepository(userId);
    if (employee) return employee;

    // 2. Check if an employee record exists with this user_id (even if soft-deleted or inactive)
    const existingByUserId = await pool.query(
      "SELECT * FROM employees WHERE user_id = $1 LIMIT 1;",
      [userId]
    );
    if (existingByUserId.rows.length > 0) {
      const row = existingByUserId.rows[0];
      if (row.is_deleted || row.status !== "ACTIVE") {
        await pool.query(
          "UPDATE employees SET is_deleted = FALSE, status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP WHERE id = $1;",
          [row.id]
        );
      }
      return (await findEmployeeByUserIdRepository(userId)) || row;
    }

    // 3. Fetch user record from users table
    const userRes = await pool.query(
      "SELECT id, full_name, email, role FROM users WHERE id = $1 LIMIT 1;",
      [userId]
    );
    const user = userRes.rows[0];
    if (!user) return null;

    // 4. Check if an employee record with this email already exists
    const existingByEmail = await pool.query(
      "SELECT * FROM employees WHERE LOWER(email) = LOWER($1) LIMIT 1;",
      [user.email]
    );
    if (existingByEmail.rows.length > 0) {
      const row = existingByEmail.rows[0];
      await pool.query(
        "UPDATE employees SET user_id = $1, is_deleted = FALSE, status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP WHERE id = $2;",
        [user.id, row.id]
      );
      return (await findEmployeeByUserIdRepository(userId)) || row;
    }

    // 5. Query a fallback department_id
    const deptRes = await pool.query(
      "SELECT id FROM departments ORDER BY id ASC LIMIT 1;"
    );
    const departmentId = deptRes.rows[0]?.id || null;

    // 6. Generate unique employee code
    let empCode = `EMP${String(user.id).padStart(6, "0")}`;
    const codeCheck = await pool.query(
      "SELECT 1 FROM employees WHERE employee_code = $1 LIMIT 1;",
      [empCode]
    );
    if (codeCheck.rows.length > 0) {
      empCode = `EMP${Date.now().toString().slice(-6)}`;
    }

    // 7. Generate unique mobile number
    let mobile = `98${String(user.id).padStart(4, "0")}${Math.floor(1000 + Math.random() * 9000)}`;
    const mobileCheck = await pool.query(
      "SELECT 1 FROM employees WHERE mobile = $1 LIMIT 1;",
      [mobile]
    );
    if (mobileCheck.rows.length > 0) {
      mobile = `99${Date.now().toString().slice(-8)}`;
    }

    // 8. Determine role & designation
    const rawRole = String(user.role || "").toUpperCase();
    const validRoles = ["ADMIN", "SUPER_ADMIN", "MANAGER", "COUNSELLOR", "EMPLOYEE"];
    const role = validRoles.includes(rawRole) ? rawRole : "COUNSELLOR";

    let designation = "Counsellor";
    if (role === "SUPER_ADMIN") designation = "Super Admin";
    else if (role === "MANAGER" || role === "ADMIN") designation = "Manager";

    // 9. Insert new employee record with proper department_id
    const insertQuery = `
      INSERT INTO employees (user_id, employee_code, full_name, email, mobile, role, department_id, designation, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE')
      ON CONFLICT (email) DO UPDATE SET user_id = EXCLUDED.user_id, status = 'ACTIVE', is_deleted = FALSE, updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    const { rows } = await pool.query(insertQuery, [
      user.id,
      empCode,
      user.full_name || "Dizital Adda Staff",
      user.email,
      mobile,
      role,
      departmentId,
      designation,
    ]);

    return (await findEmployeeByUserIdRepository(userId)) || rows[0] || null;
  } catch (err) {
    console.error("ensureEmployeeProfileForUser warning:", err.message);
    // Safe fallback to any existing matching record
    try {
      const fallback = await pool.query(
        "SELECT * FROM employees WHERE user_id = $1 LIMIT 1;",
        [userId]
      );
      if (fallback.rows[0]) return fallback.rows[0];
    } catch {
      // ignore fallback error
    }
    return null;
  }
};

