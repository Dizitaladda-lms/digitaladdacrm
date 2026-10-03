import pool from "../config/db.js";

/**
 * ==========================================================
 * ASSIGNED TASKS & WORK REVISION REPOSITORY
 * ==========================================================
 */

/**
 * Create a new task / assigned work
 */
export const createTaskRepository = async (data) => {
  const query = `
    INSERT INTO assigned_tasks (
      title,
      description,
      assigned_by_id,
      assigned_to_id,
      department_id,
      report_id,
      priority,
      status,
      due_date,
      revision_feedback
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *;
  `;

  const values = [
    data.title,
    data.description || null,
    data.assigned_by_id,
    data.assigned_to_id,
    data.department_id || null,
    data.report_id || null,
    data.priority || "MEDIUM",
    data.status || "PENDING",
    data.due_date || null,
    data.revision_feedback || null,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Find task by ID with employee, assigner, department & report details
 */
export const findTaskByIdRepository = async (taskId) => {
  const query = `
    SELECT 
      t.*,
      to_u.full_name AS assigned_to_name,
      to_u.email AS assigned_to_email,
      to_e.designation AS assigned_to_designation,
      by_u.full_name AS assigned_by_name,
      d.department_name,
      r.work_title AS report_work_title,
      r.tasks_summary AS report_tasks_summary,
      r.report_date AS report_date
    FROM assigned_tasks t
    LEFT JOIN users to_u ON t.assigned_to_id = to_u.id
    LEFT JOIN employees to_e ON to_u.id = to_e.user_id
    LEFT JOIN users by_u ON t.assigned_by_id = by_u.id
    LEFT JOIN departments d ON t.department_id = d.id
    LEFT JOIN daily_work_reports r ON t.report_id = r.id
    WHERE t.id = $1;
  `;

  const result = await pool.query(query, [taskId]);
  return result.rows[0] || null;
};

/**
 * Find list of tasks with filters
 */
export const findTasksRepository = async ({
  assignedToId,
  assignedById,
  departmentId,
  status,
  reportId,
  search,
  page = 1,
  limit = 30,
} = {}) => {
  const offset = (page - 1) * limit;
  const whereClauses = [];
  const values = [];
  let paramIdx = 1;

  if (assignedToId) {
    whereClauses.push(`t.assigned_to_id = $${paramIdx++}`);
    values.push(assignedToId);
  }

  if (assignedById) {
    whereClauses.push(`t.assigned_by_id = $${paramIdx++}`);
    values.push(assignedById);
  }

  if (departmentId) {
    whereClauses.push(`t.department_id = $${paramIdx++}`);
    values.push(departmentId);
  }

  if (status) {
    whereClauses.push(`t.status = $${paramIdx++}`);
    values.push(status);
  }

  if (reportId) {
    whereClauses.push(`t.report_id = $${paramIdx++}`);
    values.push(reportId);
  }

  if (search) {
    whereClauses.push(`(t.title ILIKE $${paramIdx} OR t.description ILIKE $${paramIdx} OR to_u.full_name ILIKE $${paramIdx})`);
    values.push(`%${search}%`);
    paramIdx++;
  }

  const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM assigned_tasks t
    LEFT JOIN users to_u ON t.assigned_to_id = to_u.id
    ${whereStr};
  `;
  const countRes = await pool.query(countQuery, values);
  const total = parseInt(countRes.rows[0].total, 10);

  const query = `
    SELECT 
      t.*,
      to_u.full_name AS assigned_to_name,
      to_u.email AS assigned_to_email,
      to_e.designation AS assigned_to_designation,
      by_u.full_name AS assigned_by_name,
      d.department_name,
      r.work_title AS report_work_title,
      r.tasks_summary AS report_tasks_summary,
      r.report_date AS report_date
    FROM assigned_tasks t
    LEFT JOIN users to_u ON t.assigned_to_id = to_u.id
    LEFT JOIN employees to_e ON to_u.id = to_e.user_id
    LEFT JOIN users by_u ON t.assigned_by_id = by_u.id
    LEFT JOIN departments d ON t.department_id = d.id
    LEFT JOIN daily_work_reports r ON t.report_id = r.id
    ${whereStr}
    ORDER BY t.created_at DESC
    LIMIT $${paramIdx++} OFFSET $${paramIdx++};
  `;

  values.push(limit, offset);
  const result = await pool.query(query, values);

  return {
    tasks: result.rows,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Update task status & revision feedback
 */
export const updateTaskStatusRepository = async (taskId, status, revisionFeedback = null) => {
  const query = `
    UPDATE assigned_tasks
    SET 
      status = $1,
      revision_feedback = COALESCE($2, revision_feedback),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
    RETURNING *;
  `;
  const result = await pool.query(query, [status, revisionFeedback, taskId]);
  return result.rows[0];
};

/**
 * Delete task
 */
export const deleteTaskRepository = async (taskId) => {
  const query = `DELETE FROM assigned_tasks WHERE id = $1 RETURNING id;`;
  const result = await pool.query(query, [taskId]);
  return result.rows[0];
};
