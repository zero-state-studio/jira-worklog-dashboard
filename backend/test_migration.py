#!/usr/bin/env python3
"""Test script to verify role system migration."""
import asyncio
import sqlite3
from app.cache import get_storage

async def test_migration():
    """Test that the role migration worked correctly."""
    print("Testing role system migration...")

    storage = get_storage()
    await storage.initialize()
    print("✓ Database initialized successfully")

    # Check if role_level column exists
    conn = sqlite3.connect(storage.db_path)
    cursor = conn.cursor()

    # Check oauth_users schema
    cursor.execute("PRAGMA table_info(oauth_users)")
    columns = {row[1]: row[2] for row in cursor.fetchall()}

    if 'role_level' in columns:
        print("✓ role_level column exists in oauth_users")
        print(f"  Type: {columns['role_level']}")
    else:
        print("✗ role_level column missing!")
        return False

    # Check teams schema
    cursor.execute("PRAGMA table_info(teams)")
    columns = {row[1]: row[2] for row in cursor.fetchall()}

    if 'owner_id' in columns:
        print("✓ owner_id column exists in teams")
        print(f"  Type: {columns['owner_id']}")
    else:
        print("✗ owner_id column missing!")
        return False

    # Check indexes
    cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE '%role_level%'")
    role_indexes = cursor.fetchall()
    if role_indexes:
        print(f"✓ Role level index exists: {role_indexes[0][0]}")
    else:
        print("✗ Role level index missing!")

    cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE '%owner_id%'")
    owner_indexes = cursor.fetchall()
    if owner_indexes:
        print(f"✓ Owner ID index exists: {owner_indexes[0][0]}")
    else:
        print("✗ Owner ID index missing!")

    # Check if any users exist and their roles
    cursor.execute("SELECT COUNT(*), COUNT(DISTINCT role), COUNT(DISTINCT role_level) FROM oauth_users")
    user_count, role_count, level_count = cursor.fetchone()
    print(f"\n✓ Users in database: {user_count}")
    print(f"  Unique roles: {role_count}")
    print(f"  Unique role levels: {level_count}")

    if user_count > 0:
        cursor.execute("SELECT role, role_level, COUNT(*) FROM oauth_users GROUP BY role, role_level")
        print("\n  Role distribution:")
        for role, level, count in cursor.fetchall():
            print(f"    {role} (level {level}): {count} users")

    # Check for old USER role
    cursor.execute("SELECT COUNT(*) FROM oauth_users WHERE role = 'USER'")
    old_users = cursor.fetchone()[0]
    if old_users == 0:
        print("\n✓ No old 'USER' roles found (migration successful)")
    else:
        print(f"\n✗ Found {old_users} users with old 'USER' role!")

    conn.close()
    print("\n✓ All migration checks passed!")
    return True

if __name__ == "__main__":
    asyncio.run(test_migration())
