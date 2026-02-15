-- ============================================================================
-- JIRA Worklog Dashboard - PostgreSQL Schema Migration
-- Migrated from SQLite to PostgreSQL
-- ============================================================================

-- Enable UUID extension (optional, for future use)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. AUTHENTICATION & COMPANIES
-- ============================================================================

-- Companies table (multi-tenant root)
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    domain VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    settings JSONB,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_companies_domain ON companies(domain);
CREATE INDEX IF NOT EXISTS idx_companies_created ON companies(created_at DESC);

-- OAuth users table
CREATE TABLE IF NOT EXISTS oauth_users (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    google_id VARCHAR(255),
    display_name VARCHAR(255),
    avatar_url TEXT,
    role VARCHAR(50) NOT NULL DEFAULT 'USER',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP,
    UNIQUE(email),
    UNIQUE(company_id, email)
);

CREATE INDEX IF NOT EXISTS idx_oauth_users_email ON oauth_users(email);
CREATE INDEX IF NOT EXISTS idx_oauth_users_company ON oauth_users(company_id);
CREATE INDEX IF NOT EXISTS idx_oauth_users_google_id ON oauth_users(google_id);

-- Auth sessions table
CREATE TABLE IF NOT EXISTS auth_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES oauth_users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(500) NOT NULL UNIQUE,
    access_token_jti VARCHAR(255),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires ON auth_sessions(expires_at);

-- Invitations table
CREATE TABLE IF NOT EXISTS invitations (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'USER',
    invited_by INTEGER REFERENCES oauth_users(id) ON DELETE SET NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(50) DEFAULT 'PENDING',
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_company ON invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(company_id, email);

-- Auth audit log
CREATE TABLE IF NOT EXISTS auth_audit_log (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES oauth_users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_audit_company ON auth_audit_log(company_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_user ON auth_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_created ON auth_audit_log(created_at DESC);

-- ============================================================================
-- 2. TEAMS & USERS
-- ============================================================================

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    owner_id INTEGER REFERENCES oauth_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_teams_company ON teams(company_id);
CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_id);

-- Users table (deprecated in favor of oauth_users, but kept for compatibility)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, email)
);

CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_team ON users(team_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(company_id, email);

-- ============================================================================
-- 3. JIRA INSTANCES & CONFIGURATION
-- ============================================================================

-- JIRA instances table
CREATE TABLE IF NOT EXISTS jira_instances (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    email VARCHAR(255) NOT NULL,
    api_token TEXT NOT NULL, -- Encrypted
    tempo_api_token TEXT, -- Encrypted
    billing_client_id INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    sync_status VARCHAR(50) DEFAULT 'idle',
    sync_started_at TIMESTAMP,
    sync_completed_at TIMESTAMP,
    last_sync_worklogs INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_jira_instances_company ON jira_instances(company_id);
CREATE INDEX IF NOT EXISTS idx_jira_instances_active ON jira_instances(company_id, is_active);

-- ============================================================================
-- 4. WORKLOGS & EPICS
-- ============================================================================

-- Worklogs table (main data table)
CREATE TABLE IF NOT EXISTS worklogs (
    id VARCHAR(255) PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    jira_instance VARCHAR(255) NOT NULL,
    issue_key VARCHAR(50) NOT NULL,
    issue_summary TEXT,
    author_email VARCHAR(255) NOT NULL,
    author_display_name VARCHAR(255),
    time_spent_seconds INTEGER NOT NULL,
    started TIMESTAMP NOT NULL,
    epic_key VARCHAR(50),
    epic_name TEXT,
    project_key VARCHAR(50),
    project_name VARCHAR(255),
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, jira_instance, id)
);

CREATE INDEX IF NOT EXISTS idx_worklogs_company ON worklogs(company_id);
CREATE INDEX IF NOT EXISTS idx_worklogs_started ON worklogs(company_id, started DESC);
CREATE INDEX IF NOT EXISTS idx_worklogs_author ON worklogs(company_id, author_email);
CREATE INDEX IF NOT EXISTS idx_worklogs_instance ON worklogs(company_id, jira_instance);
CREATE INDEX IF NOT EXISTS idx_worklogs_issue ON worklogs(company_id, issue_key);
CREATE INDEX IF NOT EXISTS idx_worklogs_epic ON worklogs(company_id, epic_key);
CREATE INDEX IF NOT EXISTS idx_worklogs_project ON worklogs(company_id, project_key);

-- Epics table
CREATE TABLE IF NOT EXISTS epics (
    key VARCHAR(50) PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255),
    summary TEXT,
    jira_instance VARCHAR(255) NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, jira_instance, key)
);

CREATE INDEX IF NOT EXISTS idx_epics_company ON epics(company_id);
CREATE INDEX IF NOT EXISTS idx_epics_instance ON epics(company_id, jira_instance);

