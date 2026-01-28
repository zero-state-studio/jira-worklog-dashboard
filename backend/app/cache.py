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
                        is_active INTEGER DEFAULT 1,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)

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
        tempo_api_token: Optional[str] = None
    ) -> int:
        """Create a new JIRA instance. Returns instance_id."""
        await self.initialize()

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("""
                INSERT INTO jira_instances (name, url, email, api_token, tempo_api_token)
                VALUES (?, ?, ?, ?, ?)
            """, (name, url, email, api_token, tempo_api_token))
            await db.commit()
            return cursor.lastrowid

    async def get_jira_instance(self, instance_id: int) -> Optional[dict]:
        """Get a JIRA instance by ID."""
        await self.initialize()

        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT id, name, url, email, api_token, tempo_api_token, is_active,
                       created_at, updated_at
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
                        "is_active": bool(row[6]),
                        "created_at": row[7],
                        "updated_at": row[8]
                    }
        return None

    async def get_jira_instance_by_name(self, name: str) -> Optional[dict]:
        """Get a JIRA instance by name."""
        await self.initialize()

        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT id, name, url, email, api_token, tempo_api_token, is_active,
                       created_at, updated_at
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
                        "is_active": bool(row[6]),
                        "created_at": row[7],
                        "updated_at": row[8]
                    }
        return None

    async def get_all_jira_instances(self, include_credentials: bool = False) -> list[dict]:
        """Get all JIRA instances. Optionally include credentials."""
        await self.initialize()

        instances = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT id, name, url, email, api_token, tempo_api_token, is_active,
                       created_at, updated_at
                FROM jira_instances
                ORDER BY name
            """) as cursor:
                async for row in cursor:
                    instance = {
                        "id": row[0],
                        "name": row[1],
                        "url": row[2],
                        "is_active": bool(row[6]),
                        "created_at": row[7],
                        "updated_at": row[8]
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

        allowed_fields = {"name", "url", "email", "api_token", "tempo_api_token", "is_active"}
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

    # ========== Utility Operations ==========

    async def clear_all(self):
        """Clear all stored data."""
        await self.initialize()
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("DELETE FROM worklogs")
            await db.execute("DELETE FROM epics")
            await db.execute("DELETE FROM sync_history")
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
