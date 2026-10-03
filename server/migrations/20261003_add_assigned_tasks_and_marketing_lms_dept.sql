-- Migration: Add Performance & Marketing LMS Team department & assigned_tasks table

-- 1. Insert "Performance & Marketing LMS Team" department
INSERT INTO departments (department_name, description, status)
VALUES (
  'Performance & Marketing LMS Team',
  'Digital Marketing, Performance Ads, LMS & Tech Operations',
  TRUE
)
ON CONFLICT (department_name) DO NOTHING;

-- 2. Create assigned_tasks table for Admin & Dept Head task management
CREATE TABLE IF NOT EXISTS assigned_tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_by_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_to_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id INT REFERENCES departments(id) ON DELETE SET NULL,
  report_id INT REFERENCES daily_work_reports(id) ON DELETE SET NULL,
  priority VARCHAR(20) DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'URGENT'
  status VARCHAR(30) DEFAULT 'PENDING', -- 'PENDING', 'IN_PROGRESS', 'REVISION_REQUESTED', 'COMPLETED', 'CANCELLED'
  due_date DATE,
  revision_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assigned_tasks_assigned_to ON assigned_tasks(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_assigned_tasks_assigned_by ON assigned_tasks(assigned_by_id);
CREATE INDEX IF NOT EXISTS idx_assigned_tasks_status ON assigned_tasks(status);
