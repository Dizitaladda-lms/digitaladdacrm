import pool from "../config/db.js";

/* ============================================================================
 * Employee Repository
 * ============================================================================
 * Responsibilities:
 * - Database access only
 * - No business logic
 * - No validation
 * - No HTTP response
 * ============================================================================
 */

const EMPLOYEE_SELECT_COLUMNS = `
    e.id,
    e.user_id,
    e.employee_code,
    e.full_name,
    e.email,
    e.mobile,
    e.department_id,
    d.department_name,
    e.domain,
    e.assigned_domains,
    e.designation,
    e.role,
    e.employment_type,
    e.reporting_manager_id,
    m.full_name AS reporting_manager_name,
    e.status,
    COALESCE(da.status, 'NOT_CHECKED_IN') AS today_attendance_status,
    da.check_in_time AS today_check_in_time,
    ROUND(
      COALESCE(
        da.total_hours, 
        CASE WHEN da.check_in_time IS NOT NULL THEN EXTRACT(EPOCH FROM (COALESCE(da.check_out_time, CURRENT_TIMESTAMP) - da.check_in_time))/3600.0 ELSE 0 END
      ), 
      2
    ) AS today_hours,
    e.joining_date,
    e.date_of_birth,
    e.gender,
    e.profile_image,
    e.address,
    e.emergency_contact_name,
    e.emergency_contact,
    e.created_by,
    e.updated_by,
    e.deleted_by,
    e.created_at,
    e.updated_at,
    e.deleted_at,
    e.is_deleted
`;

const EMPLOYEE_BASE_QUERY = `
    FROM employees e
    LEFT JOIN departments d
        ON d.id = e.department_id
    LEFT JOIN employees m
        ON m.id = e.reporting_manager_id
    LEFT JOIN daily_attendance da
        ON da.employee_id = e.id AND da.date = CURRENT_DATE
    WHERE e.is_deleted = FALSE
`;

/* ============================================================================
 * Employee Code
 * ============================================================================
 */

export const getNextEmployeeCodeRepository = async (client) => {

    const query = `
        SELECT nextval('employee_code_seq') AS sequence;
    `;

    const { rows } = await client.query(query);

    return Number(rows[0].sequence);

};

/* ============================================================================
 * Find Employee By ID
 * ============================================================================
 */

export const findEmployeeByIdRepository = async (id) => {

    const query = `
        SELECT
            ${EMPLOYEE_SELECT_COLUMNS}

        ${EMPLOYEE_BASE_QUERY}

        AND e.id = $1

        LIMIT 1;
    `;

    const { rows } = await pool.query(query, [id]);

    return rows[0] || null;

};

/* ============================================================================
 * Find Employee By User ID
 * ============================================================================
 */

export const findEmployeeByUserIdRepository = async (userId) => {

    const query = `
        SELECT
            ${EMPLOYEE_SELECT_COLUMNS}

        ${EMPLOYEE_BASE_QUERY}

        AND e.user_id = $1

        LIMIT 1;
    `;

    const { rows } = await pool.query(query, [userId]);

    return rows[0] || null;

};

/* ============================================================================
 * Find Employee By Email
 * ============================================================================
 */

export const findEmployeeByEmailRepository = async (email) => {

    const query = `
        SELECT
            ${EMPLOYEE_SELECT_COLUMNS}

        ${EMPLOYEE_BASE_QUERY}

        AND e.email = $1

        LIMIT 1;
    `;

    const { rows } = await pool.query(query, [email]);

    return rows[0] || null;

};

/* ============================================================================
 * Find Employee By Mobile
 * ============================================================================
 */

export const findEmployeeByMobileRepository = async (mobile) => {

    const query = `
        SELECT
            ${EMPLOYEE_SELECT_COLUMNS}

        ${EMPLOYEE_BASE_QUERY}

        AND e.mobile = $1

        LIMIT 1;
    `;

    const { rows } = await pool.query(query, [mobile]);

    return rows[0] || null;

};

/* ============================================================================
 * Find Employee By Employee Code
 * ============================================================================
 */

