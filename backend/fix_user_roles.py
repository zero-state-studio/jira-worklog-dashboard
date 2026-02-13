#!/usr/bin/env python3
"""Fix user roles in the database."""
import asyncio
import aiosqlite
from app.cache import get_storage
from app.models import UserRole

async def fix_user_roles():
    """Update all users to DEV, except gianluca.ricaldone@otconsulting.com as ADMIN."""
    storage = get_storage()
    await storage.initialize()

    print("Fixing user roles in database...")

    async with aiosqlite.connect(storage.db_path) as db:
        # First, check current users
        print("\nCurrent users:")
        async with db.execute("SELECT id, email, role, role_level FROM oauth_users") as cursor:
            rows = await cursor.fetchall()
            for row in rows:
                print(f"  ID {row[0]}: {row[1]} - role={row[2]}, level={row[3]}")

        # Update all users to DEV (role_level = 1)
        await db.execute("""
            UPDATE oauth_users
            SET role = 'DEV', role_level = 1
            WHERE role IS NULL OR role = ''
        """)
        print("\n✓ Set NULL/empty roles to DEV")

        # Update all users to DEV by default
        await db.execute("""
            UPDATE oauth_users
            SET role = 'DEV', role_level = 1
        """)
        print("✓ Set all users to DEV")

        # Update gianluca.ricaldone@otconsulting.com to ADMIN
        await db.execute("""
            UPDATE oauth_users
            SET role = 'ADMIN', role_level = 4
            WHERE email = 'gianluca.ricaldone@otconsulting.com'
        """)
        print("✓ Set gianluca.ricaldone@otconsulting.com to ADMIN")

        await db.commit()

        # Verify changes
        print("\nUpdated users:")
        async with db.execute("SELECT id, email, role, role_level FROM oauth_users ORDER BY role_level DESC") as cursor:
            rows = await cursor.fetchall()
            for row in rows:
                print(f"  ID {row[0]}: {row[1]} - role={row[2]}, level={row[3]}")

        # Count by role
        print("\nRole distribution:")
        async with db.execute("SELECT role, role_level, COUNT(*) FROM oauth_users GROUP BY role, role_level") as cursor:
            rows = await cursor.fetchall()
            for row in rows:
                print(f"  {row[0]} (level {row[1]}): {row[2]} users")

    print("\n✅ User roles fixed successfully!")

if __name__ == "__main__":
    asyncio.run(fix_user_roles())
