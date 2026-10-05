-- Migration: Create employee monthly rosters table
CREATE TABLE IF NOT EXISTS employee_monthly_rosters (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    year INT NOT NULL,
    month INT NOT NULL, -- 1 to 12
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CHANGE_REQUESTED'
    total_working_days INT NOT NULL DEFAULT 0,
    total_week_offs INT NOT NULL DEFAULT 0,
    total_leaves INT NOT NULL DEFAULT 0,
    total_half_days INT NOT NULL DEFAULT 0,
    days_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    submission_note TEXT,
    submitted_at TIMESTAMPTZ,
    reviewed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_remarks TEXT,
    change_request_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_employee_monthly_roster UNIQUE (employee_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_employee_rosters_emp_date ON employee_monthly_rosters(employee_id, year, month);
CREATE INDEX IF NOT EXISTS idx_employee_rosters_status ON employee_monthly_rosters(status);
CREATE INDEX IF NOT EXISTS idx_employee_rosters_year_month ON employee_monthly_rosters(year, month);
