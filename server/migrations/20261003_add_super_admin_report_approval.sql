-- Migration: Add Super Admin approval tracking to daily_work_reports table
ALTER TABLE daily_work_reports
ADD COLUMN IF NOT EXISTS super_admin_id INT REFERENCES users(id),
ADD COLUMN IF NOT EXISTS super_admin_feedback TEXT,
ADD COLUMN IF NOT EXISTS super_admin_reviewed_at TIMESTAMP WITH TIME ZONE;
