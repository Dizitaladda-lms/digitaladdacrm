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
      AND revoked_at IS NULL
    LIMIT 1
    FOR UPDATE;
  `;

  const result = await client.query(
    query,
    [hashToken(token)]
  );

  return result.rows[0];

};

export const findRotatedRefreshTokenRepository = async (token, client) => {
  const result = await client.query(
    `SELECT id, user_id, expires_at
     FROM refresh_tokens
     WHERE token = $1
       AND rotated_at IS NOT NULL
       AND expires_at > CURRENT_TIMESTAMP
     LIMIT 1
     FOR UPDATE;`,
    [hashToken(token)]
  );
  return result.rows[0];
};

/**
 * Revoke a refresh token while retaining rotation history until its expiry.
 */
export const deleteRefreshTokenRepository = async (
  client,
  token,
  rotated = false
) => {
  const query = `
    UPDATE refresh_tokens
    SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP),
        rotated_at = CASE WHEN $2 THEN CURRENT_TIMESTAMP ELSE rotated_at END
    WHERE token = $1
    RETURNING *;
  `;

  const result = await client.query(
    query,
    [hashToken(token), rotated]
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
    UPDATE refresh_tokens
    SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
    WHERE user_id = $1
      AND revoked_at IS NULL;
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
      AND revoked_at IS NULL
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
    `UPDATE refresh_tokens
     SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
     WHERE user_id = $1 AND device_id = $2 AND revoked_at IS NULL;`,
    [userId, deviceId]
  );
};
