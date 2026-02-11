# QA Engineer

## Role Overview
Responsible for testing infrastructure, multi-tenant isolation verification, API endpoint testing, performance benchmarking, test coverage reporting, and bug reproduction.

---

## Primary Responsibilities

### Test Suite Maintenance
- Maintain 20+ security/isolation test cases
- Write new tests for every feature
- Ensure test database isolation
- Keep test fixtures up-to-date
- Monitor test coverage

### Multi-Tenant Security Testing
- Verify company_id filtering in all queries
- Test cross-company access prevention (404 not 403)
- Validate credential isolation per company
- Ensure auth middleware works correctly

### API Testing
- Test all 111 endpoints for:
  - Authentication (JWT validation)
  - Authorization (role-based access)
  - Input validation (Pydantic models)
  - Error responses (correct status codes)
  - Multi-tenant data scoping

### Performance Testing
- Benchmark critical queries
- Load testing for sync operations
- Database performance testing
- API response time monitoring

### Regression Testing
- Prevent bugs from reappearing
- Test bug fixes thoroughly
- Maintain regression test suite
- Document known issues

---

## Files/Folders Ownership

### Test Suite
- `backend/tests/` (4 files, ~1,300 lines)
  - `test_multi_tenant.py` (20 security tests)
    - Authentication tests (5 tests)
    - Authorization tests (3 tests)
    - Multi-tenant isolation tests (8 tests)
    - End-to-end tests (4 tests)

  - `test_upsert_performance.py` (performance benchmarks)
    - Bulk insert performance
    - Query performance
    - Index effectiveness

  - `conftest.py` (pytest fixtures)
    - Test database setup
    - Auth token generation
    - FastAPI test client
    - Mock data generators

  - `test_routers.py` (endpoint tests - if exists)
    - Individual router endpoint tests
    - Request/response validation

### Documentation
- `backend/tests/README.md`
  - Security verification checklist
  - Test running instructions
  - Test writing guidelines
  - Known issues documentation

---

## Test Architecture

### Test Database Isolation

**CRITICAL: Tests NEVER touch production database**

```python
# conftest.py
import pytest
import os
from app.cache import WorklogStorage

TEST_DB = "test_worklog_storage.db"

@pytest.fixture(scope="function")
async def test_storage():
    """Isolated test database, fresh for each test"""
    # Create test database
    storage = WorklogStorage(TEST_DB)
    await storage.initialize()

    yield storage

    # Cleanup: Delete test database
    storage.close()
    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)

@pytest.fixture
def test_client(test_storage):
    """FastAPI test client with test database"""
    from app.main import app
    from fastapi.testclient import TestClient

    # Override storage dependency to use test database
    app.dependency_overrides[get_storage] = lambda: test_storage

    client = TestClient(app)
    yield client

    app.dependency_overrides.clear()
```

### Test Categories

**1. Authentication Tests**
```python
@pytest.mark.asyncio
async def test_no_token_returns_401(test_client):
    """Endpoint without auth token should return 401"""
    response = test_client.get("/api/teams")
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_invalid_token_returns_401(test_client):
    """Invalid JWT token should return 401"""
    response = test_client.get(
        "/api/teams",
        headers={"Authorization": "Bearer invalid_token"}
    )
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_valid_token_returns_200(test_client, test_storage):
    """Valid JWT token should return 200"""
    # Create user and generate token
    user = await test_storage.create_user({
        'email': 'user@test.com',
        'company_id': 1,
        'role': 'USER'
    })
    token = create_access_token(
        user_id=user['id'],
        email=user['email'],
        company_id=1,
        role='USER'
    )

    response = test_client.get(
        "/api/teams",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
```

**2. Authorization Tests**
```python
@pytest.mark.asyncio
async def test_user_role_cannot_access_admin_endpoint(test_client):
    """USER role should get 403 on admin endpoint"""
    token = create_token_with_role('USER')

    response = test_client.delete(
        "/api/teams/1",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 403

@pytest.mark.asyncio
async def test_admin_role_can_access_admin_endpoint(test_client):
    """ADMIN role should get 200 on admin endpoint"""
    token = create_token_with_role('ADMIN')

    response = test_client.delete(
        "/api/teams/1",
        headers={"Authorization": f"Bearer {token}"}
    )
    # May be 404 if team doesn't exist, but NOT 403
    assert response.status_code in [200, 404]
```

