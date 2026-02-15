#!/usr/bin/env python3
"""
Test generic issues with real database configuration
"""

import asyncio
import aiosqlite
from collections import namedtuple
from datetime import datetime, timedelta
from app.matching_algorithms import ParentLinkingMatcher, apply_generic_issues

# Mock worklog structure
Worklog = namedtuple('Worklog', [
    'issue_key', 'parent_key', 'parent_name', 'issue_summary',
    'time_spent_seconds', 'jira_instance', 'issue_type', 'author_email'
])


async def test_with_real_config():
    """Test generic issues with real database configuration"""

    print("\n🧪 Test: Generic Issues with Real Configuration\n")
    print("="*80)

    # Date range: last 30 days
    start_date = (datetime.now() - timedelta(days=30)).date()
    end_date = datetime.now().date()
    print(f"📅 Period: {start_date} to {end_date}\n")

    async with aiosqlite.connect('worklog_storage.db') as db:
        # Get generic issues configuration
        print("📋 Generic Issues Configuration:")
        print("-"*80)

        async with db.execute('''
            SELECT issue_code, issue_type, team_id, description
            FROM generic_issues
            ORDER BY issue_code
        ''') as cursor:
            generic_issues_raw = await cursor.fetchall()

        generic_issues = [
            {
                'issue_code': row[0],
                'issue_type': row[1],
                'team_id': row[2],
                'description': row[3]
            }
            for row in generic_issues_raw
        ]

        if not generic_issues:
            print("⚠️  No generic issues configured!")
            return

        for gi in generic_issues:
            team_info = f"team_id={gi['team_id']}" if gi['team_id'] else "global"
            print(f"  • {gi['issue_code']}: {gi['issue_type']} ({team_info})")
            if gi['description']:
                print(f"    → {gi['description']}")

        print("\n" + "-"*80)

        # Get users with team mapping
        async with db.execute('''
            SELECT email, team_id
            FROM users
            WHERE team_id IS NOT NULL
        ''') as cursor:
            users_raw = await cursor.fetchall()

        user_to_team = {email.lower(): team_id for email, team_id in users_raw}
        print(f"\n👥 User-Team mapping: {len(user_to_team)} users")

        # Get worklogs
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
        print(f"\n🔵 OT (primary): {len(ot_worklogs)} worklogs")

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
        print(f"🔵 MMFG (secondary): {len(mmfg_worklogs)} worklogs")

        print("\n" + "="*80)
        print("\n🔧 Step 1: Parent Linking Match")
        print("-"*80)

        # Extract generic issue codes to exclude from parent matching
        generic_issue_codes = [gi['issue_code'] for gi in generic_issues]
        print(f"\n🚫 Excluding from parent match: {generic_issue_codes}")

        # Run parent linking
        matcher = ParentLinkingMatcher()
        matched_groups = matcher.find_groups(
            ot_worklogs, mmfg_worklogs, config={}, exclusions=[],
            generic_issue_codes=generic_issue_codes
        )

        print(f"\nGroups created: {len(matched_groups)}")

        # Count matched worklogs
        matched_ot = sum(len(g.primary_worklogs) for g in matched_groups.values())
        matched_mmfg = sum(len(g.secondary_worklogs) for g in matched_groups.values())
        print(f"Matched: {matched_ot}/{len(ot_worklogs)} OT, {matched_mmfg}/{len(mmfg_worklogs)} MMFG")
        print(f"Orphan: {len(ot_worklogs)-matched_ot} OT, {len(mmfg_worklogs)-matched_mmfg} MMFG")

        print("\n" + "="*80)
        print("\n🔧 Step 2: Apply Generic Issues")
        print("-"*80)

        # Apply generic issues
        matched_groups = apply_generic_issues(
            matched_groups, generic_issues, ot_worklogs, mmfg_worklogs, user_to_team
        )

        # Find generic groups (new format: "ISSUE-123 (Generic)")
        generic_groups = {k: v for k, v in matched_groups.items() if '(Generic)' in k or '(Generic - Team' in k}

        print(f"\n✅ Generic groups created: {len(generic_groups)}")

        if generic_groups:
            print("\n" + "-"*80)
            for key, group in sorted(generic_groups.items(), key=lambda x: x[1].delta, reverse=True):
                print(f"\n📦 {key}")
                print(f"   Primary (OT):     {len(group.primary_worklogs):>3} worklogs, {group.primary_hours:>6.1f}h")
                print(f"   Secondary (MMFG): {len(group.secondary_worklogs):>3} worklogs, {group.secondary_hours:>6.1f}h")
                print(f"   Delta:            {group.delta:>+6.1f}h")

                if group.primary_issues:
                    print(f"   OT issues: {', '.join(list(group.primary_issues)[:5])}")
                if group.secondary_issues:
                    secondary_sample = list(group.secondary_issues)[:5]
                    print(f"   MMFG issues: {', '.join(secondary_sample)}")
                    if len(group.secondary_issues) > 5:
                        print(f"                ... and {len(group.secondary_issues) - 5} more")
        else:
            print("\n❌ No generic groups created!")

        # Final statistics
        print("\n" + "="*80)
        print("\n📊 Final Statistics")
        print("-"*80)

        total_matched_ot = sum(len(g.primary_worklogs) for g in matched_groups.values())
        total_matched_mmfg = sum(len(g.secondary_worklogs) for g in matched_groups.values())

        print(f"\nTotal groups: {len(matched_groups)}")
        print(f"  - Generic: {len(generic_groups)}")
        print(f"  - Standard: {len(matched_groups) - len(generic_groups)}")

        print(f"\nWorklog coverage:")
        print(f"  OT:   {total_matched_ot}/{len(ot_worklogs)} ({total_matched_ot/len(ot_worklogs)*100:.1f}%)")
        print(f"  MMFG: {total_matched_mmfg}/{len(mmfg_worklogs)} ({total_matched_mmfg/len(mmfg_worklogs)*100:.1f}%)")

        print("\n" + "="*80)


if __name__ == "__main__":
    asyncio.run(test_with_real_config())
