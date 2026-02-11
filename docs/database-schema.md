# Database Schema

> **Navigation:** [Architecture](./architecture.md) | [Conventions](./conventions.md) | [API Reference](./api-reference.md) | [Setup](./setup-and-commands.md)

Complete SQLite database schema for the JIRA Worklog Dashboard. All tables include `company_id` for multi-tenant isolation.

---

## Schema Overview

**24 Tables organized into 6 categories:**

1. **Authentication** (5 tables) - OAuth, users, sessions, invitations
2. **Configuration** (8 tables) - Teams, JIRA instances, holidays
3. **Worklog Cache** (3 tables) - Worklogs, epics, issues
4. **Billing** (5 tables) - Clients, projects, rates, invoices
5. **Packages** (2 tables) - Templates and cross-instance linking
6. **Logging** (1 table) - Application logs

**40+ Indexes** for query performance

---

## 1. Authentication Tables

### companies

Tenant isolation root table. Each company has isolated data.

```sql
CREATE TABLE companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    domain TEXT,
    created_at TEXT NOT NULL,
    settings JSON,
    is_active INTEGER DEFAULT 1
);

CREATE UNIQUE INDEX idx_companies_domain ON companies(domain);
CREATE INDEX idx_companies_created ON companies(created_at DESC);
```

**Columns:**
- `id` - Auto-increment primary key
- `name` - Company display name
- `domain` - Email domain for auto-assignment (e.g., "company.com")
- `created_at` - ISO timestamp
- `settings` - JSON blob for company-specific settings
- `is_active` - Soft delete flag

---

### oauth_users

User accounts authenticated via Google OAuth.

```sql
CREATE TABLE oauth_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    google_id TEXT,
    display_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'USER',
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    last_login_at TEXT,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_oauth_users_email ON oauth_users(email);
CREATE INDEX idx_oauth_users_company ON oauth_users(company_id);
CREATE INDEX idx_oauth_users_google_id ON oauth_users(google_id);
```

**Columns:**
- `id` - Auto-increment primary key
- `company_id` - Foreign key to companies table
- `email` - User email (unique globally)
- `google_id` - Google account ID
- `display_name` - Full name from Google
- `avatar_url` - Profile picture URL
- `role` - `ADMIN` | `MANAGER` | `USER`
- `is_active` - Account status
- `created_at` - Registration timestamp
- `last_login_at` - Last successful login

---

### auth_sessions

JWT refresh token storage for session management.

```sql
CREATE TABLE auth_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    refresh_token TEXT NOT NULL,
    jti TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_used_at TEXT,
    user_agent TEXT,
    ip_address TEXT,
    is_revoked INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES oauth_users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_auth_sessions_jti ON auth_sessions(jti);
CREATE INDEX idx_auth_sessions_user ON auth_sessions(user_id);
CREATE INDEX idx_auth_sessions_expires ON auth_sessions(expires_at);
```

**Columns:**
- `jti` - JWT ID (unique token identifier)
- `refresh_token` - Hashed refresh token
- `expires_at` - Token expiration timestamp
- `is_revoked` - Token revocation flag
- `user_agent` - Browser/client info
- `ip_address` - Login IP for security audit

---

### invitations

User invitation system for controlled onboarding.

```sql
CREATE TABLE invitations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'USER',
    invited_by INTEGER NOT NULL,
    token TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    accepted_at TEXT,
    is_revoked INTEGER DEFAULT 0,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES oauth_users(id)
);

CREATE UNIQUE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_company ON invitations(company_id);
CREATE INDEX idx_invitations_expires ON invitations(expires_at);
```

**Columns:**
- `email` - Invited user email
- `role` - Role to assign on acceptance
- `invited_by` - User ID who sent invitation
- `token` - Unique invitation token (UUID)
- `expires_at` - Expiration timestamp (72h default)
- `accepted_at` - Acceptance timestamp (NULL if pending)
- `is_revoked` - Manual revocation flag

---

### auth_audit_log

Security audit trail for authentication events.

