import pool from "../config/db.js";

/**
 * =====================================================
 * Password Reset Repository
 * Project : DIZITALADDA CRM
 * =====================================================
 */

/**
 * =====================================================
 * Create Password Reset Token
 * =====================================================
 */
export const createPasswordResetRepository = async (
  client,
  userId,
  resetToken,
  expiresAt
) => {

  const query = `
    INSERT INTO password_resets (
      user_id,
      reset_token,
      expires_at
    )
    VALUES ($1, $2, $3)
    RETURNING *;
  `;

  const values = [
    userId,
    resetToken,
    expiresAt,
  ];

  const result = await client.query(
    query,
    values
  );

  return result.rows[0];

};

/**
 * =====================================================
 * Find Password Reset Token
 * =====================================================
 */
export const findPasswordResetRepository = async (
  resetToken
) => {

  const query = `
    SELECT *
    FROM password_resets
    WHERE reset_token = $1
      AND used = FALSE
    LIMIT 1;
  `;

  const result = await pool.query(
    query,
    [resetToken]
  );

  return result.rows[0];

};

/**
 * =====================================================
 * Mark Reset Token Used
 * =====================================================
 */
export const markPasswordResetUsedRepository =
async (
  client,
  id
) => {

  const query = `
    UPDATE password_resets
    SET
      used = TRUE
    WHERE id = $1
    RETURNING *;
  `;

  const result = await client.query(
    query,
    [id]
  );

  return result.rows[0];

};

/**
 * =====================================================
 * Delete Expired Reset Tokens
 * =====================================================
 */
export const deleteExpiredPasswordResetRepository =
async () => {

  const query = `
    DELETE FROM password_resets
    WHERE expires_at < CURRENT_TIMESTAMP;
  `;

  await pool.query(query);

  return true;

};

/**
 * =====================================================
 * Delete User Reset Tokens
 * =====================================================
 */
export const deleteUserPasswordResetRepository =
async (
  client,
  userId
) => {

  const query = `
    DELETE FROM password_resets
    WHERE user_id = $1;
  `;

  await client.query(
    query,
    [userId]
  );

  return true;

};