ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS managed_department_ids JSONB DEFAULT '[]'::jsonb;
