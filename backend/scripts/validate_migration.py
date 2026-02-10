#!/usr/bin/env python3
"""
Pre-Migration Validation Script - Phase 1
Verify database is ready for migration and capture baseline metrics

Usage:
    python validate_migration.py --db worklog.db --report
"""

import asyncio
import argparse
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List
import aiosqlite
import sys


class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'


class MigrationValidator:
    """Validate database readiness for Phase 1 migration"""

    def __init__(self, db_path: str):
        self.db_path = db_path
        self.validation_report = {}

    async def check_database_connectivity(self) -> bool:
        """Verify database is accessible"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                async with db.execute("SELECT 1") as cursor:
                    await cursor.fetchone()
            print(f"{Colors.GREEN}✅ Database connectivity OK{Colors.RESET}")
            return True
        except Exception as e:
            print(f"{Colors.RED}❌ Database connectivity failed: {e}{Colors.RESET}")
            return False

    async def check_tables_exist(self) -> Dict[str, bool]:
        """Verify all required tables exist"""
        required_tables = [
            'worklogs', 'epics', 'teams', 'users', 'billing_rates',
            'factorial_leaves', 'invoices'
        ]

        results = {}
        async with aiosqlite.connect(self.db_path) as db:
            for table in required_tables:
                try:
                    async with db.execute(
                        f"SELECT COUNT(*) FROM {table}"
                    ) as cursor:
                        row = await cursor.fetchone()
                        results[table] = row[0] if row else 0
                except:
                    results[table] = -1

        print(f"\n{Colors.BOLD}Table Checks:{Colors.RESET}")
        for table, count in results.items():
            if count >= 0:
                print(f"  {Colors.GREEN}✅{Colors.RESET} {table}: {count:,} rows")
            else:
                print(f"  {Colors.RED}❌{Colors.RESET} {table}: NOT FOUND")

        return results

    async def check_indexes_before_migration(self) -> Dict[str, bool]:
        """Check which target indexes already exist (shouldn't)"""
        target_indexes = [
            'idx_worklogs_user_range',
            'idx_worklogs_instance_range',
            'idx_billing_rates_lookup',
            'idx_factorial_leaves_company_status'
        ]

        results = {}
        async with aiosqlite.connect(self.db_path) as db:
            for index in target_indexes:
                async with db.execute("""
                    SELECT name FROM sqlite_master
                    WHERE type='index' AND name=?
                """, (index,)) as cursor:
                    exists = await cursor.fetchone() is not None
                    results[index] = exists

        print(f"\n{Colors.BOLD}Target Indexes (Pre-Migration):{Colors.RESET}")
        for index, exists in results.items():
            if exists:
                print(f"  {Colors.YELLOW}⚠️ {Colors.RESET} {index}: ALREADY EXISTS")
            else:
                print(f"  {Colors.BLUE}→{Colors.RESET} {index}: Will be created")

        return results

    async def verify_data_integrity(self) -> bool:
        """Run SQLite integrity checks"""
        print(f"\n{Colors.BOLD}Data Integrity Checks:{Colors.RESET}")

        async with aiosqlite.connect(self.db_path) as db:
            # Check 1: PRAGMA integrity_check
            async with db.execute("PRAGMA integrity_check") as cursor:
                result = await cursor.fetchone()
                if result[0] == 'ok':
                    print(f"  {Colors.GREEN}✅{Colors.RESET} PRAGMA integrity_check: OK")
                else:
                    print(f"  {Colors.RED}❌{Colors.RESET} PRAGMA integrity_check: {result[0]}")
                    return False

            # Check 2: Foreign key constraints
            async with db.execute("PRAGMA foreign_key_check") as cursor:
                violations = await cursor.fetchall()
                if not violations:
                    print(f"  {Colors.GREEN}✅{Colors.RESET} Foreign key constraints: OK")
                else:
                    print(f"  {Colors.RED}❌{Colors.RESET} Foreign key violations: {len(violations)}")
                    return False

            # Check 3: Quick corruption check on worklogs
            try:
                async with db.execute(
                    "SELECT COUNT(*), SUM(time_spent_seconds) FROM worklogs"
                ) as cursor:
                    row = await cursor.fetchone()
                    print(f"  {Colors.GREEN}✅{Colors.RESET} Worklogs count: {row[0]:,}, "
                          f"total hours: {row[1]/3600 if row[1] else 0:.1f}h")
            except Exception as e:
                print(f"  {Colors.RED}❌{Colors.RESET} Worklogs check failed: {e}")
                return False

        return True

    async def check_disk_space(self) -> Dict:
        """Check available disk space for index creation"""
        print(f"\n{Colors.BOLD}Disk Space:{Colors.RESET}")

        # Get database file size
        db_stat = Path(self.db_path).stat()
        db_size_mb = db_stat.st_size / (1024*1024)

        # Estimate index size (typically 10-20% of table size)
        estimated_index_size_mb = db_size_mb * 0.15

        # Get filesystem stats
        import shutil
        usage = shutil.disk_usage(Path(self.db_path).parent)
        free_mb = usage.free / (1024*1024)

        print(f"  Database size: {db_size_mb:.1f} MB")
        print(f"  Estimated index size: {estimated_index_size_mb:.1f} MB")
        print(f"  Free disk space: {free_mb:.1f} MB")

        required_mb = estimated_index_size_mb * 1.5  # Safety margin
        if free_mb > required_mb:
            print(f"  {Colors.GREEN}✅{Colors.RESET} Sufficient disk space available")
            return {"status": "OK", "free_mb": free_mb, "required_mb": required_mb}
        else:
            print(f"  {Colors.RED}❌{Colors.RESET} Insufficient disk space ({free_mb:.1f} MB free, "
                  f"{required_mb:.1f} MB needed)")
            return {"status": "INSUFFICIENT", "free_mb": free_mb, "required_mb": required_mb}

    async def test_sample_queries(self) -> Dict:
        """Test that sample queries run without errors"""
        print(f"\n{Colors.BOLD}Sample Queries (Baseline):{Colors.RESET}")

        queries = {
            "user_worklogs": (
                "SELECT COUNT(*) FROM worklogs WHERE company_id = 1 AND author_email LIKE '%@%' LIMIT 1000",
                "User worklogs count"
            ),
            "sync_instance": (
                "SELECT COUNT(*) FROM worklogs WHERE company_id = 1 AND jira_instance IS NOT NULL LIMIT 1000",
                "Sync instance count"
            ),
            "billing_rates": (
                "SELECT COUNT(*) FROM billing_rates WHERE billing_project_id IS NOT NULL LIMIT 100",
                "Billing rates count"
            ),
            "factorial_leaves": (
                "SELECT COUNT(*) FROM factorial_leaves LIMIT 100",
                "Factorial leaves count"
            )
        }

        results = {}
        async with aiosqlite.connect(self.db_path) as db:
            for query_name, (query, description) in queries.items():
                try:
                    async with db.execute(query) as cursor:
                        row = await cursor.fetchone()
                        count = row[0] if row else 0
                        print(f"  {Colors.GREEN}✅{Colors.RESET} {description}: {count}")
                        results[query_name] = {"status": "OK", "count": count}
                except Exception as e:
                    print(f"  {Colors.RED}❌{Colors.RESET} {description}: {e}")
                    results[query_name] = {"status": "ERROR", "error": str(e)}

        return results

    async def check_migration_script(self, migration_file: str) -> bool:
        """Verify migration SQL script exists and is readable"""
        print(f"\n{Colors.BOLD}Migration Script:{Colors.RESET}")

        if not Path(migration_file).exists():
            print(f"  {Colors.RED}❌{Colors.RESET} Migration file not found: {migration_file}")
            return False

        try:
            with open(migration_file, 'r') as f:
                content = f.read()
                lines = len(content.split('\n'))
                indexes = content.count('CREATE INDEX')

                print(f"  {Colors.GREEN}✅{Colors.RESET} Migration file found")
                print(f"     Lines: {lines}")
                print(f"     CREATE INDEX statements: {indexes}")

                if indexes != 4:
                    print(f"  {Colors.YELLOW}⚠️ {Colors.RESET} Expected 4 indexes, found {indexes}")
                    return False

                return True
        except Exception as e:
            print(f"  {Colors.RED}❌{Colors.RESET} Error reading migration file: {e}")
            return False

    async def generate_report(self, migration_file: str) -> Dict:
        """Generate comprehensive validation report"""
        report = {
            "timestamp": datetime.now().isoformat(),
            "database": self.db_path,
            "migration_file": migration_file,
            "checks": {}
        }

        # Run all checks
        checks = {
            "connectivity": await self.check_database_connectivity(),
            "tables": await self.check_tables_exist(),
            "target_indexes": await self.check_indexes_before_migration(),
            "integrity": await self.verify_data_integrity(),
            "disk_space": await self.check_disk_space(),
            "sample_queries": await self.test_sample_queries(),
            "migration_script": await self.check_migration_script(migration_file)
        }

        # Determine overall status
        all_passed = all([
            checks["connectivity"],
            checks["integrity"],
            checks["migration_script"],
            checks["disk_space"]["status"] == "OK" if isinstance(checks["disk_space"], dict) else True
        ])

        report["checks"] = checks
        report["overall_status"] = "READY" if all_passed else "NOT_READY"

        return report

    async def validate(self, migration_file: str) -> bool:
        """Run full validation"""
        print(f"\n{Colors.BOLD}{'='*60}")
        print(f"Pre-Migration Validation - Phase 1")
        print(f"{'='*60}{Colors.RESET}\n")

        report = await self.generate_report(migration_file)

        # Print summary
        print(f"\n{Colors.BOLD}{'='*60}")
        print(f"Validation Summary")
        print(f"{'='*60}{Colors.RESET}\n")

        if report["overall_status"] == "READY":
            print(f"{Colors.GREEN}✅ Database is READY for Phase 1 migration{Colors.RESET}\n")
            print("Next steps:")
            print("  1. Create backup: cp worklog.db worklog.db.backup-$(date +%Y%m%d_%H%M%S)")
            print("  2. Run migration: python scripts/run_migration.py --db worklog.db --benchmark")
            print("  3. Verify results in PHASE1_DEPLOYMENT.md\n")
        else:
            print(f"{Colors.RED}❌ Database has issues that must be resolved before migration{Colors.RESET}\n")
            print("Issues to fix:")
            for check_name, check_result in report["checks"].items():
                if check_name in ["connectivity", "integrity", "migration_script"]:
                    if not check_result:
                        print(f"  - {check_name}")

        # Save report to file
        report_file = Path(self.db_path).parent / "migration_validation_report.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        print(f"\n📄 Report saved to: {report_file}\n")

        return report["overall_status"] == "READY"


async def main():
    parser = argparse.ArgumentParser(description="Pre-Migration Validation Script")
    parser.add_argument("--db", default="worklog.db", help="Database file path")
    parser.add_argument("--migration", default="backend/migrations/001_add_composite_indexes.sql",
                        help="Migration SQL file")

    args = parser.parse_args()

    validator = MigrationValidator(args.db)
    success = await validator.validate(args.migration)

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())
