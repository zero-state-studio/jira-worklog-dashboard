#!/usr/bin/env python3
"""
Initialize the database with all required tables.
Run this after cleaning the database.
"""
import asyncio
from app.cache import get_storage


async def init_database():
    """Initialize the database."""
    print("Initializing database...")
    storage = get_storage()
    await storage.initialize()
    print("✅ Database initialized successfully!")
    print("\nYou can now start the backend server.")


if __name__ == "__main__":
    asyncio.run(init_database())
