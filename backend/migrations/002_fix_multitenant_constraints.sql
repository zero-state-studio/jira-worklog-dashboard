-- Migration: Fix Multi-Tenant Scoped Unique Constraints
-- Date: 2026-02-10
-- Phase: 2 (Data Integrity - 30 min Downtime)
-- Impact: CRITICAL - Enables proper data isolation between tenants
--
-- Current Issue: Teams, Users, and JIRA Instances have GLOBAL unique constraints
-- Problem: Two different companies cannot have teams/users with the same name/email
-- Solution: Add company_id to unique constraints to scope them per tenant
--
-- Note: SQLite does NOT support ALTER CONSTRAINT, so tables must be recreated
--
-- Rollback: RESTORE FROM BACKUP (see pre-migration steps)

-- ============================================================
-- PRE-MIGRATION CHECKLIST
-- ============================================================
-- 1. BACKUP DATABASE
--    cp worklog.db worklog.db.backup-2026-02-10
--
-- 2. STOP APPLICATION SERVER
--    systemctl stop jira-worklog-dashboard
--
-- 3. VERIFY BACKUP
--    sqlite3 worklog.db.backup-2026-02-10 ".tables"
--
-- 4. RUN THIS MIGRATION
--    sqlite3 worklog.db < 002_fix_multitenant_constraints.sql
--
-- 5. VERIFY MIGRATION
--    sqlite3 worklog.db "SELECT COUNT(*) FROM teams;"
--
-- 6. START APPLICATION SERVER
--    systemctl start jira-worklog-dashboard

-- ============================================================
-- MIGRATION: Fix Teams Table
-- ============================================================
-- Current: UNIQUE(name) - global uniqueness
-- Problem: Company A and Company B cannot both have "Engineering" team
-- Target: UNIQUE(company_id, name) - per-tenant uniqueness

BEGIN TRANSACTION;

-- Step 1: Create backup table (optional, for safety)
CREATE TABLE teams_backup_20260210 AS SELECT * FROM teams;

-- Step 2: Create new teams table with correct constraints
CREATE TABLE teams_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, name)  -- ✅ Scoped to company
);

-- Step 3: Migrate data
INSERT INTO teams_new (id, name, company_id, created_at, updated_at)
SELECT id, name, company_id, created_at, updated_at FROM teams;

-- Step 4: Recreate indexes on new table
CREATE INDEX IF NOT EXISTS idx_teams_company
ON teams_new(company_id);

-- Step 5: Drop old table and rename new one
DROP TABLE teams;
ALTER TABLE teams_new RENAME TO teams;

COMMIT;

-- ============================================================
-- MIGRATION: Fix Users Table
-- ============================================================
-- Current: UNIQUE(email) - global uniqueness
-- Problem: Company A and Company B cannot both have employee user@example.com
-- Target: UNIQUE(company_id, email) - per-tenant uniqueness

BEGIN TRANSACTION;

-- Step 1: Backup
CREATE TABLE users_backup_20260210 AS SELECT * FROM users;

-- Step 2: Create new users table with correct constraints
CREATE TABLE users_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, email)  -- ✅ Scoped to company
);

-- Step 3: Migrate data
INSERT INTO users_new (id, email, first_name, last_name, team_id, company_id, created_at, updated_at)
SELECT id, email, first_name, last_name, team_id, company_id, created_at, updated_at FROM users;

-- Step 4: Recreate indexes on new table
CREATE INDEX IF NOT EXISTS idx_users_team
ON users_new(team_id);
CREATE INDEX IF NOT EXISTS idx_users_email
ON users_new(email);
CREATE INDEX IF NOT EXISTS idx_users_company
ON users_new(company_id);

-- Step 5: Recreate foreign key references from user_jira_accounts
CREATE TABLE user_jira_accounts_temp AS SELECT * FROM user_jira_accounts;
DROP TABLE user_jira_accounts;

CREATE TABLE user_jira_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users_new(id) ON DELETE CASCADE,
    jira_instance TEXT NOT NULL,
    account_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, jira_instance)
);

INSERT INTO user_jira_accounts (id, user_id, jira_instance, account_id, created_at)
SELECT id, user_id, jira_instance, account_id, created_at FROM user_jira_accounts_temp;

CREATE INDEX IF NOT EXISTS idx_user_jira_accounts_user
ON user_jira_accounts(user_id);

DROP TABLE user_jira_accounts_temp;

-- Step 6: Drop old table and rename new one
DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

COMMIT;

-- ============================================================
-- MIGRATION: Fix JIRA Instances Table
-- ============================================================
-- Current: UNIQUE(name) - global uniqueness
-- Problem: Company A and Company B cannot both have "Company Main" instance
-- Target: UNIQUE(company_id, name) - per-tenant uniqueness

BEGIN TRANSACTION;

-- Step 1: Backup
CREATE TABLE jira_instances_backup_20260210 AS SELECT * FROM jira_instances;

