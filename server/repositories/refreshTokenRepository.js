import pool from "../config/db.js";

/**
 * =====================================================
 * Refresh Token Repository
 * Project : DIZITALADDA CRM
 * =====================================================
 */

/**
 * =====================================================
 * Create Refresh Token
 * =====================================================
 */
export const createRefreshTokenRepository = async (
  client,
  userId,
  token,
  expiresAt
) => {

  const query = `
    INSERT INTO refresh_tokens (
      user_id,
      token,
      expires_at
    )
    VALUES ($1, $2, $3)
    RETURNING *;
  `;

  const values = [
    userId,
    token,
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
 * Find Refresh Token
 * =====================================================
 */
export const findRefreshTokenRepository = async (
  token
) => {

  const query = `
    SELECT *
    FROM refresh_tokens
    WHERE token = $1
    LIMIT 1;
  `;

  const result = await pool.query(
    query,
    [token]
  );

  return result.rows[0];

};

/**
 * =====================================================
 * Delete Refresh Token
 * =====================================================
 */
export const deleteRefreshTokenRepository = async (
  client,
  token
) => {

  const query = `
    DELETE FROM refresh_tokens
    WHERE token = $1
    RETURNING *;
  `;

  const result = await client.query(
    query,
    [token]
  );

  return result.rows[0];

};

/**
 * =====================================================
 * Delete All Refresh Tokens Of User
 * =====================================================
 */
export const deleteAllRefreshTokensRepository =
async (
  client,
  userId
) => {

  const query = `
    DELETE FROM refresh_tokens
    WHERE user_id = $1;
  `;

  await client.query(
    query,
    [userId]
  );

  return true;

};

/**
 * =====================================================
 * Delete Expired Refresh Tokens
 * =====================================================
 */
export const deleteExpiredRefreshTokensRepository =
async () => {

  const query = `
    DELETE FROM refresh_tokens
    WHERE expires_at < CURRENT_TIMESTAMP;
  `;

  await pool.query(query);

  return true;

};

/**
 * =====================================================
 * Get Active Sessions
 * =====================================================
 */
export const getUserSessionsRepository =
async (userId) => {

  const query = `
    SELECT
      id,
      created_at,
      expires_at
    FROM refresh_tokens
    WHERE user_id = $1
    ORDER BY created_at DESC;
  `;

  const result = await pool.query(
    query,
    [userId]
  );

  return result.rows;

};