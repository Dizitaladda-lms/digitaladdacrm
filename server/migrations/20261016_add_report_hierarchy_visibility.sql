BEGIN;

CREATE INDEX IF NOT EXISTS idx_employees_reporting_manager_id
  ON employees (reporting_manager_id)
  WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_employees_department_user_active
  ON employees (department_id, user_id)
  WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_daily_work_reports_user_date
  ON daily_work_reports (user_id, report_date DESC, id DESC);

CREATE TABLE IF NOT EXISTS daily_work_report_visibility (
  report_id BIGINT NOT NULL REFERENCES daily_work_reports(id) ON DELETE CASCADE,
  viewer_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (report_id, viewer_user_id)
);

CREATE INDEX IF NOT EXISTS idx_report_visibility_viewer_report
  ON daily_work_report_visibility (viewer_user_id, report_id);

COMMIT;
