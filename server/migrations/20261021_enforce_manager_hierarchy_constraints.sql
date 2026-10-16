BEGIN;

-- 1. Prevent self-referencing / circular reporting directly at database level
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_employees_no_self_reporting'
  ) THEN
    ALTER TABLE employees
      ADD CONSTRAINT chk_employees_no_self_reporting
      CHECK (reporting_manager_id IS NULL OR reporting_manager_id <> id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_no_self_reporting'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT chk_users_no_self_reporting
      CHECK (reports_to IS NULL OR reports_to <> id);
  END IF;
END $$;

-- 2. Performance indexes on manager columns
CREATE INDEX IF NOT EXISTS idx_employees_reporting_manager_id
  ON employees(reporting_manager_id)
  WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_users_reports_to
  ON users(reports_to)
  WHERE is_deleted = FALSE;

COMMIT;
