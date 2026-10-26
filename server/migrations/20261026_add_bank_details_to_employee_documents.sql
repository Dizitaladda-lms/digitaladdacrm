BEGIN;

-- Allow BANK_DETAILS as an official employee document type
ALTER TABLE employee_documents DROP CONSTRAINT IF EXISTS employee_documents_document_type_check;

ALTER TABLE employee_documents ADD CONSTRAINT employee_documents_document_type_check
  CHECK (document_type IN ('AADHAAR_CARD', 'PAN_CARD', 'OFFICE_DOCUMENT', 'OTHER', 'PROFILE_PHOTO', 'BANK_DETAILS'));

COMMIT;
