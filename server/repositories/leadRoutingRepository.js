export const getDomainsRepository = async (client) => {
  const { rows } = await client.query(`
    SELECT d.id, d.name, d.is_active,
      COALESCE(json_agg(json_build_object('id', c.id, 'name', c.name, 'is_active', c.is_active)
        ORDER BY c.name) FILTER (WHERE c.id IS NOT NULL), '[]') AS courses
    FROM lead_domains d
    LEFT JOIN domain_courses c ON c.domain_id = d.id
    GROUP BY d.id
    ORDER BY d.name;
  `);
  return rows;
};

export const createDomainRepository = async (client, name) => {
  const { rows } = await client.query(
    `INSERT INTO lead_domains (name) VALUES ($1) RETURNING *;`, [name]
  );
  return rows[0];
};

export const createCourseRepository = async (client, domainId, name) => {
  const { rows } = await client.query(
    `INSERT INTO domain_courses (domain_id, name) VALUES ($1, $2) RETURNING *;`, [domainId, name]
  );
  return rows[0];
};

export const findDomainCourseRepository = async (client, domain, course) => {
  const { rows } = await client.query(`
    SELECT d.id AS domain_id, d.name AS domain_name, c.id AS course_id, c.name AS course_name
    FROM lead_domains d
    LEFT JOIN domain_courses c ON c.domain_id = d.id AND c.is_active = TRUE
    WHERE d.is_active = TRUE AND LOWER(d.name) = LOWER($1)
    ORDER BY CASE WHEN c.id IS NOT NULL AND LOWER(c.name) = LOWER($2) THEN 0 ELSE 1 END
    LIMIT 1;
  `, [domain, course || null]);
  return rows[0] || null;
};

export const createRoutingAssignmentRepository = async (client, { employeeId, domainId, courseId, autoAssign }) => {
  const { rows } = await client.query(`
    INSERT INTO counsellor_routing_assignments (employee_id, domain_id, course_id, auto_assign)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (employee_id, domain_id, course_id)
    DO UPDATE SET auto_assign = EXCLUDED.auto_assign, is_active = TRUE, updated_at = CURRENT_TIMESTAMP
    RETURNING *;
  `, [employeeId, domainId, courseId || null, autoAssign]);
  return rows[0];
};

export const getRoutingAssignmentsRepository = async (client) => {
  const { rows } = await client.query(`
    SELECT ra.id, ra.auto_assign, ra.is_active, ra.last_assigned_at,
      e.id AS employee_id, e.full_name AS employee_name,
      d.id AS domain_id, d.name AS domain_name,
      c.id AS course_id, c.name AS course_name
    FROM counsellor_routing_assignments ra
    JOIN employees e ON e.id = ra.employee_id AND e.is_deleted = FALSE AND e.status = 'ACTIVE'
    JOIN lead_domains d ON d.id = ra.domain_id
    LEFT JOIN domain_courses c ON c.id = ra.course_id
    ORDER BY d.name, c.name NULLS FIRST, e.full_name;
  `);
  return rows;
};

export const deleteRoutingAssignmentRepository = async (client, id) => {
  const { rows } = await client.query(
    `UPDATE counsellor_routing_assignments SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *;`, [id]
  );
  return rows[0] || null;
};

export const selectNextCounsellorRepository = async (client, { domainId, courseId }) => {
  const { rows } = await client.query(`
    SELECT ra.id AS routing_assignment_id, e.id AS employee_id, e.full_name
    FROM counsellor_routing_assignments ra
    JOIN employees e ON e.id = ra.employee_id
    WHERE ra.domain_id = $1
      AND (ra.course_id = $2 OR ra.course_id IS NULL)
      AND ra.auto_assign = TRUE AND ra.is_active = TRUE
      AND e.is_deleted = FALSE AND e.status = 'ACTIVE' AND e.role = 'COUNSELLOR'
    ORDER BY CASE WHEN ra.course_id = $2 THEN 0 ELSE 1 END, ra.last_assigned_at NULLS FIRST, ra.id
    LIMIT 1
    FOR UPDATE OF ra;
  `, [domainId, courseId || null]);
  return rows[0] || null;
};

export const markRoutingAssignmentUsedRepository = async (client, id) => {
  await client.query(`UPDATE counsellor_routing_assignments SET last_assigned_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1;`, [id]);
};