**3. Multi-Tenant Isolation Tests**
```python
@pytest.mark.asyncio
async def test_company_a_cannot_see_company_b_teams(test_storage):
    """Teams are isolated by company_id"""
    # Create teams for different companies
    team_a = await test_storage.create_team("Team A", company_id=1)
    team_b = await test_storage.create_team("Team B", company_id=2)

    # Company 1 should only see Team A
    teams_1 = await test_storage.get_all_teams(company_id=1)
    assert len(teams_1) == 1
    assert teams_1[0]['name'] == "Team A"

    # Company 2 should only see Team B
    teams_2 = await test_storage.get_all_teams(company_id=2)
    assert len(teams_2) == 1
    assert teams_2[0]['name'] == "Team B"

@pytest.mark.asyncio
async def test_cross_company_access_returns_404(test_client, test_storage):
    """Accessing another company's resource returns 404"""
    # Create team for Company 1
    team = await test_storage.create_team("Team A", company_id=1)

    # Create user for Company 2
    user_b = await test_storage.create_user({
        'email': 'user@company-b.com',
        'company_id': 2,
        'role': 'USER'
    })
    token_b = create_access_token(
        user_id=user_b['id'],
        email=user_b['email'],
        company_id=2,
        role='USER'
    )

    # Try to access Company 1's team as Company 2 user
    response = test_client.get(
        f"/api/teams/{team['id']}",
        headers={"Authorization": f"Bearer {token_b}"}
    )

    # Should return 404 (not 403) to avoid leaking existence
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()
```

**4. Performance Tests**
```python
@pytest.mark.performance
@pytest.mark.asyncio
async def test_bulk_worklog_insert_performance(test_storage):
    """Bulk insert should handle 1000 worklogs in <1 second"""
    import time

    # Generate 1000 test worklogs
    worklogs = [
        {
            'id': f'WL-{i}',
            'company_id': 1,
            'author_email': 'user@test.com',
            'time_spent_seconds': 3600,
            'started': datetime.utcnow(),
            'jira_instance': 'Test'
        }
        for i in range(1000)
    ]

    # Measure insert time
    start = time.time()
    await test_storage.upsert_worklogs(worklogs)
    duration = time.time() - start

    # Should complete in <1 second
    assert duration < 1.0, f"Bulk insert took {duration:.2f}s (target: <1s)"

@pytest.mark.performance
@pytest.mark.asyncio
async def test_worklog_query_performance(test_storage):
    """Query with company_id filter should be fast"""
    import time

    # Insert test data
    await test_storage.upsert_worklogs([...])  # 1000 worklogs

    # Measure query time
    start = time.time()
    worklogs = await test_storage.get_worklogs_in_range(
        start_date=date(2024, 1, 1),
        end_date=date(2024, 1, 31),
        company_id=1
    )
    duration = time.time() - start

    # Should complete in <300ms
    assert duration < 0.3, f"Query took {duration*1000:.0f}ms (target: <300ms)"
```

---

## Dependencies

### ⬇️ Depends On (Tests All Agents)

**Backend-Core-Engineer:**
- Tests router endpoints
- Validates API contracts
- Checks error handling

**Database-Engineer:**
- Tests storage methods
- Validates SQL queries
- Checks index usage

**Frontend-Engineer:**
- May test UI components (future: Playwright/Cypress)
- Validates API client integration

**Security-Engineer:**
- Tests authentication flow
- Validates authorization rules
- Checks multi-tenant isolation

**Integration-Engineer:**
- Tests JIRA/Tempo sync
- Validates external API integration
- Checks error handling

**Billing-Engineer:**
- Tests billing calculations
- Validates rate cascade
- Checks invoice generation

### ⬆️ Provides To