export const findEmployeeByCodeRepository = async (employeeCode) => {

    const query = `
        SELECT
            ${EMPLOYEE_SELECT_COLUMNS}

        ${EMPLOYEE_BASE_QUERY}

        AND e.employee_code = $1

        LIMIT 1;
    `;

    const { rows } = await pool.query(query, [employeeCode]);

    return rows[0] || null;

};

/* ============================================================================
 * Exists By Email
 * ============================================================================
 */

export const existsEmployeeByEmailRepository = async (email) => {

    const query = `
        SELECT EXISTS(

            SELECT 1

            FROM employees

            WHERE email = $1

            AND is_deleted = FALSE

        ) AS exists;
    `;

    const { rows } = await pool.query(query, [email]);

    return rows[0].exists;

};

/* ============================================================================
 * Exists By Mobile
 * ============================================================================
 */

export const existsEmployeeByMobileRepository = async (mobile) => {

    const query = `
        SELECT EXISTS(

            SELECT 1

            FROM employees

            WHERE mobile = $1

            AND is_deleted = FALSE

        ) AS exists;
    `;

    const { rows } = await pool.query(query, [mobile]);

    return rows[0].exists;

};

/* ============================================================================
 * Exists By Employee Code
 * ============================================================================
 */

export const existsEmployeeByCodeRepository = async (employeeCode) => {

    const query = `
        SELECT EXISTS(

            SELECT 1

            FROM employees

            WHERE employee_code = $1

            AND is_deleted = FALSE

        ) AS exists;
    `;

    const { rows } = await pool.query(query, [employeeCode]);

    return rows[0].exists;

};

/* ============================================================================
 * Create Employee
 * ============================================================================
 */

export const createEmployeeRepository = async (
    client,
    employee
) => {

    const query = `
        INSERT INTO employees (

            user_id,
            employee_code,
            full_name,
            email,
            mobile,
            department_id,
            designation,
            role,
            employment_type,
            reporting_manager_id,
            status,
            joining_date,
            date_of_birth,
            gender,
            profile_image,
            address,
            emergency_contact_name,
            emergency_contact,
            created_by

        )

        VALUES (

            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
            $11,$12,$13,$14,$15,$16,$17,$18,
            $19

        )

        RETURNING *;
    `;

    const values = [

        employee.user_id,
        employee.employee_code,
        employee.full_name,
        employee.email,
        employee.mobile,
        employee.department_id,
        employee.designation,
        employee.role,
        employee.employment_type,
        employee.reporting_manager_id || null,
        employee.status,
        employee.joining_date,
        employee.date_of_birth,
        employee.gender,
        employee.profile_image,
        employee.address,
        employee.emergency_contact_name,
        employee.emergency_contact,
        employee.created_by

    ];

    const { rows } = await client.query(query, values);

    return rows[0];

};

/* ============================================================================
 * Update Employee
 * ============================================================================
 */

