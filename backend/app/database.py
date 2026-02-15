"""
PostgreSQL async connection pool manager.
"""
import asyncpg
import os
import logging
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

logger = logging.getLogger(__name__)


class Database:
    """PostgreSQL async connection pool manager."""

    def __init__(self):
        self.pool: asyncpg.Pool | None = None

    async def connect(self, dsn: str | None = None):
        """Initialize connection pool."""
        database_url = dsn or os.getenv("DATABASE_URL")
        if not database_url:
            raise ValueError("DATABASE_URL environment variable is required")

        self.pool = await asyncpg.create_pool(
            dsn=database_url,
            min_size=5,
            max_size=20,
            command_timeout=30,
        )
        logger.info("PostgreSQL connection pool created")

    async def disconnect(self):
        """Close connection pool."""
        if self.pool:
            await self.pool.close()
            logger.info("PostgreSQL connection pool closed")

    @asynccontextmanager
    async def acquire(self):
        """Acquire a connection from the pool."""
        async with self.pool.acquire() as conn:
            yield conn

    @asynccontextmanager
    async def transaction(self):
        """Acquire a connection and start a transaction."""
        async with self.pool.acquire() as conn:
            async with conn.transaction():
                yield conn


# Global database instance
db = Database()
