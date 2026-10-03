-- =====================================================
-- Migration: Add Face Biometric Image & HR Approval Workflow
-- =====================================================

BEGIN;

ALTER TABLE employee_biometrics 
ADD COLUMN IF NOT EXISTS face_image_url TEXT,
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(30) DEFAULT 'PENDING_APPROVAL',
ADD COLUMN IF NOT EXISTS approved_by BIGINT REFERENCES users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Set existing biometric credentials to APPROVED by default so current users stay uninterrupted
UPDATE employee_biometrics 
SET approval_status = 'APPROVED' 
WHERE approval_status IS NULL OR approval_status = 'PENDING_APPROVAL';

COMMIT;
