BEGIN;

ALTER TABLE employee_biometrics
  ADD COLUMN IF NOT EXISTS authenticator_transports TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS sign_count BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS face_template_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS face_template_iv TEXT,
  ADD COLUMN IF NOT EXISTS face_template_tag TEXT,
  ADD COLUMN IF NOT EXISTS face_consent_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS employee_biometric_challenges (
  employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  purpose VARCHAR(32) NOT NULL CHECK (purpose IN (
    'registration',
    'authentication',
    'face_registration',
    'face_authentication'
  )),
  challenge TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (employee_id, purpose)
);

ALTER TABLE employee_biometric_challenges
  DROP CONSTRAINT IF EXISTS employee_biometric_challenges_purpose_check;
ALTER TABLE employee_biometric_challenges
  ADD CONSTRAINT employee_biometric_challenges_purpose_check
  CHECK (purpose IN (
    'registration',
    'authentication',
    'face_registration',
    'face_authentication'
  ));

UPDATE employee_biometrics
SET
  public_key = '',
  authenticator_transports = ARRAY[]::TEXT[],
  sign_count = 0,
  face_template_encrypted = NULL,
  face_template_iv = NULL,
  face_template_tag = NULL,
  face_consent_at = NULL,
  approval_status = 'RE_ENROLL_REQUIRED',
  approved_by = NULL,
  approved_at = NULL,
  face_image_url = NULL,
  rejection_reason = NULL;

COMMIT;
