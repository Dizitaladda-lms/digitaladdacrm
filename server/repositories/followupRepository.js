import pool from "../config/db.js";

/* ============================================================================
 * FOLLOW-UP REPOSITORY
 * Enterprise Repository
 * Version : 1.0
 * ============================================================================
 */

/* ============================================================================
 * TABLE
 * ============================================================================
 */

const TABLE = "lead_followups";

/* ============================================================================
 * COLUMN DEFINITIONS
 * ============================================================================
 */

const FOLLOWUP_COLUMNS = `
    lf.id,
    lf.lead_id,
    lf.employee_id,
    lf.followup_type,
    lf.status,
    lf.outcome,
    lf.priority,
    lf.next_followup_at,
    lf.remarks,
    lf.created_by,
    lf.updated_by,
    lf.created_at,
    lf.updated_at,
    lf.is_deleted,
    lf.deleted_at,
    lf.deleted_by
`;
const LEAD_COLUMNS = `
    l.lead_code,
    l.full_name AS lead_name,
    l.mobile,
    l.email,
    l.interested_course
`;

const EMPLOYEE_COLUMNS = `
    e.employee_code,
    e.full_name AS counsellor_name
`;

/* ============================================================================
 * JOINS
 * ============================================================================
 */

const LEAD_JOIN = `
INNER JOIN leads l
ON l.id = lf.lead_id
`;

const EMPLOYEE_JOIN = `
LEFT JOIN employees e
ON e.id = lf.employee_id
`;

/* ============================================================================
 * FILTERS
 * ============================================================================
 */

const SOFT_DELETE_FILTER = "lf.is_deleted = FALSE";

/* ============================================================================
 * DEFAULTS
 * ============================================================================
 */

const DEFAULT_PAGE = 1;

const DEFAULT_LIMIT = 20;

const MAX_LIMIT = 100;

const DEFAULT_SORT_BY = "created_at";

const DEFAULT_SORT_ORDER = "DESC";

/* ============================================================================
 * ALLOWED SORT COLUMNS
 * SQL Injection Protection
 * ============================================================================
 */

const ALLOWED_SORT_COLUMNS = [

    "created_at",

    "updated_at",

    "next_followup_at",

    "priority",

    "status",

    "outcome"

];

/* ============================================================================
 * PAGINATION
 * ============================================================================
 */

const getPagination = (

    page = DEFAULT_PAGE,

    limit = DEFAULT_LIMIT

) => {

    const currentPage =
        Math.max(Number(page) || DEFAULT_PAGE, 1);

    const currentLimit =
        Math.min(
            Math.max(Number(limit) || DEFAULT_LIMIT, 1),
            MAX_LIMIT
        );

    return {

        page: currentPage,

        limit: currentLimit,

        offset: (currentPage - 1) * currentLimit,

    };

};

/* ============================================================================
 * SORT BUILDER
 * ============================================================================
 */

const buildSort = (

    sortBy = DEFAULT_SORT_BY,

    sortOrder = DEFAULT_SORT_ORDER

) => {

    const column =

        ALLOWED_SORT_COLUMNS.includes(sortBy)

            ? sortBy

            : DEFAULT_SORT_BY;

    const order =

        String(sortOrder).toUpperCase() === "ASC"

            ? "ASC"

            : "DESC";

    return `ORDER BY lf.${column} ${order}`;

};

/* ============================================================================
 * SEARCH BUILDER
 * ============================================================================
 */

const buildSearch = (

    search,

    values,

    index

) => {

    if (!search?.trim()) {

        return {

            clause: "",

            values,

            index,

        };

    }

    values.push(`%${search.trim()}%`);

    return {

        clause: `

        AND (

            l.full_name ILIKE $${index}

            OR

            l.mobile ILIKE $${index}

            OR

            l.lead_code ILIKE $${index}

        )

        `,

        values,

        index: index + 1,

    };

};

/* ============================================================================
 * DUE FILTER
 * ============================================================================
 */

