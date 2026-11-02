-- Migration: Add must_change_password column to users table
-- Enables enforcement of first-login / admin-provisioned password rotation

ALTER TABLE users
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN users.must_change_password IS 'When TRUE, user must change password before accessing any API endpoint other than change-password';
