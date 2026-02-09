"""
Pytest configuration and fixtures for multi-tenant tests.
"""
import os
import asyncio
import pytest
from httpx import AsyncClient

# Add parent directory to path for imports
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Use test database
os.environ["DB_PATH"] = "test_worklog_storage.db"

from app.main import app
from app.cache import WorklogStorage
from app.auth.jwt import create_access_token


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
async def storage():
    """Create clean test database for each test."""
    db_path = "test_worklog_storage.db"

    # Remove existing test database
    if os.path.exists(db_path):
        os.remove(db_path)

    # Create new storage instance
    test_storage = WorklogStorage(db_path=db_path)
    await test_storage.initialize()

    yield test_storage

    # Cleanup
    if os.path.exists(db_path):
        os.remove(db_path)


@pytest.fixture
async def setup_companies(storage):
    """Create two test companies."""
    # Company 1
    company1_id = await storage.create_company(
        name="Test Company 1",
        domain="company1.test"
    )

    # Company 2
    company2_id = await storage.create_company(
        name="Test Company 2",
        domain="company2.test"
    )

    return {
        "company1_id": company1_id,
        "company2_id": company2_id,
        "storage": storage
    }


@pytest.fixture
def company1_admin_token(setup_companies):
    """Generate JWT token for Company 1 ADMIN user."""
    return create_access_token(
        user_id=1001,
        company_id=setup_companies["company1_id"],
        email="admin1@company1.test",
        role="ADMIN"
    )


@pytest.fixture
def company1_user_token(setup_companies):
    """Generate JWT token for Company 1 USER."""
    return create_access_token(
        user_id=1002,
        company_id=setup_companies["company1_id"],
        email="user1@company1.test",
        role="USER"
    )


@pytest.fixture
def company2_admin_token(setup_companies):
    """Generate JWT token for Company 2 ADMIN user."""
    return create_access_token(
        user_id=2001,
        company_id=setup_companies["company2_id"],
        email="admin2@company2.test",
        role="ADMIN"
    )


@pytest.fixture
def company2_user_token(setup_companies):
    """Generate JWT token for Company 2 USER."""
    return create_access_token(
        user_id=2002,
        company_id=setup_companies["company2_id"],
        email="user2@company2.test",
        role="USER"
    )


@pytest.fixture
async def client():
    """Create async HTTP client for testing."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