const buildDueFilter = (dueType) => {

    switch (dueType) {

        case "TODAY":

            return `
            AND DATE(lf.next_followup_at)=CURRENT_DATE
            `;

        case "TOMORROW":

            return `
            AND DATE(lf.next_followup_at)=CURRENT_DATE + 1
            `;

        case "OVERDUE":

            return `
            AND lf.status='PENDING'
            AND lf.next_followup_at < NOW()
            `;

        case "UPCOMING":

            return `
            AND lf.next_followup_at > NOW()
            `;

        case "NEXT_7_DAYS":

            return `
            AND lf.next_followup_at
            BETWEEN NOW()
            AND NOW()+INTERVAL '7 DAY'
            `;

        default:

            return "";

    }

};

/* ============================================================================
 * WHERE BUILDER
 * ============================================================================
 */

const buildWhereClause = (filters = {}) => {

    const clauses = [

        SOFT_DELETE_FILTER

    ];

    const values = [];

    let index = 1;

    const addFilter = (condition, value) => {

        clauses.push(condition);

        values.push(value);

        index++;

    };

    if (filters.employeeId) {

        addFilter(

            `(lf.employee_id = $${index} OR (lf.employee_id IS NULL AND l.assigned_to = $${index}))`,

            filters.employeeId

        );

    }

    if (filters.leadId) {

        addFilter(

            `lf.lead_id = $${index}`,

            filters.leadId

        );

    }

    if (filters.status) {

        addFilter(

            `lf.status = $${index}`,

            filters.status

        );

    }

    if (filters.priority) {

        addFilter(

            `lf.priority = $${index}`,

            filters.priority

        );

    }

    if (filters.outcome) {

        addFilter(

            `lf.outcome = $${index}`,

            filters.outcome

        );

    }

    return {

        where: clauses.join("\nAND "),

        values,

        index,

    };

};

/* ============================================================================
 * PRIVATE QUERY EXECUTOR
 * ============================================================================
 */

const executeQuery = async (client, query, values = []) => {

    const { rows } = await client.query(query, values);

    return rows;

};

/* ============================================================================
 * DYNAMIC UPDATE QUERY BUILDER
 * ============================================================================
 */

const buildUpdateQuery = (

    table,

    id,

    fields,

    idColumn = "id"

) => {

    const updates = [];

    const values = [];

    let index = 1;

    Object.entries(fields).forEach(([column, value]) => {

        updates.push(`${column} = $${index}`);

        values.push(value);

        index++;

    });

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    values.push(id);

    return {

        query: `

            UPDATE ${table}

            SET

                ${updates.join(",\n")}

            WHERE

                ${idColumn} = $${index}

                AND is_deleted = FALSE

            RETURNING *;

        `,

        values,

    };

};

/* ============================================================================
 * EXECUTE UPDATE
 * ============================================================================
 */

const executeUpdate = async (

    client,

    table,

    id,

    fields

) => {

    const {

        query,

        values,

    } = buildUpdateQuery(

        table,

        id,

        fields

    );

    const rows = await executeQuery(

        client,

        query,

        values

    );

    return rows[0] || null;

};

export const createFollowupRepository = async (
    client,
    followup
) => {

    const query = `
        INSERT INTO lead_followups (

            lead_id,
            employee_id,
            followup_type,
            status,
            outcome,
            priority,
            next_followup_at,
            remarks,
            created_by

        )

        VALUES (

            $1,$2,$3,$4,$5,$6,$7,$8,$9

        )

        RETURNING *;
    `;

    const values = [

        followup.lead_id,
        followup.employee_id,
        followup.followup_type,
        followup.status,
        followup.outcome,
        followup.priority,
        followup.next_followup_at,
        followup.remarks,
        followup.created_by,

    ];

    const rows = await executeQuery(
        client,
        query,
        values
    );

    return rows[0] || null;

};

export const updateFollowupRepository = (

    client,

    followupId,

    fields

) => executeUpdate(

    client,

    TABLE,

    followupId,

    fields

);

