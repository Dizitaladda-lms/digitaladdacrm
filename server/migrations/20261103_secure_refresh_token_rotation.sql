BEGIN;

ALTER TABLE refresh_tokens
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rotated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_active_user
  ON refresh_tokens (user_id)
  WHERE revoked_at IS NULL;

COMMIT;
