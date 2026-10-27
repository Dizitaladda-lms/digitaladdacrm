-- Migration: 20261027_create_activity_logs.sql
-- Enterprise-grade centralized Activity & Audit Logs for Dizital Adda CRM
-- Tracks all data modifications (create, update, delete) and authentication events (logins, logouts, failures)

CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  user_name VARCHAR(150),
  user_email VARCHAR(255),
  role VARCHAR(50),
  action VARCHAR(100) NOT NULL,
  module VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id VARCHAR(100),
  entity_name VARCHAR(255),
  description TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address VARCHAR(100),
  user_agent TEXT,
  device_name VARCHAR(150),
  status VARCHAR(20) DEFAULT 'SUCCESS',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_module ON activity_logs (module);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs (action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_user ON activity_logs (user_id, created_at DESC);