export const applyAutomaticAssignmentRepository = async (client, { leadId, employeeId, ruleDescription }) => {
  const { rows } = await client.query(`
    UPDATE leads
    SET assigned_to = $2, assignment_mode = 'AUTO', routing_rule_description = $3, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *;
  `, [leadId, employeeId, ruleDescription]);
  return rows[0];
};

export const recordAutomaticAssignmentHistoryRepository = async (client, { leadId, employeeId, remarks }) => {
  await client.query(`
    INSERT INTO lead_assignments (lead_id, assigned_by, assigned_to, previous_assigned_to, remarks)
    VALUES ($1, NULL, $2, NULL, $3);
  `, [leadId, employeeId, remarks]);
};

export const recordRoutingTimelineRepository = async (client, { leadId, employeeId, title, description }) => {
  await client.query(`
    INSERT INTO lead_timeline (lead_id, employee_id, activity_type, title, description)
    VALUES ($1, $2, 'LEAD_AUTO_ASSIGNED', $3, $4);
  `, [leadId, employeeId, title, description]);
};

export const selectFallbackCounsellorRepository = async (client) => {
  const { rows } = await client.query(`
    SELECT e.id, e.id AS employee_id, e.full_name
    FROM employees e
    WHERE e.is_deleted = FALSE AND e.status = 'ACTIVE' AND e.role = 'COUNSELLOR'
    ORDER BY (
      SELECT COUNT(*) FROM leads l WHERE l.assigned_to = e.id AND l.is_deleted = FALSE
    ) ASC, e.id ASC
    LIMIT 1;
  `);
  return rows[0] || null;
};


export const selectDomainCounsellorRepository = async (client, domainName) => {
  const cleanDomain = String(domainName || "").trim();
  if (!cleanDomain) return null;

  const { rows } = await client.query(`
    SELECT
      (
        SELECT ra.id 
        FROM counsellor_routing_assignments ra 
        JOIN lead_domains d ON d.id = ra.domain_id 
        WHERE ra.employee_id = e.id AND ra.is_active = TRUE AND LOWER(d.name) = LOWER($1)
        LIMIT 1
      ) AS routing_assignment_id,
      e.id AS employee_id,
      e.full_name
    FROM employees e
    WHERE e.is_deleted = FALSE 
      AND e.status = 'ACTIVE' 
      AND e.role = 'COUNSELLOR'
      AND (
        LOWER(COALESCE(e.domain, '')) = LOWER($1)
        OR (e.assigned_domains IS NOT NULL AND e.assigned_domains::text ILIKE '%' || $1 || '%')
        OR EXISTS (
          SELECT 1 
          FROM counsellor_routing_assignments ra 
          JOIN lead_domains d ON d.id = ra.domain_id 
          WHERE ra.employee_id = e.id 
            AND ra.is_active = TRUE 
            AND ra.auto_assign = TRUE
            AND LOWER(d.name) = LOWER($1)
        )
      )
    ORDER BY (
      SELECT COUNT(*) FROM leads l 
      WHERE l.assigned_to = e.id AND l.is_deleted = FALSE
    ) ASC, (
      SELECT MAX(ra.last_assigned_at)
      FROM counsellor_routing_assignments ra
      WHERE ra.employee_id = e.id
    ) NULLS FIRST, e.id ASC
    LIMIT 1;
  `, [cleanDomain]);

  return rows[0] || null;
};

export const setEmployeeDomainsRepository = async (client, { employeeId, domainIds = [], domainNames = [] }) => {
  // 1. Deactivate old assignments for this employee
  await client.query(
    "UPDATE counsellor_routing_assignments SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE employee_id = $1;",
    [employeeId]
  );

  // 2. Insert or reactivate assignments for selected domain IDs
  for (const domainId of domainIds) {
    await client.query(`
      INSERT INTO counsellor_routing_assignments (employee_id, domain_id, course_id, auto_assign, is_active)
      VALUES ($1, $2, NULL, TRUE, TRUE)
      ON CONFLICT (employee_id, domain_id, course_id)
      DO UPDATE SET auto_assign = TRUE, is_active = TRUE, updated_at = CURRENT_TIMESTAMP;
    `, [employeeId, domainId]);
  }

  // 3. Update employee row with domain and assigned_domains
  const primaryDomain = domainNames.length > 0 ? domainNames[0] : null;
  const { rows } = await client.query(`
    UPDATE employees
    SET domain = $1,
        assigned_domains = $2::jsonb,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
    RETURNING id, full_name, domain, assigned_domains;
  `, [primaryDomain, JSON.stringify(domainNames), employeeId]);

  return rows[0];
};
