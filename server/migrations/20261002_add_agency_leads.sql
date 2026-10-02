-- =====================================================
-- Migration: Add Agency / Client Leads Support
-- =====================================================

BEGIN;

ALTER TABLE leads 
  ADD COLUMN IF NOT EXISTS is_agency_lead BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS budget VARCHAR(100),
  ADD COLUMN IF NOT EXISTS service VARCHAR(200);

CREATE INDEX IF NOT EXISTS idx_leads_is_agency_lead ON leads(is_agency_lead);

COMMIT;
