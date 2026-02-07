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

from .models import Worklog, Epic, Issue


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

                await db.commit()
            
            self._initialized = True
    
    # ========== Worklog Operations ==========
    
    async def get_worklogs_in_range(
        self, 
        start_date: date, 
        end_date: date,
        user_emails: Optional[list[str]] = None,
        jira_instance: Optional[str] = None
    ) -> list[Worklog]:
        """Get worklogs within a date range from permanent storage."""
        await self.initialize()
        
        query = """
            SELECT data FROM worklogs 
            WHERE date(started) >= ? AND date(started) <= ?
        """
        params = [start_date.isoformat(), end_date.isoformat()]
        
        if jira_instance:
            query += " AND jira_instance = ?"
            params.append(jira_instance)
        
        if user_emails:
            placeholders = ",".join("?" * len(user_emails))
            query += f" AND LOWER(author_email) IN ({placeholders})"
            params.extend([e.lower() for e in user_emails])
        
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
    
    async def upsert_worklogs(self, worklogs: list[Worklog]) -> tuple[int, int]:
        """
        Insert or update worklogs. 
        Returns (inserted_count, updated_count).
        """
        await self.initialize()
        
        inserted = 0
        updated = 0
        
        async with aiosqlite.connect(self.db_path) as db:
            for wl in worklogs:
                # Check if exists
                async with db.execute(
                    "SELECT id FROM worklogs WHERE id = ?", 
                    (wl.id,)
                ) as cursor:
                    exists = await cursor.fetchone() is not None
                
                if exists:
                    await db.execute("""
                        UPDATE worklogs SET
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
                    """, (
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
                    ))
                    updated += 1
                else:
                    await db.execute("""
                        INSERT INTO worklogs
                        (id, issue_key, issue_summary, author_email, author_display_name,
                         time_spent_seconds, started, jira_instance, parent_key, parent_name,
                         parent_type, epic_key, epic_name, data)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        wl.id,
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
                    ))
                    inserted += 1
            
            await db.commit()
        
        return inserted, updated
    
    async def delete_worklogs_not_in_list(
        self, 
        worklog_ids: list[str],
        start_date: date,
        end_date: date,
        jira_instance: str
    ) -> int:
        """
        Delete worklogs that are in the DB for the given range/instance 
        but not in the provided list (i.e., deleted from JIRA).
        Returns count of deleted worklogs.
        """
        await self.initialize()
        
        if not worklog_ids:
            # If no worklogs from JIRA, delete all for this range/instance
            query = """
                DELETE FROM worklogs 
                WHERE date(started) >= ? AND date(started) <= ? 
                AND jira_instance = ?
            """
            params = [start_date.isoformat(), end_date.isoformat(), jira_instance]
        else:
            placeholders = ",".join("?" * len(worklog_ids))
            query = f"""
                DELETE FROM worklogs 
                WHERE date(started) >= ? AND date(started) <= ? 
                AND jira_instance = ?
                AND id NOT IN ({placeholders})
            """
            params = [start_date.isoformat(), end_date.isoformat(), jira_instance]
            params.extend(worklog_ids)
        
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(query, params)
            deleted = cursor.rowcount
            await db.commit()
        
        return deleted
    
    async def get_worklog_count(self) -> int:
        """Get total count of worklogs in storage."""
        await self.initialize()
        
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("SELECT COUNT(*) FROM worklogs") as cursor:
                row = await cursor.fetchone()
                return row[0] if row else 0
    
    async def get_data_date_range(self) -> Optional[tuple[date, date]]:
        """Get the date range of stored data."""
        await self.initialize()
        
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT MIN(date(started)), MAX(date(started)) FROM worklogs
            """) as cursor:
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
        start_date: date, 
        end_date: date, 
        jira_instances: list[str]
    ) -> int:
        """Record the start of a sync operation. Returns sync_id."""
        await self.initialize()
        
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("""
                INSERT INTO sync_history (start_date, end_date, jira_instances, status)
                VALUES (?, ?, ?, 'in_progress')
            """, (
                start_date.isoformat(),
                end_date.isoformat(),
                json.dumps(jira_instances)
            ))
            await db.commit()
            return cursor.lastrowid
    
    async def complete_sync(
        self, 
        sync_id: int, 
        synced: int, 
        updated: int, 
        deleted: int,
        error: Optional[str] = None
    ):
        """Record the completion of a sync operation."""
        await self.initialize()
        
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
                WHERE id = ?
            """, (synced, updated, deleted, status, error, sync_id))
            await db.commit()
    
    async def get_sync_history(self, limit: int = 20) -> list[dict]:
        """Get recent sync history."""
        await self.initialize()
        
        history = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT id, start_date, end_date, jira_instances, 
                       worklogs_synced, worklogs_updated, worklogs_deleted,
                       status, error_message, started_at, completed_at
                FROM sync_history
                ORDER BY started_at DESC
                LIMIT ?
            """, (limit,)) as cursor:
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

    async def create_team(self, name: str) -> int:
        """Create a new team. Returns team_id."""
        await self.initialize()

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                "INSERT INTO teams (name) VALUES (?)",
                (name,)
            )
            await db.commit()
            return cursor.lastrowid

    async def get_team(self, team_id: int) -> Optional[dict]:
        """Get a team by ID."""
        await self.initialize()

        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                "SELECT id, name, created_at, updated_at FROM teams WHERE id = ?",
                (team_id,)
            ) as cursor:
                row = await cursor.fetchone()
                if row:
                    return {
                        "id": row[0],
                        "name": row[1],
                        "created_at": row[2],
                        "updated_at": row[3]
                    }
        return None

    async def get_team_by_name(self, name: str) -> Optional[dict]:
        """Get a team by name."""
        await self.initialize()

        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                "SELECT id, name, created_at, updated_at FROM teams WHERE name = ?",
                (name,)
            ) as cursor:
                row = await cursor.fetchone()
                if row:
                    return {
                        "id": row[0],
                        "name": row[1],
                        "created_at": row[2],
                        "updated_at": row[3]
                    }
        return None

    async def get_all_teams(self) -> list[dict]:
        """Get all teams with member counts."""
        await self.initialize()

        teams = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT t.id, t.name, t.created_at, t.updated_at,
                       COUNT(u.id) as member_count
                FROM teams t
                LEFT JOIN users u ON u.team_id = t.id
                GROUP BY t.id
                ORDER BY t.name
            """) as cursor:
                async for row in cursor:
                    teams.append({
                        "id": row[0],
                        "name": row[1],
                        "created_at": row[2],
                        "updated_at": row[3],
                        "member_count": row[4]
                    })
        return teams

    async def update_team(self, team_id: int, name: str) -> bool:
        """Update a team's name. Returns True if updated."""
        await self.initialize()

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                "UPDATE teams SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (name, team_id)
            )
            await db.commit()
            return cursor.rowcount > 0

    async def delete_team(self, team_id: int) -> bool:
        """Delete a team. Returns True if deleted."""
        await self.initialize()

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                "DELETE FROM teams WHERE id = ?",
                (team_id,)
            )
            await db.commit()
            return cursor.rowcount > 0

    # ========== User Operations ==========

    async def create_user(
        self,
        email: str,
        first_name: str,
        last_name: str,
        team_id: Optional[int] = None
    ) -> int:
        """Create a new user. Returns user_id."""
        await self.initialize()

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                "INSERT INTO users (email, first_name, last_name, team_id) VALUES (?, ?, ?, ?)",
                (email, first_name, last_name, team_id)
            )
            await db.commit()
            return cursor.lastrowid

    async def get_user(self, user_id: int) -> Optional[dict]:
        """Get a user by ID with JIRA accounts."""
        await self.initialize()

        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT u.id, u.email, u.first_name, u.last_name, u.team_id,
                       u.created_at, u.updated_at, t.name as team_name
                FROM users u
                LEFT JOIN teams t ON t.id = u.team_id
                WHERE u.id = ?
            """, (user_id,)) as cursor:
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

    async def get_user_by_email(self, email: str) -> Optional[dict]:
        """Get a user by email."""
        await self.initialize()

        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                "SELECT id FROM users WHERE LOWER(email) = LOWER(?)",
                (email,)
            ) as cursor:
                row = await cursor.fetchone()
                if row:
                    return await self.get_user(row[0])
        return None

    async def get_all_users(self) -> list[dict]:
        """Get all users with team info and JIRA accounts."""
        await self.initialize()

        users = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT u.id, u.email, u.first_name, u.last_name, u.team_id,
                       u.created_at, u.updated_at, t.name as team_name
                FROM users u
                LEFT JOIN teams t ON t.id = u.team_id
                ORDER BY u.last_name, u.first_name
            """) as cursor:
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

    async def get_users_by_team(self, team_id: int) -> list[dict]:
        """Get all users in a team."""
        await self.initialize()

        users = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT u.id, u.email, u.first_name, u.last_name, u.team_id,
                       u.created_at, u.updated_at
                FROM users u
                WHERE u.team_id = ?
                ORDER BY u.last_name, u.first_name
            """, (team_id,)) as cursor:
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

    async def update_user(self, user_id: int, **kwargs) -> bool:
        """Update user fields. Returns True if updated."""
        await self.initialize()

        allowed_fields = {"email", "first_name", "last_name", "team_id"}
        updates = {k: v for k, v in kwargs.items() if k in allowed_fields}

        if not updates:
            return False

        set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
        values = list(updates.values())
        values.append(user_id)

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                f"UPDATE users SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                values
            )
            await db.commit()
            return cursor.rowcount > 0

    async def delete_user(self, user_id: int) -> bool:
        """Delete a user and their JIRA accounts. Returns True if deleted."""
        await self.initialize()

        async with aiosqlite.connect(self.db_path) as db:
            # JIRA accounts will be deleted by CASCADE
            cursor = await db.execute(
                "DELETE FROM users WHERE id = ?",
                (user_id,)
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
        tempo_api_token: Optional[str] = None,
        billing_client_id: Optional[int] = None
    ) -> int:
        """Create a new JIRA instance. Returns instance_id."""
        await self.initialize()

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("""
                INSERT INTO jira_instances (name, url, email, api_token, tempo_api_token, billing_client_id)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (name, url, email, api_token, tempo_api_token, billing_client_id))
            await db.commit()
            return cursor.lastrowid

    async def get_jira_instance(self, instance_id: int) -> Optional[dict]:
        """Get a JIRA instance by ID."""
        await self.initialize()

        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT id, name, url, email, api_token, tempo_api_token, billing_client_id, is_active,
                       created_at, updated_at, default_project_key
                FROM jira_instances WHERE id = ?
            """, (instance_id,)) as cursor:
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

    async def get_jira_instance_by_name(self, name: str) -> Optional[dict]:
        """Get a JIRA instance by name."""
        await self.initialize()

        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT id, name, url, email, api_token, tempo_api_token, billing_client_id, is_active,
                       created_at, updated_at, default_project_key
                FROM jira_instances WHERE name = ?
            """, (name,)) as cursor:
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

    async def get_all_jira_instances(self, include_credentials: bool = False) -> list[dict]:
        """Get all JIRA instances. Optionally include credentials."""
        await self.initialize()

        instances = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT id, name, url, email, api_token, tempo_api_token, billing_client_id, is_active,
                       created_at, updated_at, default_project_key
                FROM jira_instances
                ORDER BY name
            """) as cursor:
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

    async def update_jira_instance(self, instance_id: int, **kwargs) -> bool:
        """Update JIRA instance fields. Returns True if updated."""
        await self.initialize()

        allowed_fields = {"name", "url", "email", "api_token", "tempo_api_token", "billing_client_id", "is_active", "default_project_key"}
        updates = {k: v for k, v in kwargs.items() if k in allowed_fields}

        if not updates:
            return False

        set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
        values = list(updates.values())
        values.append(instance_id)

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                f"UPDATE jira_instances SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                values
            )
            await db.commit()
            return cursor.rowcount > 0

    async def delete_jira_instance(self, instance_id: int) -> bool:
        """Delete a JIRA instance. Returns True if deleted."""
        await self.initialize()

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                "DELETE FROM jira_instances WHERE id = ?",
                (instance_id,)
            )
            await db.commit()
            return cursor.rowcount > 0

    # ========== Complementary Group Operations ==========

    async def create_complementary_group(
        self,
        name: str,
        primary_instance_id: Optional[int] = None
    ) -> int:
        """Create a new complementary group. Returns group_id."""
        await self.initialize()

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("""
                INSERT INTO complementary_groups (name, primary_instance_id)
                VALUES (?, ?)
            """, (name, primary_instance_id))
            await db.commit()
            return cursor.lastrowid

    async def get_complementary_group(self, group_id: int) -> Optional[dict]:
        """Get a complementary group with its members."""
        await self.initialize()

        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT g.id, g.name, g.primary_instance_id, g.created_at, g.updated_at,
                       pi.name as primary_instance_name
                FROM complementary_groups g
                LEFT JOIN jira_instances pi ON pi.id = g.primary_instance_id
                WHERE g.id = ?
            """, (group_id,)) as cursor:
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

            # Get members
            async with db.execute("""
                SELECT ji.id, ji.name, ji.url
                FROM complementary_group_members cgm
                JOIN jira_instances ji ON ji.id = cgm.instance_id
                WHERE cgm.group_id = ?
                ORDER BY ji.name
            """, (group_id,)) as cursor:
                async for row in cursor:
                    group["members"].append({
                        "id": row[0],
                        "name": row[1],
                        "url": row[2]
                    })

        return group

    async def get_all_complementary_groups(self) -> list[dict]:
        """Get all complementary groups with their members."""
        await self.initialize()

        groups = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT g.id, g.name, g.primary_instance_id, g.created_at, g.updated_at,
                       pi.name as primary_instance_name
                FROM complementary_groups g
                LEFT JOIN jira_instances pi ON pi.id = g.primary_instance_id
                ORDER BY g.name
            """) as cursor:
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

            # Get members for all groups
            group_ids = [g["id"] for g in groups]
            if group_ids:
                placeholders = ",".join("?" * len(group_ids))
                async with db.execute(f"""
                    SELECT cgm.group_id, ji.id, ji.name, ji.url
                    FROM complementary_group_members cgm
                    JOIN jira_instances ji ON ji.id = cgm.instance_id
                    WHERE cgm.group_id IN ({placeholders})
                    ORDER BY ji.name
                """, group_ids) as cursor:
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
        name: Optional[str] = None,
        primary_instance_id: Optional[int] = None
    ) -> bool:
        """Update complementary group. Returns True if updated."""
        await self.initialize()

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

        values.append(group_id)
        set_clause = ", ".join(updates)

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                f"UPDATE complementary_groups SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                values
            )
            await db.commit()
            return cursor.rowcount > 0

    async def delete_complementary_group(self, group_id: int) -> bool:
        """Delete a complementary group. Returns True if deleted."""
        await self.initialize()

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                "DELETE FROM complementary_groups WHERE id = ?",
                (group_id,)
            )
            await db.commit()
            return cursor.rowcount > 0

    async def add_instance_to_complementary_group(
        self,
        group_id: int,
        instance_id: int
    ) -> bool:
        """Add an instance to a complementary group. Returns True if added."""
        await self.initialize()

        async with aiosqlite.connect(self.db_path) as db:
            try:
                await db.execute("""
                    INSERT INTO complementary_group_members (group_id, instance_id)
                    VALUES (?, ?)
                """, (group_id, instance_id))
                await db.commit()
                return True
            except Exception:
                return False  # Already exists

    async def remove_instance_from_complementary_group(
        self,
        group_id: int,
        instance_id: int
    ) -> bool:
        """Remove an instance from a complementary group. Returns True if removed."""
        await self.initialize()

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("""
                DELETE FROM complementary_group_members
                WHERE group_id = ? AND instance_id = ?
            """, (group_id, instance_id))
            await db.commit()
            return cursor.rowcount > 0

    async def set_complementary_group_members(
        self,
        group_id: int,
        instance_ids: list[int]
    ) -> bool:
        """Set the members of a complementary group (replaces existing)."""
        await self.initialize()

        async with aiosqlite.connect(self.db_path) as db:
            # Remove all existing members
            await db.execute(
                "DELETE FROM complementary_group_members WHERE group_id = ?",
                (group_id,)
            )

            # Add new members
            for instance_id in instance_ids:
                await db.execute("""
                    INSERT INTO complementary_group_members (group_id, instance_id)
                    VALUES (?, ?)
                """, (group_id, instance_id))

            await db.commit()
            return True

    async def get_complementary_instance_names(self) -> list[str]:
        """
        Get list of complementary instance names for backward compatibility.
        Returns names of instances in all complementary groups (for filtering).
        """
        await self.initialize()

        names = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT DISTINCT ji.name
                FROM complementary_group_members cgm
                JOIN jira_instances ji ON ji.id = cgm.instance_id
            """) as cursor:
                async for row in cursor:
                    names.append(row[0])
        return names

    async def get_complementary_instance_names_by_group(self, group_id: int) -> list[str]:
        """
        Get instance names for a specific complementary group.
        Returns list of instance names in the specified group.
        """
        await self.initialize()

        names = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT ji.name
                FROM complementary_group_members cgm
                JOIN jira_instances ji ON ji.id = cgm.instance_id
                WHERE cgm.group_id = ?
                ORDER BY ji.name
            """, (group_id,)) as cursor:
                async for row in cursor:
                    names.append(row[0])
        return names

    async def get_primary_instance_for_complementary(self) -> Optional[str]:
        """
        Get the primary instance name to use when complementary instances exist.
        Returns the first primary instance found, or None.
        """
        await self.initialize()

        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT ji.name
                FROM complementary_groups cg
                JOIN jira_instances ji ON ji.id = cg.primary_instance_id
                WHERE cg.primary_instance_id IS NOT NULL
                LIMIT 1
            """) as cursor:
                row = await cursor.fetchone()
                if row:
                    return row[0]
        return None

    # ========== Package Template Operations ==========

    async def create_package_template(
        self,
        name: str,
        description: Optional[str] = None,
        default_project_key: Optional[str] = None,
        parent_issue_type: str = "Task",
        child_issue_type: str = "Sub-task"
    ) -> int:
        """Create a new package template. Returns template_id."""
        await self.initialize()

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("""
                INSERT INTO package_templates (name, description, default_project_key, parent_issue_type, child_issue_type)
                VALUES (?, ?, ?, ?, ?)
            """, (name, description, default_project_key, parent_issue_type, child_issue_type))
            await db.commit()
            return cursor.lastrowid

    async def get_package_template(self, template_id: int) -> Optional[dict]:
        """Get a package template with its elements."""
        await self.initialize()

        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT id, name, description, default_project_key, parent_issue_type, child_issue_type,
                       created_at, updated_at
                FROM package_templates WHERE id = ?
            """, (template_id,)) as cursor:
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

            # Get associated instances
            async with db.execute("""
                SELECT ji.id, ji.name, ji.url
                FROM package_template_instances pti
                JOIN jira_instances ji ON ji.id = pti.instance_id
                WHERE pti.template_id = ?
                ORDER BY ji.name
            """, (template_id,)) as cursor:
                async for irow in cursor:
                    template["instances"].append({
                        "id": irow[0],
                        "name": irow[1],
                        "url": irow[2]
                    })

        return template

    async def get_all_package_templates(self) -> list[dict]:
        """Get all package templates with their elements."""
        await self.initialize()

        templates = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT id, name, description, default_project_key, parent_issue_type, child_issue_type,
                       created_at, updated_at
                FROM package_templates
                ORDER BY name
            """) as cursor:
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

                # Fetch instances for all templates
                async with db.execute(f"""
                    SELECT pti.template_id, ji.id, ji.name, ji.url
                    FROM package_template_instances pti
                    JOIN jira_instances ji ON ji.id = pti.instance_id
                    WHERE pti.template_id IN ({placeholders})
                    ORDER BY ji.name
                """, template_ids) as cursor:
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

    async def update_package_template(self, template_id: int, **kwargs) -> bool:
        """Update package template fields. Returns True if updated."""
        await self.initialize()

        allowed_fields = {"name", "description", "default_project_key", "parent_issue_type", "child_issue_type"}
        updates = []
        values = []

        for field, value in kwargs.items():
            if field in allowed_fields and value is not None:
                updates.append(f"{field} = ?")
                values.append(value)

        if not updates:
            return False

        values.append(template_id)
        set_clause = ", ".join(updates)

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                f"UPDATE package_templates SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                values
            )
            await db.commit()
            return cursor.rowcount > 0

    async def delete_package_template(self, template_id: int) -> bool:
        """Delete a package template. Returns True if deleted."""
        await self.initialize()

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                "DELETE FROM package_templates WHERE id = ?",
                (template_id,)
            )
            await db.commit()
            return cursor.rowcount > 0

    async def set_template_elements(self, template_id: int, elements: list[str]) -> bool:
        """Set the elements of a package template (replaces existing)."""
        await self.initialize()

        async with aiosqlite.connect(self.db_path) as db:
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

    async def set_template_instances(self, template_id: int, instance_ids: list[int]) -> bool:
        """Set the JIRA instances associated with a template (replaces existing)."""
        await self.initialize()

        async with aiosqlite.connect(self.db_path) as db:
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

    async def get_template_instances(self, template_id: int) -> list[dict]:
        """Get JIRA instances associated with a template."""
        await self.initialize()

        instances = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT ji.id, ji.name, ji.url
                FROM package_template_instances pti
                JOIN jira_instances ji ON ji.id = pti.instance_id
                WHERE pti.template_id = ?
                ORDER BY ji.name
            """, (template_id,)) as cursor:
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

    async def get_complementary_instances_for(self, instance_name: str) -> list[str]:
        """Given an instance name, return the other instances in its complementary group(s)."""
        await self.initialize()

        other_names = []
        async with aiosqlite.connect(self.db_path) as db:
            # Find groups this instance belongs to
            async with db.execute("""
                SELECT cgm.group_id
                FROM complementary_group_members cgm
                JOIN jira_instances ji ON ji.id = cgm.instance_id
                WHERE ji.name = ?
            """, (instance_name,)) as cursor:
                group_ids = [row[0] async for row in cursor]

            if not group_ids:
                return []

            # Find all other instances in those groups
            placeholders = ",".join("?" * len(group_ids))
            async with db.execute(f"""
                SELECT DISTINCT ji.name
                FROM complementary_group_members cgm
                JOIN jira_instances ji ON ji.id = cgm.instance_id
                WHERE cgm.group_id IN ({placeholders})
                AND ji.name != ?
                ORDER BY ji.name
            """, (*group_ids, instance_name)) as cursor:
                async for row in cursor:
                    other_names.append(row[0])
        return other_names

    # ========== Billing Client Operations ==========

    async def create_billing_client(self, name: str, billing_currency: str = "EUR", default_hourly_rate: Optional[float] = None, jira_instance_id: Optional[int] = None) -> int:
        """Create a billing client. Returns client_id."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                "INSERT INTO billing_clients (name, billing_currency, default_hourly_rate, jira_instance_id) VALUES (?, ?, ?, ?)",
                (name, billing_currency, default_hourly_rate, jira_instance_id)
            )
            await db.commit()
            return cursor.lastrowid

    async def get_billing_client(self, client_id: int) -> Optional[dict]:
        """Get a billing client by ID."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                "SELECT id, name, billing_currency, default_hourly_rate, jira_instance_id, created_at, updated_at FROM billing_clients WHERE id = ?",
                (client_id,)
            ) as cursor:
                row = await cursor.fetchone()
                if row:
                    return {"id": row[0], "name": row[1], "billing_currency": row[2], "default_hourly_rate": row[3], "jira_instance_id": row[4], "created_at": row[5], "updated_at": row[6]}
        return None

    async def get_all_billing_clients(self) -> list[dict]:
        """Get all billing clients."""
        await self.initialize()
        clients = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                "SELECT id, name, billing_currency, default_hourly_rate, jira_instance_id, created_at, updated_at FROM billing_clients ORDER BY name"
            ) as cursor:
                async for row in cursor:
                    clients.append({"id": row[0], "name": row[1], "billing_currency": row[2], "default_hourly_rate": row[3], "jira_instance_id": row[4], "created_at": row[5], "updated_at": row[6]})
        return clients

    async def update_billing_client(self, client_id: int, **kwargs) -> bool:
        """Update billing client fields."""
        await self.initialize()
        allowed = {"name", "billing_currency", "default_hourly_rate", "jira_instance_id"}
        updates = {k: v for k, v in kwargs.items() if k in allowed}
        if not updates:
            return False
        set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
        values = list(updates.values()) + [client_id]
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                f"UPDATE billing_clients SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?", values
            )
            await db.commit()
            return cursor.rowcount > 0

    async def delete_billing_client(self, client_id: int) -> bool:
        """Delete a billing client (cascades to projects, mappings, rates)."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("DELETE FROM billing_clients WHERE id = ?", (client_id,))
            await db.commit()
            return cursor.rowcount > 0

    # ========== Billing Project Operations ==========

    async def create_billing_project(self, client_id: int, name: str, default_hourly_rate: Optional[float] = None) -> int:
        """Create a billing project. Returns project_id."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                "INSERT INTO billing_projects (client_id, name, default_hourly_rate) VALUES (?, ?, ?)",
                (client_id, name, default_hourly_rate)
            )
            await db.commit()
            return cursor.lastrowid

    async def get_billing_project(self, project_id: int) -> Optional[dict]:
        """Get a billing project by ID with mappings."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                "SELECT id, client_id, name, default_hourly_rate, created_at, updated_at FROM billing_projects WHERE id = ?",
                (project_id,)
            ) as cursor:
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

    async def get_billing_projects_by_client(self, client_id: int) -> list[dict]:
        """Get all billing projects for a client with mappings."""
        await self.initialize()
        projects = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                "SELECT id, client_id, name, default_hourly_rate, created_at, updated_at FROM billing_projects WHERE client_id = ? ORDER BY name",
                (client_id,)
            ) as cursor:
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

    async def get_all_billing_projects(self) -> list[dict]:
        """Get all billing projects with mappings and client info."""
        await self.initialize()
        projects = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT bp.id, bp.client_id, bp.name, bp.default_hourly_rate, bp.created_at, bp.updated_at,
                       bc.name as client_name
                FROM billing_projects bp
                JOIN billing_clients bc ON bc.id = bp.client_id
                ORDER BY bc.name, bp.name
            """) as cursor:
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

    async def update_billing_project(self, project_id: int, **kwargs) -> bool:
        """Update billing project fields."""
        await self.initialize()
        allowed = {"name", "default_hourly_rate"}
        updates = {k: v for k, v in kwargs.items() if k in allowed}
        if not updates:
            return False
        set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
        values = list(updates.values()) + [project_id]
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                f"UPDATE billing_projects SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?", values
            )
            await db.commit()
            return cursor.rowcount > 0

    async def delete_billing_project(self, project_id: int) -> bool:
        """Delete a billing project (cascades to mappings, rates)."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("DELETE FROM billing_projects WHERE id = ?", (project_id,))
            await db.commit()
            return cursor.rowcount > 0

    # ========== Billing Project Mapping Operations ==========

    async def add_billing_project_mapping(self, billing_project_id: int, jira_instance: str, jira_project_key: str) -> int:
        """Add a JIRA project mapping to a billing project. Returns mapping_id."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                "INSERT INTO billing_project_mappings (billing_project_id, jira_instance, jira_project_key) VALUES (?, ?, ?)",
                (billing_project_id, jira_instance, jira_project_key)
            )
            await db.commit()
            return cursor.lastrowid

    async def delete_billing_project_mapping(self, mapping_id: int) -> bool:
        """Delete a billing project mapping."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("DELETE FROM billing_project_mappings WHERE id = ?", (mapping_id,))
            await db.commit()
            return cursor.rowcount > 0

    async def get_billing_project_for_worklog(self, jira_instance: str, issue_key: str) -> Optional[dict]:
        """Find the billing project that maps to a given JIRA issue (by project key prefix)."""
        await self.initialize()
        project_key = issue_key.split("-")[0] if "-" in issue_key else issue_key
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT bp.id, bp.client_id, bp.name, bp.default_hourly_rate
                FROM billing_project_mappings bpm
                JOIN billing_projects bp ON bp.id = bpm.billing_project_id
                WHERE bpm.jira_instance = ? AND bpm.jira_project_key = ?
            """, (jira_instance, project_key)) as cursor:
                row = await cursor.fetchone()
                if row:
                    return {"id": row[0], "client_id": row[1], "name": row[2], "default_hourly_rate": row[3]}
        return None

    # ========== Billing Rate Operations ==========

    async def create_billing_rate(self, billing_project_id: int, hourly_rate: float, user_email: Optional[str] = None, issue_type: Optional[str] = None, valid_from: Optional[str] = None, valid_to: Optional[str] = None) -> int:
        """Create a billing rate override. Returns rate_id."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                "INSERT INTO billing_rates (billing_project_id, user_email, issue_type, hourly_rate, valid_from, valid_to) VALUES (?, ?, ?, ?, ?, ?)",
                (billing_project_id, user_email, issue_type, hourly_rate, valid_from, valid_to)
            )
            await db.commit()
            return cursor.lastrowid

    async def get_billing_rates(self, billing_project_id: int) -> list[dict]:
        """Get all billing rates for a project."""
        await self.initialize()
        rates = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                "SELECT id, billing_project_id, user_email, issue_type, hourly_rate, valid_from, valid_to, created_at FROM billing_rates WHERE billing_project_id = ? ORDER BY created_at DESC",
                (billing_project_id,)
            ) as cursor:
                async for row in cursor:
                    rates.append({"id": row[0], "billing_project_id": row[1], "user_email": row[2], "issue_type": row[3], "hourly_rate": row[4], "valid_from": row[5], "valid_to": row[6], "created_at": row[7]})
        return rates

    async def delete_billing_rate(self, rate_id: int) -> bool:
        """Delete a billing rate."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("DELETE FROM billing_rates WHERE id = ?", (rate_id,))
            await db.commit()
            return cursor.rowcount > 0

    # ========== Billing Classification Operations ==========

    async def set_worklog_classification(self, worklog_id: str, is_billable: bool, override_hourly_rate: Optional[float] = None, note: Optional[str] = None, classified_by: Optional[str] = None) -> int:
        """Set or update worklog billing classification. Returns classification_id."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("""
                INSERT INTO billing_worklog_classifications (worklog_id, is_billable, override_hourly_rate, note, classified_by)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(worklog_id)
                DO UPDATE SET is_billable = ?, override_hourly_rate = ?, note = ?, classified_by = ?, classified_at = CURRENT_TIMESTAMP
            """, (worklog_id, int(is_billable), override_hourly_rate, note, classified_by,
                  int(is_billable), override_hourly_rate, note, classified_by))
            await db.commit()
            return cursor.lastrowid

    async def get_worklog_classifications(self, worklog_ids: list[str]) -> dict[str, dict]:
        """Get classifications for a list of worklog IDs. Returns {worklog_id: classification_dict}."""
        await self.initialize()
        if not worklog_ids:
            return {}
        result = {}
        async with aiosqlite.connect(self.db_path) as db:
            placeholders = ",".join("?" * len(worklog_ids))
            async with db.execute(f"""
                SELECT id, worklog_id, is_billable, override_hourly_rate, note, classified_by, classified_at
                FROM billing_worklog_classifications WHERE worklog_id IN ({placeholders})
            """, worklog_ids) as cursor:
                async for row in cursor:
                    result[row[1]] = {"id": row[0], "worklog_id": row[1], "is_billable": bool(row[2]), "override_hourly_rate": row[3], "note": row[4], "classified_by": row[5], "classified_at": row[6]}
        return result

    # ========== Invoice Operations ==========

    async def create_invoice(self, client_id: int, period_start: str, period_end: str, currency: str = "EUR", billing_project_id: Optional[int] = None, subtotal_amount: float = 0, taxes_amount: float = 0, total_amount: float = 0, group_by: str = "project", notes: Optional[str] = None, created_by: Optional[str] = None) -> int:
        """Create an invoice. Returns invoice_id."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("""
                INSERT INTO invoices (client_id, billing_project_id, period_start, period_end, status, currency, subtotal_amount, taxes_amount, total_amount, group_by, notes, created_by)
                VALUES (?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?, ?, ?, ?)
            """, (client_id, billing_project_id, period_start, period_end, currency, subtotal_amount, taxes_amount, total_amount, group_by, notes, created_by))
            await db.commit()
            return cursor.lastrowid

    async def add_invoice_line_item(self, invoice_id: int, line_type: str, description: str, quantity_hours: float, hourly_rate: float, amount: float, metadata_json: Optional[str] = None, sort_order: int = 0) -> int:
        """Add a line item to an invoice. Returns line_item_id."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("""
                INSERT INTO invoice_line_items (invoice_id, line_type, description, quantity_hours, hourly_rate, amount, metadata_json, sort_order)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (invoice_id, line_type, description, quantity_hours, hourly_rate, amount, metadata_json, sort_order))
            await db.commit()
            return cursor.lastrowid

    async def get_invoice(self, invoice_id: int) -> Optional[dict]:
        """Get an invoice by ID with line items."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT i.id, i.client_id, i.billing_project_id, i.period_start, i.period_end,
                       i.status, i.currency, i.subtotal_amount, i.taxes_amount, i.total_amount,
                       i.group_by, i.notes, i.created_by, i.created_at, i.issued_at,
                       bc.name as client_name, bp.name as project_name
                FROM invoices i
                JOIN billing_clients bc ON bc.id = i.client_id
                LEFT JOIN billing_projects bp ON bp.id = i.billing_project_id
                WHERE i.id = ?
            """, (invoice_id,)) as cursor:
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

    async def get_invoices(self, client_id: Optional[int] = None, status: Optional[str] = None) -> list[dict]:
        """Get invoices with optional filters."""
        await self.initialize()
        conditions = []
        params = []
        if client_id:
            conditions.append("i.client_id = ?")
            params.append(client_id)
        if status:
            conditions.append("i.status = ?")
            params.append(status)
        where_clause = " AND ".join(conditions) if conditions else "1=1"

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

    async def update_invoice_status(self, invoice_id: int, status: str) -> bool:
        """Update invoice status. Sets issued_at when status is ISSUED."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            if status == "ISSUED":
                cursor = await db.execute(
                    "UPDATE invoices SET status = ?, issued_at = CURRENT_TIMESTAMP WHERE id = ?",
                    (status, invoice_id)
                )
            else:
                cursor = await db.execute(
                    "UPDATE invoices SET status = ? WHERE id = ?",
                    (status, invoice_id)
                )
            await db.commit()
            return cursor.rowcount > 0

    async def delete_invoice(self, invoice_id: int) -> bool:
        """Delete a draft invoice (cascades to line items)."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                "DELETE FROM invoices WHERE id = ? AND status = 'DRAFT'",
                (invoice_id,)
            )
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

    async def get_holidays_for_year(self, year: int, country: str = "IT") -> list[dict]:
        """Get all holidays for a given year and country."""
        await self.initialize()
        start = f"{year}-01-01"
        end = f"{year}-12-31"
        holidays = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT id, name, holiday_date, holiday_type, month, day,
                       country, is_active, created_at, updated_at
                FROM holidays
                WHERE holiday_date >= ? AND holiday_date <= ? AND country = ?
                ORDER BY holiday_date
            """, (start, end, country)) as cursor:
                async for row in cursor:
                    holidays.append({
                        "id": row[0], "name": row[1], "holiday_date": row[2],
                        "holiday_type": row[3], "month": row[4], "day": row[5],
                        "country": row[6], "is_active": bool(row[7]),
                        "created_at": row[8], "updated_at": row[9]
                    })
        return holidays

    async def get_active_holiday_dates(self, start_date: str, end_date: str, country: str = "IT") -> set[str]:
        """Get set of active holiday date strings (ISO format) in a date range.
        Auto-seeds holidays for years in range if none exist."""
        await self.initialize()

        # Auto-seed holidays for each year in the range
        start_year = int(start_date[:4])
        end_year = int(end_date[:4])
        for y in range(start_year, end_year + 1):
            existing = await self.get_holidays_for_year(y, country)
            if not existing:
                await self.seed_holidays_for_year(y, country)

        dates = set()
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT holiday_date FROM holidays
                WHERE holiday_date >= ? AND holiday_date <= ?
                AND country = ? AND is_active = 1
            """, (start_date, end_date, country)) as cursor:
                async for row in cursor:
                    dates.add(row[0])
        return dates

    async def seed_holidays_for_year(self, year: int, country: str = "IT") -> int:
        """Seed default holidays for a year. Skips existing dates. Returns count inserted."""
        await self.initialize()
        from .holidays import generate_holidays_for_year
        holidays = generate_holidays_for_year(year, country)
        inserted = 0
        async with aiosqlite.connect(self.db_path) as db:
            for h in holidays:
                try:
                    await db.execute("""
                        INSERT INTO holidays (name, holiday_date, holiday_type, month, day, country, is_active)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (h["name"], h["holiday_date"], h["holiday_type"],
                          h["month"], h["day"], h["country"], h["is_active"]))
                    inserted += 1
                except Exception:
                    pass  # UNIQUE constraint - already exists
            await db.commit()
        return inserted

    async def create_holiday(self, name: str, holiday_date: str, country: str = "IT") -> int:
        """Create a custom holiday. Returns holiday_id."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("""
                INSERT INTO holidays (name, holiday_date, holiday_type, country, is_active)
                VALUES (?, ?, 'custom', ?, 1)
            """, (name, holiday_date, country))
            await db.commit()
            return cursor.lastrowid

    async def update_holiday(self, holiday_id: int, **kwargs) -> bool:
        """Update holiday fields (name, is_active)."""
        await self.initialize()
        allowed = {"name", "is_active"}
        updates = {k: v for k, v in kwargs.items() if k in allowed}
        if not updates:
            return False
        set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
        values = list(updates.values()) + [holiday_id]
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                f"UPDATE holidays SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                values
            )
            await db.commit()
            return cursor.rowcount > 0

    async def delete_holiday(self, holiday_id: int) -> bool:
        """Delete a holiday."""
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("DELETE FROM holidays WHERE id = ?", (holiday_id,))
            await db.commit()
            return cursor.rowcount > 0


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
