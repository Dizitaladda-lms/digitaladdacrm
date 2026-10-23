BEGIN;

ALTER TABLE employee_documents
  ADD COLUMN IF NOT EXISTS document_number_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS document_details_encrypted TEXT;

COMMIT;
