ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS lead_overview_read_only BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS employees_single_lead_overview_read_only_idx
  ON employees (lead_overview_read_only)
  WHERE lead_overview_read_only = TRUE;