export const completeFollowupRepository = (

    client,

    followupId,

    outcome,

    remarks,

    updatedBy

) => executeUpdate(

    client,

    TABLE,

    followupId,

    {

        status: "COMPLETED",

        outcome,

        remarks,

        updated_by: updatedBy,

    }

);

export const rescheduleFollowupRepository = (

    client,

    followupId,

    nextFollowupAt,

    remarks,

    updatedBy

) => executeUpdate(

    client,

    TABLE,

    followupId,

   {
    next_followup_at: nextFollowupAt,
    remarks,
    updated_by: updatedBy,
}

);

export const softDeleteFollowupRepository = (

    client,

    followupId,

    deletedBy

) => executeUpdate(

    client,

    TABLE,

    followupId,

    {

        is_deleted: true,

        deleted_by: deletedBy,

        deleted_at: new Date(),

        updated_by: deletedBy,

    }

);

export const restoreFollowupRepository = async (
    client,
    followupId,
    updatedBy
) => {

    const query = `
        UPDATE lead_followups
        SET
            is_deleted = FALSE,
            deleted_at = NULL,
            deleted_by = NULL,
            updated_by = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE
            id = $1
            AND is_deleted = TRUE
        RETURNING *;
    `;

    const { rows } = await client.query(query, [
        followupId,
        updatedBy,
    ]);

    return rows[0] || null;
};
/* ============================================================================
 * UNIVERSAL FOLLOWUP REPOSITORY
 * ============================================================================
 */

