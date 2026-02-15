#!/usr/bin/env python3
"""
Test to verify that generic issues are excluded from parent linking
"""

from collections import namedtuple
from app.matching_algorithms import ParentLinkingMatcher, apply_generic_issues

# Mock worklog structure
Worklog = namedtuple('Worklog', [
    'issue_key', 'parent_key', 'parent_name', 'issue_summary',
    'time_spent_seconds', 'jira_instance', 'issue_type', 'author_email'
])


def test_generic_issue_exclusion():
    """Test that worklogs on generic issues are excluded from parent linking"""

    print("\n🧪 Test: Generic Issue Exclusion from Parent Linking\n")
    print("="*80)

    # Setup: Create worklogs
    # Primary (OT) - Worklog on SYSMMFG-3658 with parent SYSMMFG-3649
    primary_wls = [
        Worklog(
            issue_key='SYSMMFG-3658',
            parent_key='SYSMMFG-3649',
            parent_name='SYSMMFG-3649 - Parent Issue',
            issue_summary='Generic issue for incidents',
            time_spent_seconds=7200,  # 2h
            jira_instance='OT',
            issue_type='Task',
            author_email='test@example.com'
        )
    ]

    # Secondary (MMFG) - Incident worklogs without cross-instance match
    # These are "orphan" worklogs that only exist on MMFG side
    secondary_wls = [
        Worklog(
            issue_key='DMA-123',
            parent_key=None,  # No parent
            parent_name=None,
            issue_summary='Some incident',
            time_spent_seconds=1800,  # 0.5h
            jira_instance='MMFG',
            issue_type='Incident',
            author_email='test@example.com'
        ),
        Worklog(
            issue_key='DMA-456',
            parent_key=None,  # No parent
            parent_name=None,
            issue_summary='Another incident',
            time_spent_seconds=1800,  # 0.5h
            jira_instance='MMFG',
            issue_type='Incident',
            author_email='test@example.com'
        )
    ]

    # Generic issue config
    generic_issues = [
        {
            'issue_code': 'SYSMMFG-3658',
            'issue_type': 'Incident',
            'team_id': None,
            'description': 'Container for all incidents'
        }
    ]

    user_to_team = {'test@example.com': 1}

    print("📋 Test Setup:")
    print(f"  Primary (OT): SYSMMFG-3658 (2h) with parent_key=SYSMMFG-3649")
    print(f"  Secondary (MMFG): DMA-123, DMA-456 (1h total) with issue_type=Incident")
    print(f"  Generic Issue Config: SYSMMFG-3658 → Incident")
    print(f"  Expected: SYSMMFG-3658 should NOT match to SYSMMFG-3649 in parent linking\n")

    print("-"*80)
    print("\n🔧 Step 1: Parent Linking WITHOUT exclusion")
    print("-"*80)

    # Test 1: WITHOUT generic issue exclusion
    matcher = ParentLinkingMatcher()
    matched_groups_without = matcher.find_groups(
        primary_wls, secondary_wls, config={}, exclusions=[], generic_issue_codes=[]
    )

    print(f"\nGroups created: {len(matched_groups_without)}")
    for key, group in matched_groups_without.items():
        print(f"  • {key}: {group.primary_hours:.1f}h (OT) vs {group.secondary_hours:.1f}h (MMFG)")

    # Verify: Should match on SYSMMFG-3649 (the parent)
    assert 'SYSMMFG-3649' in matched_groups_without, "❌ Should match on parent key"
    assert len(matched_groups_without['SYSMMFG-3649'].primary_worklogs) == 1, "❌ Should have 1 primary worklog"
    print("\n✅ Without exclusion: Matched on parent key (SYSMMFG-3649)")

    print("\n" + "="*80)
    print("\n🔧 Step 2: Parent Linking WITH exclusion")
    print("-"*80)

    # Test 2: WITH generic issue exclusion
    generic_issue_codes = ['SYSMMFG-3658']
    matched_groups_with = matcher.find_groups(
        primary_wls, secondary_wls, config={}, exclusions=[], generic_issue_codes=generic_issue_codes
    )

    print(f"\nGroups created: {len(matched_groups_with)}")
    for key, group in matched_groups_with.items():
        print(f"  • {key}: {group.primary_hours:.1f}h (OT) vs {group.secondary_hours:.1f}h (MMFG)")

    # Verify: Should NOT match on SYSMMFG-3649 (worklog was skipped)
    if 'SYSMMFG-3649' in matched_groups_with:
        print(f"\n❌ FAIL: Still matched on parent key!")
        print(f"   Primary worklogs: {len(matched_groups_with['SYSMMFG-3649'].primary_worklogs)}")
    else:
        print("\n✅ With exclusion: Worklog skipped from parent matching")

    print("\n" + "="*80)
    print("\n🔧 Step 3: Apply Generic Issues")
    print("-"*80)

    # Apply generic issues
    matched_groups_final = apply_generic_issues(
        matched_groups_with, generic_issues, primary_wls, secondary_wls, user_to_team
    )

    # Find generic groups
    generic_groups = {k: v for k, v in matched_groups_final.items() if k.startswith('GENERIC_')}

    print(f"\nGeneric groups created: {len(generic_groups)}")
    for key, group in generic_groups.items():
        print(f"\n📦 {key}:")
        print(f"   Primary (OT): {len(group.primary_worklogs)} worklogs, {group.primary_hours:.1f}h")
        print(f"   Secondary (MMFG): {len(group.secondary_worklogs)} worklogs, {group.secondary_hours:.1f}h")
        print(f"   Delta: {group.delta:+.1f}h")

    # Verify: Should have created generic group
    expected_key = 'SYSMMFG-3658 (Generic)'
    if expected_key in matched_groups_final:
        group = matched_groups_final[expected_key]
        print(f"\n✅ SUCCESS: Generic group created!")
        print(f"   {expected_key}:")
        print(f"     Primary (OT): {group.primary_hours:.1f}h")
        print(f"     Secondary (MMFG): {group.secondary_hours:.1f}h")
        print(f"     Delta: {group.delta:+.1f}h")

        # Verify primary side
        assert group.primary_hours == 2.0, f"❌ Expected 2h primary, got {group.primary_hours}h"
        assert len(group.primary_worklogs) == 1, f"❌ Expected 1 primary worklog"
        assert group.primary_worklogs[0].issue_key == 'SYSMMFG-3658', f"❌ Wrong primary issue"

        print(f"\n✅ VERIFICATION PASSED:")
        print(f"   • Primary worklog on SYSMMFG-3658 correctly excluded from parent matching")
        print(f"   • Generic group created with correct primary hours (2h)")
        print(f"   • Secondary worklogs matched by issue_type=Incident")
    else:
        print(f"\n❌ FAIL: Generic group not created!")
        print(f"   Expected: {expected_key}")
        print(f"   Got: {list(matched_groups_final.keys())}")

    print("\n" + "="*80)


if __name__ == "__main__":
    test_generic_issue_exclusion()
