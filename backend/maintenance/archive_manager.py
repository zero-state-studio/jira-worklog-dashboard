"""
Database Archiving Manager
Handles log retention and worklog archiving strategies

Usage:
    python archive_manager.py --action cleanup-logs --days 90
    python archive_manager.py --action archive-worklogs --year 2024
    python archive_manager.py --action health-check
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
import aiosqlite
import argparse

logger = logging.getLogger(__name__)


class ArchiveManager:
    """Manages database archiving and cleanup operations"""

    def __init__(self, db_path: str):
        self.db_path = db_path

    async def cleanup_old_logs(self, days_to_keep: int = 90) -> int:
        """
        Delete application logs older than specified days.

        Args:
            days_to_keep: Number of days of logs to retain (default 90 = 3 months)

        Returns:
            Number of rows deleted

        Context:
            - Logs table grows 50-100K rows/month with heavy request logging
            - Without retention, Year 5 projection: 3.6M-7.2M rows = 2-4GB
            - 90-day retention keeps table ~10-15MB manageable
        """
        cutoff_date = (datetime.utcnow() - timedelta(days=days_to_keep)).isoformat()

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                "DELETE FROM logs WHERE timestamp < ?",
                (cutoff_date,)
            )
            deleted = cursor.rowcount
            await db.commit()

        logger.info(f"Deleted {deleted} log entries older than {days_to_keep} days")
        return deleted

    async def export_logs_before_delete(
        self,
        days_to_keep: int = 90,
        export_dir: str = "./logs_archive"
    ) -> tuple[int, str]:
        """
        Export logs to JSON before deleting (for compliance/auditing).

        Args:
            days_to_keep: Number of days to retain
            export_dir: Directory to export JSON files

        Returns:
            (exported_count, export_file_path)
        """
        cutoff_date = (datetime.utcnow() - timedelta(days=days_to_keep)).isoformat()
        Path(export_dir).mkdir(parents=True, exist_ok=True)

        # Export logs
        logs_to_export = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                "SELECT * FROM logs WHERE timestamp < ? ORDER BY timestamp DESC",
                (cutoff_date,)
            ) as cursor:
                # Get column names
                columns = [description[0] for description in cursor.description]
                async for row in cursor:
                    log_dict = dict(zip(columns, row))
                    logs_to_export.append(log_dict)

        if logs_to_export:
            # Export to file
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            export_file = Path(export_dir) / f"logs_archive_{timestamp}.json"

            with open(export_file, 'w') as f:
                json.dump(logs_to_export, f, indent=2, default=str)

            logger.info(f"Exported {len(logs_to_export)} logs to {export_file}")
            return len(logs_to_export), str(export_file)

        return 0, ""

    async def get_table_sizes(self) -> dict[str, int]:
        """
        Get size of each table (bytes).

        Returns:
            Dict of table_name: size_bytes

        Context:
            Used to monitor growth and trigger archiving strategy
        """
        sizes = {}

        async with aiosqlite.connect(self.db_path) as db:
            # Get list of all tables
            async with db.execute("""
                SELECT name FROM sqlite_master
                WHERE type='table' AND name NOT LIKE 'sqlite_%'
                ORDER BY name
            """) as cursor:
                tables = await cursor.fetchall()

            # Get row count for each table
            for (table_name,) in tables:
                try:
                    async with db.execute(f"SELECT COUNT(*) FROM {table_name}") as cursor:
                        row_count = (await cursor.fetchone())[0]
                        sizes[table_name] = row_count
                except Exception as e:
                    logger.warning(f"Error getting count for {table_name}: {e}")

        return sizes

    async def check_db_health(self) -> dict:
        """
        Check overall database health and return metrics.

        Returns:
            Dict with health metrics and alerts
        """
        async with aiosqlite.connect(self.db_path) as db:
            # Check file size
            file_size = Path(self.db_path).stat().st_size

            # Count tables
            async with db.execute("""
                SELECT COUNT(*) FROM sqlite_master WHERE type='table'
            """) as cursor:
                table_count = (await cursor.fetchone())[0]

            # Count indexes
            async with db.execute("""
                SELECT COUNT(*) FROM sqlite_master WHERE type='index'
            """) as cursor:
                index_count = (await cursor.fetchone())[0]

            # Get logs table stats
            try:
                async with db.execute(
                    "SELECT COUNT(*) FROM logs"
                ) as cursor:
                    logs_count = (await cursor.fetchone())[0]

                async with db.execute(
                    "SELECT MIN(timestamp), MAX(timestamp) FROM logs"
                ) as cursor:
                    min_ts, max_ts = await cursor.fetchone()
            except:
                logs_count = 0
                min_ts = max_ts = None

            # Get worklogs table stats
            try:
                async with db.execute(
                    "SELECT COUNT(*) FROM worklogs"
                ) as cursor:
                    worklogs_count = (await cursor.fetchone())[0]
            except:
                worklogs_count = 0

        # Generate alerts
        alerts = []
        if file_size > 2_000_000_000:  # 2GB
            alerts.append("⚠️ Database file > 2GB, consider archiving old worklogs")
        if logs_count > 1_000_000:
            alerts.append(f"⚠️ Logs table has {logs_count:,} rows, consider cleanup")
        if worklogs_count > 5_000_000:
            alerts.append(f"🔴 Worklogs table has {worklogs_count:,} rows, implement archiving")

        return {
            "file_size_bytes": file_size,
            "file_size_mb": round(file_size / 1_000_000, 2),
            "table_count": table_count,
            "index_count": index_count,
            "logs_count": logs_count,
            "logs_date_range": {"from": min_ts, "to": max_ts},
            "worklogs_count": worklogs_count,
            "alerts": alerts,
            "timestamp": datetime.utcnow().isoformat()
        }

    async def archive_worklogs_by_year(
        self,
        year: int,
        archive_dir: str = "./worklogs_archive"
    ) -> tuple[int, str]:
        """
        Export worklogs for a specific year to JSON (archiving strategy).

        Args:
            year: Year to archive (e.g., 2024)
            archive_dir: Directory to store archives

        Returns:
            (archived_count, archive_file_path)

        Context:
            - Worklogs table is largest (millions of rows after Year 2+)
            - Archive strategy: Keep hot data (last 18 months), export older to JSON
            - Enables: Free storage, maintain query performance, preserve data
        """
        Path(archive_dir).mkdir(parents=True, exist_ok=True)

        start_date = f"{year}-01-01"
        end_date = f"{year}-12-31"

        worklogs_to_export = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT * FROM worklogs
                WHERE date(started) >= ? AND date(started) <= ?
                ORDER BY started DESC
            """, (start_date, end_date)) as cursor:
                columns = [description[0] for description in cursor.description]
                async for row in cursor:
                    worklog_dict = dict(zip(columns, row))
                    # Convert to JSON-serializable format
                    worklog_dict['started'] = str(worklog_dict.get('started', ''))
                    worklog_dict['created_at'] = str(worklog_dict.get('created_at', ''))
                    worklog_dict['updated_at'] = str(worklog_dict.get('updated_at', ''))
                    worklogs_to_export.append(worklog_dict)

        if worklogs_to_export:
            # Export to file
            archive_file = Path(archive_dir) / f"worklogs_{year}.json"

            with open(archive_file, 'w') as f:
                json.dump(worklogs_to_export, f, indent=2, default=str)

            logger.info(f"Exported {len(worklogs_to_export)} worklogs for {year} to {archive_file}")

            # Note: In production, you would:
            # 1. Verify export integrity
            # 2. Upload to S3/cold storage
            # 3. Delete from database

            return len(worklogs_to_export), str(archive_file)

        return 0, ""

    async def cleanup_old_worklogs(
        self,
        months_to_keep: int = 18,
        company_id: Optional[int] = None
    ) -> int:
        """
        Delete worklogs older than specified months (Year 2+ strategy).

        Args:
            months_to_keep: Keep last N months (default 18 months)
            company_id: Specific company to clean, or None for all

        Returns:
            Number of worklogs deleted

        Note:
            - Should only run AFTER archiving to JSON
            - Use with caution - deletes historical data
        """
        cutoff_date = (datetime.utcnow() - timedelta(days=months_to_keep*30)).isoformat()

        async with aiosqlite.connect(self.db_path) as db:
            if company_id:
                cursor = await db.execute(
                    "DELETE FROM worklogs WHERE started < ? AND company_id = ?",
                    (cutoff_date, company_id)
                )
            else:
                cursor = await db.execute(
                    "DELETE FROM worklogs WHERE started < ?",
                    (cutoff_date,)
                )

            deleted = cursor.rowcount
            await db.commit()

        logger.warning(f"Deleted {deleted} worklogs older than {months_to_keep} months")
        return deleted


