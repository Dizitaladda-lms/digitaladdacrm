import pool from "../config/db.js";
import crypto from "crypto";

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

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
  expiresAt,
  deviceId
) => {

  const query = `
    INSERT INTO refresh_tokens (
      user_id,
      token,
      expires_at,
      device_id
    )
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;

  const values = [
    userId,
    hashToken(token),
    expiresAt,
    deviceId,
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
export const findRefreshTokenRepository = async (token, client = pool) => {

  const query = `
    SELECT id, user_id, expires_at, device_id
    FROM refresh_tokens
    WHERE token = $1
      AND expires_at > CURRENT_TIMESTAMP
    LIMIT 1
    FOR UPDATE;
  `;

  const result = await client.query(
    query,
    [hashToken(token)]
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
    [hashToken(token)]
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

export const revokeDeviceRefreshTokensRepository = async (client, userId, deviceId) => {
  await client.query(
    `DELETE FROM refresh_tokens WHERE user_id = $1 AND device_id = $2;`,
    [userId, deviceId]
  );
};
