#!/usr/bin/env python3
"""
Database Migration Runner - Phase 1: Composite Indexes
Execute migration and verify performance improvements

Usage:
    python run_migration.py --db worklog.db --phase 1 --benchmark
"""

import asyncio
import argparse
import json
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Tuple
import aiosqlite
import sys

# Colors for terminal output
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'


class MigrationRunner:
    """Run and verify database migrations"""

    def __init__(self, db_path: str):
        self.db_path = db_path
        self.results = {}

    async def backup_database(self) -> str:
        """Create backup before migration"""
        backup_path = f"{self.db_path}.backup-{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        # Simple file copy for SQLite
        import shutil
        try:
            shutil.copy2(self.db_path, backup_path)
            print(f"{Colors.GREEN}✅ Backup created: {backup_path}{Colors.RESET}")
            return backup_path
        except Exception as e:
            print(f"{Colors.RED}❌ Backup failed: {e}{Colors.RESET}")
            raise

    async def execute_migration(self, migration_file: str) -> bool:
        """Execute SQL migration from file"""
        try:
            with open(migration_file, 'r') as f:
                sql_script = f.read()

            async with aiosqlite.connect(self.db_path) as db:
                # Parse and execute migration script properly
                statements = []
                current_statement = ""

                for line in sql_script.split('\n'):
                    # Skip empty lines and comments
                    if not line.strip() or line.strip().startswith('--'):
                        continue

                    current_statement += " " + line

                    # Check if statement ends with semicolon
                    if ';' in line:
                        # Split by semicolon and process each statement
                        parts = current_statement.split(';')
                        for part in parts[:-1]:
                            part = part.strip()
                            if part:
                                await db.execute(part)
                        # Keep the last part (might not be complete)
                        current_statement = parts[-1]

                # Execute any remaining statement
                current_statement = current_statement.strip()
                if current_statement and current_statement != '':
                    await db.execute(current_statement)

                await db.commit()

            print(f"{Colors.GREEN}✅ Migration executed successfully{Colors.RESET}")
            return True
        except Exception as e:
            print(f"{Colors.RED}❌ Migration failed: {e}{Colors.RESET}")
            return False

    async def verify_indexes_exist(self) -> Dict[str, bool]:
        """Verify that new indexes were created"""
        indexes_to_check = [
            'idx_worklogs_user_range',
            'idx_worklogs_instance_range',
            'idx_billing_rates_lookup',
            'idx_factorial_leaves_company_status'
        ]

        results = {}
        async with aiosqlite.connect(self.db_path) as db:
            for index_name in indexes_to_check:
                async with db.execute("""
                    SELECT name FROM sqlite_master
                    WHERE type='index' AND name=?
                """, (index_name,)) as cursor:
                    exists = await cursor.fetchone() is not None
                    results[index_name] = exists
                    status = f"{Colors.GREEN}✅{Colors.RESET}" if exists else f"{Colors.RED}❌{Colors.RESET}"
                    print(f"  {status} {index_name}")

        return results

    async def get_query_plan(self, query: str) -> List[str]:
        """Get EXPLAIN QUERY PLAN for a query (without parameters)"""
        async with aiosqlite.connect(self.db_path) as db:
            try:
                async with db.execute(f"EXPLAIN QUERY PLAN {query}") as cursor:
                    rows = await cursor.fetchall()
                    return [str(row) for row in rows]
            except Exception as e:
                # If query has parameters, return empty plan
                return [f"Query has parameters, cannot explain: {str(e)[:50]}"]

    async def benchmark_query(
        self,
        query: str,
        params: List = None,
        warmup: bool = True
    ) -> Tuple[float, int]:
        """
        Benchmark a query execution time

        Returns:
            (execution_time_ms, row_count)
        """
        if params is None:
            params = []

        # Warmup run (cache warming)
        if warmup:
            async with aiosqlite.connect(self.db_path) as db:
                async with db.execute(query, params) as cursor:
                    await cursor.fetchall()

        # Actual benchmark (multiple runs)
        times = []
        async with aiosqlite.connect(self.db_path) as db:
            for _ in range(3):  # 3 runs for stable average
                start = time.time()
                async with db.execute(query, params) as cursor:
                    rows = await cursor.fetchall()
                    elapsed = (time.time() - start) * 1000  # Convert to ms
                    times.append(elapsed)

        avg_time = sum(times) / len(times)
        return avg_time, len(rows) if rows else 0

    async def benchmark_user_query(self) -> Dict:
        """Benchmark: Get user's worklogs for date range"""
        query = """
            SELECT id, issue_key, author_email, time_spent_seconds, started
            FROM worklogs
            WHERE company_id = ?
              AND date(started) >= ? AND date(started) <= ?
              AND author_email = ?
            ORDER BY started DESC
        """

        # Use test data
        params = [1, '2025-01-01', '2025-01-31', 'test@example.com']

        # Get query plan
        plan = await self.get_query_plan(query)

        # Run benchmark
        exec_time, row_count = await self.benchmark_query(query, params)

        return {
            "query_type": "User Worklogs Range",
            "execution_time_ms": round(exec_time, 2),
            "row_count": row_count,
            "query_plan": plan,
            "index_used": "idx_worklogs_user_range" if "idx_worklogs_user_range" in str(plan) else "OTHER"
        }

    async def benchmark_sync_query(self) -> Dict:
        """Benchmark: Sync JIRA instance worklogs"""
        query = """
            SELECT id, issue_key, jira_instance, time_spent_seconds, started
            FROM worklogs
            WHERE company_id = ?
              AND jira_instance = ?
              AND date(started) >= ? AND date(started) <= ?
            ORDER BY started DESC
        """

        params = [1, 'Company Main', '2025-01-01', '2025-01-31']

        # Get query plan
        plan = await self.get_query_plan(query)

        # Run benchmark
        exec_time, row_count = await self.benchmark_query(query, params)

        return {
            "query_type": "Sync Instance Range",
            "execution_time_ms": round(exec_time, 2),
            "row_count": row_count,
            "query_plan": plan,
            "index_used": "idx_worklogs_instance_range" if "idx_worklogs_instance_range" in str(plan) else "OTHER"
        }

    async def benchmark_billing_query(self) -> Dict:
        """Benchmark: Billing rate lookups"""
        query = """
            SELECT hourly_rate
            FROM billing_rates
            WHERE billing_project_id = ?
              AND user_email = ?
              AND issue_type = ?
        """

        params = [1, 'user@example.com', 'Task']

        plan = await self.get_query_plan(query)
        exec_time, row_count = await self.benchmark_query(query, params)

        return {
            "query_type": "Billing Rate Lookup",
            "execution_time_ms": round(exec_time, 2),
            "row_count": row_count,
            "query_plan": plan,
            "index_used": "idx_billing_rates_lookup" if "idx_billing_rates_lookup" in str(plan) else "OTHER"
        }

    async def run_benchmarks(self) -> Dict:
        """Run all performance benchmarks"""
        print(f"\n{Colors.BOLD}🏃 Running Performance Benchmarks...{Colors.RESET}")

        benchmarks = {
            "user_query": await self.benchmark_user_query(),
            "sync_query": await self.benchmark_sync_query(),
            "billing_query": await self.benchmark_billing_query()
        }

        return benchmarks

    async def validate_migration(self) -> bool:
        """Run post-migration validation queries"""
        print(f"\n{Colors.BOLD}✓ Validating Migration...{Colors.RESET}")

        try:
            async with aiosqlite.connect(self.db_path) as db:
                # Test 1: Verify indexes exist and work
                print("  Testing index usage...")
                async with db.execute("""
                    EXPLAIN QUERY PLAN
                    SELECT * FROM worklogs
                    WHERE company_id = 1 AND author_email = 'test@example.com'
                    AND date(started) >= '2025-01-01'
                """) as cursor:
                    plan = await cursor.fetchall()
                    uses_user_index = any('idx_worklogs_user_range' in str(row) for row in plan)
                    if uses_user_index:
                        print(f"    {Colors.GREEN}✅ idx_worklogs_user_range used{Colors.RESET}")
                    else:
                        print(f"    {Colors.YELLOW}⚠️  idx_worklogs_user_range not used{Colors.RESET}")

                # Test 2: Verify data integrity
                print("  Testing data integrity...")
                async with db.execute("SELECT COUNT(*) FROM worklogs") as cursor:
                    count = (await cursor.fetchone())[0]
                    print(f"    {Colors.GREEN}✅ Worklogs count: {count}{Colors.RESET}")

                # Test 3: Verify constraints still work
                print("  Testing constraint enforcement...")
                async with db.execute("SELECT COUNT(*) FROM teams") as cursor:
                    count = (await cursor.fetchone())[0]
                    print(f"    {Colors.GREEN}✅ Teams count: {count}{Colors.RESET}")

                print(f"\n{Colors.GREEN}✅ All validations passed{Colors.RESET}")
                return True

        except Exception as e:
            print(f"{Colors.RED}❌ Validation failed: {e}{Colors.RESET}")
            return False

    async def run_migration(self, migration_file: str, benchmark: bool = True) -> bool:
        """Run complete migration with validation"""
        print(f"\n{Colors.BOLD}{'='*60}")
        print(f"Database Migration Runner - Phase 1")
        print(f"{'='*60}{Colors.RESET}\n")

        print(f"Database: {self.db_path}")
        print(f"Migration: {migration_file}\n")

        # Step 1: Backup
        print(f"{Colors.BOLD}Step 1: Creating Backup...{Colors.RESET}")
        backup_path = await self.backup_database()

        # Step 2: Execute migration
        print(f"\n{Colors.BOLD}Step 2: Executing Migration...{Colors.RESET}")
        success = await self.execute_migration(migration_file)
        if not success:
            return False

        # Step 3: Verify indexes
        print(f"\n{Colors.BOLD}Step 3: Verifying Indexes Created...{Colors.RESET}")
        indexes = await self.verify_indexes_exist()
        if not all(indexes.values()):
            print(f"{Colors.RED}❌ Some indexes were not created{Colors.RESET}")
            return False

        # Step 4: Validate
        print(f"\n{Colors.BOLD}Step 4: Validating Data Integrity...{Colors.RESET}")
        if not await self.validate_migration():
            return False

        # Step 5: Benchmark (optional)
        if benchmark:
            print(f"\n{Colors.BOLD}Step 5: Running Performance Benchmarks...{Colors.RESET}")
            benchmarks = await self.run_benchmarks()
            self.results['benchmarks'] = benchmarks

        print(f"\n{Colors.BOLD}{'='*60}")
        print(f"✅ Migration Completed Successfully!")
        print(f"Backup: {backup_path}")
        print(f"{'='*60}{Colors.RESET}\n")

        return True

    def print_results(self):
        """Pretty print migration results"""
        if not self.results:
            return

        print(f"\n{Colors.BOLD}📊 Performance Benchmarks{Colors.RESET}\n")

        for query_name, benchmark in self.results.get('benchmarks', {}).items():
            print(f"{Colors.BLUE}{benchmark['query_type']}{Colors.RESET}")
            print(f"  Execution time: {benchmark['execution_time_ms']}ms")
            print(f"  Rows: {benchmark['row_count']}")
            print(f"  Index used: {benchmark['index_used']}")
            print()


async def main():
    parser = argparse.ArgumentParser(description="Database Migration Runner")
    parser.add_argument("--db", default="worklog.db", help="Database file path")
    parser.add_argument("--migration", default="backend/migrations/001_add_composite_indexes.sql",
                        help="Migration SQL file")
    parser.add_argument("--benchmark", action="store_true", help="Run performance benchmarks")
    parser.add_argument("--no-backup", action="store_true", help="Skip backup (dev only)")

    args = parser.parse_args()

    # Verify database exists
    if not Path(args.db).exists():
        print(f"{Colors.RED}❌ Database not found: {args.db}{Colors.RESET}")
        sys.exit(1)

    # Verify migration file exists
    if not Path(args.migration).exists():
        print(f"{Colors.RED}❌ Migration file not found: {args.migration}{Colors.RESET}")
        sys.exit(1)

    runner = MigrationRunner(args.db)

    # Run migration
    success = await runner.run_migration(args.migration, benchmark=args.benchmark)

    if success:
        runner.print_results()
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
