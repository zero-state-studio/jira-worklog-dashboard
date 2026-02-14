#!/usr/bin/env python3
"""
Unit tests for JIRA Exclusion Pattern Matching

Run with: python test_exclusion_patterns.py
"""

from app.matching_algorithms import _matches_exclusion_pattern


def test_wildcard_patterns():
    """Test wildcard pattern matching"""
    print("\n🧪 Testing Wildcard Patterns...")

    test_cases = [
        # Basic wildcard matching
        ("ASS-19", ["ASS-*"], True, "ASS-19 should match ASS-*"),
        ("ASS-2", ["ASS-*"], True, "ASS-2 should match ASS-*"),
        ("ASS-9999", ["ASS-*"], True, "ASS-9999 should match ASS-*"),
        ("FORM-10", ["FORM-*"], True, "FORM-10 should match FORM-*"),
        ("ADMIN-5", ["ADMIN-*"], True, "ADMIN-5 should match ADMIN-*"),

        # Should NOT match
        ("DLREQ-1447", ["ASS-*"], False, "DLREQ-1447 should NOT match ASS-*"),
        ("ASS", ["ASS-*"], False, "ASS (no dash) should NOT match ASS-*"),
        ("ASSIGNMENT-1", ["ASS-*"], False, "ASSIGNMENT-1 should NOT match ASS-* (different prefix)"),

        # Multiple patterns
        ("ASS-19", ["ASS-*", "FORM-*"], True, "ASS-19 should match first pattern"),
        ("FORM-10", ["ASS-*", "FORM-*"], True, "FORM-10 should match second pattern"),
        ("DLREQ-1", ["ASS-*", "FORM-*"], False, "DLREQ-1 should NOT match any pattern"),

        # Exact match (no wildcard)
        ("ASS", ["ASS"], True, "ASS should match exact ASS"),
        ("ASS-19", ["ASS"], False, "ASS-19 should NOT match exact ASS"),

        # Empty patterns
        ("ASS-19", [], False, "ASS-19 should NOT match empty pattern list"),

        # Complex patterns
        ("SYSMMFG-3658", ["SYS*"], True, "SYSMMFG-3658 should match SYS*"),
        ("DLWMS-866", ["DL*"], True, "DLWMS-866 should match DL*"),
    ]

    passed = 0
    failed = 0

    for linking_key, patterns, expected, description in test_cases:
        result = _matches_exclusion_pattern(linking_key, patterns)

        if result == expected:
            print(f"  ✅ {description}")
            passed += 1
        else:
            print(f"  ❌ {description}")
            print(f"      Input: linking_key='{linking_key}', patterns={patterns}")
            print(f"      Expected: {expected}, Got: {result}")
            failed += 1

    print(f"\n📊 Results: {passed} passed, {failed} failed")

    if failed == 0:
        print("✅ All tests passed!\n")
        return True
    else:
        print(f"❌ {failed} test(s) failed\n")
        return False


if __name__ == "__main__":
    success = test_wildcard_patterns()
    exit(0 if success else 1)
