-- =========================================================================
-- Migration: Internal Team Chat, Channels, Mentions & Live Availability
-- =========================================================================

-- 1. Chat Channels / Groups Table
CREATE TABLE IF NOT EXISTS chat_groups (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,
    group_type VARCHAR(30) NOT NULL DEFAULT 'CUSTOM', -- 'ALL_COMPANY', 'DEPARTMENT', 'CUSTOM'
    department_id BIGINT REFERENCES departments(id) ON DELETE SET NULL,
    created_by BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_groups_slug ON chat_groups(slug);
CREATE INDEX IF NOT EXISTS idx_chat_groups_type ON chat_groups(group_type);

-- 2. Chat Group Memberships
CREATE TABLE IF NOT EXISTS chat_group_members (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
    employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    role VARCHAR(30) NOT NULL DEFAULT 'MEMBER', -- 'OWNER', 'ADMIN', 'MEMBER'
    last_read_message_id BIGINT DEFAULT 0,
    last_read_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_group_employee UNIQUE (group_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_group_members_emp ON chat_group_members(employee_id);
CREATE INDEX IF NOT EXISTS idx_chat_group_members_grp ON chat_group_members(group_id);

-- 3. Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
    sender_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    mentioned_employee_ids JSONB DEFAULT '[]'::jsonb, -- Array of employee IDs mentioned
    attachments JSONB DEFAULT '[]'::jsonb,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_group_date ON chat_messages(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);

-- 4. Seed Default "All Company" Group
INSERT INTO chat_groups (name, slug, description, group_type, is_default)
VALUES (
    'All Company Announcements & Discussions',
    'all-company',
    'Official company-wide chat for all staff members. Ask work questions and mention team members anytime.',
    'ALL_COMPANY',
    TRUE
)
ON CONFLICT (slug) DO NOTHING;
