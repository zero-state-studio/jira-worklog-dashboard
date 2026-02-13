#!/usr/bin/env python3
"""Add role and role_level columns to users table."""
import asyncio
import aiosqlite
from app.cache import get_storage

async def migrate_users_table():
    """Add role and role_level to users table and populate values."""
    storage = get_storage()
    await storage.initialize()

    print("Migrating users table to add role fields...")

    async with aiosqlite.connect(storage.db_path) as db:
        # Check if columns already exist
        async with db.execute("PRAGMA table_info(users)") as cursor:
            columns = await cursor.fetchall()
            column_names = [col[1] for col in columns]

        if 'role' in column_names:
            print("⚠️  role column already exists")
        else:
            # Add role column
            await db.execute("""
                ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'DEV'
            """)
            print("✓ Added role column to users table")

        if 'role_level' in column_names:
            print("⚠️  role_level column already exists")
        else:
            # Add role_level column
            await db.execute("""
                ALTER TABLE users ADD COLUMN role_level INTEGER NOT NULL DEFAULT 1
            """)
            print("✓ Added role_level column to users table")

        # Set all users to DEV by default
        await db.execute("""
            UPDATE users
            SET role = 'DEV', role_level = 1
        """)
        print("✓ Set all users to DEV (level 1)")

        # Set gianluca.ricaldone@otconsulting.com to ADMIN
        await db.execute("""
            UPDATE users
            SET role = 'ADMIN', role_level = 4
            WHERE email = 'gianluca.ricaldone@otconsulting.com'
        """)
        print("✓ Set gianluca.ricaldone@otconsulting.com to ADMIN (level 4)")

        await db.commit()

        # Verify changes
        print("\n=== Updated Users Table ===")
        async with db.execute("""
            SELECT id, email, first_name, last_name, role, role_level
            FROM users
            ORDER BY role_level DESC
        """) as cursor:
            rows = await cursor.fetchall()
            for row in rows:
                print(f"  ID {row[0]}: {row[1]} ({row[2]} {row[3]}) - {row[4]} (level {row[5]})")

        # Count by role
        print("\n=== Role Distribution ===")
        async with db.execute("""
            SELECT role, role_level, COUNT(*)
            FROM users
            GROUP BY role, role_level
        """) as cursor:
            rows = await cursor.fetchall()
            for row in rows:
                print(f"  {row[0]} (level {row[1]}): {row[2]} users")

    print("\n✅ Users table migration complete!")

if __name__ == "__main__":
    asyncio.run(migrate_users_table())