export const updateEmployeeRepository = async (
    client,
    id,
    employee
) => {
    const fields = [];
    const values = [];
    let idx = 1;

    if (employee.employee_code !== undefined && employee.employee_code !== null && String(employee.employee_code).trim() !== "") {
        fields.push(`employee_code = $${idx++}`);
        values.push(String(employee.employee_code).trim().toUpperCase());
    }
    if (employee.full_name !== undefined && employee.full_name !== null) {
        fields.push(`full_name = $${idx++}`);
        values.push(employee.full_name);
    }
    if (employee.email !== undefined && employee.email !== null && String(employee.email).trim() !== "") {
        fields.push(`email = $${idx++}`);
        values.push(String(employee.email).trim().toLowerCase());
    }
    if (employee.mobile !== undefined && employee.mobile !== null && String(employee.mobile).trim() !== "") {
        fields.push(`mobile = $${idx++}`);
        values.push(String(employee.mobile).trim());
    }
    if (employee.department_id !== undefined && employee.department_id !== null && employee.department_id !== "") {
        fields.push(`department_id = $${idx++}`);
        values.push(Number(employee.department_id));
    }
    if (employee.designation !== undefined && employee.designation !== null) {
        fields.push(`designation = $${idx++}`);
        values.push(employee.designation);
    }
    if (employee.role !== undefined && employee.role !== null) {
        fields.push(`role = $${idx++}`);
        values.push(employee.role);
    }
    if (employee.employment_type !== undefined && employee.employment_type !== null) {
        fields.push(`employment_type = $${idx++}`);
        values.push(employee.employment_type);
    }
    if (employee.reporting_manager_id !== undefined) {
        fields.push(`reporting_manager_id = $${idx++}`);
        values.push(
            employee.reporting_manager_id !== "" && employee.reporting_manager_id !== null
                ? Number(employee.reporting_manager_id)
                : null
        );
    }
    if (employee.status !== undefined && employee.status !== null) {
        fields.push(`status = $${idx++}`);
        values.push(employee.status);
    }
    if (employee.joining_date !== undefined && employee.joining_date !== null && employee.joining_date !== "") {
        fields.push(`joining_date = $${idx++}`);
        values.push(employee.joining_date);
    }
    if (employee.date_of_birth !== undefined && employee.date_of_birth !== null && employee.date_of_birth !== "") {
        fields.push(`date_of_birth = $${idx++}`);
        values.push(employee.date_of_birth);
    }
    if (employee.gender !== undefined && employee.gender !== null) {
        fields.push(`gender = $${idx++}`);
        values.push(employee.gender);
    }
    if (employee.profile_image !== undefined && employee.profile_image !== null) {
        fields.push(`profile_image = $${idx++}`);
        values.push(employee.profile_image);
    }
    if (employee.address !== undefined && employee.address !== null) {
        fields.push(`address = $${idx++}`);
        values.push(employee.address);
    }
    if (employee.emergency_contact_name !== undefined && employee.emergency_contact_name !== null) {
        fields.push(`emergency_contact_name = $${idx++}`);
        values.push(employee.emergency_contact_name);
    }
    if (employee.emergency_contact !== undefined && employee.emergency_contact !== null && String(employee.emergency_contact).trim() !== "") {
        fields.push(`emergency_contact = $${idx++}`);
        values.push(String(employee.emergency_contact).trim());
    }
    if (employee.updated_by !== undefined && employee.updated_by !== null) {
        fields.push(`updated_by = $${idx++}`);
        values.push(employee.updated_by);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    if (fields.length === 1) {
        return await findEmployeeByIdRepository(id);
    }

    values.push(Number(id));
    const query = `
        UPDATE employees
        SET ${fields.join(", ")}
        WHERE id = $${idx} AND is_deleted = FALSE
        RETURNING *;
    `;

    const { rows } = await client.query(query, values);
    return rows[0];
};

/* ============================================================================
 * Soft Delete Employee
 * ============================================================================
 */

export const deleteEmployeeRepository = async (
    client,
    id,
    deletedBy
) => {

    const query = `
        UPDATE employees

        SET

            is_deleted = TRUE,
            deleted_at = CURRENT_TIMESTAMP,
            deleted_by = $1,
            updated_by = $1,
            updated_at = CURRENT_TIMESTAMP

        WHERE id = $2
        AND is_deleted = FALSE

        RETURNING *;
    `;

    const { rows } = await client.query(
        query,
        [
            deletedBy,
            id
        ]
    );

    return rows[0];

};

/* ============================================================================
 * Restore Employee
 * ============================================================================
 */

export const restoreEmployeeRepository = async (
    client,
    id,
    updatedBy
) => {

    const query = `
        UPDATE employees

        SET

            is_deleted = FALSE,
            deleted_at = NULL,
            deleted_by = NULL,
            updated_by = $1,
            updated_at = CURRENT_TIMESTAMP

        WHERE id = $2
        AND is_deleted = TRUE

        RETURNING *;
    `;

    const { rows } = await client.query(
        query,
        [
            updatedBy,
            id
        ]
    );

    return rows[0];

};

/* ============================================================================
 * Change Employee Status
 * ============================================================================
 */

export const changeEmployeeStatusRepository = async (
    client,
    id,
    status,
    updatedBy
) => {

    const query = `
        UPDATE employees

        SET

            status = $1,
            updated_by = $2,
            updated_at = CURRENT_TIMESTAMP

        WHERE id = $3
        AND is_deleted = FALSE

        RETURNING *;
    `;

    const { rows } = await client.query(
        query,
        [
            status,
            updatedBy,
            id
        ]
    );

    return rows[0];

};

/* ============================================================================
 * Change Employee Role
 * ============================================================================
 */

export const changeEmployeeRoleRepository = async (
    client,
    id,
    role,
    updatedBy
) => {

    const query = `
        UPDATE employees

        SET

            role = $1,
            updated_by = $2,
            updated_at = CURRENT_TIMESTAMP

        WHERE id = $3
        AND is_deleted = FALSE

        RETURNING *;
    `;

    const { rows } = await client.query(
        query,
        [
            role,
            updatedBy,
            id
        ]
    );

    return rows[0];

};

/* ============================================================================
 * Get Employees
 * ============================================================================
 */

export const getEmployeesRepository = async (filters = {}) => {

    const {

        page = 1,
        limit = 10,
        search = "",
        departmentId,
        role,
        status,
        employment_type,
        sortBy = "created_at",
        order = "DESC"

    } = filters;

    const offset = (page - 1) * limit;

    let baseQuery = `
        ${EMPLOYEE_BASE_QUERY}
    `;

    const values = [];
    let index = 1;

    /* ===========================================================
     * Search
     * ===========================================================
     */

    if (search) {

        baseQuery += `
            AND (

                e.employee_code ILIKE $${index}

                OR e.full_name ILIKE $${index}

                OR e.email ILIKE $${index}

                OR e.mobile ILIKE $${index}

            )
        `;

        values.push(`%${search}%`);

        index++;

    }

    /* ===========================================================
     * Department Filter
     * ===========================================================
     */

    if (departmentId) {

        baseQuery += `
            AND e.department_id = $${index}
        `;

        values.push(departmentId);

        index++;

    }

    /* ===========================================================
     * Role Filter
     * ===========================================================
     */

    if (role) {

        baseQuery += `
            AND e.role = $${index}
        `;

        values.push(role);

        index++;

    }

    /* ===========================================================
     * Status Filter
     * ===========================================================
     */

    if (status) {

        baseQuery += `
            AND e.status = $${index}
        `;

        values.push(status);

        index++;

    }

    /* ===========================================================
     * Employment Type
     * ===========================================================
     */

    if (employment_type) {

        baseQuery += `
            AND e.employment_type = $${index}
        `;

        values.push(employment_type);

        index++;

    }

    /* ===========================================================
     * Count Query
     * ===========================================================
     */

    const countQuery = `
        SELECT COUNT(*)
        ${baseQuery}
    `;

    const countResult = await pool.query(
        countQuery,
        values
    );

    const totalRecords = Number(
        countResult.rows[0].count
    );

    /* ===========================================================
     * Sorting
     * ===========================================================
     */

    const allowedSortColumns = [

        "created_at",

        "joining_date",

        "employee_code",

        "full_name",

        "status",

        "role"

    ];

    const sortColumn =
        allowedSortColumns.includes(sortBy)
            ? sortBy
            : "created_at";

    const sortOrder =
        order.toUpperCase() === "ASC"
            ? "ASC"
            : "DESC";

    /* ===========================================================
     * Data Query
     * ===========================================================
     */

    const dataQuery = `

        SELECT

            ${EMPLOYEE_SELECT_COLUMNS}

        ${baseQuery}

        ORDER BY e.${sortColumn} ${sortOrder}

        LIMIT $${index}

        OFFSET $${index + 1};

    `;

    values.push(limit);

    values.push(offset);

    const result = await pool.query(
        dataQuery,
        values
    );

    return {

        employees: result.rows,

        pagination: {

            page: Number(page),

            limit: Number(limit),

            totalRecords,

            totalPages: Math.ceil(
                totalRecords / limit
            )

        }

    };

};

/* ============================================================================
 * Employee Count
 * ============================================================================
 */

export const getEmployeeCountRepository = async () => {

    const query = `
        SELECT COUNT(*) AS total

        FROM employees

        WHERE is_deleted = FALSE;
    `;

    const { rows } = await pool.query(query);

    return Number(rows[0].total);

};

/* ============================================================================
 * Employee Statistics
 * ============================================================================
 */

export const getEmployeeStatisticsRepository = async () => {

    const query = `

        SELECT

            COUNT(*) FILTER (

                WHERE is_deleted = FALSE

            ) AS total_employees,

            COUNT(*) FILTER (

                WHERE status = 'ACTIVE'

                AND is_deleted = FALSE

            ) AS active_employees,

            COUNT(*) FILTER (

                WHERE status = 'INACTIVE'

                AND is_deleted = FALSE

            ) AS inactive_employees,

            COUNT(*) FILTER (

                WHERE status = 'ON_LEAVE'

                AND is_deleted = FALSE

            ) AS on_leave_employees,

            COUNT(*) FILTER (

                WHERE status = 'SUSPENDED'

                AND is_deleted = FALSE

            ) AS suspended_employees,

            COUNT(*) FILTER (

                WHERE role = 'ADMIN'

                AND is_deleted = FALSE

            ) AS admins,

            COUNT(*) FILTER (

                WHERE role = 'MANAGER'

                AND is_deleted = FALSE

            ) AS managers,

            COUNT(*) FILTER (

                WHERE role = 'COUNSELLOR'

                AND is_deleted = FALSE

            ) AS counsellors

        FROM employees;

    `;

    const { rows } = await pool.query(query);

    return rows[0];

};

export const getEmployeePerformanceRepository = async (employeeId, timeframe = "all", dateFrom = null, dateTo = null) => {
    let dateClause = "";
    const params = [employeeId];
    if (dateFrom) {
      dateClause += " AND l.created_at >= $2::date";
      params.push(dateFrom);
    }
    if (dateTo) {
      dateClause += ` AND l.created_at < ($${params.length + 1}::date + INTERVAL '1 day')`;
      params.push(dateTo);
    }
    if (!dateFrom && !dateTo && timeframe === "week") {
      dateClause = " AND l.created_at >= CURRENT_DATE - INTERVAL '7 days'";
    } else if (!dateFrom && !dateTo && timeframe === "month") {
      dateClause = " AND l.created_at >= CURRENT_DATE - INTERVAL '30 days'";
    }

    const [summaryResult, revenueResult, leadsResult, statusBreakdownResult, courseBreakdownResult, weekWiseResult] = await Promise.all([
        pool.query(`
          SELECT
            COUNT(DISTINCT l.id) FILTER (WHERE l.is_deleted = FALSE ${dateClause}) AS total_leads,
            COUNT(DISTINCT l.id) FILTER (WHERE l.is_deleted = FALSE AND UPPER(l.status) IN ('FOLLOW_UP', 'NEW', 'PENDING', 'INTERESTED', 'CONTACTED') ${dateClause}) AS pending_followups,
            COUNT(DISTINCT l.id) FILTER (WHERE l.is_deleted = FALSE AND UPPER(l.status) IN ('ENROLLED', 'ADMISSION', 'ADMISSION_DONE', 'COMPLETED') ${dateClause}) AS enrolled_conversions,
            COUNT(DISTINCT l.id) FILTER (WHERE l.is_deleted = FALSE AND UPPER(l.status) IN ('WALK_IN', 'WALKIN') ${dateClause}) AS walkin_count,
            COUNT(DISTINCT l.id) FILTER (WHERE l.is_deleted = FALSE AND UPPER(l.status) = 'NOT_INTERESTED' ${dateClause}) AS rejected_leads
          FROM employees e
          LEFT JOIN leads l ON l.assigned_to = e.id
          WHERE e.id = $1
        `, params),
        pool.query(`
          SELECT COALESCE(SUM(a.paid_fee), 0) AS total_revenue
          FROM admissions a
          LEFT JOIN leads l ON l.id = a.lead_id
          WHERE (a.assigned_to = $1 OR l.assigned_to = $1) ${dateClause.replaceAll("l.created_at", "a.created_at")};
        `, params),
        pool.query(`
          SELECT
            l.id, l.lead_code, l.full_name, l.mobile, l.email,
            l.interested_course, l.status, l.priority, l.created_at
          FROM leads l
          WHERE l.assigned_to = $1 AND l.is_deleted = FALSE ${dateClause}
          ORDER BY l.created_at DESC
          LIMIT 20;
        `, params),
        pool.query(`
          SELECT
            COALESCE(UPPER(l.status), 'NEW') AS status,
            COUNT(*) AS count
          FROM leads l
          WHERE l.assigned_to = $1 AND l.is_deleted = FALSE ${dateClause}
          GROUP BY UPPER(l.status)
          ORDER BY count DESC;
        `, params),
        pool.query(`
          SELECT
            COALESCE(NULLIF(TRIM(l.interested_course), ''), 'General Inquiry') AS course,
            COUNT(*) AS total_leads,
            COUNT(*) FILTER (WHERE UPPER(l.status) IN ('ENROLLED', 'ADMISSION', 'ADMISSION_DONE', 'COMPLETED')) AS enrolled
          FROM leads l
          WHERE l.assigned_to = $1 AND l.is_deleted = FALSE ${dateClause}
          GROUP BY COALESCE(NULLIF(TRIM(l.interested_course), ''), 'General Inquiry')
          ORDER BY total_leads DESC
          LIMIT 6;
        `, params),
        pool.query(`
          SELECT
            TO_CHAR(DATE_TRUNC('week', l.created_at), 'YYYY-"W"IW') AS week_code,
            'Week ' || TO_CHAR(DATE_TRUNC('week', l.created_at), 'IW') AS week_name,
            TO_CHAR(DATE_TRUNC('week', l.created_at), 'DD Mon') || ' - ' || TO_CHAR(DATE_TRUNC('week', l.created_at) + INTERVAL '6 days', 'DD Mon') AS week_label,
            COUNT(*) AS assigned_count,
            COUNT(*) FILTER (WHERE UPPER(l.status) IN ('ENROLLED', 'ADMISSION', 'ADMISSION_DONE', 'COMPLETED')) AS enrolled_count,
            COUNT(*) FILTER (WHERE UPPER(l.status) IN ('ENROLLED', 'ADMISSION', 'ADMISSION_DONE', 'COMPLETED', 'NOT_INTERESTED')) AS completed_count,
            COUNT(*) FILTER (WHERE UPPER(l.status) IN ('FOLLOW_UP', 'NEW', 'PENDING', 'INTERESTED', 'CONTACTED')) AS pending_count
          FROM leads l
          WHERE l.assigned_to = $1 AND l.is_deleted = FALSE
            AND l.created_at >= CURRENT_DATE - INTERVAL '8 weeks'
          GROUP BY DATE_TRUNC('week', l.created_at)
          ORDER BY DATE_TRUNC('week', l.created_at) DESC
          LIMIT 8;
        `, [employeeId]),
    ]);

    const summaryRow = summaryResult.rows[0] || {};
    const totalLeads = Number(summaryRow.total_leads || 0);
    const enrolledCount = Number(summaryRow.enrolled_conversions || 0);
    const pendingCount = Number(summaryRow.pending_followups || 0);
    const walkinCount = Number(summaryRow.walkin_count || 0);
    const rejectedCount = Number(summaryRow.rejected_leads || 0);
    const totalRevenue = Number(revenueResult.rows[0]?.total_revenue || 0);

    const conversionRate = totalLeads > 0 ? Math.round((enrolledCount / totalLeads) * 100) : 0;

    return {
        summary: {
            total_leads: totalLeads,
            total_assigned: totalLeads,
            pending_followups: pendingCount,
            pending_leads: pendingCount,
            enrolled_conversions: enrolledCount,
            enrolled_count: enrolledCount,
            walkin_count: walkinCount,
            rejected_leads: rejectedCount,
            total_revenue: totalRevenue,
            total_fees_collected: totalRevenue,
            conversion_rate: conversionRate,
            timeframe,
        },
        leads: leadsResult.rows,
        recent_leads: leadsResult.rows,
        status_breakdown: statusBreakdownResult ? statusBreakdownResult.rows : [],
        course_breakdown: courseBreakdownResult ? courseBreakdownResult.rows : [],
        week_wise: weekWiseResult ? weekWiseResult.rows : [],
    };
};
