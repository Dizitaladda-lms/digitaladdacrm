BEGIN;

-- Refresh tokens are now stored as SHA-256 hashes. Existing plaintext rows
-- cannot be migrated safely, so invalidate every prior browser session.
DELETE FROM refresh_tokens;

COMMIT;
