-- =====================================================
-- Add Main Website Source & Register Main Domains
-- Websites: www.nidads.com, www.nipage.com, www.iidad.com
-- =====================================================

BEGIN;

-- 1. Ensure 'Main Website' exists in lead_sources
INSERT INTO lead_sources (name, description, is_active)
VALUES ('Main Website', 'Official institute & agency main website', true)
ON CONFLICT (name) DO UPDATE SET is_active = true, is_deleted = false;

-- 2. Fix misspelling 'Nigape' -> 'Nipage' if present in lead_domains
UPDATE lead_domains 
SET name = 'Nipage', updated_at = CURRENT_TIMESTAMP 
WHERE name = 'Nigape'
    AND NOT EXISTS (
        SELECT 1
        FROM lead_domains canonical
        WHERE canonical.name = 'Nipage'
    );

-- 3. Also update any historical leads with 'Nigape' -> 'Nipage'
UPDATE leads 
SET domain = 'Nipage', updated_at = CURRENT_TIMESTAMP 
WHERE LOWER(domain) = 'nigape';

-- 4. Register the 3 main website domains in lead_domains
INSERT INTO lead_domains (name, is_active)
VALUES 
    ('www.nidads.com', true),
    ('www.nipage.com', true),
    ('www.iidad.com', true),
    ('Nipage', true),
    ('Nidads', true),
    ('IIDAD', true)
ON CONFLICT (name) DO UPDATE SET is_active = true;

COMMIT;