export const getFollowupsRepository = async ({
    employeeId,
    leadId,
    status,
    priority,
    outcome,
    dueType,
    search,
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
    sortBy = DEFAULT_SORT_BY,
    sortOrder = DEFAULT_SORT_ORDER,
}) => {

    /* -------------------------------------------------------------
     * WHERE
     * ------------------------------------------------------------- */

    const whereResult = buildWhereClause({
        employeeId,
        leadId,
        status,
        priority,
        outcome,
    });

    /* -------------------------------------------------------------
     * SEARCH
     * ------------------------------------------------------------- */

    const searchResult = buildSearch(
        search,
        whereResult.values,
        whereResult.index
    );

    /* -------------------------------------------------------------
     * PAGINATION
     * ------------------------------------------------------------- */

    const pagination = getPagination(page, limit);

    /* -------------------------------------------------------------
     * SORTING
     * ------------------------------------------------------------- */

    const orderBy = buildSort(sortBy, sortOrder);

    /* -------------------------------------------------------------
     * DUE FILTER
     * ------------------------------------------------------------- */

    const dueFilter = buildDueFilter(dueType);

    /* -------------------------------------------------------------
     * FINAL VALUES
     * ------------------------------------------------------------- */

    const values = [...searchResult.values];

    values.push(pagination.limit);
    values.push(pagination.offset);

    const limitIndex = values.length - 1;
    const offsetIndex = values.length;

    /* -------------------------------------------------------------
     * DATA QUERY
     * ------------------------------------------------------------- */

    const dataQuery = `

        SELECT

            ${FOLLOWUP_COLUMNS},

            ${LEAD_COLUMNS},

            ${EMPLOYEE_COLUMNS}

        FROM lead_followups lf

        ${LEAD_JOIN}

        ${EMPLOYEE_JOIN}

        WHERE

            ${whereResult.where}

            ${searchResult.clause}

            ${dueFilter}

        ${orderBy}

        LIMIT $${limitIndex}

        OFFSET $${offsetIndex};

    `;

    /* -------------------------------------------------------------
     * COUNT QUERY
     * ------------------------------------------------------------- */

    const countQuery = `

        SELECT COUNT(*) AS total

        FROM lead_followups lf

        ${LEAD_JOIN}

        ${EMPLOYEE_JOIN}

        WHERE

            ${whereResult.where}

            ${searchResult.clause}

            ${dueFilter};

    `;

    const [dataResult, countResult] = await Promise.all([
        pool.query(dataQuery, values),
        pool.query(countQuery, searchResult.values),
    ]);

    let dataList = dataResult.rows;
    let total = Number(countResult.rows[0].total || 0);

    // Direct Sync with `leads` table if lead_followups contains no rows
    if (dataList.length === 0) {
      try {
        const whereLeads = employeeId
          ? "WHERE l.assigned_to = $1 AND l.is_deleted = FALSE AND (l.status = 'FOLLOW_UP' OR l.next_followup IS NOT NULL)"
          : "WHERE l.is_deleted = FALSE AND (l.status = 'FOLLOW_UP' OR l.next_followup IS NOT NULL)";
        const params = employeeId ? [employeeId, pagination.limit, pagination.offset] : [pagination.limit, pagination.offset];
        const countParams = employeeId ? [employeeId] : [];

        const leadsQuery = `
          SELECT
            l.id AS id,
            l.id AS lead_id,
            l.lead_code,
            l.full_name AS lead_name,
            l.mobile,
            l.email,
            l.interested_course,
            l.status AS lead_status,
            l.priority,
            COALESCE(l.next_followup, l.created_at + INTERVAL '1 day') AS next_followup_at,
            'CALL' AS followup_type,
            CASE WHEN UPPER(l.status) IN ('ENROLLED', 'ADMISSION', 'ADMISSION_DONE', 'NOT_INTERESTED', 'COMPLETED') THEN 'COMPLETED' ELSE 'PENDING' END AS status,
            l.remarks,
            e.full_name AS counsellor_name
          FROM leads l
          LEFT JOIN employees e ON e.id = l.assigned_to
          ${whereLeads}
          ORDER BY next_followup_at ASC
          LIMIT $${employeeId ? 2 : 1} OFFSET $${employeeId ? 3 : 2};
        `;
        const countQueryStr = `SELECT COUNT(*) FROM leads l ${whereLeads};`;
        const [leadsRes, countRes] = await Promise.all([
          pool.query(leadsQuery, params),
          pool.query(countQueryStr, countParams),
        ]);
        dataList = leadsRes.rows;
        total = Number(countRes.rows[0].count || 0);
      } catch (syncErr) {
        console.warn("Direct leads table sync notice:", syncErr.message);
      }
    }

    return {
        data: dataList,
        pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total,
            totalPages: Math.ceil(total / pagination.limit) || 1,
            hasNext: pagination.page < Math.ceil(total / pagination.limit),
            hasPrevious: pagination.page > 1,
        },
    };
};

export const getTodayFollowupsRepository = (
    employeeId,
    options = {}
) =>
    getFollowupsRepository({
        employeeId,
        dueType: "TODAY",
        ...options,
    });

export const getPendingFollowupsRepository = (
    employeeId,
    options = {}
) =>
    getFollowupsRepository({
        employeeId,
        status: "PENDING",
        ...options,
    });


export const getCompletedFollowupsRepository = (
    employeeId,
    options = {}
) =>
    getFollowupsRepository({
        employeeId,
        status: "COMPLETED",
        ...options,
    });

export const getOverdueFollowupsRepository = (
    employeeId,
    options = {}
) =>
    getFollowupsRepository({
        employeeId,
        dueType: "OVERDUE",
        ...options,
    });

export const getUpcomingFollowupsRepository = (
    employeeId,
    options = {}
) =>
    getFollowupsRepository({
        employeeId,
        dueType: "UPCOMING",
        ...options,
    });

export const getTomorrowFollowupsRepository = (
    employeeId,
    options = {}
) =>
    getFollowupsRepository({
        employeeId,
        dueType: "TOMORROW",
        ...options,
    });

export const getMissedFollowupsRepository = (
    employeeId,
    options = {}
) =>
    getFollowupsRepository({
        employeeId,
        status: "MISSED",
        ...options,
    });