-- Sync history table
CREATE TABLE IF NOT EXISTS sync_history (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    jira_instances TEXT NOT NULL,
    worklogs_synced INTEGER DEFAULT 0,
    worklogs_updated INTEGER DEFAULT 0,
    worklogs_deleted INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'completed',
    error_message TEXT,
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sync_history_company ON sync_history(company_id);
CREATE INDEX IF NOT EXISTS idx_sync_history_started ON sync_history(company_id, started_at DESC);

-- ============================================================================
-- 5. BILLING
-- ============================================================================

-- Billing clients table
CREATE TABLE IF NOT EXISTS billing_clients (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    billing_currency VARCHAR(10) DEFAULT 'EUR',
    default_hourly_rate DECIMAL(10, 2),
    jira_instance_id INTEGER REFERENCES jira_instances(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_billing_clients_company ON billing_clients(company_id);

-- Billing projects table
CREATE TABLE IF NOT EXISTS billing_projects (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    client_id INTEGER NOT NULL REFERENCES billing_clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    default_hourly_rate DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, client_id, name)
);

CREATE INDEX IF NOT EXISTS idx_billing_projects_company ON billing_projects(company_id);
CREATE INDEX IF NOT EXISTS idx_billing_projects_client ON billing_projects(client_id);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    client_id INTEGER NOT NULL REFERENCES billing_clients(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',
    issue_date DATE,
    due_date DATE,
    subtotal DECIMAL(10, 2) DEFAULT 0,
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'EUR',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(company_id, status);

-- Invoice items table
CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

-- Package templates table
CREATE TABLE IF NOT EXISTS package_templates (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    default_project_key VARCHAR(50),
    parent_issue_type VARCHAR(50) DEFAULT 'Task',
    child_issue_type VARCHAR(50) DEFAULT 'Sub-task',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_package_templates_company ON package_templates(company_id);

-- ============================================================================
-- 6. HOLIDAYS & SETTINGS
-- ============================================================================

-- Holidays table
CREATE TABLE IF NOT EXISTS holidays (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_working_day BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, date)
);

CREATE INDEX IF NOT EXISTS idx_holidays_company ON holidays(company_id);
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(company_id, date);

-- Factorial config table
CREATE TABLE IF NOT EXISTS factorial_config (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    api_key TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_factorial_config_company ON factorial_config(company_id);

-- Complementary groups table
CREATE TABLE IF NOT EXISTS complementary_groups (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    primary_instance_id INTEGER NOT NULL REFERENCES jira_instances(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_complementary_groups_company ON complementary_groups(company_id);

-- Complementary group members table
CREATE TABLE IF NOT EXISTS complementary_group_members (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    group_id INTEGER NOT NULL REFERENCES complementary_groups(id) ON DELETE CASCADE,
    instance_id INTEGER NOT NULL REFERENCES jira_instances(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(group_id, instance_id)
);

CREATE INDEX IF NOT EXISTS idx_complementary_members_group ON complementary_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_complementary_members_company ON complementary_group_members(company_id);

-- ============================================================================
-- 7. JIRA EXCLUSIONS & GENERIC ISSUES
-- ============================================================================

-- JIRA exclusions table
CREATE TABLE IF NOT EXISTS jira_exclusions (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    exclusion_key VARCHAR(100) NOT NULL,
    exclusion_type VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, exclusion_key, exclusion_type)
);

CREATE INDEX IF NOT EXISTS idx_jira_exclusions_company ON jira_exclusions(company_id);

-- Generic issues table
CREATE TABLE IF NOT EXISTS generic_issues (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    issue_code VARCHAR(50) NOT NULL,
    issue_type VARCHAR(50) NOT NULL,
    team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, issue_code, issue_type)
);

CREATE INDEX IF NOT EXISTS idx_generic_issues_company ON generic_issues(company_id);

-- JIRA issue types cache
CREATE TABLE IF NOT EXISTS jira_issue_types (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    jira_instance VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, name, jira_instance)
);

CREATE INDEX IF NOT EXISTS idx_jira_issue_types_company ON jira_issue_types(company_id);
CREATE INDEX IF NOT EXISTS idx_jira_issue_types_name ON jira_issue_types(company_id, name);

-- ============================================================================
-- 8. LOGGING
-- ============================================================================

-- Logs table
CREATE TABLE IF NOT EXISTS logs (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    timestamp TIMESTAMP DEFAULT NOW(),
    level VARCHAR(20) NOT NULL,
    logger_name VARCHAR(255),
    message TEXT NOT NULL,
    request_id VARCHAR(100),
    endpoint VARCHAR(255),
    method VARCHAR(10),
    status_code INTEGER,
    duration_ms INTEGER,
    extra_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_logs_company ON logs(company_id);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_request ON logs(request_id);

-- ============================================================================
-- COMPLETE!
-- ============================================================================

-- Insert default company for migration (if needed)
INSERT INTO companies (id, name, domain, is_active)
VALUES (1, 'Default Company', 'localhost', TRUE)
ON CONFLICT (id) DO NOTHING;
