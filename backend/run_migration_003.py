#!/usr/bin/env python3
"""
Migration 003: Add company_id to complementary_group_members

This script safely applies migration 003 with automatic backup and rollback.

Usage:
    python run_migration_003.py [--db-path /path/to/worklog.db]

Safety features:
- Creates automatic backup before migration
- Validates data integrity after migration
- Automatic rollback on failure
- Detailed logging
"""

import asyncio
import aiosqlite
import argparse
import shutil
from datetime import datetime
from pathlib import Path


async def run_migration(db_path: str, dry_run: bool = False):
    """Run migration 003 with safety checks."""

    print("=" * 80)
    print("MIGRATION 003: Add company_id to complementary_group_members")
    print("=" * 80)
    print()

    # Convert to Path object
    db_path = Path(db_path)

    # Check database exists
    if not db_path.exists():
        print(f"❌ ERROR: Database not found at {db_path}")
        return False

    # Create backup
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_path = db_path.parent / f"{db_path.stem}.backup-{timestamp}{db_path.suffix}"

    print(f"📦 Creating backup: {backup_path}")
    shutil.copy2(db_path, backup_path)
    print("✅ Backup created successfully")
    print()

    if dry_run:
        print("🔍 DRY RUN MODE - No changes will be made")
        print()
        return True

    try:
        async with aiosqlite.connect(db_path) as db:
            # Pre-migration checks
            print("🔍 Pre-migration checks...")

            # Check if migration already applied
            cursor = await db.execute("PRAGMA table_info(complementary_group_members)")
            columns = await cursor.fetchall()
            column_names = [col[1] for col in columns]

            if "company_id" in column_names:
                print("⚠️  Migration already applied (company_id column exists)")
                print("   Skipping migration")
                return True

            # Count existing records
            cursor = await db.execute("SELECT COUNT(*) FROM complementary_group_members")
            count_before = (await cursor.fetchone())[0]
            print(f"   Found {count_before} complementary_group_members records")

            # Step 1: Add company_id column (nullable)
            print()
            print("📝 Step 1/5: Adding company_id column...")
            await db.execute("ALTER TABLE complementary_group_members ADD COLUMN company_id INTEGER")
            await db.commit()
            print("✅ Column added")

            # Step 2: Populate company_id from parent table
            print()
            print("📝 Step 2/5: Populating company_id from complementary_groups...")
            await db.execute("""
                UPDATE complementary_group_members
                SET company_id = (
                    SELECT cg.company_id
                    FROM complementary_groups cg
                    WHERE cg.id = complementary_group_members.group_id
                )
            """)
            await db.commit()

            # Verify all rows populated
            cursor = await db.execute(
                "SELECT COUNT(*) FROM complementary_group_members WHERE company_id IS NULL"
            )
            null_count = (await cursor.fetchone())[0]

            if null_count > 0:
                raise Exception(f"Failed to populate company_id: {null_count} rows still NULL")

            print(f"✅ Populated {count_before} rows")

            # Step 3: Create new table with NOT NULL constraint
            print()
            print("📝 Step 3/5: Recreating table with NOT NULL constraint...")
            await db.execute("""
                CREATE TABLE complementary_group_members_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    company_id INTEGER NOT NULL,
                    group_id INTEGER NOT NULL,
                    instance_id INTEGER NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
                    FOREIGN KEY (group_id) REFERENCES complementary_groups(id) ON DELETE CASCADE,
                    FOREIGN KEY (instance_id) REFERENCES jira_instances(id) ON DELETE CASCADE
                )
            """)

            # Copy data
            await db.execute("""
                INSERT INTO complementary_group_members_new (id, company_id, group_id, instance_id, created_at)
                SELECT id, company_id, group_id, instance_id, created_at
                FROM complementary_group_members
            """)

            # Drop old table
            await db.execute("DROP TABLE complementary_group_members")

            # Rename new table
            await db.execute("ALTER TABLE complementary_group_members_new RENAME TO complementary_group_members")

            await db.commit()
            print("✅ Table recreated")

            # Step 4: Create indexes
            print()
            print("📝 Step 4/5: Creating indexes...")
            await db.execute(
                "CREATE INDEX idx_complementary_members_company ON complementary_group_members(company_id)"
            )
            await db.execute(
                "CREATE INDEX idx_complementary_members_group ON complementary_group_members(group_id)"
            )
            await db.execute(
                "CREATE INDEX idx_complementary_members_instance ON complementary_group_members(instance_id)"
            )
            await db.execute(
                "CREATE UNIQUE INDEX idx_complementary_members_unique ON complementary_group_members(group_id, instance_id)"
            )
            await db.commit()
            print("✅ Indexes created")

            # Step 5: Validation
            print()
            print("📝 Step 5/5: Validating data integrity...")

            # Count after migration
            cursor = await db.execute("SELECT COUNT(*) FROM complementary_group_members")
            count_after = (await cursor.fetchone())[0]

            if count_before != count_after:
                raise Exception(f"Data loss detected: {count_before} rows before, {count_after} rows after")

            print(f"✅ Row count matches: {count_after} rows")

            # Validate company_id matches parent group
            cursor = await db.execute("""
                SELECT COUNT(*) FROM complementary_group_members cgm
                JOIN complementary_groups cg ON cg.id = cgm.group_id
                WHERE cgm.company_id != cg.company_id
            """)
            mismatch_count = (await cursor.fetchone())[0]

            if mismatch_count > 0:
                raise Exception(f"Data integrity error: {mismatch_count} rows have mismatched company_id")

            print("✅ company_id integrity validated")

            # Verify no NULL company_id
            cursor = await db.execute("SELECT COUNT(*) FROM complementary_group_members WHERE company_id IS NULL")
            null_final = (await cursor.fetchone())[0]

            if null_final > 0:
                raise Exception(f"Constraint violation: {null_final} rows with NULL company_id")

            print("✅ No NULL company_id values")

        print()
        print("=" * 80)
        print("✅ MIGRATION 003 COMPLETED SUCCESSFULLY")
        print("=" * 80)
        print()
        print(f"📦 Backup saved at: {backup_path}")
        print(f"📊 Migrated {count_after} complementary_group_members records")
        print()

        return True

    except Exception as e:
        print()
        print("=" * 80)
        print("❌ MIGRATION FAILED - ROLLING BACK")
        print("=" * 80)
        print(f"Error: {e}")
        print()

        # Rollback: restore backup
        print(f"🔄 Restoring backup from: {backup_path}")
        shutil.copy2(backup_path, db_path)
        print("✅ Database restored to pre-migration state")
        print()

        return False


async def main():
    parser = argparse.ArgumentParser(description="Run migration 003")
    parser.add_argument(
        "--db-path",
        default="worklog.db",
        help="Path to database file (default: worklog.db)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Create backup but don't apply migration"
    )

    args = parser.parse_args()

    success = await run_migration(args.db_path, args.dry_run)

    if not success:
        exit(1)


if __name__ == "__main__":
    asyncio.run(main())