```sql
CREATE TABLE auth_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER,
    user_id INTEGER,
    event_type TEXT NOT NULL,
    email TEXT,
    ip_address TEXT,
    user_agent TEXT,
    details JSON,
    created_at TEXT NOT NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (user_id) REFERENCES oauth_users(id)
);

CREATE INDEX idx_auth_audit_company ON auth_audit_log(company_id);
CREATE INDEX idx_auth_audit_user ON auth_audit_log(user_id);
CREATE INDEX idx_auth_audit_created ON auth_audit_log(created_at DESC);
CREATE INDEX idx_auth_audit_event ON auth_audit_log(event_type);
```

**Event Types:**
- `login_success` - Successful OAuth login
- `login_failed` - Failed login attempt
- `token_refresh` - Access token refreshed
- `logout` - User logout
- `session_revoked` - Session manually revoked
- `invitation_sent` - Invitation email sent
- `invitation_accepted` - User accepted invitation

---

## 2. Configuration Tables

### teams

Team definitions for worklog grouping.

```sql
CREATE TABLE teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX idx_teams_company ON teams(company_id);
CREATE UNIQUE INDEX idx_teams_company_name ON teams(company_id, name);
```

**Columns:**
- `company_id` - Multi-tenant isolation key
- `name` - Team name (unique per company)
- `description` - Optional team description

**Note:** Originally had global `UNIQUE(name)` which prevented multi-tenant name reuse. Now uses composite unique constraint.

---

### users

Team members (worklog authors).

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    team_id INTEGER,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    display_name TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
);

CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_users_team ON users(team_id);
CREATE UNIQUE INDEX idx_users_company_email ON users(company_id, email);
CREATE INDEX idx_users_email ON users(email);
```

**Columns:**
- `company_id` - Multi-tenant isolation key
- `team_id` - Optional team assignment (NULL = no team)
- `email` - User email (unique per company)
- `display_name` - Combined first_name + last_name
- `is_active` - User status (for filtering)

**Relationship:**
- One user → One team (or NULL)
- One team → Many users

---

### user_jira_accounts

Maps local users to JIRA account IDs across instances.

```sql
CREATE TABLE user_jira_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    jira_instance_id INTEGER NOT NULL,
    account_id TEXT NOT NULL,
    email TEXT,
    display_name TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (jira_instance_id) REFERENCES jira_instances(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_jira_company ON user_jira_accounts(company_id);
CREATE INDEX idx_user_jira_user ON user_jira_accounts(user_id);
CREATE INDEX idx_user_jira_instance ON user_jira_accounts(jira_instance_id);
CREATE UNIQUE INDEX idx_user_jira_unique ON user_jira_accounts(
    jira_instance_id,
    account_id
);
```

**Purpose:** JIRA uses different account IDs per instance. This table maps local users to their JIRA identities.

---

### user_factorial_accounts

Maps users to Factorial HR employee IDs.

```sql
CREATE TABLE user_factorial_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    factorial_employee_id INTEGER NOT NULL,
    email TEXT,
    full_name TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_factorial_company ON user_factorial_accounts(company_id);
CREATE INDEX idx_user_factorial_user ON user_factorial_accounts(user_id);
CREATE UNIQUE INDEX idx_user_factorial_unique ON user_factorial_accounts(
    company_id,
    factorial_employee_id
);
```

---

### jira_instances

JIRA instance configurations with credentials.

```sql
CREATE TABLE jira_instances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    email TEXT NOT NULL,
    api_token TEXT NOT NULL,
    tempo_api_token TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX idx_jira_instances_company ON jira_instances(company_id);
CREATE UNIQUE INDEX idx_jira_instances_company_name ON jira_instances(company_id, name);
```

**Columns:**
- `name` - Instance identifier (e.g., "Company Main")
- `url` - JIRA base URL (e.g., "https://company.atlassian.net")
- `email` - JIRA user email for Basic Auth
- `api_token` - JIRA API token (stored in plaintext - **security debt**)
- `tempo_api_token` - Optional Tempo API token (preferred for worklogs)
- `is_active` - Enable/disable instance

**Security Issue:** Credentials stored in plaintext. Should encrypt with company-specific key.

---

### complementary_groups

Groups of JIRA instances that should be counted together.

```sql
CREATE TABLE complementary_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    primary_instance_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (primary_instance_id) REFERENCES jira_instances(id)
);