export const findFollowupByIdRepository = async (
    followupId,
    client = pool,
    includeDeleted = false
) => {

    console.log("followupId:", followupId);
    console.log("includeDeleted:", includeDeleted);

    const query = `
        SELECT
            ${FOLLOWUP_COLUMNS},
            ${LEAD_COLUMNS},
            ${EMPLOYEE_COLUMNS}
        FROM lead_followups lf
        ${LEAD_JOIN}
        ${EMPLOYEE_JOIN}
        WHERE
            lf.id = $1
            ${includeDeleted ? "" : "AND lf.is_deleted = FALSE"}
    `;

    console.log(query);

    const { rows } = await client.query(query, [followupId]);

    console.log(rows);

    return rows[0] || null;
};

export const checkFollowupOwnershipRepository = async (
    followupId,
    employeeId
) => {

    const query = `
        SELECT 1

        FROM lead_followups

        WHERE
            id = $1
            AND employee_id = $2
            AND is_deleted = FALSE
    `;

    const { rowCount } = await pool.query(query, [
        followupId,
        employeeId,
    ]);

    return rowCount > 0;
};

export const checkPendingFollowupRepository = async (
    leadId
) => {

    const query = `

        SELECT EXISTS(

            SELECT 1

            FROM lead_followups

            WHERE

                lead_id=$1

                AND status='PENDING'

                AND is_deleted=FALSE

        ) AS exists;

    `;

    const { rows } = await pool.query(query, [leadId]);

    return rows[0].exists;

};

export const checkLeadAssignmentRepository = async (
    leadId,
    employeeId
) => {

    const query = `

        SELECT EXISTS(

            SELECT 1

            FROM lead_assignments

            WHERE

                lead_id=$1

                AND employee_id=$2

        ) AS assigned;

    `;

    const { rows } = await pool.query(query, [
        leadId,
        employeeId,
    ]);

    return rows[0].assigned;

};

export const getLatestFollowupRepository = async (
    leadId
) => {

    const query = `

        SELECT

            ${FOLLOWUP_COLUMNS}

        FROM lead_followups lf

        WHERE

            lf.lead_id=$1

            AND lf.is_deleted=FALSE

        ORDER BY

            lf.created_at DESC

        LIMIT 1;

    `;

    const { rows } = await pool.query(query, [leadId]);

    return rows[0] || null;

};
export const getFollowupTimelineRepository = async (
    leadId
) => {

    const query = `

        SELECT

            ${FOLLOWUP_COLUMNS},

            ${EMPLOYEE_COLUMNS}

        FROM lead_followups lf

        ${EMPLOYEE_JOIN}

        WHERE

            lf.lead_id=$1

            AND lf.is_deleted=FALSE

        ORDER BY

            lf.created_at DESC;

    `;

    const { rows } = await pool.query(query, [leadId]);

    return rows;

};

export const getFollowupStatisticsRepository =
async () => {

    const query = `

    SELECT

    COUNT(*) FILTER(
        WHERE status='PENDING'
    ) AS pending,

    COUNT(*) FILTER(
        WHERE status='COMPLETED'
    ) AS completed,

    COUNT(*) FILTER(
        WHERE status='MISSED'
    ) AS missed,

    COUNT(*) FILTER(
        WHERE next_followup_at<CURRENT_TIMESTAMP
        AND status='PENDING'
    ) AS overdue

    FROM lead_followups

    WHERE is_deleted=FALSE;

    `;

    const { rows } = await pool.query(query);

    return rows[0];

};

export const getCounsellorPerformanceRepository =
async () => {

    const query = `

SELECT

e.id,

e.full_name,

COUNT(lf.id) total,

COUNT(*) FILTER(
WHERE lf.status='COMPLETED'
) completed,

COUNT(*) FILTER(
WHERE lf.status='PENDING'
) pending

FROM employees e

LEFT JOIN lead_followups lf

ON lf.employee_id=e.id

AND lf.is_deleted=FALSE

GROUP BY

e.id,
e.full_name

ORDER BY

completed DESC;

`;

    const { rows } = await pool.query(query);

    return rows;

};

