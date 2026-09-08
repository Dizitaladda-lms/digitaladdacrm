import pool from "../config/db.js";

/**
 * =====================================================
 * Auth Repository
 * Project : DIZITALADDA CRM
 * =====================================================
 */

/**
 * =====================================================
 * Create User
 * =====================================================
 */
export const createUserRepository = async (
  client,
  userData
) => {

  const {
    full_name,
    email,
    password,
    role,
  } = userData;

  const query = `
    INSERT INTO users (
      full_name,
      email,
      password,
      role
    )
    VALUES ($1, $2, $3, $4)
    RETURNING
      id,
      full_name,
      email,
      role,
      profile_image,
      is_active,
      is_deleted,
      email_verified,
      last_login,
      created_at,
      updated_at;
  `;

  const values = [
    full_name,
    email,
    password,
    role,
  ];

  const result = await client.query(
    query,
    values
  );

  return result.rows[0];

};

/**
 * =====================================================
 * Find User By Email
 * (Without Password)
 * =====================================================
 */
export const findUserByEmailRepository =
async (email) => {

  const query = `
    SELECT
      id,
      full_name,
      email,
      role,
      is_active,
      is_deleted,
      email_verified,
      last_login,
      created_at,
      updated_at
    FROM users
    WHERE email = $1
      AND is_deleted = FALSE;
  `;

  const result = await pool.query(
    query,
    [email]
  );

  return result.rows[0];

};

/**
 * =====================================================
 * Find User By Email
 * (With Password)
 * Used For Login
 * =====================================================
 */
export const findUserByEmailWithPasswordRepository =
async (email) => {

  const query = `
    SELECT *
    FROM users
    WHERE email = $1
      AND is_deleted = FALSE;
  `;

  const result = await pool.query(
    query,
    [email]
  );

  return result.rows[0];

};

/**
 * =====================================================
 * Find User By ID
 * =====================================================
 */
export const findUserByIdRepository =
async (id) => {

  const query = `
    SELECT
      id,
      full_name,
      email,
      role,
      profile_image,
      is_active,
      is_deleted,
      email_verified,
      last_login,
      created_at,
      updated_at
    FROM users
    WHERE id = $1
      AND is_deleted = FALSE;
  `;

  const result = await pool.query(
    query,
    [id]
  );

  return result.rows[0];

};

export const updateOwnProfileRepository = async (userId, profile) => {
  const query = `
    UPDATE users
    SET full_name = $1,
        profile_image = $2,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $3 AND is_deleted = FALSE
    RETURNING id, full_name, email, role, profile_image, is_active, email_verified, updated_at;
  `;

  const result = await pool.query(query, [
    profile.full_name,
    profile.profile_image || null,
    userId,
  ]);

  return result.rows[0];
};

/**
 * =====================================================
 * Update Password
 * =====================================================
 */
export const updatePasswordRepository = async (
  client,
  userId,
  hashedPassword
) => {

  const query = `
    UPDATE users
    SET
      password = $1,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
      AND is_deleted = FALSE
    RETURNING
      id,
      full_name,
      email,
      role,
      is_active,
      email_verified,
      last_login,
      created_at,
      updated_at;
  `;

  const values = [
    hashedPassword,
    userId,
  ];

  const result = await client.query(
    query,
    values
  );

  return result.rows[0];

};

/**
 * =====================================================
 * Update Last Login
 * =====================================================
 */
export const updateLastLoginRepository = async (
  userId
) => {

  const query = `
    UPDATE users
    SET
      last_login = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
      AND is_deleted = FALSE
    RETURNING last_login;
  `;

  const result = await pool.query(
    query,
    [userId]
  );

  return result.rows[0];

};

/**
 * =====================================================
 * Verify Email
 * =====================================================
 */
export const updateEmailVerificationRepository =
async (client, userId) => {

  const query = `
    UPDATE users
    SET
      email_verified = TRUE,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
      AND is_deleted = FALSE
    RETURNING
      id,
      full_name,
      email,
      role,
      email_verified,
      updated_at;
  `;

  const result = await client.query(
    query,
    [userId]
  );

  return result.rows[0];

};

/**
 * =====================================================
 * Activate / Deactivate User
 * =====================================================
 */
export const updateUserStatusRepository =
async (
  client,
  userId,
  isActive
) => {

  const query = `
    UPDATE users
    SET
      is_active = $1,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
      AND is_deleted = FALSE
    RETURNING
      id,
      full_name,
      email,
      role,
      is_active,
      updated_at;
  `;

  const result = await client.query(
    query,
    [
      isActive,
      userId,
    ]
  );

  return result.rows[0];

};

/**
 * =====================================================
 * Soft Delete User
 * =====================================================
 */
export const softDeleteUserRepository =
async (
  client,
  userId
) => {

  const query = `
    UPDATE users
    SET
      is_deleted = TRUE,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING
      id,
      full_name,
      email,
      role,
      is_deleted,
      updated_at;
  `;

  const result = await client.query(
    query,
    [userId]
  );

  return result.rows[0];

};

/**
 * =====================================================
 * Restore User
 * (Admin Only)
 * =====================================================
 */
export const restoreUserRepository = async (
  client,
  userId
) => {

  const query = `
    UPDATE users
    SET
      is_deleted = FALSE,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING
      id,
      full_name,
      email,
      role,
      is_active,
      is_deleted,
      email_verified,
      last_login,
      created_at,
      updated_at;
  `;

  const result = await client.query(
    query,
    [userId]
  );

  return result.rows[0];

};

/**
 * =====================================================
 * Get All Users
 * =====================================================
 */
export const getAllUsersRepository = async (
  {
    page = 1,
    limit = 10,
    search = "",
    role = "",
    isActive = "",
  }
) => {

  const offset = (page - 1) * limit;

  const values = [];
  let index = 1;

  let query = `
    SELECT
      id,
      full_name,
      email,
      role,
      is_active,
      email_verified,
      last_login,
      created_at,
      updated_at
    FROM users
    WHERE is_deleted = FALSE
  `;

  if (search) {
    query += `
      AND (
        full_name ILIKE $${index}
        OR email ILIKE $${index}
      )
    `;
    values.push(`%${search}%`);
    index++;
  }

  if (role) {
    query += `
      AND role = $${index}
    `;
    values.push(role);
    index++;
  }

  if (isActive !== "") {
    query += `
      AND is_active = $${index}
    `;
    values.push(isActive);
    index++;
  }

  query += `
    ORDER BY created_at DESC
    LIMIT $${index}
    OFFSET $${index + 1};
  `;

  values.push(limit);
  values.push(offset);

  const result = await pool.query(
    query,
    values
  );

  return result.rows;

};

/**
 * =====================================================
 * Get Total Users Count
 * =====================================================
 */
export const getUserCountRepository = async (
  {
    search = "",
    role = "",
    isActive = "",
  }
) => {

  const values = [];
  let index = 1;

  let query = `
    SELECT COUNT(*) AS total
    FROM users
    WHERE is_deleted = FALSE
  `;

  if (search) {
    query += `
      AND (
        full_name ILIKE $${index}
        OR email ILIKE $${index}
      )
    `;
    values.push(`%${search}%`);
    index++;
  }

  if (role) {
    query += `
      AND role = $${index}
    `;
    values.push(role);
    index++;
  }

  if (isActive !== "") {
    query += `
      AND is_active = $${index}
    `;
    values.push(isActive);
    index++;
  }

  const result = await pool.query(
    query,
    values
  );

  return Number(result.rows[0].total);

};

