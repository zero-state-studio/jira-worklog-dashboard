#!/usr/bin/env python3
"""
Analyze which MMFG worklogs remain without match after parent linking
"""

import asyncio
import aiosqlite
from collections import defaultdict, namedtuple
from datetime import datetime, timedelta
from app.matching_algorithms import ParentLinkingMatcher

# Mock worklog structure
Worklog = namedtuple('Worklog', [
    'issue_key', 'parent_key', 'parent_name', 'issue_summary',
    'time_spent_seconds', 'jira_instance', 'issue_type', 'author_email'
])


async def analyze_orphans():
    """Analyze orphan worklogs on MMFG after parent linking"""

    print("\n🔍 Analysis: MMFG Worklogs Without Match\n")
    print("="*80)

    # Date range: last 30 days
    start_date = (datetime.now() - timedelta(days=30)).date()
    end_date = datetime.now().date()
    print(f"📅 Period: {start_date} to {end_date}\n")

    async with aiosqlite.connect('worklog_storage.db') as db:
        # Get OT worklogs (primary)
        async with db.execute('''
            SELECT issue_key, parent_key, parent_name, issue_summary,
                   time_spent_seconds, jira_instance, issue_type, author_email
            FROM worklogs
            WHERE jira_instance = 'OT'
              AND date(started) >= ?
              AND date(started) <= ?
        ''', (str(start_date), str(end_date))) as cursor:
            ot_rows = await cursor.fetchall()

        ot_worklogs = [Worklog(*row) for row in ot_rows]
        print(f"🔵 OT (primary): {len(ot_worklogs)} worklogs")

        # Get MMFG worklogs (secondary)
        async with db.execute('''
            SELECT issue_key, parent_key, parent_name, issue_summary,
                   time_spent_seconds, jira_instance, issue_type, author_email
            FROM worklogs
            WHERE jira_instance = 'MMFG'
              AND date(started) >= ?
              AND date(started) <= ?
        ''', (str(start_date), str(end_date))) as cursor:
            mmfg_rows = await cursor.fetchall()

        mmfg_worklogs = [Worklog(*row) for row in mmfg_rows]
        print(f"🔵 MMFG (secondary): {len(mmfg_worklogs)} worklogs\n")

        print("-"*80)
        print("\n🔧 Running Parent Linking Match")
        print("-"*80)

        # Run parent linking
        matcher = ParentLinkingMatcher()
        matched_groups = matcher.find_groups(
            ot_worklogs, mmfg_worklogs, config={}, exclusions=[], generic_issue_codes=[]
        )

        print(f"\nTotal groups: {len(matched_groups)}")

        # Count matched worklogs
        matched_mmfg_ids = set()
        for group in matched_groups.values():
            for wl in group.secondary_worklogs:
                matched_mmfg_ids.add(id(wl))

        # Find orphan MMFG worklogs (not matched)
        orphan_mmfg = [wl for wl in mmfg_worklogs if id(wl) not in matched_mmfg_ids]

        print(f"Matched MMFG worklogs: {len(matched_mmfg_ids)}/{len(mmfg_worklogs)} ({len(matched_mmfg_ids)/len(mmfg_worklogs)*100:.1f}%)")
        print(f"Orphan MMFG worklogs: {len(orphan_mmfg)} ({len(orphan_mmfg)/len(mmfg_worklogs)*100:.1f}%)")

        # Analyze solitary groups (only MMFG, no OT match)
        print("\n" + "="*80)
        print("\n📊 Solitary Groups Analysis (MMFG only, no OT match)")
        print("-"*80)

        solitary_mmfg_groups = []
        for key, group in matched_groups.items():
            # Solitary: has MMFG worklogs but no OT worklogs
            if len(group.secondary_worklogs) > 0 and len(group.primary_worklogs) == 0:
                solitary_mmfg_groups.append((key, group))

        print(f"\nTotal solitary MMFG groups: {len(solitary_mmfg_groups)}")

        if solitary_mmfg_groups:
            # Group by issue_type
            solitary_by_type = defaultdict(lambda: {'count': 0, 'hours': 0, 'groups': []})
            for key, group in solitary_mmfg_groups:
                # Get issue_type from first worklog
                issue_type = group.secondary_worklogs[0].issue_type or 'Unknown'
                solitary_by_type[issue_type]['count'] += len(group.secondary_worklogs)
                solitary_by_type[issue_type]['hours'] += group.secondary_hours
                solitary_by_type[issue_type]['groups'].append(key)

            print(f"\n📋 Solitary Groups by Issue Type:")
            print(f"{'Type':<20} {'Groups':>8} {'Worklogs':>10} {'Hours':>10}")
            print("-"*60)

            sorted_types = sorted(solitary_by_type.items(), key=lambda x: x[1]['hours'], reverse=True)
            for issue_type, data in sorted_types:
                print(f"{issue_type:<20} {len(data['groups']):>8} {data['count']:>10} {data['hours']:>9.1f}h")

            total_solitary_hours = sum(g[1].secondary_hours for g in solitary_mmfg_groups)
            total_mmfg_hours = sum(wl.time_spent_seconds for wl in mmfg_worklogs) / 3600
            solitary_percentage = (total_solitary_hours / total_mmfg_hours * 100) if total_mmfg_hours > 0 else 0

            print("-"*60)
            print(f"{'TOTAL SOLITARY':<20} {len(solitary_mmfg_groups):>8} {sum(len(g[1].secondary_worklogs) for g in solitary_mmfg_groups):>10} {total_solitary_hours:>9.1f}h")
            print(f"\n⚠️  Solitary hours represent {solitary_percentage:.1f}% of total MMFG hours")

            # Sample solitary groups
            print("\n" + "-"*80)
            print("\n📄 Sample Solitary Groups (top 10 by hours):")
            print("-"*80)

            sorted_solitary = sorted(solitary_mmfg_groups, key=lambda x: x[1].secondary_hours, reverse=True)

            print(f"{'Linking Key':<25} {'Type':<15} {'Worklogs':>10} {'Hours':>10}")
            print("-"*65)
            for key, group in sorted_solitary[:10]:
                issue_type = group.secondary_worklogs[0].issue_type or 'Unknown'
                print(f"{key:<25} {issue_type:<15} {len(group.secondary_worklogs):>10} {group.secondary_hours:>9.1f}h")

            print("\n" + "="*80)
            print("\n💡 These solitary groups are MMFG worklogs without OT match.")
            print("   They could potentially be matched via generic issues.")

        print("\n" + "="*80)
        print("\n📊 Orphan MMFG Worklogs Analysis")
        print("-"*80)

        if not orphan_mmfg:
            print("\n✅ No orphan worklogs found (but check solitary groups above).")
            return

        # Group by issue_type
        by_type = defaultdict(lambda: {'count': 0, 'hours': 0, 'issues': set()})
        for wl in orphan_mmfg:
            issue_type = wl.issue_type or 'Unknown'
            by_type[issue_type]['count'] += 1
            by_type[issue_type]['hours'] += wl.time_spent_seconds / 3600
            by_type[issue_type]['issues'].add(wl.issue_key)

        print(f"\n📋 By Issue Type:")
        print(f"{'Type':<20} {'Count':>8} {'Hours':>10} {'Unique Issues':>15}")
        print("-"*60)

        sorted_types = sorted(by_type.items(), key=lambda x: x[1]['hours'], reverse=True)
        for issue_type, data in sorted_types:
            print(f"{issue_type:<20} {data['count']:>8} {data['hours']:>9.1f}h {len(data['issues']):>15}")

        # Total orphan hours
        total_orphan_hours = sum(wl.time_spent_seconds for wl in orphan_mmfg) / 3600
        total_mmfg_hours = sum(wl.time_spent_seconds for wl in mmfg_worklogs) / 3600
        orphan_percentage = (total_orphan_hours / total_mmfg_hours * 100) if total_mmfg_hours > 0 else 0

        print("-"*60)
        print(f"{'TOTAL ORPHAN':<20} {len(orphan_mmfg):>8} {total_orphan_hours:>9.1f}h")
        print(f"\n⚠️  Orphan hours represent {orphan_percentage:.1f}% of total MMFG hours")

        # Sample orphan issues
        print("\n" + "-"*80)
        print("\n📄 Sample Orphan Issues (top 10 by hours):")
        print("-"*80)

        orphan_by_issue = defaultdict(lambda: {'hours': 0, 'type': '', 'count': 0})
        for wl in orphan_mmfg:
            orphan_by_issue[wl.issue_key]['hours'] += wl.time_spent_seconds / 3600
            orphan_by_issue[wl.issue_key]['type'] = wl.issue_type or 'Unknown'
            orphan_by_issue[wl.issue_key]['count'] += 1

        sorted_issues = sorted(orphan_by_issue.items(), key=lambda x: x[1]['hours'], reverse=True)

        print(f"{'Issue Key':<20} {'Type':<15} {'Worklogs':>10} {'Hours':>10}")
        print("-"*60)
        for issue_key, data in sorted_issues[:10]:
            print(f"{issue_key:<20} {data['type']:<15} {data['count']:>10} {data['hours']:>9.1f}h")

        print("\n" + "="*80)


if __name__ == "__main__":
    asyncio.run(analyze_orphans())