CREATE INDEX idx_complementary_groups_company ON complementary_groups(company_id);
CREATE INDEX idx_complementary_groups_primary ON complementary_groups(primary_instance_id);
```

**Purpose:** Some orgs use separate JIRA instances for issues vs time tracking. This prevents double-counting hours in "All" view.

---

### complementary_group_members

Secondary instances in a complementary group.

```sql
CREATE TABLE complementary_group_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    instance_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (group_id) REFERENCES complementary_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (instance_id) REFERENCES jira_instances(id) ON DELETE CASCADE
);

CREATE INDEX idx_complementary_members_group ON complementary_group_members(group_id);
CREATE INDEX idx_complementary_members_instance ON complementary_group_members(instance_id);
CREATE UNIQUE INDEX idx_complementary_members_unique ON complementary_group_members(
    group_id,
    instance_id
);
```

**Note:** Missing `company_id` column - identified as technical debt.

---

### holidays

Company holidays and non-working days.

```sql
CREATE TABLE holidays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    name TEXT NOT NULL,
    country TEXT,
    is_working_day INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX idx_holidays_company ON holidays(company_id);
CREATE INDEX idx_holidays_date ON holidays(company_id, date);
CREATE UNIQUE INDEX idx_holidays_company_date ON holidays(company_id, date);
```

**Columns:**
- `date` - ISO date (YYYY-MM-DD)
- `name` - Holiday name (e.g., "Christmas Day")
- `country` - Optional country code (e.g., "IT", "US")
- `is_working_day` - 0 = holiday, 1 = working day override

**Use Case:** Calculate expected work hours for billing calculations.

---

### jira_instance_issue_types

Issue type configurations per JIRA instance.

```sql
CREATE TABLE jira_instance_issue_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    jira_instance_id INTEGER NOT NULL,
    issue_type_id TEXT NOT NULL,
    issue_type_name TEXT NOT NULL,
    is_billable INTEGER DEFAULT 1,
    default_rate REAL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (jira_instance_id) REFERENCES jira_instances(id) ON DELETE CASCADE
);

CREATE INDEX idx_issue_types_company ON jira_instance_issue_types(company_id);
CREATE INDEX idx_issue_types_instance ON jira_instance_issue_types(jira_instance_id);
CREATE UNIQUE INDEX idx_issue_types_unique ON jira_instance_issue_types(
    jira_instance_id,
    issue_type_id
);
```

**Purpose:** Different billing rates for different issue types (e.g., Bug vs Story).

---

## 3. Worklog Cache Tables

### worklogs

Cached JIRA worklogs with denormalized epic/issue data.

```sql
CREATE TABLE worklogs (
    id TEXT PRIMARY KEY,
    company_id INTEGER NOT NULL,
    jira_instance TEXT NOT NULL,
    issue_id TEXT NOT NULL,
    issue_key TEXT NOT NULL,
    issue_summary TEXT,
    issue_type_id TEXT,
    issue_type_name TEXT,
    epic_id TEXT,
    epic_key TEXT,
    epic_name TEXT,
    author_account_id TEXT NOT NULL,
    author_email TEXT NOT NULL,
    author_display_name TEXT,
    time_spent_seconds INTEGER NOT NULL,
    started TEXT NOT NULL,
    comment TEXT,
    created TEXT NOT NULL,
    updated TEXT NOT NULL,
    cache_timestamp TEXT NOT NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Performance indexes (critical!)
CREATE INDEX idx_worklogs_company_started ON worklogs(company_id, started DESC);
CREATE INDEX idx_worklogs_user_range ON worklogs(
    company_id,
    author_email,
    started DESC
);
CREATE INDEX idx_worklogs_instance_range ON worklogs(
    company_id,
    jira_instance,
    started DESC
);
CREATE INDEX idx_worklogs_issue ON worklogs(company_id, issue_key);
CREATE INDEX idx_worklogs_epic ON worklogs(company_id, epic_key);
CREATE INDEX idx_worklogs_author ON worklogs(company_id, author_email);
```

**Columns:**
- `id` - JIRA worklog ID (globally unique)
- `jira_instance` - Source instance name
- `issue_*` - Denormalized issue data (avoids JOINs)
- `epic_*` - Denormalized epic data (avoids JOINs)
- `author_*` - Author info (email is join key to users table)
- `time_spent_seconds` - Duration in seconds
- `started` - ISO timestamp when work began
- `comment` - Optional worklog comment
- `cache_timestamp` - When synced from JIRA

**Denormalization Trade-off:**
- ✅ 87% query performance improvement
- ✅ Single query for most dashboards
- ❌ 20-30% storage overhead
- ❌ Epic name changes require re-sync

---

### epics

Cached epic metadata.

```sql
CREATE TABLE epics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    jira_instance TEXT NOT NULL,
    epic_id TEXT NOT NULL,
    epic_key TEXT NOT NULL,
    epic_name TEXT,
    summary TEXT,
    status TEXT,
    created TEXT,
    updated TEXT,
    cache_timestamp TEXT NOT NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX idx_epics_company ON epics(company_id);
CREATE INDEX idx_epics_instance ON epics(jira_instance);
CREATE UNIQUE INDEX idx_epics_company_instance_key ON epics(
    company_id,
    jira_instance,
    epic_key
);
```

---

### sync_history

Track sync operations for auditing and debugging.

```sql
CREATE TABLE sync_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    jira_instance_id INTEGER NOT NULL,
    sync_type TEXT NOT NULL,
    start_date TEXT,
    end_date TEXT,
    status TEXT NOT NULL,
    worklogs_synced INTEGER DEFAULT 0,
    epics_synced INTEGER DEFAULT 0,
    issues_synced INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    duration_seconds REAL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (jira_instance_id) REFERENCES jira_instances(id)
);