**Tech-Lead:**
- Test coverage reports
- Quality metrics
- Bug reports
- Performance benchmarks

**All Engineers:**
- Bug reproduction steps
- Test failures for debugging
- Regression prevention

---

## Required Skills

### Core Technologies
- **pytest**: Test framework, fixtures, markers
- **pytest-asyncio**: Async test support
- **FastAPI TestClient**: API testing
- **unittest.mock**: Mocking external dependencies
- **coverage.py**: Code coverage measurement

### Testing Patterns
- AAA pattern (Arrange, Act, Assert)
- Test isolation
- Fixture management
- Mocking strategies
- Performance benchmarking

### Security Testing
- Authentication testing
- Authorization testing
- Multi-tenant isolation verification
- Credential security testing

---

## Development Workflow

### Writing a New Test

1. **Identify Test Category**
   - Authentication? Authorization? Isolation? Performance?
   - Choose appropriate test file

2. **Write Test with AAA Pattern**
   ```python
   @pytest.mark.asyncio
   async def test_feature_does_something(test_storage, test_client):
       """Test that feature does something correctly"""

       # ARRANGE: Set up test data
       user = await test_storage.create_user({
           'email': 'user@test.com',
           'company_id': 1
       })
       token = create_access_token(user['id'], user['email'], 1, 'USER')

       # ACT: Perform action
       response = test_client.post(
           "/api/feature",
           json={"data": "test"},
           headers={"Authorization": f"Bearer {token}"}
       )

       # ASSERT: Verify results
       assert response.status_code == 200
       assert response.json()["success"] == True
   ```

3. **Run Test**
   ```bash
   pytest tests/test_multi_tenant.py::test_feature_does_something -v
   ```

4. **Check Coverage**
   ```bash
   pytest tests/test_multi_tenant.py --cov=app --cov-report=html
   open htmlcov/index.html
   ```

5. **Document Test**
   - Clear docstring explaining what is tested
   - Comment complex setup/assertions
   - Reference related tests

### Test Writing Checklist

When writing tests for new feature:

- ✅ **Authentication**: Test without token (401), invalid token (401), valid token (200)
- ✅ **Authorization**: Test USER role (403 on admin), MANAGER role, ADMIN role (200)
- ✅ **Multi-tenant**: Test company_id filtering, cross-company access (404)
- ✅ **Input validation**: Test invalid input (422), valid input (200)
- ✅ **Error cases**: Test not found (404), conflict (409), server error (500)
- ✅ **Edge cases**: Test empty lists, null values, boundary conditions
- ✅ **Performance**: Test with large datasets (if applicable)

---

## Common Test Patterns

### Fixture Pattern for Test Data

```python
@pytest.fixture
async def test_user(test_storage):
    """Create test user"""
    user = await test_storage.create_user({
        'email': 'test@example.com',
        'company_id': 1,
        'role': 'USER'
    })
    return user

@pytest.fixture
async def test_admin(test_storage):
    """Create test admin"""
    admin = await test_storage.create_user({
        'email': 'admin@example.com',
        'company_id': 1,
        'role': 'ADMIN'
    })
    return admin

@pytest.fixture
def user_token(test_user):
    """Generate token for test user"""
    return create_access_token(
        user_id=test_user['id'],
        email=test_user['email'],
        company_id=test_user['company_id'],
        role=test_user['role']
    )

# Usage
@pytest.mark.asyncio
async def test_with_fixtures(test_client, user_token):
    response = test_client.get(
        "/api/resource",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 200
```

### Parametrized Test Pattern

```python
@pytest.mark.parametrize("role,expected_status", [
    ("USER", 403),
    ("MANAGER", 403),
    ("ADMIN", 200),
])
@pytest.mark.asyncio
async def test_admin_endpoint_authorization(role, expected_status, test_client):
    """Test admin endpoint with different roles"""
    token = create_token_with_role(role)

    response = test_client.delete(
        "/api/admin/action",
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == expected_status
```

### Mock External API Pattern

