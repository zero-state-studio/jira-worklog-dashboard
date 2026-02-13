"""
SQLite-based permanent storage for JIRA worklog data.
Data persists permanently and is manually synced from JIRA.
"""
import aiosqlite
import json
from datetime import datetime, date
from pathlib import Path
from typing import Optional
import asyncio

from .models import Worklog, Epic, Issue, UserRole


class WorklogStorage:
    """Async SQLite storage for JIRA worklog data - permanent storage."""
    
    def __init__(self, db_path: str = "worklog_storage.db"):
        self.db_path = Path(db_path)
        self._initialized = False
        self._lock = asyncio.Lock()
    
    async def initialize(self):
        """Initialize the storage database."""
        if self._initialized:
            return
            
        async with self._lock:
            if self._initialized:
                return
                
            async with aiosqlite.connect(self.db_path) as db:
                # Worklogs table - permanent storage
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS worklogs (
                        id TEXT PRIMARY KEY,
                        issue_key TEXT NOT NULL,
                        issue_summary TEXT,
                        author_email TEXT NOT NULL,
                        author_display_name TEXT,
                        time_spent_seconds INTEGER NOT NULL,
                        started TEXT NOT NULL,
                        jira_instance TEXT NOT NULL,
                        epic_key TEXT,
                        epic_name TEXT,
                        data TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Epics table
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS epics (
                        key TEXT PRIMARY KEY,
                        name TEXT,
                        summary TEXT,
                        jira_instance TEXT NOT NULL,
                        data TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Sync history table - tracks when syncs occurred
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS sync_history (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        start_date TEXT NOT NULL,
                        end_date TEXT NOT NULL,
                        jira_instances TEXT NOT NULL,
                        worklogs_synced INTEGER DEFAULT 0,
                        worklogs_updated INTEGER DEFAULT 0,
                        worklogs_deleted INTEGER DEFAULT 0,
                        status TEXT DEFAULT 'completed',
                        error_message TEXT,
                        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        completed_at TIMESTAMP
                    )
                """)

                # Migrate sync_history to add company_id column if not exists
                try:
                    # Check if company_id column exists
                    async with db.execute("PRAGMA table_info(sync_history)") as cursor:
                        columns = await cursor.fetchall()
                        has_company_id = any(col[1] == 'company_id' for col in columns)

                    if not has_company_id:
                        # Add company_id column
                        await db.execute("""
                            ALTER TABLE sync_history
                            ADD COLUMN company_id INTEGER
                        """)
                        # Backfill existing records with company_id = 1
                        await db.execute("""
                            UPDATE sync_history
                            SET company_id = 1
                            WHERE company_id IS NULL
                        """)
                        await db.commit()
                except Exception as e:
                    # If migration fails, log but continue (table might already be updated)
                    print(f"sync_history migration warning: {e}")

                # Create indexes for faster lookups
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_worklogs_started 
                    ON worklogs(started)
                """)
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_worklogs_author 
                    ON worklogs(author_email)
                """)
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_worklogs_instance 
                    ON worklogs(jira_instance)
                """)
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_worklogs_started_date
                    ON worklogs(date(started))
                """)

                # ========== Settings Tables ==========

                # Teams table
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS teams (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL UNIQUE,
                        owner_id INTEGER REFERENCES oauth_users(id) ON DELETE SET NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)

                # Users table
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        email TEXT NOT NULL UNIQUE,
                        first_name TEXT NOT NULL,
                        last_name TEXT NOT NULL,
                        team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)

                # User JIRA accounts mapping (accountId per JIRA instance)
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS user_jira_accounts (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        jira_instance TEXT NOT NULL,
                        account_id TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(user_id, jira_instance)
                    )
                """)

                # Indexes for settings tables
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_users_team
                    ON users(team_id)
                """)
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_users_email
                    ON users(email)
                """)
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_user_jira_accounts_user
                    ON user_jira_accounts(user_id)
                """)

                # ========== Application Logs Table ==========

                await db.execute("""
                    CREATE TABLE IF NOT EXISTS logs (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp TEXT NOT NULL,
                        level TEXT NOT NULL,
                        logger_name TEXT,
                        message TEXT NOT NULL,
                        request_id TEXT,
                        endpoint TEXT,
                        method TEXT,
                        status_code INTEGER,
                        duration_ms REAL,
                        extra_data TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)

                # Indexes for logs
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_logs_timestamp
                    ON logs(timestamp)
                """)
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_logs_level
                    ON logs(level)
                """)
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_logs_endpoint
                    ON logs(endpoint)
                """)
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_logs_request_id
                    ON logs(request_id)
                """)

                # ========== JIRA Instances Table ==========

                await db.execute("""
                    CREATE TABLE IF NOT EXISTS jira_instances (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL UNIQUE,
                        url TEXT NOT NULL,
                        email TEXT NOT NULL,
                        api_token TEXT NOT NULL,
                        tempo_api_token TEXT,
                        billing_client_id INTEGER REFERENCES billing_clients(id) ON DELETE SET NULL,
                        is_active INTEGER DEFAULT 1,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)

                # Add billing_client_id column if it doesn't exist (migration)
                try:
                    await db.execute("""
                        ALTER TABLE jira_instances
                        ADD COLUMN billing_client_id INTEGER REFERENCES billing_clients(id) ON DELETE SET NULL
                    """)
                except Exception:
                    pass  # Column already exists

                # Complementary instance groups - instances in same group track same work
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS complementary_groups (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL UNIQUE,
                        primary_instance_id INTEGER REFERENCES jira_instances(id) ON DELETE SET NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)

                # Junction table for complementary group members
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS complementary_group_members (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                        group_id INTEGER NOT NULL REFERENCES complementary_groups(id) ON DELETE CASCADE,
                        instance_id INTEGER NOT NULL REFERENCES jira_instances(id) ON DELETE CASCADE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(group_id, instance_id)
                    )
                """)

                # Index for JIRA instances
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_jira_instances_name
                    ON jira_instances(name)
                """)

                # Package templates - configurable issue creation templates
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS package_templates (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL UNIQUE,
                        description TEXT,
                        default_project_key TEXT,
                        parent_issue_type TEXT DEFAULT 'Task',
                        child_issue_type TEXT DEFAULT 'Sub-task',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)

                # Package template elements - the distinctive elements for each template
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS package_template_elements (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        template_id INTEGER NOT NULL REFERENCES package_templates(id) ON DELETE CASCADE,
                        name TEXT NOT NULL,
                        sort_order INTEGER DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(template_id, name)
                    )
                """)

                # JIRA instance issue types (cached from JIRA)
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS jira_instance_issue_types (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        instance_id INTEGER NOT NULL REFERENCES jira_instances(id) ON DELETE CASCADE,
                        type_id TEXT NOT NULL,
                        name TEXT NOT NULL,
                        subtask INTEGER DEFAULT 0,
                        UNIQUE(instance_id, type_id)
                    )
                """)

                # Package template - JIRA instance associations
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS package_template_instances (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        template_id INTEGER NOT NULL REFERENCES package_templates(id) ON DELETE CASCADE,
                        instance_id INTEGER NOT NULL REFERENCES jira_instances(id) ON DELETE CASCADE,
                        UNIQUE(template_id, instance_id)
                    )
                """)

                # Linked issues table (cross-instance package linking)
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS linked_issues (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        link_group_id TEXT NOT NULL,
                        issue_key TEXT NOT NULL,
                        jira_instance TEXT NOT NULL,
                        element_name TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(issue_key, jira_instance)
                    )
                """)
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_linked_issues_group
                    ON linked_issues(link_group_id)
                """)

                # Holidays table
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS holidays (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        holiday_date TEXT NOT NULL,
                        holiday_type TEXT NOT NULL,
                        month INTEGER,
                        day INTEGER,
                        country TEXT DEFAULT 'IT',
                        is_active INTEGER DEFAULT 1,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(holiday_date, country)
                    )
                """)
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_holidays_date
                    ON holidays(holiday_date)
                """)

                # ========== Billing Tables ==========

                # Billing clients
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS billing_clients (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL UNIQUE,
                        billing_currency TEXT NOT NULL DEFAULT 'EUR',
                        default_hourly_rate REAL,
                        jira_instance_id INTEGER REFERENCES jira_instances(id) ON DELETE SET NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)

                # Add jira_instance_id column if it doesn't exist (migration)
                try:
                    await db.execute("""
                        ALTER TABLE billing_clients
                        ADD COLUMN jira_instance_id INTEGER REFERENCES jira_instances(id) ON DELETE SET NULL
                    """)
                except Exception:
                    pass  # Column already exists

                # Billing projects (belong to a client)
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS billing_projects (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        client_id INTEGER NOT NULL REFERENCES billing_clients(id) ON DELETE CASCADE,
                        name TEXT NOT NULL,
                        default_hourly_rate REAL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)

                # Billing project mappings (link JIRA projects to billing projects)
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS billing_project_mappings (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        billing_project_id INTEGER NOT NULL REFERENCES billing_projects(id) ON DELETE CASCADE,
                        jira_instance TEXT NOT NULL,
                        jira_project_key TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(billing_project_id, jira_instance, jira_project_key)
                    )
                """)

                # Billing rates (override rates per project/user/issue_type)
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS billing_rates (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        billing_project_id INTEGER NOT NULL REFERENCES billing_projects(id) ON DELETE CASCADE,
                        user_email TEXT,
                        issue_type TEXT,
                        hourly_rate REAL NOT NULL,
                        valid_from TEXT,
                        valid_to TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)

                # Billing worklog classifications (billable/non-billable)
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS billing_worklog_classifications (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        worklog_id TEXT NOT NULL UNIQUE,
                        is_billable INTEGER NOT NULL DEFAULT 1,
                        override_hourly_rate REAL,
                        note TEXT,
                        classified_by TEXT,
                        classified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)

                # Invoices
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS invoices (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        client_id INTEGER NOT NULL REFERENCES billing_clients(id),
                        billing_project_id INTEGER REFERENCES billing_projects(id),
                        period_start TEXT NOT NULL,
                        period_end TEXT NOT NULL,
                        status TEXT NOT NULL DEFAULT 'DRAFT',
                        currency TEXT NOT NULL DEFAULT 'EUR',
                        subtotal_amount REAL NOT NULL DEFAULT 0,
                        taxes_amount REAL NOT NULL DEFAULT 0,
                        total_amount REAL NOT NULL DEFAULT 0,
                        group_by TEXT NOT NULL DEFAULT 'project',
                        notes TEXT,
                        created_by TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        issued_at TIMESTAMP
                    )
                """)

                # Invoice line items (snapshot at creation time)
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS invoice_line_items (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
                        line_type TEXT NOT NULL DEFAULT 'work',
                        description TEXT NOT NULL,
                        quantity_hours REAL NOT NULL DEFAULT 0,
                        hourly_rate REAL NOT NULL DEFAULT 0,
                        amount REAL NOT NULL DEFAULT 0,
                        metadata_json TEXT,
                        sort_order INTEGER DEFAULT 0
                    )
                """)

                # Billing indexes
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_billing_project_mappings
                    ON billing_project_mappings(billing_project_id, jira_project_key)
                """)
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_invoices_client
                    ON invoices(client_id, status)
                """)
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_invoice_lines
                    ON invoice_line_items(invoice_id)
                """)
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_billing_classifications_worklog
                    ON billing_worklog_classifications(worklog_id)
                """)

                # ========== Migrations ==========

                # Add parent columns to worklogs table (migration)
                try:
                    await db.execute("ALTER TABLE worklogs ADD COLUMN parent_key TEXT")
                except Exception:
                    pass  # Column already exists
                try:
                    await db.execute("ALTER TABLE worklogs ADD COLUMN parent_name TEXT")
                except Exception:
                    pass  # Column already exists
                try:
                    await db.execute("ALTER TABLE worklogs ADD COLUMN parent_type TEXT")
                except Exception:
                    pass  # Column already exists

                # Add default_project_key to jira_instances (migration)
                try:
                    await db.execute("ALTER TABLE jira_instances ADD COLUMN default_project_key TEXT")
                except Exception:
                    pass  # Column already exists

                # ========== Factorial HR Tables ==========

                # Factorial configuration
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS factorial_config (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        api_key TEXT NOT NULL,
                        is_active INTEGER DEFAULT 1,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)

                # User Factorial accounts mapping
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS user_factorial_accounts (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        factorial_employee_id INTEGER NOT NULL UNIQUE,
                        factorial_email TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(user_id)
                    )
                """)

                # Factorial leaves/absences
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS factorial_leaves (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        factorial_leave_id INTEGER NOT NULL UNIQUE,
                        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        factorial_employee_id INTEGER NOT NULL,
                        leave_type_id INTEGER,
                        leave_type_name TEXT NOT NULL,
                        start_date TEXT NOT NULL,
                        finish_date TEXT NOT NULL,
                        half_day TEXT DEFAULT 'no',
                        status TEXT NOT NULL,
                        description TEXT,
                        data TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)

                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_factorial_leaves_user
                    ON factorial_leaves(user_id)
                """)
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_factorial_leaves_dates
                    ON factorial_leaves(start_date, finish_date)
                """)
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_factorial_leaves_status
                    ON factorial_leaves(status)
                """)

                # Factorial sync history
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS factorial_sync_history (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        start_date TEXT NOT NULL,
                        end_date TEXT NOT NULL,
                        leaves_synced INTEGER DEFAULT 0,
                        leaves_updated INTEGER DEFAULT 0,
                        status TEXT DEFAULT 'completed',
                        error_message TEXT,
                        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        completed_at TIMESTAMP
                    )
                """)

                # ========== Authentication Tables ==========

                # Companies/Organizations
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS companies (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL UNIQUE,
                        domain TEXT,
                        is_active INTEGER DEFAULT 1,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)

                # OAuth authenticated users
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS oauth_users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                        google_id TEXT NOT NULL UNIQUE,
                        email TEXT NOT NULL,
                        first_name TEXT,
                        last_name TEXT,
                        picture_url TEXT,
                        role TEXT NOT NULL DEFAULT 'DEV',
                        role_level INTEGER NOT NULL DEFAULT 1,
                        is_active INTEGER DEFAULT 1,
                        last_login_at TIMESTAMP,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(company_id, email)
                    )
                """)

                # Session tokens
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS auth_sessions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL REFERENCES oauth_users(id) ON DELETE CASCADE,
                        refresh_token TEXT NOT NULL UNIQUE,
                        access_token_jti TEXT,
                        expires_at TIMESTAMP NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)

                # Invitations
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS invitations (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                        email TEXT NOT NULL,
                        role TEXT NOT NULL DEFAULT 'USER',
                        invited_by INTEGER REFERENCES oauth_users(id),
                        token TEXT NOT NULL UNIQUE,
                        status TEXT DEFAULT 'PENDING',
                        expires_at TIMESTAMP NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)

                # Auth audit log
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS auth_audit_log (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        company_id INTEGER REFERENCES companies(id),
                        user_id INTEGER REFERENCES oauth_users(id),
                        event_type TEXT NOT NULL,
                        email TEXT,
                        ip_address TEXT,
                        metadata_json TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)

                # Auth indexes
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_oauth_users_company
                    ON oauth_users(company_id)
                """)
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_oauth_users_google_id
                    ON oauth_users(google_id)
                """)
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_oauth_users_email
                    ON oauth_users(email)
                """)
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_auth_sessions_user
                    ON auth_sessions(user_id)
                """)
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_auth_sessions_token
                    ON auth_sessions(refresh_token)
                """)
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_invitations_company
                    ON invitations(company_id)
                """)
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_invitations_token
                    ON invitations(token)
                """)
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_invitations_email
                    ON invitations(email, status)
                """)
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_auth_audit_company
                    ON auth_audit_log(company_id, created_at)
                """)

                # ========== Company ID Migration ==========
                # Add company_id to all existing tables for multi-tenant support

                # Add company_id to teams
                try:
                    await db.execute("""
                        ALTER TABLE teams
                        ADD COLUMN company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE
                    """)
                except Exception:
                    pass  # Column already exists

                # Add company_id to users
                try:
                    await db.execute("""
                        ALTER TABLE users
                        ADD COLUMN company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE
                    """)
                except Exception:
                    pass  # Column already exists

                # Add company_id to jira_instances
                try:
                    await db.execute("""
                        ALTER TABLE jira_instances
                        ADD COLUMN company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE
                    """)
                except Exception:
                    pass  # Column already exists

                # Add company_id to worklogs
                try:
                    await db.execute("""
                        ALTER TABLE worklogs
                        ADD COLUMN company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE
                    """)
                    # Backfill existing worklogs with company_id = 1 for backward compatibility
                    await db.execute("""
                        UPDATE worklogs
                        SET company_id = 1
                        WHERE company_id IS NULL
                    """)
                    await db.commit()
                except Exception:
                    pass  # Column already exists

                # Add company_id to epics
                try:
                    await db.execute("""
                        ALTER TABLE epics
                        ADD COLUMN company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE
                    """)
                except Exception:
                    pass  # Column already exists

                # Add company_id to billing_clients
                try:
                    await db.execute("""
                        ALTER TABLE billing_clients
                        ADD COLUMN company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE
                    """)
                except Exception:
                    pass  # Column already exists

                # Add company_id to billing_projects
                try:
                    await db.execute("""
                        ALTER TABLE billing_projects
                        ADD COLUMN company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE
                    """)
                except Exception:
                    pass  # Column already exists

                # Add company_id to invoices
                try:
                    await db.execute("""
                        ALTER TABLE invoices
                        ADD COLUMN company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE
                    """)
                except Exception:
                    pass  # Column already exists

                # Add company_id to package_templates
                try:
                    await db.execute("""
                        ALTER TABLE package_templates
                        ADD COLUMN company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE
                    """)
                except Exception:
                    pass  # Column already exists

                # Add company_id to holidays
                try:
                    await db.execute("""
                        ALTER TABLE holidays
                        ADD COLUMN company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE
                    """)
                except Exception:
                    pass  # Column already exists

                # Add company_id to factorial_config
                try:
                    await db.execute("""
                        ALTER TABLE factorial_config
                        ADD COLUMN company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE
                    """)
                except Exception:
                    pass  # Column already exists

                # Add company_id to complementary_groups
                try:
                    await db.execute("""
                        ALTER TABLE complementary_groups
                        ADD COLUMN company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE
                    """)
                except Exception:
                    pass  # Column already exists

                # Add company_id to logs (optional - for filtering)
                try:
                    await db.execute("""
                        ALTER TABLE logs
                        ADD COLUMN company_id INTEGER REFERENCES companies(id)
                    """)
                except Exception:
                    pass  # Column already exists

                # ========== Automatic Backfill for Legacy Data ==========
                # Backfill any remaining NULL company_id values to company_id=1 for backward compatibility
                # This ensures data created before multi-tenant implementation is visible

                try:
                    # Backfill worklogs
                    await db.execute("""
                        UPDATE worklogs
                        SET company_id = 1
                        WHERE company_id IS NULL
                    """)

                    # Backfill epics
                    await db.execute("""
                        UPDATE epics
                        SET company_id = 1
                        WHERE company_id IS NULL
                    """)

                    # Backfill teams
                    await db.execute("""
                        UPDATE teams
                        SET company_id = 1
                        WHERE company_id IS NULL
                    """)

                    # Backfill users
                    await db.execute("""
                        UPDATE users
                        SET company_id = 1
                        WHERE company_id IS NULL
                    """)

                    # Backfill jira_instances
                    await db.execute("""
                        UPDATE jira_instances
                        SET company_id = 1
                        WHERE company_id IS NULL
                    """)

                    await db.commit()
                except Exception as e:
                    # Silently ignore errors (tables might not have company_id yet)
                    pass

                # Create indexes for company_id columns
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_teams_company
                    ON teams(company_id)
                """)
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_users_company
                    ON users(company_id)
                """)
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_jira_instances_company
                    ON jira_instances(company_id)
                """)
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_worklogs_company
                    ON worklogs(company_id, started)
                """)
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_epics_company
                    ON epics(company_id)
                """)
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_billing_clients_company
                    ON billing_clients(company_id)
                """)
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_billing_projects_company
                    ON billing_projects(company_id)
                """)
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_invoices_company
                    ON invoices(company_id)
                """)
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_package_templates_company
                    ON package_templates(company_id)
                """)
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_holidays_company
                    ON holidays(company_id)
                """)
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_factorial_config_company
                    ON factorial_config(company_id)
                """)
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_complementary_groups_company
                    ON complementary_groups(company_id)
                """)

                # ========== Role System Migration ==========
                # Add role_level to oauth_users for hierarchical role queries
                try:
                    await db.execute("""
                        ALTER TABLE oauth_users
                        ADD COLUMN role_level INTEGER NOT NULL DEFAULT 1
                    """)
                    # Backfill role_level from existing role values
                    await db.execute("UPDATE oauth_users SET role_level = 4 WHERE role = 'ADMIN'")
                    await db.execute("UPDATE oauth_users SET role_level = 3 WHERE role = 'MANAGER'")
                    await db.execute("UPDATE oauth_users SET role_level = 2 WHERE role = 'PM'")
                    await db.execute("UPDATE oauth_users SET role_level = 1 WHERE role IN ('USER', 'DEV')")
                    # Migrate old role names: USER -> DEV
                    await db.execute("UPDATE oauth_users SET role = 'DEV' WHERE role = 'USER'")
                    await db.commit()
                except Exception:
                    pass  # Column already exists

                # Add owner_id to teams for team ownership
                try:
                    await db.execute("""
                        ALTER TABLE teams
                        ADD COLUMN owner_id INTEGER REFERENCES oauth_users(id) ON DELETE SET NULL
                    """)
                except Exception:
                    pass  # Column already exists

                # Indexes for role system
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_oauth_users_role_level
                    ON oauth_users(company_id, role_level)
                """)
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_teams_owner_id
                    ON teams(company_id, owner_id)
                """)

                # Add role and role_level to users table (for team members)
                try:
                    await db.execute("""
                        ALTER TABLE users
                        ADD COLUMN role TEXT NOT NULL DEFAULT 'DEV'
                    """)
                    await db.execute("""
                        ALTER TABLE users
                        ADD COLUMN role_level INTEGER NOT NULL DEFAULT 1
                    """)
                    # Backfill role_level from existing role values if any
                    await db.execute("UPDATE users SET role_level = 4 WHERE role = 'ADMIN'")
                    await db.execute("UPDATE users SET role_level = 3 WHERE role = 'MANAGER'")
                    await db.execute("UPDATE users SET role_level = 2 WHERE role = 'PM'")
                    await db.execute("UPDATE users SET role_level = 1 WHERE role IN ('USER', 'DEV')")
                    # Migrate old role names: USER -> DEV
                    await db.execute("UPDATE users SET role = 'DEV' WHERE role = 'USER'")
                    await db.commit()
                except Exception:
                    pass  # Columns already exist

                # Index for role-based queries on users
                await db.execute("""
                    CREATE INDEX IF NOT EXISTS idx_users_role_level
                    ON users(company_id, role_level)
                """)

                # Migrate worklog IDs to composite format (id__jira_instance)
                # This allows multiple JIRA instances to have worklogs with the same original ID
                try:
                    # Check if migration is needed (worklogs with old ID format)
                    cursor = await db.execute("""
                        SELECT COUNT(*) FROM worklogs WHERE id NOT LIKE '%__%'
                    """)
                    old_format_count = (await cursor.fetchone())[0]

                    if old_format_count > 0:
                        print(f"🔄 Migrating {old_format_count} worklogs to new ID format (id__instance)...")

                        # Update IDs to composite format
                        await db.execute("""
                            UPDATE worklogs
                            SET id = id || '__' || REPLACE(jira_instance, ' ', '_')
                            WHERE id NOT LIKE '%__%'
                        """)

                        print(f"✅ Migration completed: {old_format_count} worklogs updated")
                except Exception as e:
                    print(f"⚠️  Worklog ID migration skipped: {e}")
                    pass

                await db.commit()

            self._initialized = True

    # ========== Migration Operations ==========

    async def check_legacy_data(self) -> dict:
        """Check if there are legacy records (company_id IS NULL) that need migration.

        Returns:
            Dictionary with counts of legacy records per table
        """
        await self.initialize()

        tables_with_company_id = [
            "teams", "users", "jira_instances", "worklogs", "epics",
            "billing_clients", "billing_projects", "invoices",
            "package_templates", "holidays", "factorial_config",
            "complementary_groups", "logs"
        ]

        legacy_counts = {}

        async with aiosqlite.connect(self.db_path) as db:
            for table in tables_with_company_id:
                try:
                    cursor = await db.execute(
                        f"SELECT COUNT(*) FROM {table} WHERE company_id IS NULL"
                    )
                    count = (await cursor.fetchone())[0]
                    if count > 0:
                        legacy_counts[table] = count
                except Exception as e:
                    # Table might not exist or have company_id column yet
                    pass

        total_legacy = sum(legacy_counts.values())
        return {
            "needs_migration": total_legacy > 0,
            "total_legacy_records": total_legacy,
            "by_table": legacy_counts
        }

    async def migrate_legacy_data(self, target_company_id: int = 1) -> dict:
        """Migrate all legacy data (company_id IS NULL) to a specific company.

        This is a one-time migration operation that assigns legacy data to company_id=1
        (or another specified company). This ensures backward compatibility with data
        created before multi-tenant implementation.

        Args:
            target_company_id: The company ID to assign to legacy data (default: 1)

        Returns:
            Dictionary with migration results per table
        """
        await self.initialize()

        # Check if target company exists
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                "SELECT COUNT(*) FROM companies WHERE id = ?",
                (target_company_id,)
            )
            if (await cursor.fetchone())[0] == 0:
                raise ValueError(f"Target company_id={target_company_id} does not exist")

        tables_with_company_id = [
            "teams", "users", "jira_instances", "worklogs", "epics",
            "billing_clients", "billing_projects", "invoices",
            "package_templates", "holidays", "factorial_config",
            "complementary_groups", "logs"
        ]

        migration_results = {}
        total_migrated = 0

        async with aiosqlite.connect(self.db_path) as db:
            for table in tables_with_company_id:
                try:
                    # Count records to migrate
                    cursor = await db.execute(
                        f"SELECT COUNT(*) FROM {table} WHERE company_id IS NULL"
                    )
                    count_before = (await cursor.fetchone())[0]

                    if count_before > 0:
                        # Migrate records
                        await db.execute(
                            f"UPDATE {table} SET company_id = ? WHERE company_id IS NULL",
                            (target_company_id,)
                        )

                        # Verify migration
                        cursor = await db.execute(
                            f"SELECT COUNT(*) FROM {table} WHERE company_id IS NULL"
                        )
                        count_after = (await cursor.fetchone())[0]

                        migrated = count_before - count_after
                        migration_results[table] = {
                            "before": count_before,
                            "after": count_after,
                            "migrated": migrated
                        }
                        total_migrated += migrated
                except Exception as e:
                    # Table might not exist or have company_id column yet
                    migration_results[table] = {
                        "error": str(e)
                    }

            await db.commit()

        return {
            "success": True,
            "target_company_id": target_company_id,
            "total_migrated": total_migrated,
            "by_table": migration_results
        }

    # ========== Worklog Operations ==========
    
    async def get_worklogs_in_range(
        self,
        start_date: date,
        end_date: date,
        user_emails: Optional[list[str]] = None,
        jira_instance: Optional[str] = None,
        company_id: Optional[int] = None
    ) -> list[Worklog]:
        """Get worklogs within a date range from permanent storage.

        Args:
            start_date: Start of date range
            end_date: End of date range
            user_emails: Optional list of user emails to filter by
            jira_instance: Optional JIRA instance name to filter by
            company_id: Company ID to filter by (REQUIRED for multi-tenant isolation)

        Returns:
            List of worklogs matching the criteria
        """
        await self.initialize()

        # Multi-tenant security: require company_id for data isolation
        if company_id is None:
            raise ValueError("company_id is required for multi-tenant operations")

        query = """
            SELECT data FROM worklogs
            WHERE company_id = ? AND date(started) >= ? AND date(started) <= ?
        """
        params = [company_id, start_date.isoformat(), end_date.isoformat()]

        if jira_instance:
            query += " AND jira_instance = ?"
            params.append(jira_instance)

        if user_emails:
            placeholders = ",".join("?" * len(user_emails))
            query += f" AND LOWER(author_email) IN ({placeholders})"
            params.extend([e.lower() for e in user_emails])

        print(f"🔍 SQL QUERY: {query}")
        print(f"🔍 SQL PARAMS: {params}")
        
        query += " ORDER BY started DESC"
        
        worklogs = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(query, params) as cursor:
                async for row in cursor:
                    try:
                        worklogs.append(Worklog(**json.loads(row[0])))
                    except Exception as e:
                        print(f"Error parsing worklog: {e}")
        
        return worklogs
    
    async def upsert_worklogs(self, worklogs: list[Worklog], company_id: int) -> tuple[int, int]:
        """
        Insert or update worklogs using batch operations.
        Optimized to eliminate N+1 query problem.

        Args:
            worklogs: List of worklogs to insert/update
            company_id: Company ID to assign to worklogs (REQUIRED for multi-tenant isolation)

        Returns:
            (inserted_count, updated_count)
        """
        await self.initialize()

        # Multi-tenant security: require company_id
        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        if not worklogs:
            return 0, 0

        # Deduplicate worklogs by (id, jira_instance) to prevent UNIQUE constraint errors
        # This can happen if JIRA/Tempo API returns duplicates in the same response
        seen = set()
        unique_worklogs = []
        duplicates_found = 0
        for wl in worklogs:
            key = (wl.id, wl.jira_instance)
            if key not in seen:
                seen.add(key)
                unique_worklogs.append(wl)
            else:
                duplicates_found += 1

        if duplicates_found > 0:
            print(f"⚠️  Warning: Found {duplicates_found} duplicate worklogs in input, deduplicating...")

        worklogs = unique_worklogs

        # Generate unique IDs by combining original ID + jira_instance
        # This allows multiple JIRA instances to have worklogs with the same original ID
        # The original ID is preserved in the 'data' JSON field
        worklogs_with_unique_ids = []
        for wl in worklogs:
            # Create unique ID: "original_id__instance_name"
            unique_id = f"{wl.id}__{wl.jira_instance.replace(' ', '_')}"

            # Create new worklog with unique ID
            wl_copy = Worklog(
                id=unique_id,  # Unique composite ID
                issue_key=wl.issue_key,
                issue_summary=wl.issue_summary,
                author_email=wl.author_email,
                author_display_name=wl.author_display_name,
                time_spent_seconds=wl.time_spent_seconds,
                started=wl.started,
                jira_instance=wl.jira_instance,
                parent_key=wl.parent_key,
                parent_name=wl.parent_name,
                parent_type=wl.parent_type,
                epic_key=wl.epic_key,
                epic_name=wl.epic_name
            )
            worklogs_with_unique_ids.append(wl_copy)

        worklogs = worklogs_with_unique_ids

        async with aiosqlite.connect(self.db_path) as db:
            # Step 1: Get all existing worklog IDs in a single query (no N+1!)
            # IDs are now unique (composed of original_id__instance_name)
            worklog_ids_to_check = [wl.id for wl in worklogs]
            placeholders = ",".join("?" * len(worklog_ids_to_check))

            async with db.execute(
                f"SELECT id FROM worklogs WHERE id IN ({placeholders}) AND company_id = ?",
                worklog_ids_to_check + [company_id]
            ) as cursor:
                existing_ids = {row[0] for row in await cursor.fetchall()}

            # Step 2: Separate worklogs into new and existing
            new_worklogs = [wl for wl in worklogs if wl.id not in existing_ids]
            existing_worklogs = [wl for wl in worklogs if wl.id in existing_ids]

            inserted = 0
            updated = 0

            # Step 3: Batch insert new worklogs using executemany
            if new_worklogs:
                insert_data = [
                    (
                        wl.id,
                        company_id,
                        wl.issue_key,
                        wl.issue_summary,
                        wl.author_email,
                        wl.author_display_name,
                        wl.time_spent_seconds,
                        wl.started.isoformat(),
                        wl.jira_instance,
                        wl.parent_key,
                        wl.parent_name,
                        wl.parent_type,
                        wl.epic_key,
                        wl.epic_name,
                        wl.model_dump_json()
                    )
                    for wl in new_worklogs
                ]

                await db.executemany("""
                    INSERT INTO worklogs
                    (id, company_id, issue_key, issue_summary, author_email, author_display_name,
                     time_spent_seconds, started, jira_instance, parent_key, parent_name,
                     parent_type, epic_key, epic_name, data)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, insert_data)

                inserted = len(new_worklogs)

            # Step 4: Batch update existing worklogs using executemany
            if existing_worklogs:
                update_data = [
                    (
                        company_id,
                        wl.issue_key,
                        wl.issue_summary,
                        wl.author_email,
                        wl.author_display_name,
                        wl.time_spent_seconds,
                        wl.started.isoformat(),
                        wl.jira_instance,
                        wl.parent_key,
                        wl.parent_name,
                        wl.parent_type,
                        wl.epic_key,
                        wl.epic_name,
                        wl.model_dump_json(),
                        wl.id
                    )
                    for wl in existing_worklogs
                ]

                await db.executemany("""
                    UPDATE worklogs SET
                        company_id = ?,
                        issue_key = ?,
                        issue_summary = ?,
                        author_email = ?,
                        author_display_name = ?,
                        time_spent_seconds = ?,
                        started = ?,
                        jira_instance = ?,
                        parent_key = ?,
                        parent_name = ?,
                        parent_type = ?,
                        epic_key = ?,
                        epic_name = ?,
                        data = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, update_data)

                updated = len(existing_worklogs)

            await db.commit()

        return inserted, updated
    
    async def delete_worklogs_not_in_list(
        self,
        worklog_ids: list[str],
        start_date: date,
        end_date: date,
        jira_instance: str,
        company_id: int
    ) -> int:
        """Delete worklogs that are in the DB for the given range/instance/company
        but not in the provided list (i.e., deleted from JIRA).

        Args:
            worklog_ids: List of worklog IDs to keep
            start_date: Start of date range
            end_date: End of date range
            jira_instance: JIRA instance name
            company_id: Company ID (REQUIRED for multi-tenant isolation)

        Returns:
            Count of deleted worklogs
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        if not worklog_ids:
            # If no worklogs from JIRA, delete all for this range/instance/company
            query = """
                DELETE FROM worklogs
                WHERE company_id = ? AND date(started) >= ? AND date(started) <= ?
                AND jira_instance = ?
            """
            params = [company_id, start_date.isoformat(), end_date.isoformat(), jira_instance]
        else:
            # Transform worklog_ids to composite format (id__instance) to match DB format
            composite_ids = [f"{wl_id}__{jira_instance.replace(' ', '_')}" for wl_id in worklog_ids]
            placeholders = ",".join("?" * len(composite_ids))
            query = f"""
                DELETE FROM worklogs
                WHERE company_id = ? AND date(started) >= ? AND date(started) <= ?
                AND jira_instance = ?
                AND id NOT IN ({placeholders})
            """
            params = [company_id, start_date.isoformat(), end_date.isoformat(), jira_instance]
            params.extend(composite_ids)

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(query, params)
            deleted = cursor.rowcount
            await db.commit()

        return deleted

    async def delete_all_worklogs(self, company_id: int) -> int:
        """Delete ALL worklogs for a specific company.

        **DEV/TEST ONLY** - Use with caution!

        Args:
            company_id: Company ID (REQUIRED for multi-tenant isolation)

        Returns:
            Count of deleted worklogs
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                "DELETE FROM worklogs WHERE company_id = ?",
                (company_id,)
            )
            deleted = cursor.rowcount
            await db.commit()

        return deleted

    async def get_worklog_count(self, company_id: int) -> int:
        """Get total count of worklogs in storage for a specific company.

        Args:
            company_id: Company ID (REQUIRED for multi-tenant isolation)

        Returns:
            Count of worklogs belonging to the company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                "SELECT COUNT(*) FROM worklogs WHERE company_id = ?",
                (company_id,)
            ) as cursor:
                row = await cursor.fetchone()
                return row[0] if row else 0

    async def get_data_date_range(self, company_id: int) -> Optional[tuple[date, date]]:
        """Get the date range of stored data for a specific company.

        Args:
            company_id: Company ID (REQUIRED for multi-tenant isolation)

        Returns:
            Tuple of (min_date, max_date) for company's worklogs, None if no data
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT MIN(date(started)), MAX(date(started)) FROM worklogs WHERE company_id = ?
            """, (company_id,)) as cursor:
                row = await cursor.fetchone()
                if row and row[0] and row[1]:
                    return (
                        date.fromisoformat(row[0]),
                        date.fromisoformat(row[1])
                    )
        return None
    
    # ========== Sync History Operations ==========
    
    async def start_sync(
        self,
        company_id: int,
        start_date: date,
        end_date: date,
        jira_instances: list[str]
    ) -> int:
        """Record the start of a sync operation. Returns sync_id.

        Args:
            company_id: Company ID (REQUIRED for multi-tenant isolation)
            start_date: Start date of sync range
            end_date: End date of sync range
            jira_instances: List of JIRA instance names being synced

        Returns:
            sync_id for tracking this sync operation
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required")

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("""
                INSERT INTO sync_history (company_id, start_date, end_date, jira_instances, status)
                VALUES (?, ?, ?, ?, 'in_progress')
            """, (
                company_id,
                start_date.isoformat(),
                end_date.isoformat(),
                json.dumps(jira_instances)
            ))
            await db.commit()
            return cursor.lastrowid
    
    async def complete_sync(
        self,
        sync_id: int,
        company_id: int,
        synced: int,
        updated: int,
        deleted: int,
        error: Optional[str] = None
    ):
        """Record the completion of a sync operation.

        Args:
            sync_id: ID of the sync operation
            company_id: Company ID (REQUIRED for multi-tenant isolation)
            synced: Number of worklogs synced
            updated: Number of worklogs updated
            deleted: Number of worklogs deleted
            error: Optional error message if sync failed
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required")

        status = "failed" if error else "completed"

        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                UPDATE sync_history SET
                    worklogs_synced = ?,
                    worklogs_updated = ?,
                    worklogs_deleted = ?,
                    status = ?,
                    error_message = ?,
                    completed_at = CURRENT_TIMESTAMP
                WHERE id = ? AND company_id = ?
            """, (synced, updated, deleted, status, error, sync_id, company_id))
            await db.commit()
    
    async def get_sync_history(self, company_id: int, limit: int = 20) -> list[dict]:
        """Get recent sync history for a specific company.

        Args:
            company_id: Company ID (REQUIRED for multi-tenant isolation)
            limit: Maximum number of records to return

        Returns:
            List of sync history records
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required")

        history = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT id, start_date, end_date, jira_instances,
                       worklogs_synced, worklogs_updated, worklogs_deleted,
                       status, error_message, started_at, completed_at
                FROM sync_history
                WHERE company_id = ?
                ORDER BY started_at DESC
                LIMIT ?
            """, (company_id, limit)) as cursor:
                async for row in cursor:
                    history.append({
                        "id": row[0],
                        "start_date": row[1],
                        "end_date": row[2],
                        "jira_instances": json.loads(row[3]),
                        "worklogs_synced": row[4],
                        "worklogs_updated": row[5],
                        "worklogs_deleted": row[6],
                        "status": row[7],
                        "error_message": row[8],
                        "started_at": row[9],
                        "completed_at": row[10]
                    })

        return history
    
    # ========== Team Operations ==========

    async def create_team(self, name: str, company_id: int, owner_id: Optional[int] = None) -> int:
        """Create a new team for a specific company.

        Args:
            name: Team name
            company_id: Company ID (REQUIRED for multi-tenant isolation)
            owner_id: Optional OAuth user ID to set as team owner

        Returns:
            Created team ID
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                "INSERT INTO teams (name, company_id, owner_id) VALUES (?, ?, ?)",
                (name, company_id, owner_id)
            )
            await db.commit()
            return cursor.lastrowid

    async def get_team(self, team_id: int, company_id: int) -> Optional[dict]:
        """Get a team by ID for a specific company.

        Args:
            team_id: Team ID to retrieve
            company_id: Company ID (REQUIRED for multi-tenant isolation)

        Returns:
            Team dict if found and belongs to company, None otherwise
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                "SELECT id, name, owner_id, created_at, updated_at FROM teams WHERE id = ? AND company_id = ?",
                (team_id, company_id)
            ) as cursor:
                row = await cursor.fetchone()
                if row:
                    return {
                        "id": row[0],
                        "name": row[1],
                        "owner_id": row[2],
                        "created_at": row[3],
                        "updated_at": row[4]
                    }
        return None

    async def get_team_by_name(self, name: str, company_id: int) -> Optional[dict]:
        """Get a team by name for a specific company.

        Args:
            name: Team name to search for
            company_id: Company ID (REQUIRED for multi-tenant isolation)

        Returns:
            Team dict if found and belongs to company, None otherwise
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                "SELECT id, name, owner_id, created_at, updated_at FROM teams WHERE name = ? AND company_id = ?",
                (name, company_id)
            ) as cursor:
                row = await cursor.fetchone()
                if row:
                    return {
                        "id": row[0],
                        "name": row[1],
                        "owner_id": row[2],
                        "created_at": row[3],
                        "updated_at": row[4]
                    }
        return None

    async def get_all_teams(self, company_id: int) -> list[dict]:
        """Get all teams with member counts and owner info for a specific company.

        Args:
            company_id: Company ID to filter teams by (REQUIRED for multi-tenant isolation)

        Returns:
            List of teams belonging to the company
        """
        await self.initialize()

        # Multi-tenant security: require company_id
        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        teams = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT t.id, t.name, t.owner_id, t.created_at, t.updated_at,
                       COUNT(u.id) as member_count,
                       o.email as owner_email, o.first_name as owner_first_name,
                       o.last_name as owner_last_name
                FROM teams t
                LEFT JOIN users u ON u.team_id = t.id AND u.company_id = ?
                LEFT JOIN oauth_users o ON o.id = t.owner_id AND o.company_id = ?
                WHERE t.company_id = ?
                GROUP BY t.id
                ORDER BY t.name
            """, (company_id, company_id, company_id)) as cursor:
                async for row in cursor:
                    teams.append({
                        "id": row[0],
                        "name": row[1],
                        "owner_id": row[2],
                        "created_at": row[3],
                        "updated_at": row[4],
                        "member_count": row[5],
                        "owner_email": row[6],
                        "owner_first_name": row[7],
                        "owner_last_name": row[8]
                    })
        return teams

    async def update_team(self, team_id: int, name: str, company_id: int) -> bool:
        """Update a team's name for a specific company.

        Args:
            team_id: Team ID to update
            name: New team name
            company_id: Company ID (REQUIRED for multi-tenant isolation)

        Returns:
            True if updated, False if team not found or doesn't belong to company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                "UPDATE teams SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?",
                (name, team_id, company_id)
            )
            await db.commit()
            return cursor.rowcount > 0

    async def delete_team(self, team_id: int, company_id: int) -> bool:
        """Delete a team for a specific company.

        Args:
            team_id: Team ID to delete
            company_id: Company ID (REQUIRED for multi-tenant isolation)

        Returns:
            True if deleted, False if team not found or doesn't belong to company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                "DELETE FROM teams WHERE id = ? AND company_id = ?",
                (team_id, company_id)
            )
            await db.commit()
            return cursor.rowcount > 0

    async def update_team_owner(self, team_id: int, owner_id: Optional[int], company_id: int) -> bool:
        """Update the owner of a team.

        Args:
            team_id: Team ID to update
            owner_id: OAuth user ID to set as owner (None to clear)
            company_id: Company ID (REQUIRED for multi-tenant isolation)

        Returns:
            True if updated, False if team not found or doesn't belong to company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                "UPDATE teams SET owner_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?",
                (owner_id, team_id, company_id)
            )
            await db.commit()
            return cursor.rowcount > 0

    async def get_team_with_owner(self, team_id: int, company_id: int) -> Optional[dict]:
        """Get a team by ID with owner details.

        Args:
            team_id: Team ID to retrieve
            company_id: Company ID (REQUIRED for multi-tenant isolation)

        Returns:
            Team dict with owner info if found, None otherwise
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT t.id, t.name, t.owner_id, t.created_at, t.updated_at,
                       o.email as owner_email, o.first_name as owner_first_name,
                       o.last_name as owner_last_name
                FROM teams t
                LEFT JOIN oauth_users o ON o.id = t.owner_id AND o.company_id = ?
                WHERE t.id = ? AND t.company_id = ?
            """, (company_id, team_id, company_id)) as cursor:
                row = await cursor.fetchone()
                if row:
                    return {
                        "id": row[0],
                        "name": row[1],
                        "owner_id": row[2],
                        "created_at": row[3],
                        "updated_at": row[4],
                        "owner_email": row[5],
                        "owner_first_name": row[6],
                        "owner_last_name": row[7]
                    }
        return None

    # ========== User Operations ==========

    async def create_user(
        self,
        email: str,
        first_name: str,
        last_name: str,
        company_id: int,
        team_id: Optional[int] = None
    ) -> int:
        """Create a new user for a specific company.

        Args:
            email: User email
            first_name: User first name
            last_name: User last name
            company_id: Company ID (REQUIRED for multi-tenant isolation)
            team_id: Optional team ID

        Returns:
            Created user ID
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                "INSERT INTO users (email, first_name, last_name, company_id, team_id) VALUES (?, ?, ?, ?, ?)",
                (email, first_name, last_name, company_id, team_id)
            )
            await db.commit()
            return cursor.lastrowid

    async def get_user(self, user_id: int, company_id: int) -> Optional[dict]:
        """Get a user by ID with JIRA accounts for a specific company.

        Args:
            user_id: User ID to retrieve
            company_id: Company ID (REQUIRED for multi-tenant isolation)

        Returns:
            User dict if found and belongs to company, None otherwise
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT u.id, u.email, u.first_name, u.last_name, u.team_id,
                       u.created_at, u.updated_at, t.name as team_name
                FROM users u
                LEFT JOIN teams t ON t.id = u.team_id AND t.company_id = ?
                WHERE u.id = ? AND u.company_id = ?
            """, (company_id, user_id, company_id)) as cursor:
                row = await cursor.fetchone()
                if not row:
                    return None

                user = {
                    "id": row[0],
                    "email": row[1],
                    "first_name": row[2],
                    "last_name": row[3],
                    "team_id": row[4],
                    "created_at": row[5],
                    "updated_at": row[6],
                    "team_name": row[7],
                    "jira_accounts": []
                }

            # Get JIRA accounts
            async with db.execute(
                "SELECT jira_instance, account_id FROM user_jira_accounts WHERE user_id = ?",
                (user_id,)
            ) as cursor:
                async for row in cursor:
                    user["jira_accounts"].append({
                        "jira_instance": row[0],
                        "account_id": row[1]
                    })

        return user

    async def get_user_by_email(self, email: str, company_id: int) -> Optional[dict]:
        """Get a user by email for a specific company.

        Args:
            email: User email to search for
            company_id: Company ID (REQUIRED for multi-tenant isolation)

        Returns:
            User dict if found and belongs to company, None otherwise
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                "SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND company_id = ?",
                (email, company_id)
            ) as cursor:
                row = await cursor.fetchone()
                if row:
                    return await self.get_user(row[0], company_id)
        return None

    async def get_all_users(self, company_id: int) -> list[dict]:
        """Get all users with team info and JIRA accounts for a specific company.

        Args:
            company_id: Company ID to filter users by (REQUIRED for multi-tenant isolation)

        Returns:
            List of users belonging to the company
        """
        await self.initialize()

        # Multi-tenant security: require company_id
        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        users = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT u.id, u.email, u.first_name, u.last_name, u.team_id,
                       u.created_at, u.updated_at, t.name as team_name,
                       u.role, u.role_level
                FROM users u
                LEFT JOIN teams t ON t.id = u.team_id AND t.company_id = ?
                WHERE u.company_id = ?
                ORDER BY u.last_name, u.first_name
            """, (company_id, company_id)) as cursor:
                async for row in cursor:
                    users.append({
                        "id": row[0],
                        "email": row[1],
                        "first_name": row[2],
                        "last_name": row[3],
                        "team_id": row[4],
                        "created_at": row[5],
                        "updated_at": row[6],
                        "team_name": row[7],
                        "role": row[8],
                        "role_level": row[9],
                        "jira_accounts": []
                    })

            # Get JIRA accounts for all users
            user_ids = [u["id"] for u in users]
            if user_ids:
                placeholders = ",".join("?" * len(user_ids))
                async with db.execute(f"""
                    SELECT user_id, jira_instance, account_id
                    FROM user_jira_accounts
                    WHERE user_id IN ({placeholders})
                """, user_ids) as cursor:
                    async for row in cursor:
                        user_id, jira_instance, account_id = row
                        for user in users:
                            if user["id"] == user_id:
                                user["jira_accounts"].append({
                                    "jira_instance": jira_instance,
                                    "account_id": account_id
                                })
                                break

        return users

    async def get_users_by_team(self, team_id: int, company_id: int) -> list[dict]:
        """Get all users in a team for a specific company.

        Args:
            team_id: Team ID to get users for
            company_id: Company ID (REQUIRED for multi-tenant isolation)

        Returns:
            List of users in the team belonging to the company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        users = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT u.id, u.email, u.first_name, u.last_name, u.team_id,
                       u.created_at, u.updated_at
                FROM users u
                WHERE u.team_id = ? AND u.company_id = ?
                ORDER BY u.last_name, u.first_name
            """, (team_id, company_id)) as cursor:
                async for row in cursor:
                    users.append({
                        "id": row[0],
                        "email": row[1],
                        "first_name": row[2],
                        "last_name": row[3],
                        "team_id": row[4],
                        "created_at": row[5],
                        "updated_at": row[6],
                        "jira_accounts": []
                    })
        return users

    async def update_user(self, user_id: int, company_id: int, **kwargs) -> bool:
        """Update user fields for a specific company.

        Args:
            user_id: User ID to update
            company_id: Company ID (REQUIRED for multi-tenant isolation)
            **kwargs: Fields to update (email, first_name, last_name, team_id)

        Returns:
            True if updated, False if user not found or doesn't belong to company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        allowed_fields = {"email", "first_name", "last_name", "team_id"}
        updates = {k: v for k, v in kwargs.items() if k in allowed_fields}

        if not updates:
            return False

        set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
        values = list(updates.values())
        values.extend([user_id, company_id])

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                f"UPDATE users SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?",
                values
            )
            await db.commit()
            return cursor.rowcount > 0

    async def delete_user(self, user_id: int, company_id: int) -> bool:
        """Delete a user and their JIRA accounts for a specific company.

        Args:
            user_id: User ID to delete
            company_id: Company ID (REQUIRED for multi-tenant isolation)

        Returns:
            True if deleted, False if user not found or doesn't belong to company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            # JIRA accounts will be deleted by CASCADE
            cursor = await db.execute(
                "DELETE FROM users WHERE id = ? AND company_id = ?",
                (user_id, company_id)
            )
            await db.commit()
            return cursor.rowcount > 0

    # ========== User JIRA Account Operations ==========

    async def set_user_jira_account(
        self,
        user_id: int,
        jira_instance: str,
        account_id: str
    ) -> bool:
        """Set or update a user's JIRA account ID for an instance."""
        await self.initialize()

        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT INTO user_jira_accounts (user_id, jira_instance, account_id)
                VALUES (?, ?, ?)
                ON CONFLICT(user_id, jira_instance)
                DO UPDATE SET account_id = ?, updated_at = CURRENT_TIMESTAMP
            """, (user_id, jira_instance, account_id, account_id))
            await db.commit()
            return True

    async def get_user_jira_accounts(self, user_id: int) -> list[dict]:
        """Get all JIRA accounts for a user."""
        await self.initialize()

        accounts = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                "SELECT jira_instance, account_id FROM user_jira_accounts WHERE user_id = ?",
                (user_id,)
            ) as cursor:
                async for row in cursor:
                    accounts.append({
                        "jira_instance": row[0],
                        "account_id": row[1]
                    })
        return accounts

    async def delete_user_jira_account(self, user_id: int, jira_instance: str) -> bool:
        """Delete a user's JIRA account mapping. Returns True if deleted."""
        await self.initialize()

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                "DELETE FROM user_jira_accounts WHERE user_id = ? AND jira_instance = ?",
                (user_id, jira_instance)
            )
            await db.commit()
            return cursor.rowcount > 0

    # ========== Import Operations ==========

    async def import_teams_from_config(self, teams_config: list[dict]) -> dict:
        """
        Import teams and users from config.yaml format.
        Returns {"teams_created": int, "users_created": int}.
        """
        await self.initialize()

        teams_created = 0
        users_created = 0

        for team_data in teams_config:
            team_name = team_data.get("name")
            if not team_name:
                continue

            # Check if team exists
            existing = await self.get_team_by_name(team_name)
            if existing:
                team_id = existing["id"]
            else:
                team_id = await self.create_team(team_name)
                teams_created += 1

            # Import members
            for member in team_data.get("members", []):
                email = member.get("email")
                if not email:
                    continue

                # Check if user exists
                existing_user = await self.get_user_by_email(email)
                if existing_user:
                    # Update team assignment if different
                    if existing_user["team_id"] != team_id:
                        await self.update_user(existing_user["id"], team_id=team_id)
                else:
                    await self.create_user(
                        email=email,
                        first_name=member.get("first_name", ""),
                        last_name=member.get("last_name", ""),
                        team_id=team_id
                    )
                    users_created += 1

        return {"teams_created": teams_created, "users_created": users_created}

    # ========== Log Operations ==========

    async def insert_log(
        self,
        timestamp: str,
        level: str,
        logger_name: str,
        message: str,
        request_id: Optional[str] = None,
        endpoint: Optional[str] = None,
        method: Optional[str] = None,
        status_code: Optional[int] = None,
        duration_ms: Optional[float] = None,
        extra_data: Optional[dict] = None
    ) -> int:
        """Insert a log entry. Returns log_id."""
        await self.initialize()

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("""
                INSERT INTO logs
                (timestamp, level, logger_name, message, request_id,
                 endpoint, method, status_code, duration_ms, extra_data)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                timestamp,
                level,
                logger_name,
                message,
                request_id,
                endpoint,
                method,
                status_code,
                duration_ms,
                json.dumps(extra_data) if extra_data else None
            ))
            await db.commit()
            return cursor.lastrowid

    async def insert_logs_batch(self, logs: list[dict]) -> int:
        """Insert multiple log entries. Returns count inserted."""
        await self.initialize()

        if not logs:
            return 0

        async with aiosqlite.connect(self.db_path) as db:
            for log in logs:
                await db.execute("""
                    INSERT INTO logs
                    (timestamp, level, logger_name, message, request_id,
                     endpoint, method, status_code, duration_ms, extra_data)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    log.get("timestamp"),
                    log.get("level"),
                    log.get("logger_name"),
                    log.get("message"),
                    log.get("request_id"),
                    log.get("endpoint"),
                    log.get("method"),
                    log.get("status_code"),
                    log.get("duration_ms"),
                    json.dumps(log.get("extra_data")) if log.get("extra_data") else None
                ))
            await db.commit()
        return len(logs)

    async def get_logs(
        self,
        level: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        endpoint: Optional[str] = None,
        request_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> tuple[list[dict], int]:
        """
        Get logs with optional filters.
        Returns (logs_list, total_count).
        """
        await self.initialize()

        conditions = []
        params = []

        if level:
            conditions.append("level = ?")
            params.append(level)
        if start_date:
            conditions.append("timestamp >= ?")
            params.append(start_date)
        if end_date:
            conditions.append("timestamp <= ?")
            params.append(end_date + "T23:59:59")
        if endpoint:
            conditions.append("endpoint LIKE ?")
            params.append(f"%{endpoint}%")
        if request_id:
            conditions.append("request_id = ?")
            params.append(request_id)

        where_clause = " AND ".join(conditions) if conditions else "1=1"

        logs = []
        total = 0

        async with aiosqlite.connect(self.db_path) as db:
            # Get total count
            async with db.execute(
                f"SELECT COUNT(*) FROM logs WHERE {where_clause}",
                params
            ) as cursor:
                row = await cursor.fetchone()
                total = row[0] if row else 0

            # Get paginated logs
            query = f"""
                SELECT id, timestamp, level, logger_name, message,
                       request_id, endpoint, method, status_code,
                       duration_ms, extra_data, created_at
                FROM logs
                WHERE {where_clause}
                ORDER BY timestamp DESC
                LIMIT ? OFFSET ?
            """
            query_params = params + [limit, offset]

            async with db.execute(query, query_params) as cursor:
                async for row in cursor:
                    extra_data = None
                    if row[10]:
                        try:
                            extra_data = json.loads(row[10])
                        except json.JSONDecodeError:
                            extra_data = None

                    logs.append({
                        "id": row[0],
                        "timestamp": row[1],
                        "level": row[2],
                        "logger_name": row[3],
                        "message": row[4],
                        "request_id": row[5],
                        "endpoint": row[6],
                        "method": row[7],
                        "status_code": row[8],
                        "duration_ms": row[9],
                        "extra_data": extra_data,
                        "created_at": row[11]
                    })

        return logs, total

    async def delete_old_logs(self, before_date: str) -> int:
        """Delete logs older than the specified date. Returns deleted count."""
        await self.initialize()

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                "DELETE FROM logs WHERE timestamp < ?",
                (before_date,)
            )
            await db.commit()
            return cursor.rowcount

    async def delete_all_logs(self) -> int:
        """Delete all logs. Returns deleted count."""
        await self.initialize()

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("DELETE FROM logs")
            await db.commit()
            return cursor.rowcount

    async def get_log_stats(self) -> dict:
        """Get log statistics."""
        await self.initialize()

        async with aiosqlite.connect(self.db_path) as db:
            # Total count
            async with db.execute("SELECT COUNT(*) FROM logs") as cursor:
                row = await cursor.fetchone()
                total = row[0] if row else 0

            # Count by level
            by_level = {}
            async with db.execute("""
                SELECT level, COUNT(*) FROM logs GROUP BY level
            """) as cursor:
                async for row in cursor:
                    by_level[row[0]] = row[1]

            # Date range
            date_range = None
            async with db.execute("""
                SELECT MIN(timestamp), MAX(timestamp) FROM logs
            """) as cursor:
                row = await cursor.fetchone()
                if row and row[0]:
                    date_range = {"min": row[0], "max": row[1]}

        return {
            "total": total,
            "by_level": by_level,
            "date_range": date_range
        }

    # ========== JIRA Instance Operations ==========

    async def create_jira_instance(
        self,
        name: str,
        url: str,
        email: str,
        api_token: str,
        company_id: int,
        tempo_api_token: Optional[str] = None,
        billing_client_id: Optional[int] = None
    ) -> int:
        """Create a new JIRA instance for a specific company.

        Args:
            name: Instance name
            url: JIRA base URL
            email: User email for authentication
            api_token: JIRA API token
            company_id: Company ID (REQUIRED for multi-tenant isolation)
            tempo_api_token: Optional Tempo API token
            billing_client_id: Optional billing client ID

        Returns:
            Created instance ID
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("""
                INSERT INTO jira_instances (name, url, email, api_token, company_id, tempo_api_token, billing_client_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (name, url, email, api_token, company_id, tempo_api_token, billing_client_id))
            await db.commit()
            return cursor.lastrowid

    async def get_jira_instance(self, instance_id: int, company_id: int) -> Optional[dict]:
        """Get a JIRA instance by ID for a specific company.

        Args:
            instance_id: JIRA instance ID to retrieve
            company_id: Company ID (REQUIRED for multi-tenant isolation)

        Returns:
            JIRA instance dict if found and belongs to company, None otherwise
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT id, name, url, email, api_token, tempo_api_token, billing_client_id, is_active,
                       created_at, updated_at, default_project_key
                FROM jira_instances WHERE id = ? AND company_id = ?
            """, (instance_id, company_id)) as cursor:
                row = await cursor.fetchone()
                if row:
                    return {
                        "id": row[0],
                        "name": row[1],
                        "url": row[2],
                        "email": row[3],
                        "api_token": row[4],
                        "tempo_api_token": row[5],
                        "billing_client_id": row[6],
                        "is_active": bool(row[7]),
                        "created_at": row[8],
                        "updated_at": row[9],
                        "default_project_key": row[10]
                    }
        return None

    async def get_jira_instance_by_name(self, name: str, company_id: int) -> Optional[dict]:
        """Get a JIRA instance by name for a specific company.

        Args:
            name: JIRA instance name to search for
            company_id: Company ID (REQUIRED for multi-tenant isolation)

        Returns:
            JIRA instance dict if found and belongs to company, None otherwise
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT id, name, url, email, api_token, tempo_api_token, billing_client_id, is_active,
                       created_at, updated_at, default_project_key
                FROM jira_instances WHERE name = ? AND company_id = ?
            """, (name, company_id)) as cursor:
                row = await cursor.fetchone()
                if row:
                    return {
                        "id": row[0],
                        "name": row[1],
                        "url": row[2],
                        "email": row[3],
                        "api_token": row[4],
                        "tempo_api_token": row[5],
                        "billing_client_id": row[6],
                        "is_active": bool(row[7]),
                        "created_at": row[8],
                        "updated_at": row[9],
                        "default_project_key": row[10]
                    }
        return None

    async def get_all_jira_instances(self, company_id: int, include_credentials: bool = False) -> list[dict]:
        """Get all JIRA instances for a specific company. Optionally include credentials.

        Args:
            company_id: Company ID to filter instances by (REQUIRED for multi-tenant isolation)
            include_credentials: Whether to include API tokens in response

        Returns:
            List of JIRA instances belonging to the company
        """
        await self.initialize()

        # Multi-tenant security: require company_id
        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        instances = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT id, name, url, email, api_token, tempo_api_token, billing_client_id, is_active,
                       created_at, updated_at, default_project_key
                FROM jira_instances
                WHERE company_id = ?
                ORDER BY name
            """, (company_id,)) as cursor:
                async for row in cursor:
                    instance = {
                        "id": row[0],
                        "name": row[1],
                        "url": row[2],
                        "billing_client_id": row[6],
                        "is_active": bool(row[7]),
                        "created_at": row[8],
                        "updated_at": row[9],
                        "default_project_key": row[10]
                    }
                    if include_credentials:
                        instance["email"] = row[3]
                        instance["api_token"] = row[4]
                        instance["tempo_api_token"] = row[5]
                    instances.append(instance)
        return instances

    async def update_jira_instance(self, instance_id: int, company_id: int, **kwargs) -> bool:
        """Update JIRA instance fields for a specific company.

        Args:
            instance_id: Instance ID to update
            company_id: Company ID (REQUIRED for multi-tenant isolation)
            **kwargs: Fields to update (name, url, email, api_token, etc.)

        Returns:
            True if updated, False if instance not found or doesn't belong to company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        allowed_fields = {"name", "url", "email", "api_token", "tempo_api_token", "billing_client_id", "is_active", "default_project_key"}
        updates = {k: v for k, v in kwargs.items() if k in allowed_fields}

        if not updates:
            return False

        set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
        values = list(updates.values())
        values.extend([instance_id, company_id])

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                f"UPDATE jira_instances SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?",
                values
            )
            await db.commit()
            return cursor.rowcount > 0

    async def delete_jira_instance(self, instance_id: int, company_id: int) -> bool:
        """Delete a JIRA instance for a specific company.

        Args:
            instance_id: Instance ID to delete
            company_id: Company ID (REQUIRED for multi-tenant isolation)

        Returns:
            True if deleted, False if instance not found or doesn't belong to company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                "DELETE FROM jira_instances WHERE id = ? AND company_id = ?",
                (instance_id, company_id)
            )
            await db.commit()
            return cursor.rowcount > 0

    # ========== Complementary Group Operations ==========

    async def create_complementary_group(
        self,
        name: str,
        company_id: int,
        primary_instance_id: Optional[int] = None
    ) -> int:
        """Create a new complementary group for a specific company.

        Args:
            name: Group name
            company_id: Company ID (REQUIRED for multi-tenant isolation)
            primary_instance_id: Optional primary instance ID (must belong to company if provided)

        Returns:
            group_id

        Raises:
            ValueError: If primary_instance doesn't belong to company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            # Verify primary instance belongs to company if provided
            if primary_instance_id:
                async with db.execute(
                    "SELECT id FROM jira_instances WHERE id = ? AND company_id = ?",
                    (primary_instance_id, company_id)
                ) as cursor:
                    if not await cursor.fetchone():
                        raise ValueError(f"Primary instance {primary_instance_id} not found or doesn't belong to company {company_id}")

            cursor = await db.execute("""
                INSERT INTO complementary_groups (name, primary_instance_id, company_id)
                VALUES (?, ?, ?)
            """, (name, primary_instance_id, company_id))
            await db.commit()
            return cursor.lastrowid

    async def get_complementary_group(self, group_id: int, company_id: int) -> Optional[dict]:
        """Get a complementary group with its members for a specific company.

        Args:
            group_id: Group ID to retrieve
            company_id: Company ID (REQUIRED for multi-tenant isolation)

        Returns:
            Group dict or None if not found or doesn't belong to company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT g.id, g.name, g.primary_instance_id, g.created_at, g.updated_at,
                       pi.name as primary_instance_name
                FROM complementary_groups g
                LEFT JOIN jira_instances pi ON pi.id = g.primary_instance_id
                WHERE g.id = ? AND g.company_id = ?
            """, (group_id, company_id)) as cursor:
                row = await cursor.fetchone()
                if not row:
                    return None

                group = {
                    "id": row[0],
                    "name": row[1],
                    "primary_instance_id": row[2],
                    "primary_instance_name": row[5],
                    "created_at": row[3],
                    "updated_at": row[4],
                    "members": []
                }

            # Get members (only from same company), primary instance first
            async with db.execute("""
                SELECT ji.id, ji.name, ji.url
                FROM complementary_group_members cgm
                JOIN jira_instances ji ON ji.id = cgm.instance_id
                JOIN complementary_groups cg ON cg.id = cgm.group_id
                WHERE cgm.group_id = ? AND cgm.company_id = ? AND ji.company_id = ? AND cg.company_id = ?
                ORDER BY CASE WHEN ji.id = cg.primary_instance_id THEN 0 ELSE 1 END, ji.name
            """, (group_id, company_id, company_id, company_id)) as cursor:
                async for row in cursor:
                    group["members"].append({
                        "id": row[0],
                        "name": row[1],
                        "url": row[2]
                    })

        return group

    async def get_all_complementary_groups(self, company_id: int) -> list[dict]:
        """Get all complementary groups with their members for a specific company.

        Args:
            company_id: Company ID (REQUIRED for multi-tenant isolation)

        Returns:
            List of group dicts for the company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        groups = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT g.id, g.name, g.primary_instance_id, g.created_at, g.updated_at,
                       pi.name as primary_instance_name
                FROM complementary_groups g
                LEFT JOIN jira_instances pi ON pi.id = g.primary_instance_id
                WHERE g.company_id = ?
                ORDER BY g.name
            """, (company_id,)) as cursor:
                async for row in cursor:
                    groups.append({
                        "id": row[0],
                        "name": row[1],
                        "primary_instance_id": row[2],
                        "primary_instance_name": row[5],
                        "created_at": row[3],
                        "updated_at": row[4],
                        "members": []
                    })

            # Get members for all groups (only from same company), primary instance first
            group_ids = [g["id"] for g in groups]
            if group_ids:
                placeholders = ",".join("?" * len(group_ids))
                params = group_ids + [company_id, company_id, company_id]
                async with db.execute(f"""
                    SELECT cgm.group_id, ji.id, ji.name, ji.url
                    FROM complementary_group_members cgm
                    JOIN jira_instances ji ON ji.id = cgm.instance_id
                    JOIN complementary_groups cg ON cg.id = cgm.group_id
                    WHERE cgm.group_id IN ({placeholders}) AND cgm.company_id = ? AND ji.company_id = ? AND cg.company_id = ?
                    ORDER BY CASE WHEN ji.id = cg.primary_instance_id THEN 0 ELSE 1 END, ji.name
                """, params) as cursor:
                    async for row in cursor:
                        group_id, inst_id, inst_name, inst_url = row
                        for group in groups:
                            if group["id"] == group_id:
                                group["members"].append({
                                    "id": inst_id,
                                    "name": inst_name,
                                    "url": inst_url
                                })
                                break

        return groups

    async def update_complementary_group(
        self,
        group_id: int,
        company_id: int,
        name: Optional[str] = None,
        primary_instance_id: Optional[int] = None
    ) -> bool:
        """Update complementary group for a specific company.

        Args:
            group_id: Group ID to update
            company_id: Company ID (REQUIRED for multi-tenant isolation - verifies ownership)
            name: Optional new group name
            primary_instance_id: Optional new primary instance ID (must belong to company)

        Returns:
            True if updated, False if group not found or doesn't belong to company

        Raises:
            ValueError: If primary_instance doesn't belong to company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        # Verify primary instance belongs to company if provided
        if primary_instance_id and primary_instance_id > 0:
            async with aiosqlite.connect(self.db_path) as db:
                async with db.execute(
                    "SELECT id FROM jira_instances WHERE id = ? AND company_id = ?",
                    (primary_instance_id, company_id)
                ) as cursor:
                    if not await cursor.fetchone():
                        raise ValueError(f"Primary instance {primary_instance_id} not found or doesn't belong to company {company_id}")

        updates = []
        values = []

        if name is not None:
            updates.append("name = ?")
            values.append(name)
        if primary_instance_id is not None:
            updates.append("primary_instance_id = ?")
            values.append(primary_instance_id if primary_instance_id > 0 else None)

        if not updates:
            return False

        values.extend([group_id, company_id])
        set_clause = ", ".join(updates)

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                f"UPDATE complementary_groups SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?",
                values
            )
            await db.commit()
            return cursor.rowcount > 0

    async def delete_complementary_group(self, group_id: int, company_id: int) -> bool:
        """Delete a complementary group for a specific company.

        Args:
            group_id: Group ID to delete
            company_id: Company ID (REQUIRED for multi-tenant isolation - verifies ownership)

        Returns:
            True if deleted, False if group not found or doesn't belong to company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                "DELETE FROM complementary_groups WHERE id = ? AND company_id = ?",
                (group_id, company_id)
            )
            await db.commit()
            return cursor.rowcount > 0

    async def add_instance_to_complementary_group(
        self,
        group_id: int,
        instance_id: int,
        company_id: int
    ) -> bool:
        """Add an instance to a complementary group for a specific company.

        Args:
            group_id: Group ID (must belong to company)
            instance_id: Instance ID (must belong to company)
            company_id: Company ID (REQUIRED for multi-tenant isolation)

        Returns:
            True if added, False if already exists

        Raises:
            ValueError: If group or instance doesn't belong to company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            # Verify group belongs to company
            async with db.execute(
                "SELECT id FROM complementary_groups WHERE id = ? AND company_id = ?",
                (group_id, company_id)
            ) as cursor:
                if not await cursor.fetchone():
                    raise ValueError(f"Group {group_id} not found or doesn't belong to company {company_id}")

            # Verify instance belongs to company
            async with db.execute(
                "SELECT id FROM jira_instances WHERE id = ? AND company_id = ?",
                (instance_id, company_id)
            ) as cursor:
                if not await cursor.fetchone():
                    raise ValueError(f"Instance {instance_id} not found or doesn't belong to company {company_id}")

            try:
                await db.execute("""
                    INSERT INTO complementary_group_members (company_id, group_id, instance_id)
                    VALUES (?, ?, ?)
                """, (company_id, group_id, instance_id))
                await db.commit()
                return True
            except Exception:
                return False  # Already exists

    async def remove_instance_from_complementary_group(
        self,
        group_id: int,
        instance_id: int,
        company_id: int
    ) -> bool:
        """Remove an instance from a complementary group for a specific company.

        Args:
            group_id: Group ID (must belong to company)
            instance_id: Instance ID
            company_id: Company ID (REQUIRED for multi-tenant isolation)

        Returns:
            True if removed, False if membership not found or group doesn't belong to company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            # Verify group belongs to company before removing membership (direct company_id filter)
            cursor = await db.execute("""
                DELETE FROM complementary_group_members
                WHERE group_id = ? AND instance_id = ? AND company_id = ?
            """, (group_id, instance_id, company_id))
            await db.commit()
            return cursor.rowcount > 0

    async def set_complementary_group_members(
        self,
        group_id: int,
        instance_ids: list[int],
        company_id: int
    ) -> bool:
        """Set the members of a complementary group for a specific company (replaces existing).

        Args:
            group_id: Group ID (must belong to company)
            instance_ids: List of instance IDs (must belong to company)
            company_id: Company ID (REQUIRED for multi-tenant isolation)

        Returns:
            True if successful

        Raises:
            ValueError: If group or any instance doesn't belong to company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            # Verify group belongs to company
            async with db.execute(
                "SELECT id FROM complementary_groups WHERE id = ? AND company_id = ?",
                (group_id, company_id)
            ) as cursor:
                if not await cursor.fetchone():
                    raise ValueError(f"Group {group_id} not found or doesn't belong to company {company_id}")

            # Verify all instances belong to company
            if instance_ids:
                placeholders = ",".join("?" * len(instance_ids))
                params = instance_ids + [company_id]
                async with db.execute(f"""
                    SELECT COUNT(*) FROM jira_instances
                    WHERE id IN ({placeholders}) AND company_id = ?
                """, params) as cursor:
                    count = (await cursor.fetchone())[0]
                    if count != len(instance_ids):
                        raise ValueError(f"Some instances don't belong to company {company_id}")

            # Remove all existing members (filter by company_id for security)
            await db.execute("""
                DELETE FROM complementary_group_members
                WHERE group_id = ?
                AND group_id IN (SELECT id FROM complementary_groups WHERE company_id = ?)
            """, (group_id, company_id))

            # Add new members
            for instance_id in instance_ids:
                await db.execute("""
                    INSERT INTO complementary_group_members (company_id, group_id, instance_id)
                    VALUES (?, ?, ?)
                """, (company_id, group_id, instance_id))

            await db.commit()
            return True

    async def get_complementary_instance_names(self, company_id: int) -> list[str]:
        """Get list of complementary instance names for a specific company.

        Returns names of instances in all complementary groups (for filtering).

        Args:
            company_id: Company ID (REQUIRED for multi-tenant isolation)

        Returns:
            List of instance names in complementary groups for the company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        names = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT DISTINCT ji.name
                FROM complementary_group_members cgm
                JOIN jira_instances ji ON ji.id = cgm.instance_id
                JOIN complementary_groups cg ON cg.id = cgm.group_id
                WHERE cgm.company_id = ? AND cg.company_id = ? AND ji.company_id = ?
            """, (company_id, company_id, company_id)) as cursor:
                async for row in cursor:
                    names.append(row[0])
        return names

    async def get_complementary_instance_names_by_group(self, group_id: int, company_id: int) -> list[str]:
        """Get instance names for a specific complementary group for a specific company.

        Args:
            group_id: Group ID
            company_id: Company ID (REQUIRED for multi-tenant isolation)

        Returns:
            List of instance names in the group (empty if group doesn't belong to company)
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        names = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT ji.name
                FROM complementary_group_members cgm
                JOIN jira_instances ji ON ji.id = cgm.instance_id
                JOIN complementary_groups cg ON cg.id = cgm.group_id
                WHERE cgm.group_id = ? AND cgm.company_id = ? AND cg.company_id = ? AND ji.company_id = ?
                ORDER BY CASE WHEN ji.id = cg.primary_instance_id THEN 0 ELSE 1 END, ji.name
            """, (group_id, company_id, company_id, company_id)) as cursor:
                async for row in cursor:
                    names.append(row[0])
        return names

    async def get_primary_instance_for_complementary(self, company_id: int) -> Optional[str]:
        """Get the primary instance name to use when complementary instances exist for a specific company.

        Args:
            company_id: Company ID (REQUIRED for multi-tenant isolation)

        Returns:
            Primary instance name or None
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT ji.name
                FROM complementary_groups cg
                JOIN jira_instances ji ON ji.id = cg.primary_instance_id
                WHERE cg.primary_instance_id IS NOT NULL
                AND cg.company_id = ? AND ji.company_id = ?
                LIMIT 1
            """, (company_id, company_id)) as cursor:
                row = await cursor.fetchone()
                if row:
                    return row[0]
        return None

    # ========== Package Template Operations ==========

    async def create_package_template(
        self,
        name: str,
        company_id: int,
        description: Optional[str] = None,
        default_project_key: Optional[str] = None,
        parent_issue_type: str = "Task",
        child_issue_type: str = "Sub-task"
    ) -> int:
        """Create a new package template for a specific company.

        Args:
            name: Template name
            company_id: Company ID (REQUIRED for multi-tenant isolation)
            description: Optional template description
            default_project_key: Default JIRA project key
            parent_issue_type: Parent issue type (default: Task)
            child_issue_type: Child issue type (default: Sub-task)

        Returns:
            template_id
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("""
                INSERT INTO package_templates (name, description, default_project_key, parent_issue_type, child_issue_type, company_id)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (name, description, default_project_key, parent_issue_type, child_issue_type, company_id))
            await db.commit()
            return cursor.lastrowid

    async def get_package_template(self, template_id: int, company_id: int) -> Optional[dict]:
        """Get a package template with its elements for a specific company.

        Args:
            template_id: Template ID to retrieve
            company_id: Company ID (REQUIRED for multi-tenant isolation)

        Returns:
            Template dict or None if not found or doesn't belong to company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT id, name, description, default_project_key, parent_issue_type, child_issue_type,
                       created_at, updated_at
                FROM package_templates WHERE id = ? AND company_id = ?
            """, (template_id, company_id)) as cursor:
                row = await cursor.fetchone()
                if not row:
                    return None

                template = {
                    "id": row[0],
                    "name": row[1],
                    "description": row[2],
                    "default_project_key": row[3],
                    "parent_issue_type": row[4],
                    "child_issue_type": row[5],
                    "created_at": row[6],
                    "updated_at": row[7],
                    "elements": [],
                    "instances": []
                }

            # Get elements
            async with db.execute("""
                SELECT id, name, sort_order
                FROM package_template_elements
                WHERE template_id = ?
                ORDER BY sort_order, id
            """, (template_id,)) as cursor:
                async for erow in cursor:
                    template["elements"].append({
                        "id": erow[0],
                        "name": erow[1],
                        "sort_order": erow[2]
                    })

            # Get associated instances (only from same company)
            async with db.execute("""
                SELECT ji.id, ji.name, ji.url
                FROM package_template_instances pti
                JOIN jira_instances ji ON ji.id = pti.instance_id
                WHERE pti.template_id = ? AND ji.company_id = ?
                ORDER BY ji.name
            """, (template_id, company_id)) as cursor:
                async for irow in cursor:
                    template["instances"].append({
                        "id": irow[0],
                        "name": irow[1],
                        "url": irow[2]
                    })

        return template

    async def get_all_package_templates(self, company_id: int) -> list[dict]:
        """Get all package templates with their elements for a specific company.

        Args:
            company_id: Company ID (REQUIRED for multi-tenant isolation)

        Returns:
            List of template dicts for the company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        templates = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT id, name, description, default_project_key, parent_issue_type, child_issue_type,
                       created_at, updated_at
                FROM package_templates
                WHERE company_id = ?
                ORDER BY name
            """, (company_id,)) as cursor:
                async for row in cursor:
                    templates.append({
                        "id": row[0],
                        "name": row[1],
                        "description": row[2],
                        "default_project_key": row[3],
                        "parent_issue_type": row[4],
                        "child_issue_type": row[5],
                        "created_at": row[6],
                        "updated_at": row[7],
                        "elements": [],
                        "instances": []
                    })

            # Fetch elements for all templates
            if templates:
                template_ids = [t["id"] for t in templates]
                placeholders = ",".join("?" * len(template_ids))
                async with db.execute(f"""
                    SELECT template_id, id, name, sort_order
                    FROM package_template_elements
                    WHERE template_id IN ({placeholders})
                    ORDER BY sort_order, id
                """, template_ids) as cursor:
                    async for row in cursor:
                        for t in templates:
                            if t["id"] == row[0]:
                                t["elements"].append({
                                    "id": row[1],
                                    "name": row[2],
                                    "sort_order": row[3]
                                })
                                break

                # Fetch instances for all templates (only from same company)
                params = template_ids + [company_id]
                async with db.execute(f"""
                    SELECT pti.template_id, ji.id, ji.name, ji.url
                    FROM package_template_instances pti
                    JOIN jira_instances ji ON ji.id = pti.instance_id
                    WHERE pti.template_id IN ({placeholders}) AND ji.company_id = ?
                    ORDER BY ji.name
                """, params) as cursor:
                    async for row in cursor:
                        for t in templates:
                            if t["id"] == row[0]:
                                t["instances"].append({
                                    "id": row[1],
                                    "name": row[2],
                                    "url": row[3]
                                })
                                break

        return templates

    async def update_package_template(self, template_id: int, company_id: int, **kwargs) -> bool:
        """Update package template fields for a specific company.

        Args:
            template_id: Template ID to update
            company_id: Company ID (REQUIRED for multi-tenant isolation - verifies ownership)
            **kwargs: Fields to update (name, description, default_project_key, parent_issue_type, child_issue_type)

        Returns:
            True if updated, False if template not found or doesn't belong to company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        allowed_fields = {"name", "description", "default_project_key", "parent_issue_type", "child_issue_type"}
        updates = []
        values = []

        for field, value in kwargs.items():
            if field in allowed_fields and value is not None:
                updates.append(f"{field} = ?")
                values.append(value)

        if not updates:
            return False

        values.extend([template_id, company_id])
        set_clause = ", ".join(updates)

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                f"UPDATE package_templates SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?",
                values
            )
            await db.commit()
            return cursor.rowcount > 0

    async def delete_package_template(self, template_id: int, company_id: int) -> bool:
        """Delete a package template for a specific company.

        Args:
            template_id: Template ID to delete
            company_id: Company ID (REQUIRED for multi-tenant isolation - verifies ownership)

        Returns:
            True if deleted, False if template not found or doesn't belong to company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                "DELETE FROM package_templates WHERE id = ? AND company_id = ?",
                (template_id, company_id)
            )
            await db.commit()
            return cursor.rowcount > 0

    async def set_template_elements(self, template_id: int, elements: list[str], company_id: int) -> bool:
        """Set the elements of a package template for a specific company (replaces existing).

        Args:
            template_id: Template ID (must belong to company)
            elements: List of element names
            company_id: Company ID (REQUIRED for multi-tenant isolation)

        Returns:
            True if successful

        Raises:
            ValueError: If template doesn't belong to company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            # Verify template belongs to company
            async with db.execute(
                "SELECT id FROM package_templates WHERE id = ? AND company_id = ?",
                (template_id, company_id)
            ) as cursor:
                if not await cursor.fetchone():
                    raise ValueError(f"Template {template_id} not found or doesn't belong to company {company_id}")

            # Remove all existing elements
            await db.execute(
                "DELETE FROM package_template_elements WHERE template_id = ?",
                (template_id,)
            )

            # Add new elements with sort order
            for idx, name in enumerate(elements):
                await db.execute("""
                    INSERT INTO package_template_elements (template_id, name, sort_order)
                    VALUES (?, ?, ?)
                """, (template_id, name, idx))

            await db.commit()
            return True

    # ========== Issue Type Cache Operations ==========

    async def save_instance_issue_types(self, instance_id: int, types: list[dict]) -> bool:
        """Save (replace) cached issue types for a JIRA instance."""
        await self.initialize()

        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "DELETE FROM jira_instance_issue_types WHERE instance_id = ?",
                (instance_id,)
            )
            for t in types:
                await db.execute("""
                    INSERT INTO jira_instance_issue_types (instance_id, type_id, name, subtask)
                    VALUES (?, ?, ?, ?)
                """, (instance_id, t["id"], t["name"], 1 if t.get("subtask") else 0))
            await db.commit()
        return True

    async def get_instance_issue_types(self, instance_id: int) -> list[dict]:
        """Get cached issue types for a JIRA instance."""
        await self.initialize()

        types = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT type_id, name, subtask
                FROM jira_instance_issue_types
                WHERE instance_id = ?
                ORDER BY name
            """, (instance_id,)) as cursor:
                async for row in cursor:
                    types.append({
                        "id": row[0],
                        "name": row[1],
                        "subtask": bool(row[2])
                    })
        return types

    # ========== Template Instance Operations ==========

    async def set_template_instances(self, template_id: int, instance_ids: list[int], company_id: int) -> bool:
        """Set the JIRA instances associated with a template for a specific company (replaces existing).

        Args:
            template_id: Template ID (must belong to company)
            instance_ids: List of JIRA instance IDs (must belong to company)
            company_id: Company ID (REQUIRED for multi-tenant isolation)

        Returns:
            True if successful

        Raises:
            ValueError: If template or any instance doesn't belong to company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            # Verify template belongs to company
            async with db.execute(
                "SELECT id FROM package_templates WHERE id = ? AND company_id = ?",
                (template_id, company_id)
            ) as cursor:
                if not await cursor.fetchone():
                    raise ValueError(f"Template {template_id} not found or doesn't belong to company {company_id}")

            # Verify all instances belong to company
            if instance_ids:
                placeholders = ",".join("?" * len(instance_ids))
                params = instance_ids + [company_id]
                async with db.execute(f"""
                    SELECT COUNT(*) FROM jira_instances
                    WHERE id IN ({placeholders}) AND company_id = ?
                """, params) as cursor:
                    count = (await cursor.fetchone())[0]
                    if count != len(instance_ids):
                        raise ValueError(f"Some instances don't belong to company {company_id}")

            await db.execute(
                "DELETE FROM package_template_instances WHERE template_id = ?",
                (template_id,)
            )
            for iid in instance_ids:
                await db.execute("""
                    INSERT INTO package_template_instances (template_id, instance_id)
                    VALUES (?, ?)
                """, (template_id, iid))
            await db.commit()
        return True

    async def get_template_instances(self, template_id: int, company_id: int) -> list[dict]:
        """Get JIRA instances associated with a template for a specific company.

        Args:
            template_id: Template ID
            company_id: Company ID (REQUIRED for multi-tenant isolation)

        Returns:
            List of instance dicts (empty if template doesn't belong to company)
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        instances = []
        async with aiosqlite.connect(self.db_path) as db:
            # Verify template belongs to company, then get instances (also filtered by company)
            async with db.execute("""
                SELECT ji.id, ji.name, ji.url
                FROM package_template_instances pti
                JOIN jira_instances ji ON ji.id = pti.instance_id
                JOIN package_templates pt ON pt.id = pti.template_id
                WHERE pti.template_id = ? AND pt.company_id = ? AND ji.company_id = ?
                ORDER BY ji.name
            """, (template_id, company_id, company_id)) as cursor:
                async for row in cursor:
                    instances.append({
                        "id": row[0],
                        "name": row[1],
                        "url": row[2]
                    })
        return instances

    # ========== Linked Issues Operations ==========

    async def save_linked_issues(self, links: list[dict]) -> bool:
        """Save linked issues. Each dict has: link_group_id, issue_key, jira_instance, element_name."""
        await self.initialize()

        async with aiosqlite.connect(self.db_path) as db:
            for link in links:
                await db.execute("""
                    INSERT OR REPLACE INTO linked_issues (link_group_id, issue_key, jira_instance, element_name)
                    VALUES (?, ?, ?, ?)
                """, (link["link_group_id"], link["issue_key"], link["jira_instance"], link.get("element_name")))
            await db.commit()
        return True

    async def get_linked_issues_by_key(self, issue_key: str, jira_instance: str) -> list[dict]:
        """Find all issues linked to a given issue (same link_group_id)."""
        await self.initialize()

        results = []
        async with aiosqlite.connect(self.db_path) as db:
            # First find the link_group_id(s) for this issue
            async with db.execute("""
                SELECT link_group_id FROM linked_issues
                WHERE issue_key = ? AND jira_instance = ?
            """, (issue_key, jira_instance)) as cursor:
                group_ids = [row[0] async for row in cursor]

            if not group_ids:
                return []

            # Then find all issues in those groups (excluding the original)
            placeholders = ",".join("?" * len(group_ids))
            async with db.execute(f"""
                SELECT id, link_group_id, issue_key, jira_instance, element_name, created_at
                FROM linked_issues
                WHERE link_group_id IN ({placeholders})
                AND NOT (issue_key = ? AND jira_instance = ?)
                ORDER BY link_group_id, jira_instance
            """, (*group_ids, issue_key, jira_instance)) as cursor:
                async for row in cursor:
                    results.append({
                        "id": row[0],
                        "link_group_id": row[1],
                        "issue_key": row[2],
                        "jira_instance": row[3],
                        "element_name": row[4],
                        "created_at": row[5]
                    })
        return results

    async def get_linked_issues_by_group(self, link_group_id: str) -> list[dict]:
        """Get all issues in a link group."""
        await self.initialize()

        results = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT id, link_group_id, issue_key, jira_instance, element_name, created_at
                FROM linked_issues
                WHERE link_group_id = ?
                ORDER BY jira_instance
            """, (link_group_id,)) as cursor:
                async for row in cursor:
                    results.append({
                        "id": row[0],
                        "link_group_id": row[1],
                        "issue_key": row[2],
                        "jira_instance": row[3],
                        "element_name": row[4],
                        "created_at": row[5]
                    })
        return results

    async def get_complementary_instances_for(self, instance_name: str, company_id: int) -> list[str]:
        """Given an instance name, return the other instances in its complementary group(s) for a specific company.

        Args:
            instance_name: Instance name to find complementary instances for
            company_id: Company ID (REQUIRED for multi-tenant isolation)

        Returns:
            List of other instance names in the same complementary groups
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        other_names = []
        async with aiosqlite.connect(self.db_path) as db:
            # Find groups this instance belongs to (only within same company)
            async with db.execute("""
                SELECT cgm.group_id
                FROM complementary_group_members cgm
                JOIN jira_instances ji ON ji.id = cgm.instance_id
                JOIN complementary_groups cg ON cg.id = cgm.group_id
                WHERE ji.name = ? AND cgm.company_id = ? AND ji.company_id = ? AND cg.company_id = ?
            """, (instance_name, company_id, company_id, company_id)) as cursor:
                group_ids = [row[0] async for row in cursor]

            if not group_ids:
                return []

            # Find all other instances in those groups (only from same company)
            placeholders = ",".join("?" * len(group_ids))
            params = list(group_ids) + [company_id, company_id, instance_name]
            async with db.execute(f"""
                SELECT DISTINCT ji.name
                FROM complementary_group_members cgm
                JOIN jira_instances ji ON ji.id = cgm.instance_id
                WHERE cgm.group_id IN ({placeholders})
                AND cgm.company_id = ?
                AND ji.company_id = ?
                AND ji.name != ?
                ORDER BY ji.name
            """, params) as cursor:
                async for row in cursor:
                    other_names.append(row[0])
        return other_names

    # ========== Billing Client Operations ==========

    async def create_billing_client(self, name: str, company_id: int, billing_currency: str = "EUR", default_hourly_rate: Optional[float] = None, jira_instance_id: Optional[int] = None) -> int:
        """Create a billing client for a specific company.

        Args:
            name: Client name
            company_id: Company ID (REQUIRED for multi-tenant isolation)
            billing_currency: Currency code (default: EUR)
            default_hourly_rate: Default hourly rate
            jira_instance_id: Associated JIRA instance ID

        Returns:
            client_id
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                "INSERT INTO billing_clients (name, billing_currency, default_hourly_rate, jira_instance_id, company_id) VALUES (?, ?, ?, ?, ?)",
                (name, billing_currency, default_hourly_rate, jira_instance_id, company_id)
            )
            await db.commit()
            return cursor.lastrowid

    async def get_billing_client(self, client_id: int, company_id: int) -> Optional[dict]:
        """Get a billing client by ID for a specific company.

        Args:
            client_id: Client ID to retrieve
            company_id: Company ID (REQUIRED for multi-tenant isolation)

        Returns:
            Client dict or None if not found or doesn't belong to company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                "SELECT id, name, billing_currency, default_hourly_rate, jira_instance_id, created_at, updated_at FROM billing_clients WHERE id = ? AND company_id = ?",
                (client_id, company_id)
            ) as cursor:
                row = await cursor.fetchone()
                if row:
                    return {"id": row[0], "name": row[1], "billing_currency": row[2], "default_hourly_rate": row[3], "jira_instance_id": row[4], "created_at": row[5], "updated_at": row[6]}
        return None

    async def get_all_billing_clients(self, company_id: int) -> list[dict]:
        """Get all billing clients for a specific company.

        Args:
            company_id: Company ID (REQUIRED for multi-tenant isolation)

        Returns:
            List of client dicts for the company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        clients = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                "SELECT id, name, billing_currency, default_hourly_rate, jira_instance_id, created_at, updated_at FROM billing_clients WHERE company_id = ? ORDER BY name",
                (company_id,)
            ) as cursor:
                async for row in cursor:
                    clients.append({"id": row[0], "name": row[1], "billing_currency": row[2], "default_hourly_rate": row[3], "jira_instance_id": row[4], "created_at": row[5], "updated_at": row[6]})
        return clients

    async def update_billing_client(self, client_id: int, company_id: int, **kwargs) -> bool:
        """Update billing client fields for a specific company.

        Args:
            client_id: Client ID to update
            company_id: Company ID (REQUIRED for multi-tenant isolation - verifies ownership)
            **kwargs: Fields to update (name, billing_currency, default_hourly_rate, jira_instance_id)

        Returns:
            True if updated, False if client not found or doesn't belong to company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        allowed = {"name", "billing_currency", "default_hourly_rate", "jira_instance_id"}
        updates = {k: v for k, v in kwargs.items() if k in allowed}
        if not updates:
            return False
        set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
        values = list(updates.values()) + [client_id, company_id]
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                f"UPDATE billing_clients SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?", values
            )
            await db.commit()
            return cursor.rowcount > 0

    async def delete_billing_client(self, client_id: int, company_id: int) -> bool:
        """Delete a billing client for a specific company (cascades to projects, mappings, rates).

        Args:
            client_id: Client ID to delete
            company_id: Company ID (REQUIRED for multi-tenant isolation - verifies ownership)

        Returns:
            True if deleted, False if client not found or doesn't belong to company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("DELETE FROM billing_clients WHERE id = ? AND company_id = ?", (client_id, company_id))
            await db.commit()
            return cursor.rowcount > 0

    # ========== Billing Project Operations ==========

    async def create_billing_project(self, client_id: int, name: str, company_id: int, default_hourly_rate: Optional[float] = None) -> int:
        """Create a billing project for a specific company.

        Args:
            client_id: Client ID (must belong to company)
            name: Project name
            company_id: Company ID (REQUIRED for multi-tenant isolation)
            default_hourly_rate: Default hourly rate

        Returns:
            project_id

        Raises:
            ValueError: If client doesn't belong to company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        # Verify client belongs to company
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                "SELECT id FROM billing_clients WHERE id = ? AND company_id = ?",
                (client_id, company_id)
            ) as cursor:
                if not await cursor.fetchone():
                    raise ValueError(f"Client {client_id} not found or doesn't belong to company {company_id}")

            cursor = await db.execute(
                "INSERT INTO billing_projects (client_id, name, default_hourly_rate) VALUES (?, ?, ?)",
                (client_id, name, default_hourly_rate)
            )
            await db.commit()
            return cursor.lastrowid

    async def get_billing_project(self, project_id: int, company_id: int) -> Optional[dict]:
        """Get a billing project by ID with mappings for a specific company.

        Args:
            project_id: Project ID to retrieve
            company_id: Company ID (REQUIRED for multi-tenant isolation)

        Returns:
            Project dict or None if not found or doesn't belong to company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT bp.id, bp.client_id, bp.name, bp.default_hourly_rate, bp.created_at, bp.updated_at
                FROM billing_projects bp
                JOIN billing_clients bc ON bc.id = bp.client_id
                WHERE bp.id = ? AND bc.company_id = ?
            """, (project_id, company_id)) as cursor:
                row = await cursor.fetchone()
                if not row:
                    return None
                project = {"id": row[0], "client_id": row[1], "name": row[2], "default_hourly_rate": row[3], "created_at": row[4], "updated_at": row[5], "mappings": []}

            async with db.execute(
                "SELECT id, billing_project_id, jira_instance, jira_project_key, created_at FROM billing_project_mappings WHERE billing_project_id = ?",
                (project_id,)
            ) as cursor:
                async for row in cursor:
                    project["mappings"].append({"id": row[0], "billing_project_id": row[1], "jira_instance": row[2], "jira_project_key": row[3], "created_at": row[4]})
        return project

    async def get_billing_projects_by_client(self, client_id: int, company_id: int) -> list[dict]:
        """Get all billing projects for a client with mappings for a specific company.

        Args:
            client_id: Client ID
            company_id: Company ID (REQUIRED for multi-tenant isolation)

        Returns:
            List of project dicts for the client (empty if client doesn't belong to company)
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        projects = []
        async with aiosqlite.connect(self.db_path) as db:
            # Verify client belongs to company, then get projects
            async with db.execute("""
                SELECT bp.id, bp.client_id, bp.name, bp.default_hourly_rate, bp.created_at, bp.updated_at
                FROM billing_projects bp
                JOIN billing_clients bc ON bc.id = bp.client_id
                WHERE bp.client_id = ? AND bc.company_id = ?
                ORDER BY bp.name
            """, (client_id, company_id)) as cursor:
                async for row in cursor:
                    projects.append({"id": row[0], "client_id": row[1], "name": row[2], "default_hourly_rate": row[3], "created_at": row[4], "updated_at": row[5], "mappings": []})

            if projects:
                project_ids = [p["id"] for p in projects]
                placeholders = ",".join("?" * len(project_ids))
                async with db.execute(f"""
                    SELECT id, billing_project_id, jira_instance, jira_project_key, created_at
                    FROM billing_project_mappings WHERE billing_project_id IN ({placeholders})
                """, project_ids) as cursor:
                    async for row in cursor:
                        for p in projects:
                            if p["id"] == row[1]:
                                p["mappings"].append({"id": row[0], "billing_project_id": row[1], "jira_instance": row[2], "jira_project_key": row[3], "created_at": row[4]})
                                break
        return projects

    async def get_all_billing_projects(self, company_id: int) -> list[dict]:
        """Get all billing projects with mappings and client info for a specific company.

        Args:
            company_id: Company ID (REQUIRED for multi-tenant isolation)

        Returns:
            List of project dicts for the company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        projects = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT bp.id, bp.client_id, bp.name, bp.default_hourly_rate, bp.created_at, bp.updated_at,
                       bc.name as client_name
                FROM billing_projects bp
                JOIN billing_clients bc ON bc.id = bp.client_id
                WHERE bc.company_id = ?
                ORDER BY bc.name, bp.name
            """, (company_id,)) as cursor:
                async for row in cursor:
                    projects.append({"id": row[0], "client_id": row[1], "name": row[2], "default_hourly_rate": row[3], "created_at": row[4], "updated_at": row[5], "client_name": row[6], "mappings": []})

            if projects:
                project_ids = [p["id"] for p in projects]
                placeholders = ",".join("?" * len(project_ids))
                async with db.execute(f"""
                    SELECT id, billing_project_id, jira_instance, jira_project_key, created_at
                    FROM billing_project_mappings WHERE billing_project_id IN ({placeholders})
                """, project_ids) as cursor:
                    async for row in cursor:
                        for p in projects:
                            if p["id"] == row[1]:
                                p["mappings"].append({"id": row[0], "billing_project_id": row[1], "jira_instance": row[2], "jira_project_key": row[3], "created_at": row[4]})
                                break
        return projects

    async def update_billing_project(self, project_id: int, company_id: int, **kwargs) -> bool:
        """Update billing project fields for a specific company.

        Args:
            project_id: Project ID to update
            company_id: Company ID (REQUIRED for multi-tenant isolation - verifies ownership)
            **kwargs: Fields to update (name, default_hourly_rate)

        Returns:
            True if updated, False if project not found or doesn't belong to company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        allowed = {"name", "default_hourly_rate"}
        updates = {k: v for k, v in kwargs.items() if k in allowed}
        if not updates:
            return False
        set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
        values = list(updates.values()) + [project_id, company_id]
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(f"""
                UPDATE billing_projects SET {set_clause}, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND client_id IN (SELECT id FROM billing_clients WHERE company_id = ?)
            """, values)
            await db.commit()
            return cursor.rowcount > 0

    async def delete_billing_project(self, project_id: int, company_id: int) -> bool:
        """Delete a billing project for a specific company (cascades to mappings, rates).

        Args:
            project_id: Project ID to delete
            company_id: Company ID (REQUIRED for multi-tenant isolation - verifies ownership)

        Returns:
            True if deleted, False if project not found or doesn't belong to company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("""
                DELETE FROM billing_projects
                WHERE id = ? AND client_id IN (SELECT id FROM billing_clients WHERE company_id = ?)
            """, (project_id, company_id))
            await db.commit()
            return cursor.rowcount > 0

    # ========== Billing Project Mapping Operations ==========

    async def add_billing_project_mapping(self, billing_project_id: int, jira_instance: str, jira_project_key: str, company_id: int) -> int:
        """Add a JIRA project mapping to a billing project for a specific company.

        Args:
            billing_project_id: Billing project ID (must belong to company)
            jira_instance: JIRA instance name
            jira_project_key: JIRA project key
            company_id: Company ID (REQUIRED for multi-tenant isolation)

        Returns:
            mapping_id

        Raises:
            ValueError: If project doesn't belong to company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            # Verify project belongs to company
            async with db.execute("""
                SELECT bp.id FROM billing_projects bp
                JOIN billing_clients bc ON bc.id = bp.client_id
                WHERE bp.id = ? AND bc.company_id = ?
            """, (billing_project_id, company_id)) as cursor:
                if not await cursor.fetchone():
                    raise ValueError(f"Project {billing_project_id} not found or doesn't belong to company {company_id}")

            cursor = await db.execute(
                "INSERT INTO billing_project_mappings (billing_project_id, jira_instance, jira_project_key) VALUES (?, ?, ?)",
                (billing_project_id, jira_instance, jira_project_key)
            )
            await db.commit()
            return cursor.lastrowid

    async def delete_billing_project_mapping(self, mapping_id: int, company_id: int) -> bool:
        """Delete a billing project mapping for a specific company.

        Args:
            mapping_id: Mapping ID to delete
            company_id: Company ID (REQUIRED for multi-tenant isolation - verifies ownership)

        Returns:
            True if deleted, False if mapping not found or doesn't belong to company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("""
                DELETE FROM billing_project_mappings
                WHERE id = ? AND billing_project_id IN (
                    SELECT bp.id FROM billing_projects bp
                    JOIN billing_clients bc ON bc.id = bp.client_id
                    WHERE bc.company_id = ?
                )
            """, (mapping_id, company_id))
            await db.commit()
            return cursor.rowcount > 0

    async def get_billing_project_for_worklog(self, jira_instance: str, issue_key: str, company_id: int) -> Optional[dict]:
        """Find the billing project that maps to a given JIRA issue for a specific company.

        Args:
            jira_instance: JIRA instance name
            issue_key: JIRA issue key (e.g. PROJ-123)
            company_id: Company ID (REQUIRED for multi-tenant isolation)

        Returns:
            Billing project dict or None if not found or doesn't belong to company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        project_key = issue_key.split("-")[0] if "-" in issue_key else issue_key
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT bp.id, bp.client_id, bp.name, bp.default_hourly_rate
                FROM billing_project_mappings bpm
                JOIN billing_projects bp ON bp.id = bpm.billing_project_id
                JOIN billing_clients bc ON bc.id = bp.client_id
                WHERE bpm.jira_instance = ? AND bpm.jira_project_key = ? AND bc.company_id = ?
            """, (jira_instance, project_key, company_id)) as cursor:
                row = await cursor.fetchone()
                if row:
                    return {"id": row[0], "client_id": row[1], "name": row[2], "default_hourly_rate": row[3]}
        return None

    # ========== Billing Rate Operations ==========

    async def create_billing_rate(self, billing_project_id: int, hourly_rate: float, company_id: int, user_email: Optional[str] = None, issue_type: Optional[str] = None, valid_from: Optional[str] = None, valid_to: Optional[str] = None) -> int:
        """Create a billing rate override for a specific company.

        Args:
            billing_project_id: Billing project ID (must belong to company)
            hourly_rate: Hourly rate
            company_id: Company ID (REQUIRED for multi-tenant isolation)
            user_email: Optional user email filter
            issue_type: Optional issue type filter
            valid_from: Optional start date
            valid_to: Optional end date

        Returns:
            rate_id

        Raises:
            ValueError: If project doesn't belong to company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            # Verify project belongs to company
            async with db.execute("""
                SELECT bp.id FROM billing_projects bp
                JOIN billing_clients bc ON bc.id = bp.client_id
                WHERE bp.id = ? AND bc.company_id = ?
            """, (billing_project_id, company_id)) as cursor:
                if not await cursor.fetchone():
                    raise ValueError(f"Project {billing_project_id} not found or doesn't belong to company {company_id}")

            cursor = await db.execute(
                "INSERT INTO billing_rates (billing_project_id, user_email, issue_type, hourly_rate, valid_from, valid_to) VALUES (?, ?, ?, ?, ?, ?)",
                (billing_project_id, user_email, issue_type, hourly_rate, valid_from, valid_to)
            )
            await db.commit()
            return cursor.lastrowid

    async def get_billing_rates(self, billing_project_id: int, company_id: int) -> list[dict]:
        """Get all billing rates for a project for a specific company.

        Args:
            billing_project_id: Billing project ID
            company_id: Company ID (REQUIRED for multi-tenant isolation)

        Returns:
            List of rate dicts (empty if project doesn't belong to company)
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        rates = []
        async with aiosqlite.connect(self.db_path) as db:
            # Verify project belongs to company, then get rates
            async with db.execute("""
                SELECT br.id, br.billing_project_id, br.user_email, br.issue_type, br.hourly_rate, br.valid_from, br.valid_to, br.created_at
                FROM billing_rates br
                JOIN billing_projects bp ON bp.id = br.billing_project_id
                JOIN billing_clients bc ON bc.id = bp.client_id
                WHERE br.billing_project_id = ? AND bc.company_id = ?
                ORDER BY br.created_at DESC
            """, (billing_project_id, company_id)) as cursor:
                async for row in cursor:
                    rates.append({"id": row[0], "billing_project_id": row[1], "user_email": row[2], "issue_type": row[3], "hourly_rate": row[4], "valid_from": row[5], "valid_to": row[6], "created_at": row[7]})
        return rates

    async def delete_billing_rate(self, rate_id: int, company_id: int) -> bool:
        """Delete a billing rate for a specific company.

        Args:
            rate_id: Rate ID to delete
            company_id: Company ID (REQUIRED for multi-tenant isolation - verifies ownership)

        Returns:
            True if deleted, False if rate not found or doesn't belong to company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("""
                DELETE FROM billing_rates
                WHERE id = ? AND billing_project_id IN (
                    SELECT bp.id FROM billing_projects bp
                    JOIN billing_clients bc ON bc.id = bp.client_id
                    WHERE bc.company_id = ?
                )
            """, (rate_id, company_id))
            await db.commit()
            return cursor.rowcount > 0

    # ========== Billing Classification Operations ==========

    async def set_worklog_classification(self, worklog_id: str, is_billable: bool, company_id: int, override_hourly_rate: Optional[float] = None, note: Optional[str] = None, classified_by: Optional[str] = None) -> int:
        """Set or update worklog billing classification for a specific company.

        Args:
            worklog_id: Worklog ID (must belong to company)
            is_billable: Whether worklog is billable
            company_id: Company ID (REQUIRED for multi-tenant isolation)
            override_hourly_rate: Optional override rate
            note: Optional note
            classified_by: User who classified the worklog

        Returns:
            classification_id

        Raises:
            ValueError: If worklog doesn't belong to company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            # Verify worklog belongs to company
            async with db.execute(
                "SELECT id FROM worklogs WHERE id = ? AND company_id = ?",
                (worklog_id, company_id)
            ) as cursor:
                if not await cursor.fetchone():
                    raise ValueError(f"Worklog {worklog_id} not found or doesn't belong to company {company_id}")

            cursor = await db.execute("""
                INSERT INTO billing_worklog_classifications (worklog_id, is_billable, override_hourly_rate, note, classified_by)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(worklog_id)
                DO UPDATE SET is_billable = ?, override_hourly_rate = ?, note = ?, classified_by = ?, classified_at = CURRENT_TIMESTAMP
            """, (worklog_id, int(is_billable), override_hourly_rate, note, classified_by,
                  int(is_billable), override_hourly_rate, note, classified_by))
            await db.commit()
            return cursor.lastrowid

    async def get_worklog_classifications(self, worklog_ids: list[str], company_id: int) -> dict[str, dict]:
        """Get classifications for a list of worklog IDs for a specific company.

        Args:
            worklog_ids: List of worklog IDs
            company_id: Company ID (REQUIRED for multi-tenant isolation)

        Returns:
            Dict mapping worklog_id to classification dict (only for worklogs belonging to company)
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        if not worklog_ids:
            return {}
        result = {}
        async with aiosqlite.connect(self.db_path) as db:
            placeholders = ",".join("?" * len(worklog_ids))
            params = worklog_ids + [company_id]
            async with db.execute(f"""
                SELECT bwc.id, bwc.worklog_id, bwc.is_billable, bwc.override_hourly_rate, bwc.note, bwc.classified_by, bwc.classified_at
                FROM billing_worklog_classifications bwc
                JOIN worklogs w ON w.id = bwc.worklog_id
                WHERE bwc.worklog_id IN ({placeholders}) AND w.company_id = ?
            """, params) as cursor:
                async for row in cursor:
                    result[row[1]] = {"id": row[0], "worklog_id": row[1], "is_billable": bool(row[2]), "override_hourly_rate": row[3], "note": row[4], "classified_by": row[5], "classified_at": row[6]}
        return result

    # ========== Invoice Operations ==========

    async def create_invoice(self, client_id: int, period_start: str, period_end: str, company_id: int, currency: str = "EUR", billing_project_id: Optional[int] = None, subtotal_amount: float = 0, taxes_amount: float = 0, total_amount: float = 0, group_by: str = "project", notes: Optional[str] = None, created_by: Optional[str] = None) -> int:
        """Create an invoice for a specific company.

        Args:
            client_id: Client ID (must belong to company)
            period_start: Invoice period start date
            period_end: Invoice period end date
            company_id: Company ID (REQUIRED for multi-tenant isolation)
            currency: Currency code (default: EUR)
            billing_project_id: Optional billing project ID
            subtotal_amount: Subtotal amount
            taxes_amount: Taxes amount
            total_amount: Total amount
            group_by: Grouping method (project, user, etc.)
            notes: Optional notes
            created_by: User who created the invoice

        Returns:
            invoice_id

        Raises:
            ValueError: If client doesn't belong to company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            # Verify client belongs to company
            async with db.execute(
                "SELECT id FROM billing_clients WHERE id = ? AND company_id = ?",
                (client_id, company_id)
            ) as cursor:
                if not await cursor.fetchone():
                    raise ValueError(f"Client {client_id} not found or doesn't belong to company {company_id}")

            cursor = await db.execute("""
                INSERT INTO invoices (client_id, billing_project_id, period_start, period_end, status, currency, subtotal_amount, taxes_amount, total_amount, group_by, notes, created_by)
                VALUES (?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?, ?, ?, ?)
            """, (client_id, billing_project_id, period_start, period_end, currency, subtotal_amount, taxes_amount, total_amount, group_by, notes, created_by))
            await db.commit()
            return cursor.lastrowid

    async def add_invoice_line_item(self, invoice_id: int, line_type: str, description: str, quantity_hours: float, hourly_rate: float, amount: float, company_id: int, metadata_json: Optional[str] = None, sort_order: int = 0) -> int:
        """Add a line item to an invoice for a specific company.

        Args:
            invoice_id: Invoice ID (must belong to company)
            line_type: Type of line item
            description: Line item description
            quantity_hours: Quantity in hours
            hourly_rate: Hourly rate
            amount: Total amount
            company_id: Company ID (REQUIRED for multi-tenant isolation)
            metadata_json: Optional metadata JSON
            sort_order: Sort order

        Returns:
            line_item_id

        Raises:
            ValueError: If invoice doesn't belong to company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            # Verify invoice belongs to company
            async with db.execute("""
                SELECT i.id FROM invoices i
                JOIN billing_clients bc ON bc.id = i.client_id
                WHERE i.id = ? AND bc.company_id = ?
            """, (invoice_id, company_id)) as cursor:
                if not await cursor.fetchone():
                    raise ValueError(f"Invoice {invoice_id} not found or doesn't belong to company {company_id}")

            cursor = await db.execute("""
                INSERT INTO invoice_line_items (invoice_id, line_type, description, quantity_hours, hourly_rate, amount, metadata_json, sort_order)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (invoice_id, line_type, description, quantity_hours, hourly_rate, amount, metadata_json, sort_order))
            await db.commit()
            return cursor.lastrowid

    async def get_invoice(self, invoice_id: int, company_id: int) -> Optional[dict]:
        """Get an invoice by ID with line items for a specific company.

        Args:
            invoice_id: Invoice ID to retrieve
            company_id: Company ID (REQUIRED for multi-tenant isolation)

        Returns:
            Invoice dict or None if not found or doesn't belong to company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT i.id, i.client_id, i.billing_project_id, i.period_start, i.period_end,
                       i.status, i.currency, i.subtotal_amount, i.taxes_amount, i.total_amount,
                       i.group_by, i.notes, i.created_by, i.created_at, i.issued_at,
                       bc.name as client_name, bp.name as project_name
                FROM invoices i
                JOIN billing_clients bc ON bc.id = i.client_id
                LEFT JOIN billing_projects bp ON bp.id = i.billing_project_id
                WHERE i.id = ? AND bc.company_id = ?
            """, (invoice_id, company_id)) as cursor:
                row = await cursor.fetchone()
                if not row:
                    return None
                invoice = {
                    "id": row[0], "client_id": row[1], "billing_project_id": row[2],
                    "period_start": row[3], "period_end": row[4], "status": row[5],
                    "currency": row[6], "subtotal_amount": row[7], "taxes_amount": row[8],
                    "total_amount": row[9], "group_by": row[10], "notes": row[11],
                    "created_by": row[12], "created_at": row[13], "issued_at": row[14],
                    "client_name": row[15], "billing_project_name": row[16],
                    "line_items": []
                }

            async with db.execute("""
                SELECT id, invoice_id, line_type, description, quantity_hours, hourly_rate, amount, metadata_json, sort_order
                FROM invoice_line_items WHERE invoice_id = ? ORDER BY sort_order
            """, (invoice_id,)) as cursor:
                async for row in cursor:
                    invoice["line_items"].append({
                        "id": row[0], "invoice_id": row[1], "line_type": row[2],
                        "description": row[3], "quantity_hours": row[4], "hourly_rate": row[5],
                        "amount": row[6], "metadata_json": row[7], "sort_order": row[8]
                    })
        return invoice

    async def get_invoices(self, company_id: int, client_id: Optional[int] = None, status: Optional[str] = None) -> list[dict]:
        """Get invoices with optional filters for a specific company.

        Args:
            company_id: Company ID (REQUIRED for multi-tenant isolation)
            client_id: Optional client ID filter (must belong to company)
            status: Optional status filter

        Returns:
            List of invoice dicts for the company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        conditions = ["bc.company_id = ?"]
        params = [company_id]

        if client_id:
            conditions.append("i.client_id = ?")
            params.append(client_id)
        if status:
            conditions.append("i.status = ?")
            params.append(status)
        where_clause = " AND ".join(conditions)

        invoices = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(f"""
                SELECT i.id, i.client_id, i.billing_project_id, i.period_start, i.period_end,
                       i.status, i.currency, i.subtotal_amount, i.taxes_amount, i.total_amount,
                       i.group_by, i.notes, i.created_by, i.created_at, i.issued_at,
                       bc.name as client_name, bp.name as project_name
                FROM invoices i
                JOIN billing_clients bc ON bc.id = i.client_id
                LEFT JOIN billing_projects bp ON bp.id = i.billing_project_id
                WHERE {where_clause}
                ORDER BY i.created_at DESC
            """, params) as cursor:
                async for row in cursor:
                    invoices.append({
                        "id": row[0], "client_id": row[1], "billing_project_id": row[2],
                        "period_start": row[3], "period_end": row[4], "status": row[5],
                        "currency": row[6], "subtotal_amount": row[7], "taxes_amount": row[8],
                        "total_amount": row[9], "group_by": row[10], "notes": row[11],
                        "created_by": row[12], "created_at": row[13], "issued_at": row[14],
                        "client_name": row[15], "billing_project_name": row[16],
                        "line_items": []
                    })
        return invoices

    async def update_invoice_status(self, invoice_id: int, status: str, company_id: int) -> bool:
        """Update invoice status for a specific company.

        Args:
            invoice_id: Invoice ID to update
            status: New status (DRAFT, ISSUED, PAID, etc.)
            company_id: Company ID (REQUIRED for multi-tenant isolation - verifies ownership)

        Returns:
            True if updated, False if invoice not found or doesn't belong to company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            if status == "ISSUED":
                cursor = await db.execute("""
                    UPDATE invoices SET status = ?, issued_at = CURRENT_TIMESTAMP
                    WHERE id = ? AND client_id IN (SELECT id FROM billing_clients WHERE company_id = ?)
                """, (status, invoice_id, company_id))
            else:
                cursor = await db.execute("""
                    UPDATE invoices SET status = ?
                    WHERE id = ? AND client_id IN (SELECT id FROM billing_clients WHERE company_id = ?)
                """, (status, invoice_id, company_id))
            await db.commit()
            return cursor.rowcount > 0

    async def delete_invoice(self, invoice_id: int, company_id: int) -> bool:
        """Delete a draft invoice for a specific company (cascades to line items).

        Args:
            invoice_id: Invoice ID to delete
            company_id: Company ID (REQUIRED for multi-tenant isolation - verifies ownership)

        Returns:
            True if deleted, False if invoice not found, not a draft, or doesn't belong to company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("""
                DELETE FROM invoices
                WHERE id = ? AND status = 'DRAFT'
                AND client_id IN (SELECT id FROM billing_clients WHERE company_id = ?)
            """, (invoice_id, company_id))
            await db.commit()
            return cursor.rowcount > 0

    # ========== Utility Operations ==========

    async def clear_all(self):
        """Clear all stored data."""
        await self.initialize()
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("DELETE FROM worklogs")
            await db.execute("DELETE FROM epics")
            await db.execute("DELETE FROM sync_history")
            await db.commit()

    # ========== Holiday Operations ==========

    async def get_holidays_for_year(self, year: int, company_id: int, country: str = "IT") -> list[dict]:
        """Get all holidays for a given year and country for a specific company.

        Args:
            year: Year to retrieve holidays for
            company_id: Company ID (REQUIRED for multi-tenant isolation)
            country: Country code (default: IT)

        Returns:
            List of holiday dicts for the company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        start = f"{year}-01-01"
        end = f"{year}-12-31"
        holidays = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT id, name, holiday_date, holiday_type, month, day,
                       country, is_active, created_at, updated_at
                FROM holidays
                WHERE holiday_date >= ? AND holiday_date <= ? AND country = ? AND company_id = ?
                ORDER BY holiday_date
            """, (start, end, country, company_id)) as cursor:
                async for row in cursor:
                    holidays.append({
                        "id": row[0], "name": row[1], "holiday_date": row[2],
                        "holiday_type": row[3], "month": row[4], "day": row[5],
                        "country": row[6], "is_active": bool(row[7]),
                        "created_at": row[8], "updated_at": row[9]
                    })
        return holidays

    async def get_active_holiday_dates(self, start_date: str, end_date: str, company_id: int, country: str = "IT") -> set[str]:
        """Get set of active holiday date strings (ISO format) in a date range for a specific company.

        Auto-seeds holidays for years in range if none exist.

        Args:
            start_date: Start date (ISO format)
            end_date: End date (ISO format)
            company_id: Company ID (REQUIRED for multi-tenant isolation)
            country: Country code (default: IT)

        Returns:
            Set of holiday date strings for the company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        # Auto-seed holidays for each year in the range
        start_year = int(start_date[:4])
        end_year = int(end_date[:4])
        for y in range(start_year, end_year + 1):
            existing = await self.get_holidays_for_year(y, company_id, country)
            if not existing:
                await self.seed_holidays_for_year(y, company_id, country)

        dates = set()
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT holiday_date FROM holidays
                WHERE holiday_date >= ? AND holiday_date <= ?
                AND country = ? AND is_active = 1 AND company_id = ?
            """, (start_date, end_date, country, company_id)) as cursor:
                async for row in cursor:
                    dates.add(row[0])
        return dates

    async def seed_holidays_for_year(self, year: int, company_id: int, country: str = "IT") -> int:
        """Seed default holidays for a year for a specific company.

        Skips existing dates.

        Args:
            year: Year to seed holidays for
            company_id: Company ID (REQUIRED for multi-tenant isolation)
            country: Country code (default: IT)

        Returns:
            Count of holidays inserted
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        from .holidays import generate_holidays_for_year
        holidays = generate_holidays_for_year(year, country)
        inserted = 0
        async with aiosqlite.connect(self.db_path) as db:
            for h in holidays:
                try:
                    await db.execute("""
                        INSERT INTO holidays (name, holiday_date, holiday_type, month, day, country, is_active, company_id)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (h["name"], h["holiday_date"], h["holiday_type"],
                          h["month"], h["day"], h["country"], h["is_active"], company_id))
                    inserted += 1
                except Exception:
                    pass  # UNIQUE constraint - already exists
            await db.commit()
        return inserted

    async def create_holiday(self, name: str, holiday_date: str, company_id: int, country: str = "IT") -> int:
        """Create a custom holiday for a specific company.

        Args:
            name: Holiday name
            holiday_date: Holiday date (ISO format)
            company_id: Company ID (REQUIRED for multi-tenant isolation)
            country: Country code (default: IT)

        Returns:
            holiday_id
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("""
                INSERT INTO holidays (name, holiday_date, holiday_type, country, is_active, company_id)
                VALUES (?, ?, 'custom', ?, 1, ?)
            """, (name, holiday_date, country, company_id))
            await db.commit()
            return cursor.lastrowid

    async def update_holiday(self, holiday_id: int, company_id: int, **kwargs) -> bool:
        """Update holiday fields for a specific company.

        Args:
            holiday_id: Holiday ID to update
            company_id: Company ID (REQUIRED for multi-tenant isolation - verifies ownership)
            **kwargs: Fields to update (name, is_active)

        Returns:
            True if updated, False if holiday not found or doesn't belong to company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        allowed = {"name", "is_active"}
        updates = {k: v for k, v in kwargs.items() if k in allowed}
        if not updates:
            return False
        set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
        values = list(updates.values()) + [holiday_id, company_id]
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                f"UPDATE holidays SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?",
                values
            )
            await db.commit()
            return cursor.rowcount > 0

    async def delete_holiday(self, holiday_id: int, company_id: int) -> bool:
        """Delete a holiday for a specific company.

        Args:
            holiday_id: Holiday ID to delete
            company_id: Company ID (REQUIRED for multi-tenant isolation - verifies ownership)

        Returns:
            True if deleted, False if holiday not found or doesn't belong to company
        """
        await self.initialize()

        if not company_id:
            raise ValueError("company_id is required for multi-tenant operations")

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("DELETE FROM holidays WHERE id = ? AND company_id = ?", (holiday_id, company_id))
            await db.commit()
            return cursor.rowcount > 0

    # ========== Factorial HR Operations ==========

    async def get_factorial_config(self, company_id: int) -> Optional[dict]:
        """Get active Factorial configuration."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                "SELECT id, api_key, is_active, created_at, updated_at FROM factorial_config WHERE is_active = 1 AND company_id = ? ORDER BY id DESC LIMIT 1",
                (company_id,)
            ) as cursor:
                row = await cursor.fetchone()
                if row:
                    return {
                        "id": row[0],
                        "api_key": row[1],
                        "is_active": row[2],
                        "created_at": row[3],
                        "updated_at": row[4]
                    }
        return None

    async def set_factorial_config(self, api_key: str, company_id: int) -> int:
        """Create or update Factorial configuration."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            # Deactivate old configs for this company
            await db.execute("UPDATE factorial_config SET is_active = 0 WHERE company_id = ?", (company_id,))

            # Insert new config
            cursor = await db.execute(
                "INSERT INTO factorial_config (api_key, is_active, company_id) VALUES (?, 1, ?)",
                (api_key, company_id)
            )
            await db.commit()
            return cursor.lastrowid

    async def get_user_factorial_account(self, user_id: int, company_id: int) -> Optional[dict]:
        """Get Factorial employee ID for a user."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                "SELECT factorial_employee_id, factorial_email FROM user_factorial_accounts WHERE user_id = ?",
                (user_id,)
            ) as cursor:
                row = await cursor.fetchone()
                if row:
                    return {
                        "factorial_employee_id": row[0],
                        "factorial_email": row[1]
                    }
        return None

    async def set_user_factorial_account(
        self,
        user_id: int,
        factorial_employee_id: int,
        factorial_email: str = None,
        company_id: int = None
    ) -> bool:
        """Set/update Factorial employee ID for a user."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT INTO user_factorial_accounts (user_id, factorial_employee_id, factorial_email)
                VALUES (?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                    factorial_employee_id = excluded.factorial_employee_id,
                    factorial_email = excluded.factorial_email,
                    updated_at = CURRENT_TIMESTAMP
            """, (user_id, factorial_employee_id, factorial_email))
            await db.commit()
        return True

    async def delete_user_factorial_account(self, user_id: int, company_id: int) -> bool:
        """Delete Factorial account mapping for a user."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                "DELETE FROM user_factorial_accounts WHERE user_id = ?",
                (user_id,)
            )
            await db.commit()
            return cursor.rowcount > 0

    async def get_leaves_in_range(
        self,
        start_date: date,
        end_date: date,
        user_id: Optional[int] = None,
        status_filter: Optional[str] = None
    ) -> list[dict]:
        """Get leaves within date range from storage."""
        await self.initialize()

        query = """
            SELECT
                fl.id, fl.factorial_leave_id, fl.user_id,
                u.email as user_email,
                u.first_name || ' ' || u.last_name as user_full_name,
                fl.factorial_employee_id, fl.leave_type_id, fl.leave_type_name,
                fl.start_date, fl.finish_date, fl.half_day, fl.status, fl.description,
                fl.created_at
            FROM factorial_leaves fl
            JOIN users u ON fl.user_id = u.id
            WHERE (fl.start_date <= ? AND fl.finish_date >= ?)
        """
        params = [end_date.isoformat(), start_date.isoformat()]

        if user_id:
            query += " AND fl.user_id = ?"
            params.append(user_id)

        if status_filter:
            query += " AND fl.status = ?"
            params.append(status_filter)

        query += " ORDER BY fl.start_date DESC"

        leaves = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(query, params) as cursor:
                async for row in cursor:
                    leaves.append({
                        "id": row[0],
                        "factorial_leave_id": row[1],
                        "user_id": row[2],
                        "user_email": row[3],
                        "user_full_name": row[4],
                        "factorial_employee_id": row[5],
                        "leave_type_id": row[6],
                        "leave_type_name": row[7],
                        "start_date": row[8],
                        "finish_date": row[9],
                        "half_day": row[10],
                        "status": row[11],
                        "description": row[12],
                        "created_at": row[13]
                    })

        return leaves

    async def upsert_leaves(self, leaves: list[dict], user_id_map: dict[int, int], company_id: int) -> tuple[int, int]:
        """
        Insert or update leaves.

        Args:
            leaves: List of leave dicts from Factorial API
            user_id_map: Map of factorial_employee_id -> user_id

        Returns:
            (inserted_count, updated_count)
        """
        await self.initialize()

        inserted = 0
        updated = 0

        async with aiosqlite.connect(self.db_path) as db:
            for leave in leaves:
                factorial_employee_id = leave.get("employee_id")
                user_id = user_id_map.get(factorial_employee_id)

                if not user_id:
                    continue  # Skip leaves for unmapped employees

                factorial_leave_id = leave.get("id")

                # Check if exists
                async with db.execute(
                    "SELECT id FROM factorial_leaves WHERE factorial_leave_id = ?",
                    (factorial_leave_id,)
                ) as cursor:
                    exists = await cursor.fetchone() is not None

                leave_type = leave.get("leave_type", {})

                if exists:
                    await db.execute("""
                        UPDATE factorial_leaves SET
                            user_id = ?,
                            factorial_employee_id = ?,
                            leave_type_id = ?,
                            leave_type_name = ?,
                            start_date = ?,
                            finish_date = ?,
                            half_day = ?,
                            status = ?,
                            description = ?,
                            data = ?,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE factorial_leave_id = ?
                    """, (
                        user_id,
                        factorial_employee_id,
                        leave_type.get("id"),
                        leave_type.get("name", "Leave"),
                        leave.get("start_on"),
                        leave.get("finish_on"),
                        leave.get("half_day", "no"),
                        leave.get("status", "approved"),
                        leave.get("description"),
                        json.dumps(leave),
                        factorial_leave_id
                    ))
                    updated += 1
                else:
                    await db.execute("""
                        INSERT INTO factorial_leaves
                        (factorial_leave_id, user_id, factorial_employee_id, leave_type_id,
                         leave_type_name, start_date, finish_date, half_day, status, description, data)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        factorial_leave_id,
                        user_id,
                        factorial_employee_id,
                        leave_type.get("id"),
                        leave_type.get("name", "Leave"),
                        leave.get("start_on"),
                        leave.get("finish_on"),
                        leave.get("half_day", "no"),
                        leave.get("status", "approved"),
                        leave.get("description"),
                        json.dumps(leave)
                    ))
                    inserted += 1

            await db.commit()

        return (inserted, updated)

    # ========== Authentication Operations ==========

    async def create_company(self, name: str, domain: str = None) -> int:
        """Create a new company/organization."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("""
                INSERT INTO companies (name, domain)
                VALUES (?, ?)
            """, (name, domain))
            await db.commit()
            return cursor.lastrowid

    async def get_company(self, company_id: int) -> Optional[dict]:
        """Get company by ID."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM companies WHERE id = ? AND is_active = 1
            """, (company_id,)) as cursor:
                row = await cursor.fetchone()
                return dict(row) if row else None

    async def update_company(self, company_id: int, name: str) -> bool:
        """Update company name."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("""
                UPDATE companies SET name = ? WHERE id = ? AND is_active = 1
            """, (name, company_id))
            await db.commit()
            return cursor.rowcount > 0

    async def count_companies(self) -> int:
        """Count total active companies."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT COUNT(*) FROM companies WHERE is_active = 1
            """) as cursor:
                row = await cursor.fetchone()
                return row[0] if row else 0

    # OAuth Users

    async def create_oauth_user(
        self,
        google_id: str,
        email: str,
        company_id: int,
        role: str = "DEV",
        first_name: str = None,
        last_name: str = None,
        picture_url: str = None
    ) -> int:
        """Create a new OAuth user with role_level calculated from role."""
        await self.initialize()
        role_level = UserRole.get_level(role)
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("""
                INSERT INTO oauth_users
                (company_id, google_id, email, first_name, last_name, picture_url, role, role_level, last_login_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """, (company_id, google_id, email, first_name, last_name, picture_url, role, role_level))
            await db.commit()
            return cursor.lastrowid

    async def get_oauth_user_by_id(self, user_id: int) -> Optional[dict]:
        """Get OAuth user by ID."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM oauth_users WHERE id = ?
            """, (user_id,)) as cursor:
                row = await cursor.fetchone()
                return dict(row) if row else None

    async def get_oauth_user_by_google_id(self, google_id: str) -> Optional[dict]:
        """Get OAuth user by Google ID."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM oauth_users WHERE google_id = ?
            """, (google_id,)) as cursor:
                row = await cursor.fetchone()
                return dict(row) if row else None

    async def get_oauth_user_by_email(self, email: str, company_id: int = None) -> Optional[dict]:
        """Get OAuth user by email (optionally filtered by company)."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            if company_id:
                query = "SELECT * FROM oauth_users WHERE email = ? AND company_id = ?"
                params = (email, company_id)
            else:
                query = "SELECT * FROM oauth_users WHERE email = ?"
                params = (email,)

            async with db.execute(query, params) as cursor:
                row = await cursor.fetchone()
                return dict(row) if row else None

    async def get_all_oauth_users(self, company_id: int) -> list[dict]:
        """Get all OAuth users for a company."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM oauth_users
                WHERE company_id = ?
                ORDER BY created_at DESC
            """, (company_id,)) as cursor:
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]

    async def update_oauth_user_last_login(self, user_id: int):
        """Update user's last login timestamp."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                UPDATE oauth_users
                SET last_login_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (user_id,))
            await db.commit()

    async def update_oauth_user(
        self,
        user_id: int,
        first_name: str = None,
        last_name: str = None,
        picture_url: str = None,
        role: str = None,
        is_active: int = None
    ):
        """Update OAuth user profile. Automatically syncs role_level when role changes."""
        await self.initialize()

        updates = []
        params = []

        if first_name is not None:
            updates.append("first_name = ?")
            params.append(first_name)
        if last_name is not None:
            updates.append("last_name = ?")
            params.append(last_name)
        if picture_url is not None:
            updates.append("picture_url = ?")
            params.append(picture_url)
        if role is not None:
            updates.append("role = ?")
            params.append(role)
            # Sync role_level whenever role changes
            updates.append("role_level = ?")
            params.append(UserRole.get_level(role))
        if is_active is not None:
            updates.append("is_active = ?")
            params.append(is_active)

        if not updates:
            return

        params.append(user_id)
        query = f"""
            UPDATE oauth_users
            SET {', '.join(updates)}
            WHERE id = ?
        """

        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(query, params)
            await db.commit()

    async def count_users_in_company(self, company_id: int) -> int:
        """Count number of active users in a company."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                "SELECT COUNT(*) FROM oauth_users WHERE company_id = ? AND is_active = 1",
                (company_id,)
            )
            result = await cursor.fetchone()
            return result[0] if result else 0

    async def delete_oauth_user(self, user_id: int) -> bool:
        """
        Delete a user account.

        Returns True if user was deleted, False if not found.
        """
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            # Delete user's sessions first
            await db.execute("DELETE FROM auth_sessions WHERE user_id = ?", (user_id,))

            # Delete the user
            cursor = await db.execute("DELETE FROM oauth_users WHERE id = ?", (user_id,))
            await db.commit()

            return cursor.rowcount > 0

    async def delete_company_cascade(self, company_id: int) -> bool:
        """
        Delete a company and ALL associated data in cascade.

        WARNING: This is irreversible and will delete:
        - The company record
        - All users (oauth_users and legacy users)
        - All teams
        - All JIRA instances (+ child tables via CASCADE: jira_instance_issue_types, package_template_instances)
        - All worklogs
        - All epics
        - All billing data:
          - billing_clients
          - billing_projects (+ child tables via CASCADE: billing_rates, billing_project_mappings)
          - invoices (+ child tables via CASCADE: invoice_line_items)
        - All package_templates (+ child tables via CASCADE: package_template_elements, package_template_instances)
        - All holidays
        - All configurations (factorial_config, user_factorial_accounts, user_jira_accounts)
        - All complementary_groups (+ child table: complementary_group_members via foreign key)
        - All logs, sync_history, auth logs
        - All sessions

        Returns True if company was deleted, False if not found.
        """
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            # Order matters: delete children before parents to avoid FK constraints
            # Many child tables have ON DELETE CASCADE, so they'll be auto-deleted

            # 1. Delete all sessions for users in this company
            await db.execute("""
                DELETE FROM auth_sessions
                WHERE user_id IN (SELECT id FROM oauth_users WHERE company_id = ?)
            """, (company_id,))

            # 2. Delete auth audit log for this company
            try:
                await db.execute("DELETE FROM auth_audit_log WHERE company_id = ?", (company_id,))
            except:
                pass  # Table might not exist in older DBs

            # 3. Delete all invitations
            await db.execute("DELETE FROM invitations WHERE company_id = ?", (company_id,))

            # 4. Delete user account mappings
            await db.execute("""
                DELETE FROM user_factorial_accounts
                WHERE user_id IN (SELECT id FROM oauth_users WHERE company_id = ?)
            """, (company_id,))
            await db.execute("""
                DELETE FROM user_jira_accounts
                WHERE user_id IN (SELECT id FROM oauth_users WHERE company_id = ?)
            """, (company_id,))

            # 5. Delete all users (oauth_users and legacy users table)
            await db.execute("DELETE FROM oauth_users WHERE company_id = ?", (company_id,))
            await db.execute("DELETE FROM users WHERE company_id = ?", (company_id,))

            # 6. Delete all teams
            await db.execute("DELETE FROM teams WHERE company_id = ?", (company_id,))

            # 7. Delete complementary groups (members deleted via FK cascade)
            await db.execute("DELETE FROM complementary_groups WHERE company_id = ?", (company_id,))

            # 8. Delete all JIRA instances (auto-deletes: jira_instance_issue_types, package_template_instances via CASCADE)
            await db.execute("DELETE FROM jira_instances WHERE company_id = ?", (company_id,))

            # 9. Delete all worklogs
            await db.execute("DELETE FROM worklogs WHERE company_id = ?", (company_id,))

            # 10. Delete all epics
            await db.execute("DELETE FROM epics WHERE company_id = ?", (company_id,))

            # 11. Delete billing data (some children auto-delete via CASCADE)
            await db.execute("DELETE FROM billing_clients WHERE company_id = ?", (company_id,))
            # billing_projects deletion auto-deletes: billing_rates, billing_project_mappings via CASCADE
            await db.execute("DELETE FROM billing_projects WHERE company_id = ?", (company_id,))
            # invoices deletion auto-deletes: invoice_line_items via CASCADE
            await db.execute("DELETE FROM invoices WHERE company_id = ?", (company_id,))

            # 12. Delete package templates (auto-deletes: package_template_elements, package_template_instances via CASCADE)
            await db.execute("DELETE FROM package_templates WHERE company_id = ?", (company_id,))

            # 13. Delete holidays
            await db.execute("DELETE FROM holidays WHERE company_id = ?", (company_id,))

            # 14. Delete configurations
            await db.execute("DELETE FROM factorial_config WHERE company_id = ?", (company_id,))

            # 15. Delete sync history
            try:
                await db.execute("DELETE FROM sync_history WHERE company_id = ?", (company_id,))
            except:
                pass  # Table might not have company_id column

            try:
                await db.execute("DELETE FROM factorial_sync_history WHERE company_id = ?", (company_id,))
            except:
                pass  # Table might not exist or have company_id

            # 16. Delete logs
            await db.execute("DELETE FROM logs WHERE company_id = ?", (company_id,))

            # 17. Delete billing classifications
            try:
                await db.execute("DELETE FROM billing_worklog_classifications WHERE company_id = ?", (company_id,))
            except:
                pass  # Table might not have company_id

            # 18. Finally, delete the company itself
            cursor = await db.execute("DELETE FROM companies WHERE id = ?", (company_id,))
            await db.commit()

            return cursor.rowcount > 0

    # Auth Sessions

    async def create_session(
        self,
        user_id: int,
        refresh_token: str,
        expires_at: datetime,
        access_token_jti: str = None
    ) -> int:
        """Create a new auth session."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("""
                INSERT INTO auth_sessions (user_id, refresh_token, access_token_jti, expires_at)
                VALUES (?, ?, ?, ?)
            """, (user_id, refresh_token, access_token_jti, expires_at.isoformat()))
            await db.commit()
            return cursor.lastrowid

    async def get_session_by_refresh_token(self, refresh_token: str) -> Optional[dict]:
        """Get session by refresh token."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM auth_sessions WHERE refresh_token = ?
            """, (refresh_token,)) as cursor:
                row = await cursor.fetchone()
                if not row:
                    return None

                session = dict(row)
                # Parse datetime
                session["expires_at"] = datetime.fromisoformat(session["expires_at"])
                return session

    async def invalidate_session(self, refresh_token: str):
        """Invalidate a session by deleting it."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                DELETE FROM auth_sessions WHERE refresh_token = ?
            """, (refresh_token,))
            await db.commit()

    async def delete_expired_sessions(self):
        """Delete all expired sessions."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                DELETE FROM auth_sessions
                WHERE datetime(expires_at) < datetime('now')
            """)
            await db.commit()

    # Invitations

    async def create_invitation(
        self,
        company_id: int,
        email: str,
        role: str,
        invited_by: int,
        token: str,
        expires_at: datetime
    ) -> int:
        """Create a new invitation."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("""
                INSERT INTO invitations
                (company_id, email, role, invited_by, token, expires_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (company_id, email, role, invited_by, token, expires_at.isoformat()))
            await db.commit()
            return cursor.lastrowid

    async def get_invitation_by_token(self, token: str) -> Optional[dict]:
        """Get invitation by token."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM invitations WHERE token = ?
            """, (token,)) as cursor:
                row = await cursor.fetchone()
                if not row:
                    return None

                inv = dict(row)
                inv["expires_at"] = datetime.fromisoformat(inv["expires_at"])
                return inv

    async def get_invitation_by_email(self, email: str) -> Optional[dict]:
        """Get pending invitation by email (most recent)."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("""
                SELECT * FROM invitations
                WHERE LOWER(email) = LOWER(?) AND status = 'PENDING'
                ORDER BY created_at DESC
                LIMIT 1
            """, (email,)) as cursor:
                row = await cursor.fetchone()
                if not row:
                    return None

                inv = dict(row)
                inv["expires_at"] = datetime.fromisoformat(inv["expires_at"])
                return inv

    async def list_company_invitations(
        self,
        company_id: int,
        status: str = None
    ) -> list[dict]:
        """List all invitations for a company."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row

            if status:
                query = """
                    SELECT * FROM invitations
                    WHERE company_id = ? AND status = ?
                    ORDER BY created_at DESC
                """
                params = (company_id, status)
            else:
                query = """
                    SELECT * FROM invitations
                    WHERE company_id = ?
                    ORDER BY created_at DESC
                """
                params = (company_id,)

            async with db.execute(query, params) as cursor:
                rows = await cursor.fetchall()
                invitations = []
                for row in rows:
                    inv = dict(row)
                    inv["expires_at"] = datetime.fromisoformat(inv["expires_at"])
                    invitations.append(inv)
                return invitations

    async def update_invitation_status(self, invitation_id: int, status: str):
        """Update invitation status."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                UPDATE invitations
                SET status = ?
                WHERE id = ?
            """, (status, invitation_id))
            await db.commit()

    async def delete_invitation(self, invitation_id: int):
        """Delete an invitation."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                DELETE FROM invitations WHERE id = ?
            """, (invitation_id,))
            await db.commit()

    # Auth Audit Log

    async def log_auth_event(
        self,
        event_type: str,
        company_id: int = None,
        user_id: int = None,
        email: str = None,
        ip_address: str = None,
        metadata: dict = None
    ):
        """Log an authentication event."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT INTO auth_audit_log
                (company_id, user_id, event_type, email, ip_address, metadata_json)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                company_id,
                user_id,
                event_type,
                email,
                ip_address,
                json.dumps(metadata) if metadata else None
            ))
            await db.commit()


# Global storage instance
_storage: Optional[WorklogStorage] = None


def get_storage() -> WorklogStorage:
    """Get the global storage instance."""
    global _storage
    if _storage is None:
        _storage = WorklogStorage()
    return _storage


# Backward compatibility alias
def get_cache(ttl_seconds: int = 900) -> WorklogStorage:
    """Backward compatibility - returns storage instance."""
    return get_storage()