CREATE INDEX idx_sync_history_company ON sync_history(company_id);
CREATE INDEX idx_sync_history_instance ON sync_history(jira_instance_id);
CREATE INDEX idx_sync_history_started ON sync_history(started_at DESC);
```

**Sync Types:**
- `worklogs` - Worklog sync
- `epics` - Epic metadata sync
- `issues` - Issue metadata sync
- `full` - Complete sync

**Status:**
- `in_progress` - Currently running
- `completed` - Successfully completed
- `failed` - Error occurred
- `partial` - Completed with warnings

---

## 4. Billing Tables

### billing_clients

Client companies for billing purposes.

```sql
CREATE TABLE billing_clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    code TEXT,
    email TEXT,
    address TEXT,
    vat_number TEXT,
    default_rate REAL,
    currency TEXT DEFAULT 'EUR',
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX idx_billing_clients_company ON billing_clients(company_id);
CREATE UNIQUE INDEX idx_billing_clients_company_name ON billing_clients(
    company_id,
    name
);
```

**Columns:**
- `name` - Client company name
- `code` - Short code for reference (e.g., "ACME")
- `default_rate` - Hourly rate in specified currency
- `currency` - ISO currency code (EUR, USD, GBP)
- `vat_number` - Tax ID for invoicing

---

### billing_projects

Projects within a client for worklog classification.

```sql
CREATE TABLE billing_projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    code TEXT,
    rate_override REAL,
    is_billable INTEGER DEFAULT 1,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES billing_clients(id) ON DELETE CASCADE
);

CREATE INDEX idx_billing_projects_company ON billing_projects(company_id);
CREATE INDEX idx_billing_projects_client ON billing_projects(client_id);
CREATE UNIQUE INDEX idx_billing_projects_client_name ON billing_projects(
    client_id,
    name
);
```

**Columns:**
- `rate_override` - Project-specific rate (overrides client default)
- `is_billable` - Flag for internal vs billable projects

---

### billing_project_mappings

Maps JIRA projects to billing projects.

```sql
CREATE TABLE billing_project_mappings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    billing_project_id INTEGER NOT NULL,
    jira_instance_id INTEGER NOT NULL,
    jira_project_key TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (billing_project_id) REFERENCES billing_projects(id) ON DELETE CASCADE,
    FOREIGN KEY (jira_instance_id) REFERENCES jira_instances(id) ON DELETE CASCADE
);

