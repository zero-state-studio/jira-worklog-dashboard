#!/usr/bin/env python3
"""
End-to-end test for generic issues matching
"""

import asyncio
import aiosqlite
from app.matching_algorithms import ParentLinkingMatcher, apply_generic_issues
from collections import namedtuple
from datetime import date

# Mock worklog structure
Worklog = namedtuple('Worklog', [
    'issue_key', 'parent_key', 'parent_name', 'issue_summary',
    'time_spent_seconds', 'jira_instance', 'issue_type', 'author_email'
])


async def test_generic_issues_e2e():
    """Test the complete flow including generic issues"""

    print("\n🧪 End-to-End Test: Generic Issues Matching\n")
    print("="*80)

    async with aiosqlite.connect('worklog_storage.db') as db:
        # Get generic issues config
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

        print(f"📋 Generic Issues Config: {len(generic_issues)} issues")
        for gi in generic_issues:
            print(f"   • {gi['issue_code']}: {gi['issue_type']} (team={gi['team_id']})")

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

        # Get worklogs for OT and MMFG (last 30 days)
        from datetime import datetime, timedelta
        start_date = (datetime.now() - timedelta(days=30)).date()
        end_date = datetime.now().date()

        print(f"\n📅 Date range: {start_date} to {end_date}")

        # OT worklogs (primary)
        async with db.execute('''
            SELECT issue_key, parent_key, parent_name, issue_summary,
                   time_spent_seconds, jira_instance, issue_type, author_email
            FROM worklogs
            WHERE jira_instance = 'OT'
              AND date(started) >= ?
              AND date(started) <= ?
            LIMIT 500
        ''', (str(start_date), str(end_date))) as cursor:
            ot_rows = await cursor.fetchall()

        ot_worklogs = [Worklog(*row) for row in ot_rows]
        print(f"\n🔵 OT (primary): {len(ot_worklogs)} worklogs")

        # MMFG worklogs (secondary)
        async with db.execute('''
            SELECT issue_key, parent_key, parent_name, issue_summary,
                   time_spent_seconds, jira_instance, issue_type, author_email
            FROM worklogs
            WHERE jira_instance = 'MMFG'
              AND date(started) >= ?
              AND date(started) <= ?
            LIMIT 500
        ''', (str(start_date), str(end_date))) as cursor:
            mmfg_rows = await cursor.fetchall()

        mmfg_worklogs = [Worklog(*row) for row in mmfg_rows]
        print(f"🔵 MMFG (secondary): {len(mmfg_worklogs)} worklogs")

        print("\n" + "="*80)
        print("\n🔧 Step 1: Standard Matching (ParentLinkingMatcher)")
        print("-"*80)

        # Extract generic issue codes to exclude from parent matching
        generic_issue_codes = [gi['issue_code'] for gi in generic_issues]
        print(f"\n🚫 Excluding generic issues from parent matching: {generic_issue_codes}")

        # Run standard matching
        matcher = ParentLinkingMatcher()
        matched_groups = matcher.find_groups(
            ot_worklogs, mmfg_worklogs, config={}, exclusions=[], generic_issue_codes=generic_issue_codes
        )

        print(f"\nGroups created: {len(matched_groups)}")
        for key, group in list(matched_groups.items())[:5]:
            print(f"  • {key}: {group.primary_hours:.1f}h (OT) vs {group.secondary_hours:.1f}h (MMFG) = {group.delta:+.1f}h")
        if len(matched_groups) > 5:
            print(f"  ... and {len(matched_groups) - 5} more groups")

        # Count matched worklogs
        matched_primary = sum(len(g.primary_worklogs) for g in matched_groups.values())
        matched_secondary = sum(len(g.secondary_worklogs) for g in matched_groups.values())
        print(f"\nMatched worklogs:")
        print(f"  OT: {matched_primary}/{len(ot_worklogs)} ({matched_primary/len(ot_worklogs)*100:.1f}%)")
        print(f"  MMFG: {matched_secondary}/{len(mmfg_worklogs)} ({matched_secondary/len(mmfg_worklogs)*100:.1f}%)")

        print("\n" + "="*80)
        print("\n🔧 Step 2: Apply Generic Issues")
        print("-"*80)

        if not generic_issues:
            print("\n⚠️  No generic issues configured!")
            return

        # Apply generic issues
        matched_groups = apply_generic_issues(
            matched_groups, generic_issues, ot_worklogs, mmfg_worklogs, user_to_team
        )

        # Find GENERIC groups (new format: "ISSUE-123 (Generic)")
        generic_groups = {k: v for k, v in matched_groups.items() if '(Generic)' in k or '(Generic - Team' in k}

        print(f"\n✅ Generic groups created: {len(generic_groups)}")

        if generic_groups:
            for key, group in generic_groups.items():
                print(f"\n📦 {key}:")
                print(f"   Primary (OT): {len(group.primary_worklogs)} worklogs, {group.primary_hours:.1f}h")
                print(f"   Secondary (MMFG): {len(group.secondary_worklogs)} worklogs, {group.secondary_hours:.1f}h")
                print(f"   Delta: {group.delta:+.1f}h")

                if group.primary_issues:
                    print(f"   Primary issues: {', '.join(list(group.primary_issues)[:5])}")
                if group.secondary_issues:
                    print(f"   Secondary issues: {', '.join(list(group.secondary_issues)[:10])}")
        else:
            print("\n❌ NO generic groups created!")
            print("\nDebugging info:")

            # Check if SYSMMFG-3658 has worklogs
            sysmmfg_wls = [wl for wl in ot_worklogs if wl.issue_key == 'SYSMMFG-3658']
            print(f"\n  SYSMMFG-3658 worklogs in OT: {len(sysmmfg_wls)}")
            if sysmmfg_wls:
                print(f"    Hours: {sum(wl.time_spent_seconds for wl in sysmmfg_wls)/3600:.1f}h")

            # Check if MMFG has worklogs with matching issue_type
            incident_wls = [wl for wl in mmfg_worklogs if wl.issue_type in ['Task', 'Incident', 'Request', 'Support', 'Bug']]
            print(f"\n  MMFG worklogs with matching types: {len(incident_wls)}")
            if incident_wls:
                print(f"    Hours: {sum(wl.time_spent_seconds for wl in incident_wls)/3600:.1f}h")

                # Check team membership
                team_filtered = [wl for wl in incident_wls if user_to_team.get(wl.author_email.lower()) == 1]
                print(f"    With team_id=1: {len(team_filtered)}")
                print(f"    Hours (team filtered): {sum(wl.time_spent_seconds for wl in team_filtered)/3600:.1f}h")

                # Sample issues
                sample_issues = list(set(wl.issue_key for wl in incident_wls))[:10]
                print(f"    Sample issues: {', '.join(sample_issues)}")

        print("\n" + "="*80)
        print("\n📊 Final Summary")
        print("-"*80)
        print(f"Total groups: {len(matched_groups)}")
        print(f"Generic groups: {len(generic_groups)}")
        print(f"Standard groups: {len(matched_groups) - len(generic_groups)}")


if __name__ == "__main__":
    asyncio.run(test_generic_issues_e2e())
