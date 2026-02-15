#!/usr/bin/env python3
"""
Test to find orphan worklogs (not matched by standard algorithm)
"""

import asyncio
import aiosqlite
from app.matching_algorithms import ParentLinkingMatcher
from collections import namedtuple

Worklog = namedtuple('Worklog', [
    'id', 'issue_key', 'parent_key', 'parent_name', 'issue_summary',
    'time_spent_seconds', 'jira_instance', 'issue_type', 'author_email'
])


async def test_orphan_worklogs():
    """Find worklogs that don't match between OT and MMFG"""

    print("\n🔍 Finding Orphan Worklogs (Not Matched)\n")
    print("="*80)

    async with aiosqlite.connect('worklog_storage.db') as db:
        # Get worklogs from 2026-01-01
        start_date = '2026-01-01'
        end_date = '2026-02-14'

        # OT worklogs
        async with db.execute('''
            SELECT id, issue_key, parent_key, parent_name, issue_summary,
                   time_spent_seconds, jira_instance, issue_type, author_email
            FROM worklogs
            WHERE jira_instance = 'OT'
              AND date(started) >= ?
              AND date(started) <= ?
        ''', (start_date, end_date)) as cursor:
            ot_rows = await cursor.fetchall()

        ot_worklogs = [Worklog(*row) for row in ot_rows]

        # MMFG worklogs
        async with db.execute('''
            SELECT id, issue_key, parent_key, parent_name, issue_summary,
                   time_spent_seconds, jira_instance, issue_type, author_email
            FROM worklogs
            WHERE jira_instance = 'MMFG'
              AND date(started) >= ?
              AND date(started) <= ?
        ''', (start_date, end_date)) as cursor:
            mmfg_rows = await cursor.fetchall()

        mmfg_worklogs = [Worklog(*row) for row in mmfg_rows]

        print(f"📅 Period: {start_date} to {end_date}")
        print(f"🔵 OT: {len(ot_worklogs)} worklogs")
        print(f"🔵 MMFG: {len(mmfg_worklogs)} worklogs")

        # Run matching
        print("\n" + "-"*80)
        print("🔧 Running standard matching...")

        matcher = ParentLinkingMatcher()
        matched_groups = matcher.find_groups(ot_worklogs, mmfg_worklogs, config={}, exclusions=[])

        # Collect matched worklog IDs
        matched_ot_ids = set()
        matched_mmfg_ids = set()

        for group in matched_groups.values():
            for wl in group.primary_worklogs:
                matched_ot_ids.add(wl.id)
            for wl in group.secondary_worklogs:
                matched_mmfg_ids.add(wl.id)

        # Find orphan worklogs
        orphan_ot = [wl for wl in ot_worklogs if wl.id not in matched_ot_ids]
        orphan_mmfg = [wl for wl in mmfg_worklogs if wl.id not in matched_mmfg_ids]

        print(f"\n✅ Matched groups: {len(matched_groups)}")
        print(f"✅ Matched OT worklogs: {len(matched_ot_ids)}/{len(ot_worklogs)} ({len(matched_ot_ids)/len(ot_worklogs)*100:.1f}%)")
        print(f"✅ Matched MMFG worklogs: {len(matched_mmfg_ids)}/{len(mmfg_worklogs)} ({len(matched_mmfg_ids)/len(mmfg_worklogs)*100:.1f}%)")

        print("\n" + "="*80)
        print("\n❌ ORPHAN WORKLOGS (Not Matched)")
        print("-"*80)

        print(f"\n🔴 OT Orphans: {len(orphan_ot)} worklogs")
        if orphan_ot:
            orphan_ot_hours = sum(wl.time_spent_seconds for wl in orphan_ot) / 3600
            print(f"   Hours: {orphan_ot_hours:.1f}h")

            # Group by issue
            from collections import defaultdict
            by_issue = defaultdict(list)
            for wl in orphan_ot:
                by_issue[wl.issue_key].append(wl)

            print(f"   Issues: {len(by_issue)}")
            for issue, wls in sorted(by_issue.items(), key=lambda x: -sum(w.time_spent_seconds for w in x[1]))[:10]:
                hours = sum(w.time_spent_seconds for w in wls) / 3600
                print(f"     • {issue}: {hours:.1f}h")

        print(f"\n🔴 MMFG Orphans: {len(orphan_mmfg)} worklogs")
        if orphan_mmfg:
            orphan_mmfg_hours = sum(wl.time_spent_seconds for wl in orphan_mmfg) / 3600
            print(f"   Hours: {orphan_mmfg_hours:.1f}h")

            # Group by issue_type
            from collections import defaultdict
            by_type = defaultdict(list)
            for wl in orphan_mmfg:
                issue_type = wl.issue_type or '(None)'
                by_type[issue_type].append(wl)

            print(f"   By issue_type:")
            for issue_type, wls in sorted(by_type.items(), key=lambda x: -sum(w.time_spent_seconds for w in x[1])):
                hours = sum(w.time_spent_seconds for w in wls) / 3600
                count = len(wls)
                sample = ', '.join(list(set(w.issue_key for w in wls))[:5])
                print(f"     • {issue_type}: {count} worklogs, {hours:.1f}h")
                print(f"       Sample: {sample}")

        # Check if orphans match generic issue config
        print("\n" + "="*80)
        print("\n✅ ORPHAN WORKLOGS ELIGIBLE FOR GENERIC MATCHING")
        print("-"*80)

        # Get generic issue config
        async with db.execute('''
            SELECT issue_code, issue_type, team_id
            FROM generic_issues
        ''') as cursor:
            gi_configs = await cursor.fetchall()

        if not gi_configs:
            print("\n⚠️  No generic issues configured!")
            return

        for issue_code, issue_types_str, team_id in gi_configs:
            allowed_types = [t.strip() for t in issue_types_str.split(',')]

            print(f"\n📦 {issue_code} (types: {', '.join(allowed_types)}, team={team_id})")

            # Find OT worklogs on this issue
            ot_container = [wl for wl in orphan_ot if wl.issue_key == issue_code]
            if ot_container:
                hours = sum(wl.time_spent_seconds for wl in ot_container) / 3600
                print(f"   PRIMARY (OT): {len(ot_container)} worklogs, {hours:.1f}h")
            else:
                print(f"   PRIMARY (OT): 0 worklogs")

            # Find MMFG worklogs with matching type
            mmfg_matching = [wl for wl in orphan_mmfg if wl.issue_type in allowed_types]
            if mmfg_matching:
                hours = sum(wl.time_spent_seconds for wl in mmfg_matching) / 3600
                issues = list(set(wl.issue_key for wl in mmfg_matching))
                print(f"   SECONDARY (MMFG): {len(mmfg_matching)} worklogs, {hours:.1f}h")
                print(f"   Issues: {', '.join(issues[:10])}")

                if len(ot_container) > 0 or len(mmfg_matching) > 0:
                    print(f"   ✅ Would create GENERIC group!")
            else:
                print(f"   SECONDARY (MMFG): 0 worklogs with matching type")


if __name__ == "__main__":
    asyncio.run(test_orphan_worklogs())
