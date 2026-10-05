-- Migration: Add shift timing configurations to employees and rejection reason to reports

-- 1. Employee shift timing columns
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS shift_timing_type VARCHAR(20) DEFAULT 'DEFAULT',
ADD COLUMN IF NOT EXISTS shift_start_time VARCHAR(10) DEFAULT '10:00',
ADD COLUMN IF NOT EXISTS shift_end_time VARCHAR(10) DEFAULT '18:00',
ADD COLUMN IF NOT EXISTS custom_shift_timings JSONB DEFAULT NULL;

-- 2. Daily work reports rejection reason column
ALTER TABLE daily_work_reports 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