async def main():
    parser = argparse.ArgumentParser(description="Database Archive Manager")
    parser.add_argument("--db", default="worklog.db", help="Path to database file")
    parser.add_argument(
        "--action",
        choices=["cleanup-logs", "export-logs", "archive-worklogs", "cleanup-worklogs", "health-check"],
        required=True,
        help="Action to perform"
    )
    parser.add_argument("--days", type=int, default=90, help="Days to keep (for logs)")
    parser.add_argument("--months", type=int, default=18, help="Months to keep (for worklogs)")
    parser.add_argument("--year", type=int, help="Year to archive (for worklogs)")
    parser.add_argument("--export-dir", default="./archive", help="Export directory")
    parser.add_argument("--company-id", type=int, help="Company ID for scoped cleanup")

    args = parser.parse_args()

    manager = ArchiveManager(args.db)

    if args.action == "cleanup-logs":
        deleted = await manager.cleanup_old_logs(days_to_keep=args.days)
        print(f"✅ Deleted {deleted} log entries")

    elif args.action == "export-logs":
        count, path = await manager.export_logs_before_delete(
            days_to_keep=args.days,
            export_dir=args.export_dir
        )
        print(f"✅ Exported {count} logs to {path}")

    elif args.action == "archive-worklogs":
        if not args.year:
            print("❌ --year required for archive-worklogs")
            return
        count, path = await manager.archive_worklogs_by_year(
            year=args.year,
            archive_dir=args.export_dir
        )
        print(f"✅ Archived {count} worklogs for {args.year} to {path}")

    elif args.action == "cleanup-worklogs":
        deleted = await manager.cleanup_old_worklogs(
            months_to_keep=args.months,
            company_id=args.company_id
        )
        print(f"✅ Deleted {deleted} old worklogs")

    elif args.action == "health-check":
        health = await manager.check_db_health()
        print("\n📊 Database Health Report")
        print(f"  File size: {health['file_size_mb']} MB")
        print(f"  Tables: {health['table_count']}, Indexes: {health['index_count']}")
        print(f"  Logs: {health['logs_count']:,} rows")
        print(f"  Worklogs: {health['worklogs_count']:,} rows")
        if health['alerts']:
            print("\n⚠️  Alerts:")
            for alert in health['alerts']:
                print(f"    {alert}")
        else:
            print("\n✅ No alerts")


if __name__ == "__main__":
    asyncio.run(main())