-- Step 2: Create new jira_instances table with correct constraints
CREATE TABLE jira_instances_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    email TEXT NOT NULL,
    api_token TEXT NOT NULL,
    tempo_api_token TEXT,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, name)  -- ✅ Scoped to company
);

-- Step 3: Migrate data
INSERT INTO jira_instances_new (id, name, url, email, api_token, tempo_api_token, company_id, created_at, updated_at)
SELECT id, name, url, email, api_token, tempo_api_token, company_id, created_at, updated_at FROM jira_instances;

-- Step 4: Recreate indexes on new table
CREATE INDEX IF NOT EXISTS idx_jira_instances_name
ON jira_instances_new(name);
CREATE INDEX IF NOT EXISTS idx_jira_instances_company
ON jira_instances_new(company_id);

-- Step 5: Drop old table and rename new one
DROP TABLE jira_instances;
ALTER TABLE jira_instances_new RENAME TO jira_instances;

COMMIT;

-- ============================================================
-- MIGRATION: Fix OAuth Users Table
-- ============================================================
-- Current: UNIQUE(google_id) - OK, UNIQUE(email) - MISSING
-- Problem: Cannot have multiple users with same email in different companies
-- Target: UNIQUE(company_id, email) + UNIQUE(google_id)

BEGIN TRANSACTION;

-- Step 1: Create new oauth_users table with additional constraint
CREATE TABLE oauth_users_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    google_id TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    role TEXT DEFAULT 'USER',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, email)  -- ✅ Scoped to company
);

-- Step 2: Migrate data
INSERT INTO oauth_users_new (id, company_id, google_id, email, first_name, last_name, role, created_at, updated_at)
SELECT id, company_id, google_id, email, first_name, last_name, role, created_at, updated_at FROM oauth_users;

-- Step 3: Recreate indexes on new table
CREATE INDEX IF NOT EXISTS idx_oauth_users_company
ON oauth_users_new(company_id);
CREATE INDEX IF NOT EXISTS idx_oauth_users_google_id
ON oauth_users_new(google_id);
CREATE INDEX IF NOT EXISTS idx_oauth_users_email
ON oauth_users_new(email);

-- Step 4: Drop old table and rename new one
DROP TABLE oauth_users;
ALTER TABLE oauth_users_new RENAME TO oauth_users;

COMMIT;

-- ============================================================
-- MIGRATION: Add company_id to complementary_group_members
-- ============================================================
-- Current Issue: Table references complementary_groups but lacks explicit company_id
-- Problem: Potential data confusion if referential integrity fails
-- Solution: Add explicit company_id + backfill from parent table

BEGIN TRANSACTION;

-- Step 1: Add company_id column
ALTER TABLE complementary_group_members
ADD COLUMN company_id INTEGER REFERENCES companies(id);

-- Step 2: Backfill company_id from parent complementary_groups
UPDATE complementary_group_members cgm
SET company_id = (
    SELECT company_id FROM complementary_groups cg
    WHERE cg.id = cgm.group_id
);

-- Step 3: Make company_id NOT NULL after backfill
-- Note: SQLite doesn't support ALTER COLUMN, so we skip this
-- In future migration, recreate table with NOT NULL constraint

-- Step 4: Create index on company_id
CREATE INDEX IF NOT EXISTS idx_complementary_members_company
ON complementary_group_members(company_id);

COMMIT;

-- ============================================================
-- POST-MIGRATION VALIDATION
-- ============================================================
-- Run these queries to verify constraints:
--
-- 1. Verify teams are scoped by company
--    SELECT COUNT(*) FROM teams WHERE company_id = 1 AND name = 'Engineering';
--    SELECT COUNT(*) FROM teams WHERE company_id = 2 AND name = 'Engineering';
--    Expected: Both should return 1 (same name, different companies)
--
-- 2. Verify users are scoped by company
--    SELECT COUNT(*) FROM users WHERE company_id = 1 AND email = 'john@example.com';
--    SELECT COUNT(*) FROM users WHERE company_id = 2 AND email = 'john@example.com';
--    Expected: Both should return 1
--
-- 3. Verify JIRA instances are scoped by company
--    SELECT COUNT(*) FROM jira_instances WHERE company_id = 1 AND name = 'Company Main';
--    Expected: Should return 1 per company
--
-- 4. Verify complementary_group_members has company_id
--    SELECT COUNT(DISTINCT company_id) FROM complementary_group_members;
--    Expected: Should match number of companies
--
-- 5. Test duplicate constraint
--    INSERT INTO teams (name, company_id) VALUES ('Engineering', 1);
--    Expected: Should succeed (first Engineering team for company 1)
--
--    INSERT INTO teams (name, company_id) VALUES ('Engineering', 1);
--    Expected: UNIQUE CONSTRAINT FAILED (duplicate within same company)
--
--    INSERT INTO teams (name, company_id) VALUES ('Engineering', 2);
--    Expected: Should succeed (Engineering team for different company)

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