export const getDailyFollowupTrendRepository = async (
    days = 30
) => {

    const query = `

        SELECT

            DATE(created_at) AS date,

            COUNT(*) AS total,

            COUNT(*) FILTER (
                WHERE status = 'COMPLETED'
            ) AS completed,

            COUNT(*) FILTER (
                WHERE status = 'PENDING'
            ) AS pending

        FROM lead_followups

        WHERE

            is_deleted = FALSE

            AND created_at >= CURRENT_DATE - ($1::INTEGER - 1)

        GROUP BY DATE(created_at)

        ORDER BY DATE(created_at);

    `;

    const { rows } = await pool.query(query, [days]);
    
    return rows;

};

export const getOutcomeAnalyticsRepository = async () => {

    const query = `

        SELECT

            outcome,

            COUNT(*) AS total

        FROM lead_followups

        WHERE

            is_deleted = FALSE

        GROUP BY outcome

        ORDER BY total DESC;

    `;

    const { rows } = await pool.query(query);

    return rows;

};

export const getPriorityAnalyticsRepository = async () => {

    const query = `

        SELECT

            priority,

            COUNT(*) total

        FROM lead_followups

        WHERE

            is_deleted = FALSE

        GROUP BY priority

        ORDER BY priority;

    `;

    const { rows } = await pool.query(query);

    return rows;

};

export const getConversionAnalyticsRepository = async () => {

    const query = `

        SELECT

            outcome,

            COUNT(*) total

        FROM lead_followups

        WHERE

            is_deleted = FALSE

            AND outcome IS NOT NULL

        GROUP BY outcome

        ORDER BY total DESC;

    `;

    const { rows } = await pool.query(query);

    return rows;

};

export const bulkCompleteFollowupsRepository = async (
    client,
    followupIds,
    outcome,
    remarks,
    updatedBy
) => {

    const query = `

        UPDATE lead_followups

        SET

            status = 'COMPLETED',

            outcome = $2,

            remarks = $3,

            updated_by = $4,

            updated_at = CURRENT_TIMESTAMP

        WHERE

            id = ANY($1::int[])

            AND is_deleted = FALSE

        RETURNING id;

    `;

    const { rows } = await client.query(query, [

        followupIds,

        outcome,

        remarks,

        updatedBy,

    ]);

    return rows;

};

export const bulkSoftDeleteFollowupsRepository = async (
    client,
    followupIds,
    deletedBy
) => {

    const query = `

        UPDATE lead_followups

        SET

            is_deleted = TRUE,

            deleted_by = $2,

            deleted_at = CURRENT_TIMESTAMP,

            updated_by = $2,

            updated_at = CURRENT_TIMESTAMP

        WHERE

            id = ANY($1::int[])

            AND is_deleted = FALSE

        RETURNING id;

    `;

    const { rows } = await client.query(query, [

        followupIds,

        deletedBy,

    ]);

    return rows;

};

export const bulkRestoreFollowupsRepository = async (
    client,
    followupIds,
    updatedBy
) => {

    const query = `

        UPDATE lead_followups

        SET

            is_deleted = FALSE,

            deleted_at = NULL,

            deleted_by = NULL,

            updated_by = $2,

            updated_at = CURRENT_TIMESTAMP

        WHERE

            id = ANY($1::int[])

        RETURNING id;

    `;

    const { rows } = await client.query(query, [

        followupIds,

        updatedBy,

    ]);

    return rows;

};

export const bulkAssignFollowupsRepository = async (
    client,
    followupIds,
    employeeId,
    updatedBy
) => {

    const query = `

        UPDATE lead_followups

        SET

            employee_id = $2,

            updated_by = $3,

            updated_at = CURRENT_TIMESTAMP

        WHERE

            id = ANY($1::int[])

            AND is_deleted = FALSE

        RETURNING id;

    `;

    const { rows } = await client.query(query, [

        followupIds,

        employeeId,

        updatedBy,

    ]);

    return rows;

};


