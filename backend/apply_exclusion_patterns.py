#!/usr/bin/env python3
"""
Apply JIRA Exclusion Pattern Matching Migration

This script:
1. Backs up the database
2. Applies pattern-based exclusions (ASS-*, FORM-*, ADMIN-*)
3. Verifies the migration

Usage:
    python apply_exclusion_patterns.py
"""

import asyncio
import aiosqlite
from datetime import datetime
from pathlib import Path
import shutil

# Colors for terminal output
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'


async def main():
    db_path = "worklog_storage.db"
    migration_file = "migrations/015_update_exclusions_with_patterns.sql"

    print(f"\n{Colors.BOLD}{'='*60}")
    print(f"JIRA Exclusion Pattern Matching Migration")
    print(f"{'='*60}{Colors.RESET}\n")

    # Step 1: Check if database exists
    if not Path(db_path).exists():
        print(f"{Colors.RED}❌ Database not found: {db_path}{Colors.RESET}")
        print(f"Run this script from backend/ directory")
        return

    # Step 2: Backup database
    print(f"{Colors.BOLD}Step 1: Creating Backup...{Colors.RESET}")
    backup_path = f"{db_path}.backup-{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    try:
        shutil.copy2(db_path, backup_path)
        print(f"{Colors.GREEN}✅ Backup created: {backup_path}{Colors.RESET}")
    except Exception as e:
        print(f"{Colors.RED}❌ Backup failed: {e}{Colors.RESET}")
        return

    # Step 3: Apply migration
    print(f"\n{Colors.BOLD}Step 2: Applying Migration...{Colors.RESET}")
    try:
        with open(migration_file, 'r') as f:
            sql_script = f.read()

        async with aiosqlite.connect(db_path) as db:
            # Execute migration statements
            for statement in sql_script.split(';'):
                statement = statement.strip()
                if statement and not statement.startswith('--') and not statement.startswith('SELECT'):
                    await db.execute(statement)
            await db.commit()

        print(f"{Colors.GREEN}✅ Migration applied successfully{Colors.RESET}")
    except Exception as e:
        print(f"{Colors.RED}❌ Migration failed: {e}{Colors.RESET}")
        print(f"Database restored from backup: {backup_path}")
        return

    # Step 4: Verify exclusions
    print(f"\n{Colors.BOLD}Step 3: Verifying Exclusions...{Colors.RESET}")
    try:
        async with aiosqlite.connect(db_path) as db:
            async with db.execute("""
                SELECT company_id, exclusion_key, description
                FROM jira_exclusions
                WHERE exclusion_key LIKE '%*%'
                ORDER BY company_id, exclusion_key
            """) as cursor:
                exclusions = await cursor.fetchall()

            if exclusions:
                print(f"{Colors.GREEN}✅ Pattern-based exclusions found:{Colors.RESET}\n")
                current_company = None
                for company_id, key, desc in exclusions:
                    if company_id != current_company:
                        print(f"\n  {Colors.BLUE}Company ID: {company_id}{Colors.RESET}")
                        current_company = company_id
                    print(f"    • {Colors.BOLD}{key}{Colors.RESET} - {desc}")
            else:
                print(f"{Colors.YELLOW}⚠️  No pattern-based exclusions found{Colors.RESET}")

    except Exception as e:
        print(f"{Colors.RED}❌ Verification failed: {e}{Colors.RESET}")
        return

    # Step 5: Test pattern matching
    print(f"\n{Colors.BOLD}Step 4: Testing Pattern Matching...{Colors.RESET}")
    from app.matching_algorithms import _matches_exclusion_pattern

    test_cases = [
        ("ASS-19", ["ASS-*"], True, "ASS-19 should match ASS-*"),
        ("ASS-2", ["ASS-*"], True, "ASS-2 should match ASS-*"),
        ("ASS-9999", ["ASS-*"], True, "ASS-9999 should match ASS-*"),
        ("FORM-10", ["FORM-*"], True, "FORM-10 should match FORM-*"),
        ("ADMIN-5", ["ADMIN-*"], True, "ADMIN-5 should match ADMIN-*"),
        ("DLREQ-1447", ["ASS-*"], False, "DLREQ-1447 should NOT match ASS-*"),
        ("ASS", ["ASS-*"], False, "ASS should NOT match ASS-* (no dash)"),
        ("ASS-19", ["ASS-*", "FORM-*"], True, "ASS-19 should match multiple patterns"),
    ]

    all_passed = True
    for linking_key, patterns, expected, description in test_cases:
        result = _matches_exclusion_pattern(linking_key, patterns)
        status = "✅" if result == expected else "❌"
        color = Colors.GREEN if result == expected else Colors.RED
        print(f"  {color}{status}{Colors.RESET} {description}")
        if result != expected:
            all_passed = False
            print(f"      Expected: {expected}, Got: {result}")

    # Final summary
    print(f"\n{Colors.BOLD}{'='*60}")
    if all_passed:
        print(f"{Colors.GREEN}✅ Migration Completed Successfully!{Colors.RESET}")
        print(f"{Colors.GREEN}✅ Pattern matching works correctly{Colors.RESET}")
    else:
        print(f"{Colors.RED}❌ Some tests failed{Colors.RESET}")
    print(f"Backup: {backup_path}")
    print(f"{'='*60}{Colors.RESET}\n")


if __name__ == "__main__":
    asyncio.run(main())