```python
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_jira_sync_with_mock():
    """Test JIRA sync with mocked API calls"""

    # Mock JIRA API response
    mock_worklogs = [
        {
            'id': '12345',
            'issue': {'key': 'PROJ-123'},
            'author': {'email': 'user@test.com'},
            'timeSpentSeconds': 7200
        }
    ]

    with patch('app.jira_client.JiraClient.get_worklogs') as mock_get:
        mock_get.return_value = mock_worklogs

        # Run sync
        result = await sync_worklogs(...)

        # Verify
        assert result['worklogs_synced'] == 1
        assert mock_get.called
```

---

## Test Coverage Targets

### Current Coverage
- **Overall**: ~60% (needs improvement)
- **Auth module**: 90% (good)
- **Storage layer**: 70% (acceptable)
- **Routers**: 50% (needs improvement)

### Target Coverage
- **Overall**: 80%+
- **Auth module**: 95%+
- **Storage layer**: 85%+
- **Routers**: 75%+
- **Billing logic**: 90%+ (critical)

### Measuring Coverage

```bash
# Generate coverage report
pytest tests/ --cov=app --cov-report=html

# View report
open htmlcov/index.html

# Coverage by file
pytest tests/ --cov=app --cov-report=term-missing

# Fail if coverage below threshold
pytest tests/ --cov=app --cov-fail-under=80
```

---

## Performance Benchmarking

### Benchmark Suite

```python
# test_performance.py
import pytest
import time
from datetime import date

@pytest.mark.performance
class TestQueryPerformance:
    """Performance benchmarks for critical queries"""

    @pytest.mark.asyncio
    async def test_dashboard_query_performance(self, test_storage):
        """Dashboard query should complete in <300ms"""
        # Setup: Insert realistic data volume
        await self._setup_data(test_storage, num_worklogs=10000)

        # Benchmark
        start = time.time()
        result = await test_storage.get_dashboard_stats(
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31),
            company_id=1
        )
        duration = time.time() - start

        # Assert
        assert duration < 0.3, f"Query took {duration*1000:.0f}ms (target: <300ms)"

    @pytest.mark.asyncio
    async def test_sync_performance(self, test_storage):
        """Sync should handle 5K worklogs in <5 seconds"""
        worklogs = self._generate_worklogs(5000)

        start = time.time()
        await test_storage.upsert_worklogs(worklogs)
        duration = time.time() - start

        assert duration < 5.0, f"Sync took {duration:.2f}s (target: <5s)"
```

### Running Benchmarks

```bash
# Run only performance tests
pytest tests/ -m performance -v

# Run with profiling
pytest tests/test_performance.py --profile

# Compare before/after optimization
pytest tests/test_performance.py --benchmark-only --benchmark-save=before
# ... make optimization ...
pytest tests/test_performance.py --benchmark-only --benchmark-save=after
pytest-benchmark compare before after
```

---

## Bug Reproduction

### Bug Report Template

When reproducing a bug:

1. **Minimal Reproduction**
   ```python
   @pytest.mark.asyncio
   async def test_bug_123_reproduction(test_storage):
       """
       Bug #123: Cross-company access returns 403 instead of 404

       Steps to reproduce:
       1. Create team for Company A
       2. Create user for Company B
       3. Try to access Company A team as Company B user
       4. Expected: 404, Actual: 403
       """

       # Reproduce bug
       team_a = await test_storage.create_team("Team A", company_id=1)
       user_b_token = create_token_for_company(2)

       response = test_client.get(
           f"/api/teams/{team_a['id']}",
           headers={"Authorization": f"Bearer {user_b_token}"}
       )

       # This currently FAILS (bug exists)
       assert response.status_code == 404  # Expected
       # Currently returns 403
   ```

2. **Document Expected vs Actual**
   - Clear description of expected behavior
   - Actual behavior observed
   - Steps to reproduce
   - Affected endpoints/components