CREATE INDEX idx_billing_mappings_company ON billing_project_mappings(company_id);
CREATE INDEX idx_billing_mappings_project ON billing_project_mappings(billing_project_id);
CREATE UNIQUE INDEX idx_billing_mappings_jira ON billing_project_mappings(
    jira_instance_id,
    jira_project_key
);
```

**Purpose:** Automatically classify worklogs by JIRA project key.

**Example:**
```
JIRA Project "ENG" → Billing Project "Product Development"
JIRA Project "SUP" → Billing Project "Customer Support"
```

---

### billing_rates

User/project-specific rate overrides.

```sql
CREATE TABLE billing_rates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    billing_project_id INTEGER,
    user_id INTEGER,
    issue_type_id TEXT,
    rate REAL NOT NULL,
    start_date TEXT,
    end_date TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (billing_project_id) REFERENCES billing_projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_billing_rates_company ON billing_rates(company_id);
CREATE INDEX idx_billing_rates_project ON billing_rates(billing_project_id);
CREATE INDEX idx_billing_rates_user ON billing_rates(user_id);
```

**Rate Resolution Cascade:**
1. Specific user + project + issue type + date range
2. User + project + date range
3. Project + issue type
4. Project override
5. Client default rate
6. Global default rate (from settings)

---

### billing_worklog_classifications

Manual billable/non-billable overrides per worklog.

```sql
CREATE TABLE billing_worklog_classifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    worklog_id TEXT NOT NULL,
    is_billable INTEGER NOT NULL,
    billing_project_id INTEGER,
    rate_override REAL,
    notes TEXT,
    classified_by INTEGER NOT NULL,
    classified_at TEXT NOT NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (worklog_id) REFERENCES worklogs(id) ON DELETE CASCADE,
    FOREIGN KEY (billing_project_id) REFERENCES billing_projects(id),
    FOREIGN KEY (classified_by) REFERENCES oauth_users(id)
);

CREATE INDEX idx_worklog_class_company ON billing_worklog_classifications(company_id);
CREATE UNIQUE INDEX idx_worklog_class_worklog ON billing_worklog_classifications(worklog_id);
```

**Use Case:** Manager manually marks specific worklogs as non-billable or overrides project assignment.

---

### invoices

Generated invoices for billing periods.

```sql
CREATE TABLE invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    invoice_number TEXT NOT NULL,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    total_hours REAL NOT NULL,
    total_amount REAL NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    notes TEXT,
    generated_by INTEGER NOT NULL,
    generated_at TEXT NOT NULL,
    issued_at TEXT,
    paid_at TEXT,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES billing_clients(id),
    FOREIGN KEY (generated_by) REFERENCES oauth_users(id)
);

CREATE INDEX idx_invoices_company ON invoices(company_id);
CREATE INDEX idx_invoices_client ON invoices(client_id);
CREATE INDEX idx_invoices_period ON invoices(
    company_id,
    period_start,
    period_end
);
CREATE UNIQUE INDEX idx_invoices_number ON invoices(company_id, invoice_number);
```

**Status Flow:**
- `DRAFT` → Can edit
- `ISSUED` → Sent to client, read-only
- `PAID` → Payment received

---

### invoice_line_items

Detailed breakdown of invoice charges.

```sql
CREATE TABLE invoice_line_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    billing_project_id INTEGER,
    description TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    total_amount REAL NOT NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (billing_project_id) REFERENCES billing_projects(id)
);

CREATE INDEX idx_invoice_items_invoice ON invoice_line_items(invoice_id);
CREATE INDEX idx_invoice_items_project ON invoice_line_items(billing_project_id);
```

**Example:**
```
Invoice #2024-001
  Line 1: "Product Development" | 120 hours | €80/h | €9,600
  Line 2: "Bug Fixes" | 20 hours | €60/h | €1,200
  Total: €10,800
