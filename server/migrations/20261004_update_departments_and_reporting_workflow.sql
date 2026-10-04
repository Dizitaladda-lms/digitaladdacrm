-- =====================================================
-- Migration: Add 6 Official Departments & Multi-tier Report Workflow
-- =====================================================

BEGIN;

INSERT INTO departments (department_name, description, status)
VALUES
  ('Performance Marketing', 'Performance Ads, Meta Ads, Google Ads & ROI Campaigns', TRUE),
  ('SEO and Search AI', 'Search Engine Optimization, AI Search, Content & Organic Growth', TRUE),
  ('Operations & Administration', 'Company operations, administration, facilities and student coordination', TRUE),
  ('Graphics Design & Video Editing', 'Creative media, visual branding, video production & motion design', TRUE),
  ('Tech and Web Development', 'CRM development, web development, software and IT infrastructure', TRUE),
  ('Digital Marketing Agency', 'Client digital campaigns, client management & full-service agency ops', TRUE)
ON CONFLICT (department_name) 
DO UPDATE SET description = EXCLUDED.description, status = TRUE;

ALTER TABLE daily_work_reports DROP CONSTRAINT IF EXISTS chk_report_status;
ALTER TABLE daily_work_reports ADD CONSTRAINT chk_report_status 
  CHECK (status IN (
    'SUBMITTED', 
    'PENDING_TL_APPROVAL', 
    'TL_REVIEWED', 
    'PENDING_HR_APPROVAL', 
    'HR_APPROVED', 
    'REVISION_REQUESTED', 
    'REJECTED', 
    'SUPER_ADMIN_APPROVED'
  ));

COMMIT;
