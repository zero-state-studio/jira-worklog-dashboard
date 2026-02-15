-- Migration 003: Add company_id to complementary_group_members for multi-tenant security
-- Date: 2026-02-12
-- Purpose: Fix missing company_id column in complementary_group_members table

-- Step 1: Add company_id column (nullable initially)
ALTER TABLE complementary_group_members ADD COLUMN company_id INTEGER;

-- Step 2: Populate company_id from parent complementary_groups table
UPDATE complementary_group_members
SET company_id = (
    SELECT cg.company_id
    FROM complementary_groups cg
    WHERE cg.id = complementary_group_members.group_id
);

-- Step 3: Verify all rows have company_id (should return 0)
-- SELECT COUNT(*) FROM complementary_group_members WHERE company_id IS NULL;

-- Step 4: Recreate table with NOT NULL constraint and proper indexes
-- (SQLite doesn't support ALTER COLUMN, so we need to recreate)

CREATE TABLE complementary_group_members_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    group_id INTEGER NOT NULL,
    instance_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES complementary_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (instance_id) REFERENCES jira_instances(id) ON DELETE CASCADE
);

-- Copy data
INSERT INTO complementary_group_members_new (id, company_id, group_id, instance_id, created_at)
SELECT id, company_id, group_id, instance_id, created_at
FROM complementary_group_members;

-- Drop old table
DROP TABLE complementary_group_members;

-- Rename new table
ALTER TABLE complementary_group_members_new RENAME TO complementary_group_members;

-- Step 5: Recreate indexes with company_id
CREATE INDEX idx_complementary_members_company ON complementary_group_members(company_id);
CREATE INDEX idx_complementary_members_group ON complementary_group_members(group_id);
CREATE INDEX idx_complementary_members_instance ON complementary_group_members(instance_id);
CREATE UNIQUE INDEX idx_complementary_members_unique ON complementary_group_members(group_id, instance_id);

-- Verification queries (run manually after migration):
-- SELECT COUNT(*) FROM complementary_group_members;
-- SELECT cgm.*, cg.company_id as group_company_id
-- FROM complementary_group_members cgm
-- JOIN complementary_groups cg ON cg.id = cgm.group_id
-- WHERE cgm.company_id != cg.company_id;  -- Should return 0 rows