```

---

## 5. Package Templates

### package_templates

Templates for cross-instance issue creation (packages).

```sql
CREATE TABLE package_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX idx_package_templates_company ON package_templates(company_id);
CREATE UNIQUE INDEX idx_package_templates_company_name ON package_templates(
    company_id,
    name
);
```

**Purpose:** Define reusable issue sets that should be created across multiple JIRA instances.

---

### package_template_elements

Individual issues within a package template.

```sql
CREATE TABLE package_template_elements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    package_template_id INTEGER NOT NULL,
    jira_instance_id INTEGER NOT NULL,
    project_key TEXT NOT NULL,
    issue_type TEXT NOT NULL,
    summary TEXT NOT NULL,
    description TEXT,
    story_points INTEGER,
    order_index INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (package_template_id) REFERENCES package_templates(id) ON DELETE CASCADE,
    FOREIGN KEY (jira_instance_id) REFERENCES jira_instances(id)
);

CREATE INDEX idx_package_elements_template ON package_template_elements(package_template_id);
CREATE INDEX idx_package_elements_instance ON package_template_elements(jira_instance_id);
```

**Example:**
```
Package: "New Feature Setup"
  Element 1: Create Epic in Instance A, Project "ENG"
  Element 2: Create Backend Story in Instance A, Project "ENG"
  Element 3: Create Frontend Story in Instance A, Project "ENG"
  Element 4: Create QA Task in Instance B, Project "TEST"
```

---

### linked_issues

Cross-instance issue relationships created by packages.

```sql
CREATE TABLE linked_issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    source_instance_id INTEGER NOT NULL,
    source_issue_key TEXT NOT NULL,
    target_instance_id INTEGER NOT NULL,
    target_issue_key TEXT NOT NULL,
    link_type TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (source_instance_id) REFERENCES jira_instances(id),
    FOREIGN KEY (target_instance_id) REFERENCES jira_instances(id)
);

CREATE INDEX idx_linked_issues_company ON linked_issues(company_id);
CREATE INDEX idx_linked_issues_source ON linked_issues(
    source_instance_id,
    source_issue_key
);
CREATE INDEX idx_linked_issues_target ON linked_issues(
    target_instance_id,
    target_issue_key
);
```

**Link Types:**
- `relates_to` - Generic relationship
- `blocks` - Source blocks target
- `is_blocked_by` - Inverse of blocks
- `duplicates` - Source duplicates target

---

## 6. HR Integration

### factorial_config

Factorial HR API configuration.

```sql
CREATE TABLE factorial_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    api_key TEXT NOT NULL,
    company_identifier TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_factorial_config_company ON factorial_config(company_id);
```

---

### factorial_leaves

Cached employee absences from Factorial.

```sql
CREATE TABLE factorial_leaves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    leave_type TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    days_count REAL NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX idx_factorial_leaves_company ON factorial_leaves(company_id);
CREATE INDEX idx_factorial_leaves_employee ON factorial_leaves(employee_id);
CREATE INDEX idx_factorial_leaves_dates ON factorial_leaves(start_date, end_date);
```

**Leave Types:**
- `vacation` - Paid time off
- `sick` - Sick leave
- `unpaid` - Unpaid leave
- `other` - Other absences

---

### factorial_sync_history

Track Factorial sync operations.

```sql
CREATE TABLE factorial_sync_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    sync_type TEXT NOT NULL,
    start_date TEXT,
    end_date TEXT,
    status TEXT NOT NULL,
    leaves_synced INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX idx_factorial_sync_company ON factorial_sync_history(company_id);
CREATE INDEX idx_factorial_sync_started ON factorial_sync_history(started_at DESC);
```

---

## 7. Logging

### logs

Application logs stored in database for debugging.

```sql
CREATE TABLE logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER,
    timestamp TEXT NOT NULL,
    level TEXT NOT NULL,
    logger_name TEXT NOT NULL,
    message TEXT NOT NULL,
    request_id TEXT,
    endpoint TEXT,
    method TEXT,
    status_code INTEGER,
    duration_ms REAL,
    extra_data JSON,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX idx_logs_company_timestamp ON logs(company_id, timestamp DESC);
