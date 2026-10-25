ALTER TABLE employee_leave_requests
  ADD COLUMN IF NOT EXISTS manager_approval_proof_public_id TEXT,
  ADD COLUMN IF NOT EXISTS manager_approval_proof_resource_type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS manager_approval_proof_version VARCHAR(40),
  ADD COLUMN IF NOT EXISTS manager_approval_proof_filename VARCHAR(255),
  ADD COLUMN IF NOT EXISTS manager_approval_proof_mime_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS manager_approval_proof_size_bytes BIGINT;
