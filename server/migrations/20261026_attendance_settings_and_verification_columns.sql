-- =====================================================
-- Migration: Add Attendance Settings and Verification Columns
-- =====================================================

BEGIN;

-- 1. Add verification details to daily_attendance
ALTER TABLE daily_attendance
ADD COLUMN IF NOT EXISTS check_in_accuracy NUMERIC(8, 2),
ADD COLUMN IF NOT EXISTS check_in_distance NUMERIC(8, 2),
ADD COLUMN IF NOT EXISTS check_out_accuracy NUMERIC(8, 2),
ADD COLUMN IF NOT EXISTS check_out_distance NUMERIC(8, 2),
ADD COLUMN IF NOT EXISTS verification_method VARCHAR(50) DEFAULT 'GPS';

-- 2. Create Attendance Settings table
CREATE TABLE IF NOT EXISTS attendance_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Seed default office coordinates and radius (100m)
INSERT INTO attendance_settings (key, value, description)
VALUES 
  ('office_lat', '28.54175', 'Office Latitude Coordinate'),
  ('office_lng', '77.240611111', 'Office Longitude Coordinate'),
  ('office_radius', '100', 'Office Geofence Radius in Meters')
ON CONFLICT (key) DO NOTHING;

COMMIT;
