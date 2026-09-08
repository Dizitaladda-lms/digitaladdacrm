import jwt from "jsonwebtoken";
import crypto from "crypto";

/**
 * =====================================================
 * Generate Access Token
 * =====================================================
 */
export const generateAccessToken = (user) => {

  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    }
  );

};

/**
 * =====================================================
 * Generate Refresh Token
 * =====================================================
 */
export const generateRefreshToken = (user) => {

  return jwt.sign(
    {
      id: user.id,
      jti: crypto.randomUUID(),
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn:
        process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    }
  );

};

/**
 * =====================================================
 * Verify Access Token
 * =====================================================
 */
export const verifyAccessToken = (token) => {

  return jwt.verify(
    token,
    process.env.JWT_SECRET
  );

};

/**
 * =====================================================
 * Verify Refresh Token
 * =====================================================
 */
export const verifyRefreshToken = (token) => {

  return jwt.verify(
    token,
    process.env.JWT_REFRESH_SECRET
  );

};