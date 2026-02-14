#!/usr/bin/env python3
"""
Test new matching algorithm with real data from database
"""

import asyncio
import aiosqlite
from app.matching_algorithms import ParentLinkingMatcher
from collections import namedtuple

# Mock worklog structure
Worklog = namedtuple('Worklog', ['issue_key', 'parent_key', 'parent_name', 'issue_summary', 'time_spent_seconds'])


async def test_matching():
    """Test the new matching algorithm with real database data"""

    print("\n🧪 Testing New Matching Algorithm\n")
    print("="*80)

    async with aiosqlite.connect('worklog_storage.db') as db:
        # Get DLWMS and SYSMMFG worklogs for DLREQ-1447
        print("\n📋 Test Case 1: DLREQ-1447 matching")
        print("-"*80)

        async with db.execute('''
            SELECT issue_key, parent_key, parent_name, issue_summary, time_spent_seconds
            FROM worklogs
            WHERE issue_key IN ('DLWMS-864', 'DLWMS-865', 'DLWMS-866',
                               'SYSMMFG-5344', 'SYSMMFG-5348', 'SYSMMFG-5349')
            LIMIT 20
        ''') as cursor:
            rows = await cursor.fetchall()

        # Convert to Worklog objects
        worklogs = [Worklog(*row) for row in rows]

        # Split by instance (simulate primary/secondary)
        dlwms_wls = [w for w in worklogs if w.issue_key.startswith('DLWMS')]
        sysmmfg_wls = [w for w in worklogs if w.issue_key.startswith('SYSMMFG')]

        # Test the matcher
        matcher = ParentLinkingMatcher()

        print(f"\n🔵 MMFG Side (DLWMS): {len(dlwms_wls)} worklogs")
        for wl in dlwms_wls[:3]:  # Show first 3
            key = matcher._extract_linking_key(wl)
            print(f"  {wl.issue_key} → linking_key: {key}")

        print(f"\n🔵 OT Side (SYSMMFG): {len(sysmmfg_wls)} worklogs")
        for wl in sysmmfg_wls[:3]:  # Show first 3
            key = matcher._extract_linking_key(wl)
            print(f"  {wl.issue_key} → linking_key: {key}")

        # Run full matching
        groups = matcher.find_groups(dlwms_wls, sysmmfg_wls, config={}, exclusions=[])

        print(f"\n📊 Matching Results:")
        print(f"  Total groups: {len(groups)}")

        # Check if DLREQ-1447 group exists
        if 'DLREQ-1447' in groups:
            group = groups['DLREQ-1447']
            print(f"\n  ✅ DLREQ-1447 group found!")
            print(f"     Primary worklogs: {len(group.primary_worklogs)} ({group.primary_hours:.1f}h)")
            print(f"     Secondary worklogs: {len(group.secondary_worklogs)} ({group.secondary_hours:.1f}h)")
            print(f"     Delta: {group.delta:.1f}h")
            print(f"     Primary issues: {', '.join(group.primary_issues[:3])}")
            print(f"     Secondary issues: {', '.join(group.secondary_issues[:3])}")
        else:
            print(f"\n  ❌ DLREQ-1447 group NOT found (matching failed)")

        # Test Case 2: DLREQ-1448
        print("\n" + "="*80)
        print("\n📋 Test Case 2: DLREQ-1448 matching")
        print("-"*80)

        async with db.execute('''
            SELECT issue_key, parent_key, parent_name, issue_summary, time_spent_seconds
            FROM worklogs
            WHERE issue_key IN ('DLREQ-1448', 'SYSMMFG-5378')
        ''') as cursor:
            rows = await cursor.fetchall()

        worklogs2 = [Worklog(*row) for row in rows]

        dlreq_wls = [w for w in worklogs2 if w.issue_key.startswith('DLREQ')]
        sysmmfg2_wls = [w for w in worklogs2 if w.issue_key.startswith('SYSMMFG')]

        print(f"\n🔵 MMFG Side (DLREQ): {len(dlreq_wls)} worklogs")
        for wl in dlreq_wls:
            key = matcher._extract_linking_key(wl)
            print(f"  {wl.issue_key} → linking_key: {key}")

        print(f"\n🔵 OT Side (SYSMMFG): {len(sysmmfg2_wls)} worklogs")
        for wl in sysmmfg2_wls:
            key = matcher._extract_linking_key(wl)
            print(f"  {wl.issue_key} → linking_key: {key}")

        # Run matching
        groups2 = matcher.find_groups(dlreq_wls, sysmmfg2_wls, config={}, exclusions=[])

        print(f"\n📊 Matching Results:")
        print(f"  Total groups: {len(groups2)}")

        if 'DLREQ-1448' in groups2:
            group = groups2['DLREQ-1448']
            print(f"\n  ✅ DLREQ-1448 group found!")
            print(f"     Primary worklogs: {len(group.primary_worklogs)} ({group.primary_hours:.1f}h)")
            print(f"     Secondary worklogs: {len(group.secondary_worklogs)} ({group.secondary_hours:.1f}h)")
            print(f"     Delta: {group.delta:.1f}h")
        else:
            print(f"\n  ❌ DLREQ-1448 group NOT found (matching failed)")

    print("\n" + "="*80)
    print("✅ Test completed!\n")


if __name__ == "__main__":
    asyncio.run(test_matching())
