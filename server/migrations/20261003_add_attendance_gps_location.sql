-- =====================================================
-- Migration: Add GPS Latitude, Longitude & Location Address to Daily Attendance
-- =====================================================

BEGIN;

ALTER TABLE daily_attendance
ADD COLUMN IF NOT EXISTS check_in_lat NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS check_in_lng NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS check_in_location TEXT,
ADD COLUMN IF NOT EXISTS check_out_lat NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS check_out_lng NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS check_out_location TEXT;

COMMIT;
