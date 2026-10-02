-- =====================================================
-- Migration: Add Biometric Attendance, Office Wi-Fi Whitelist & Daily Attendance
-- =====================================================

BEGIN;

-- 1. Office Wi-Fi Whitelisted IPs Table
CREATE TABLE IF NOT EXISTS office_wifi_ips (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(100) NOT NULL UNIQUE,
    label VARCHAR(150) DEFAULT 'Office Wi-Fi',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Seed local & localhost IP defaults if not present
INSERT INTO office_wifi_ips (ip_address, label)
VALUES 
    ('127.0.0.1', 'Localhost Testing'),
    ('::1', 'Localhost IPv6')
ON CONFLICT (ip_address) DO NOTHING;

-- 2. Employee Biometric Credentials Table (Permanent & Locked)
CREATE TABLE IF NOT EXISTS employee_biometrics (
    id SERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    credential_id TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    device_info VARCHAR(255),
    is_locked BOOLEAN DEFAULT TRUE,
    registered_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_employee_biometrics_emp_id ON employee_biometrics(employee_id);

-- 3. Daily Attendance Logs Table
CREATE TABLE IF NOT EXISTS daily_attendance (
    id SERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    check_out_time TIMESTAMPTZ,
    total_hours NUMERIC(5, 2) DEFAULT 0.00,
    ip_address VARCHAR(100),
    is_office_wifi BOOLEAN DEFAULT TRUE,
    status VARCHAR(50) DEFAULT 'PRESENT',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (employee_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_attendance_emp_date ON daily_attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_attendance_date ON daily_attendance(date);

COMMIT;