3. **Fix Verification**
   ```python
   @pytest.mark.asyncio
   async def test_bug_123_fixed(test_storage):
       """Verify bug #123 is fixed"""

       # Same reproduction steps
       team_a = await test_storage.create_team("Team A", company_id=1)
       user_b_token = create_token_for_company(2)

       response = test_client.get(
           f"/api/teams/{team_a['id']}",
           headers={"Authorization": f"Bearer {user_b_token}"}
       )

       # After fix, this should PASS
       assert response.status_code == 404
       assert "not found" in response.json()["detail"].lower()
   ```

---

## Continuous Integration (Future)

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v2

    - name: Set up Python
      uses: actions/setup-python@v2
      with:
        python-version: '3.11'

    - name: Install dependencies
      run: |
        cd backend
        pip install -r requirements.txt
        pip install pytest pytest-asyncio pytest-cov

    - name: Run tests
      run: |
        cd backend
        pytest tests/ --cov=app --cov-report=xml --cov-report=term

    - name: Upload coverage
      uses: codecov/codecov-action@v2
      with:
        file: ./backend/coverage.xml
```

---

## Best Practices

### Test Isolation
- **Each test independent**: Tests should not depend on each other
- **Clean state**: Use fixtures to create fresh state for each test
- **No shared state**: Avoid global variables or class attributes

### Test Naming
- **Descriptive names**: `test_user_cannot_access_other_company_data`
- **Follow pattern**: `test_<what>_<condition>_<expected_result>`
- **Clear intent**: Name should explain what is being tested

### Test Maintenance
- **Keep tests fast**: Total test suite <30 seconds
- **Fail fast**: Critical tests first
- **Clear failures**: Assertion messages explain what went wrong
- **Update regularly**: Update tests when code changes

### Documentation
- **Docstrings**: Every test needs clear docstring
- **Comments**: Complex setup/assertions need comments
- **README**: Keep test README up-to-date

---

## Troubleshooting

### Common Test Issues

**Issue: Tests pass locally but fail in CI**
- Check for timing issues (use asyncio properly)
- Verify test database isolation
- Check for hardcoded paths
- Ensure all dependencies installed

**Issue: Test database not cleaned up**
- Check fixture scope (should be "function")
- Verify cleanup code in fixture
- Check for exceptions preventing cleanup

**Issue: Slow test suite (>1 minute)**
- Profile tests: `pytest --profile`
- Check for unnecessary database operations
- Use mocks for external APIs
- Parallelize with `pytest-xdist`

**Issue: Flaky tests (intermittent failures)**
- Check for race conditions
- Verify proper async/await usage
- Check for shared state between tests
- Add explicit waits if needed

---

## Communication Protocol

### When to Notify Other Agents

**All Engineers:**
- Test failures in their code
- New test requirements for features
- Performance regression detected

**Tech-Lead:**
- Test coverage drops below threshold
- Critical bugs discovered
- Performance benchmarks degraded
- Quality metrics reports (weekly)

**Specific Engineer:**
- Test failure in their module
- Bug reproduction complete
- Performance issue in their code

---

## Resources

### Documentation
- pytest docs: https://docs.pytest.org/
- pytest-asyncio: https://pytest-asyncio.readthedocs.io/
- FastAPI testing: https://fastapi.tiangolo.com/tutorial/testing/
- coverage.py: https://coverage.readthedocs.io/

### Internal References
- Project overview: `/docs/project-overview.md`
- Test suite: `/backend/tests/`
- Test README: `/backend/tests/README.md`

---

## Quick Reference Commands

```bash
# Run all tests
cd backend
pytest tests/ -v

# Run specific test file
pytest tests/test_multi_tenant.py -v

# Run specific test
pytest tests/test_multi_tenant.py::test_auth_invalid_token_returns_401 -v

# Run with coverage
pytest tests/ --cov=app --cov-report=html
open htmlcov/index.html

# Run only fast tests (skip performance)
pytest tests/ -v -m "not performance"

# Run only performance tests
pytest tests/ -v -m performance

# Run tests in parallel (faster)
pytest tests/ -n auto

# Run with verbose output
pytest tests/ -vv

# Stop on first failure
pytest tests/ -x

# Show print statements
pytest tests/ -s
```
