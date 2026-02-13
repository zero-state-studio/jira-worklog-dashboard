#!/usr/bin/env python3
"""Test script to verify authorization with role_level."""
from app.auth.dependencies import CurrentUser
from app.models import UserRole

def test_authorization():
    """Test CurrentUser role level authorization methods."""
    print("Testing authorization with role_level...")

    # Test all roles
    test_cases = [
        {
            "role": "DEV",
            "level": 1,
            "can_manage_teams": False,
            "can_manage_users": False,
            "is_manager": False,
            "is_admin": False,
        },
        {
            "role": "PM",
            "level": 2,
            "can_manage_teams": True,
            "can_manage_users": False,
            "is_manager": False,
            "is_admin": False,
        },
        {
            "role": "MANAGER",
            "level": 3,
            "can_manage_teams": True,
            "can_manage_users": True,
            "is_manager": True,
            "is_admin": False,
        },
        {
            "role": "ADMIN",
            "level": 4,
            "can_manage_teams": True,
            "can_manage_users": True,
            "is_manager": True,
            "is_admin": True,
        },
    ]

    for test_case in test_cases:
        role = test_case["role"]
        level = test_case["level"]
        print(f"\nTesting {role} (level {level}):")

        # Create CurrentUser instance
        user = CurrentUser(
            id=1,
            company_id=1,
            email=f"test_{role.lower()}@example.com",
            role=role,
            role_level=level,
            google_id="test123"
        )

        # Test has_role_level
        for check_level in range(1, 5):
            expected = level >= check_level
            actual = user.has_role_level(check_level)
            assert actual == expected, f"has_role_level({check_level}) failed for {role}"
            if expected:
                print(f"  ✓ has_role_level({check_level}): {actual}")

        # Test helper methods
        assert user.can_manage_teams() == test_case["can_manage_teams"], f"can_manage_teams failed for {role}"
        print(f"  ✓ can_manage_teams: {user.can_manage_teams()}")

        assert user.can_manage_users() == test_case["can_manage_users"], f"can_manage_users failed for {role}"
        print(f"  ✓ can_manage_users: {user.can_manage_users()}")

        # Test backward compatibility
        assert user.is_manager() == test_case["is_manager"], f"is_manager failed for {role}"
        print(f"  ✓ is_manager: {user.is_manager()}")

        assert user.is_admin() == test_case["is_admin"], f"is_admin failed for {role}"
        print(f"  ✓ is_admin: {user.is_admin()}")

    print("\n" + "="*50)
    print("✓ All authorization tests passed!")
    print("="*50)

    # Test permissions summary
    print("\nPermission Matrix:")
    print("="*50)
    print(f"{'Role':<10} {'Level':<7} {'Teams':<7} {'Users':<7} {'Manager':<9} {'Admin':<7}")
    print("-"*50)
    for tc in test_cases:
        print(f"{tc['role']:<10} {tc['level']:<7} "
              f"{'✓' if tc['can_manage_teams'] else '✗':<7} "
              f"{'✓' if tc['can_manage_users'] else '✗':<7} "
              f"{'✓' if tc['is_manager'] else '✗':<9} "
              f"{'✓' if tc['is_admin'] else '✗':<7}")
    print("="*50)

if __name__ == "__main__":
    test_authorization()