CREATE INDEX idx_logs_request_id ON logs(request_id);
CREATE INDEX idx_logs_level ON logs(level);
CREATE INDEX idx_logs_timestamp ON logs(timestamp DESC);
```

**Columns:**
- `level` - DEBUG | INFO | WARNING | ERROR | CRITICAL
- `logger_name` - Python module name (e.g., "app.routers.teams")
- `request_id` - UUID for request correlation
- `endpoint` - API path (e.g., "/api/teams")
- `method` - HTTP method (GET, POST, PUT, DELETE)
- `duration_ms` - Request duration in milliseconds
- `extra_data` - JSON blob for additional context

**Retention:** Logs table can grow unbounded. Recommended cleanup: delete logs > 90 days old.

---

## Performance Optimizations

### Critical Indexes (Already Created)

**Worklog Queries (87% improvement):**
```sql
idx_worklogs_company_started       -- Dashboard overview
idx_worklogs_user_range            -- User detail page (1.2s → 150ms)
idx_worklogs_instance_range        -- Instance filtering (2.8s → 350ms)
idx_worklogs_issue                 -- Issue detail page
idx_worklogs_epic                  -- Epic aggregation
```

**Auth Queries:**
```sql
idx_oauth_users_email              -- Login lookup
idx_auth_sessions_jti              -- Token validation
idx_invitations_token              -- Invitation redemption
```

**Billing Queries:**
```sql
idx_invoices_period                -- Period-based invoice search
idx_billing_mappings_jira          -- Project classification
```

### Planned Indexes (Phase 2)

**Missing from Phase 1:**
```sql
-- Composite index for team worklog queries
CREATE INDEX idx_worklogs_team_range ON worklogs(
    company_id,
    (SELECT team_id FROM users WHERE email = author_email),
    started DESC
);

-- Epic worklog aggregation
CREATE INDEX idx_worklogs_epic_range ON worklogs(
    company_id,
    epic_key,
    started DESC
);
```

---

## Database Maintenance

### Vacuum and Analyze

```sql
-- Reclaim space after large deletes
VACUUM;

-- Update query planner statistics
ANALYZE;
```

Run monthly or after large data operations.

### Archive Old Data

**Logs Table Cleanup:**
```sql
DELETE FROM logs
WHERE timestamp < datetime('now', '-90 days');
```

**Sync History Cleanup:**
```sql
DELETE FROM sync_history
WHERE started_at < datetime('now', '-365 days')
  AND status = 'completed';
```

### Check Database Size

```bash
ls -lh backend/worklog_storage.db
```

**Monitoring:**
- < 100MB: Healthy
- 100MB - 1GB: Normal growth
- > 1GB: Consider archiving or PostgreSQL migration

---

## Migration Strategy

### Adding company_id to Existing Tables

**Step 1: Add column (nullable)**
```sql
ALTER TABLE complementary_group_members ADD COLUMN company_id INTEGER;
```

**Step 2: Populate from parent table**
```sql
UPDATE complementary_group_members
SET company_id = (
    SELECT cg.company_id
    FROM complementary_groups cg
    WHERE cg.id = complementary_group_members.group_id
);
```

**Step 3: Make NOT NULL**
```sql
-- SQLite doesn't support ALTER COLUMN, need to recreate table
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

INSERT INTO complementary_group_members_new
SELECT * FROM complementary_group_members;

DROP TABLE complementary_group_members;
ALTER TABLE complementary_group_members_new RENAME TO complementary_group_members;

-- Recreate indexes
CREATE INDEX idx_complementary_members_company ON complementary_group_members(company_id);
CREATE INDEX idx_complementary_members_group ON complementary_group_members(group_id);
```

---

## Relationships Summary

```
companies (1) ──< oauth_users (N)
companies (1) ──< teams (N)
companies (1) ──< jira_instances (N)

teams (1) ──< users (N)

users (1) ──< user_jira_accounts (N)
jira_instances (1) ──< user_jira_accounts (N)

companies (1) ──< worklogs (N)

billing_clients (1) ──< billing_projects (N)
billing_projects (1) ──< billing_project_mappings (N)
billing_clients (1) ──< invoices (N)
invoices (1) ──< invoice_line_items (N)

package_templates (1) ──< package_template_elements (N)
```

---

## Resources

- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [SQLite Performance Tips](https://www.sqlite.org/performance.html)
- [EXPLAIN QUERY PLAN](https://www.sqlite.org/eqp.html) - Query optimization
- [Backend OPTIMIZATION_PLAN.md](../backend/OPTIMIZATION_PLAN.md) - Database performance roadmap
