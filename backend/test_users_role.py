#!/usr/bin/env python3
"""Test that users have role field in API responses."""
import asyncio
from app.config import get_users_from_db

async def test_users_role():
    """Test that get_users_from_db returns role field."""
    print("Testing users with role field...")

    # Get users for company_id=1
    users = await get_users_from_db(company_id=1)

    print(f"\nFound {len(users)} users:")
    for user in users:
        print(f"\n  {user['first_name']} {user['last_name']} ({user['email']})")
        print(f"    Role: {user.get('role', 'MISSING')}")
        print(f"    Role Level: {user.get('role_level', 'MISSING')}")
        print(f"    Team: {user.get('team_name', 'No team')}")

    # Verify all users have role field
    missing_role = [u for u in users if 'role' not in u or u['role'] is None]
    if missing_role:
        print(f"\n❌ {len(missing_role)} users missing role field!")
        return False

    print("\n✅ All users have role field!")
    return True

if __name__ == "__main__":
    asyncio.run(test_users_role())
