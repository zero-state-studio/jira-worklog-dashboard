# Code Conventions & Standards

> **Navigation:** [Architecture](./architecture.md) | [Database Schema](./database-schema.md) | [API Reference](./api-reference.md) | [Setup](./setup-and-commands.md)

This document defines coding standards, naming conventions, and development patterns for the JIRA Worklog Dashboard project.

---

## File Organization

### Backend Structure

```
backend/app/
├── main.py                    # FastAPI app initialization, CORS, lifespan
├── models.py                  # All Pydantic models (84 models)
├── cache.py                   # WorklogStorage class (5,297 lines)
├── config.py                  # Configuration loader
├── {feature}_client.py        # External API clients (jira, tempo, factorial)
├── {feature}.py               # Business logic modules (billing, holidays)
│
├── auth/                      # Authentication module
│   ├── jwt.py
│   ├── dependencies.py
│   └── google_oauth.py
│
├── middleware/                # Custom middleware
│   └── company_context.py
│
└── routers/                   # API route handlers
    ├── auth.py
    ├── dashboard.py
    ├── teams.py
    └── ... (11 total routers)
```

**Rules:**
- One router per resource type (teams, users, epics, etc.)
- Business logic goes in dedicated modules (`billing.py`, `holidays.py`)
- External integrations in `{service}_client.py` files
- All Pydantic models centralized in `models.py`

### Frontend Structure

```
frontend/src/
├── App.jsx                    # Routes + global state
├── main.jsx                   # React entry point
├── index.css                  # Tailwind + utilities
│
├── api/
│   └── client.js              # API wrapper (Tauri-aware)
│
├── hooks/
│   └── useData.js             # Custom data hooks
│
├── components/
│   ├── Layout.jsx             # Shell component
│   ├── {Feature}Card.jsx      # Reusable cards
│   ├── {Feature}Chart.jsx     # Chart components
│   ├── {Feature}Modal.jsx     # Modal dialogs
│   │
│   ├── WorklogCalendar/       # Feature-specific modules
│   │   ├── WorklogCalendar.jsx
│   │   ├── CalendarDayCell.jsx
│   │   └── calendarUtils.js
│   │
│   └── settings/              # Settings panels
│       ├── TeamsSection.jsx
│       └── ... (13 sections)
│
└── pages/                     # Route components
    ├── Dashboard.jsx
    ├── {Resource}ListView.jsx
    ├── {Resource}View.jsx
    └── ... (14 pages)
```

**Rules:**
- Pages in `pages/` directory (one per route)
- Reusable components in `components/`
- Complex features get subdirectories (`WorklogCalendar/`, `settings/`)
- Utility functions in `{feature}Utils.js` files

---

## Naming Conventions

### Python (Backend)

#### Files

```python
# Module names: lowercase with underscores
cache.py
jira_client.py
tempo_client.py
google_oauth.py
```

#### Classes

```python
# PascalCase for classes
class WorklogStorage:
    pass

class JiraClient:
    pass

class CurrentUser:
    pass
```

#### Functions

```python
# snake_case for functions
async def get_all_teams(company_id: int):
    pass

async def bulk_upsert_worklogs(company_id: int, worklogs: list):
    pass

def calculate_billable_hours(worklogs: list, rates: dict):
    pass
```

#### Variables

```python
# snake_case for variables
team_name = "Engineering"
start_date = "2024-01-01"
worklog_count = 42

# SCREAMING_SNAKE_CASE for constants
DEFAULT_WORKING_HOURS = 8
MAX_RETRY_ATTEMPTS = 3
API_TIMEOUT_SECONDS = 30
```

#### Private Members

```python
# Single underscore prefix for internal use
class WorklogStorage:
    def __init__(self):
        self._connection = None  # Internal state

    async def _execute_query(self, sql: str):  # Internal method
        pass
```

### JavaScript (Frontend)

#### Files

```javascript
// PascalCase for React components
Dashboard.jsx
TeamView.jsx
WorklogCalendar.jsx

// camelCase for utilities/hooks
useData.js
calendarUtils.js
apiClient.js
```

#### Components

```javascript
// PascalCase for component names
function Dashboard() {}
function TeamCard({ team }) {}
function WorklogCalendar({ dateRange }) {}

// camelCase for props
<TeamCard team={teamData} showMembers={true} />
```

#### Functions & Variables

```javascript
// camelCase for functions and variables
const fetchTeams = async () => {};
const calculateTotalHours = (worklogs) => {};

const teamName = "Engineering";
const startDate = "2024-01-01";
const worklogCount = 42;

// SCREAMING_SNAKE_CASE for constants
const DEFAULT_DATE_RANGE = 30;
const API_BASE_URL = "/api";
const MAX_ITEMS_PER_PAGE = 50;
```

### Database

#### Tables

```sql
-- Lowercase with underscores
teams
users
jira_instances
worklogs
billing_clients
complementary_groups
```

#### Columns

```sql
-- Lowercase with underscores
company_id
team_name
created_at
time_spent_seconds
epic_key
```

#### Indexes

```sql
-- Prefix with idx_, describe what it indexes
idx_worklogs_company_started
idx_users_company_email
idx_teams_company
idx_billing_clients_company
```

---

## Type Hints & Validation

### Python Type Hints (Required)

```python
# ✅ Good - All parameters and return types annotated
async def get_team_by_name(
    self,
    company_id: int,
    team_name: str
) -> dict | None:
    """
    Get team by name for a specific company.

    Args:
        company_id: Company ID for multi-tenant filtering
        team_name: Name of the team to retrieve

    Returns:
        Team dict or None if not found
    """
    pass

# ❌ Bad - Missing type hints
async def get_team_by_name(self, company_id, team_name):
    pass
```

### Pydantic Models (Preferred)

```python
# Use Pydantic for all API request/response models
from pydantic import BaseModel, Field, validator

class TeamCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None
    members: list[str] = Field(default_factory=list)

    @validator('name')
    def validate_name(cls, v):
        if not v.strip():
            raise ValueError("Team name cannot be empty")
        return v.strip()

class TeamResponse(BaseModel):
    id: int
    company_id: int
    name: str
    description: str | None
    member_count: int
    created_at: str

    class Config:
        from_attributes = True  # For ORM compatibility
```

### PropTypes (Frontend - Optional)

```javascript
// Use PropTypes for component validation
import PropTypes from 'prop-types';

function TeamCard({ team, showMembers, onSelect }) {
  // Component logic
}

TeamCard.propTypes = {
  team: PropTypes.shape({
    name: PropTypes.string.isRequired,
    member_count: PropTypes.number.isRequired,
    total_hours: PropTypes.number,
  }).isRequired,
  showMembers: PropTypes.bool,
  onSelect: PropTypes.func,
};

TeamCard.defaultProps = {
  showMembers: false,
  onSelect: () => {},
};
```

---

## Import Organization

### Python

```python
# 1. Standard library imports
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional

# 2. Third-party imports
import aiosqlite
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

# 3. Local application imports
from app.auth.dependencies import get_current_user
from app.cache import get_storage
from app.models import TeamCreate, TeamResponse
```

### JavaScript

```javascript
// 1. React/Third-party libraries
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth } from 'date-fns';

// 2. API/Utils
import { apiClient } from '../api/client';
import { formatHours, calculateTotals } from '../utils/dataUtils';

// 3. Components
import Layout from '../components/Layout';
import TeamCard from '../components/TeamCard';
import TrendChart from '../components/Charts';

// 4. Styles (if any)
import './Dashboard.css';
```

---

## Code Patterns

### Multi-Tenant Router Pattern (Critical)

**Every router endpoint MUST follow this pattern:**

```python
from fastapi import APIRouter, Depends, HTTPException
from app.auth.dependencies import get_current_user
from app.auth.jwt import CurrentUser
from app.cache import get_storage

router = APIRouter()

@router.get("/teams")
async def list_teams(
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    List all teams for the current user's company.

    Security: Automatically filtered by company_id from JWT token.
    """
    storage = get_storage()
    teams = await storage.get_all_teams(current_user.company_id)
    return teams

@router.post("/teams")
async def create_team(
    team: TeamCreate,
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Create a new team.

    Security: company_id taken from current user, not request body.
    """
    storage = get_storage()
    team_id = await storage.create_team(
        company_id=current_user.company_id,  # Explicit!
        name=team.name,
        description=team.description
    )
    return {"id": team_id}

@router.get("/teams/{team_name}")
async def get_team(
    team_name: str,
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Get team by name.

    Security: Returns 404 if team doesn't exist or belongs to different company.
    """
    storage = get_storage()
    team = await storage.get_team_by_name(
        company_id=current_user.company_id,
        team_name=team_name
    )

    if not team:
        # 404 (not 403) to avoid leaking resource existence
        raise HTTPException(status_code=404, detail="Team not found")

    return team
```

**Key Rules:**
1. ✅ Always use `Depends(get_current_user)` on protected endpoints
2. ✅ Extract `current_user.company_id` and pass explicitly to storage
3. ✅ Return 404 (not 403) for cross-company access
4. ❌ Never accept `company_id` from request body/params

### Multi-Tenant Storage Pattern (Critical)

**Every storage method MUST filter by company_id:**

```python
class WorklogStorage:
    async def get_all_teams(self, company_id: int) -> list[dict]:
        """
        Get all teams for a company.

        Args:
            company_id: Required for multi-tenant isolation

        Returns:
            List of team dicts

        Raises:
            ValueError: If company_id is None or 0
        """
        if not company_id:
            raise ValueError("company_id is required")

        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                """
                SELECT id, company_id, name, description, created_at
                FROM teams
                WHERE company_id = ?
                ORDER BY name
                """,
                (company_id,)
            ) as cursor:
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]

    async def create_team(
        self,
        company_id: int,
        name: str,
        description: str | None = None
    ) -> int:
        """
        Create a new team.

        Args:
            company_id: Company ID (REQUIRED)
            name: Team name
            description: Optional description

        Returns:
            Team ID
        """
        if not company_id:
            raise ValueError("company_id is required")

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                """
                INSERT INTO teams (company_id, name, description, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (company_id, name, description, datetime.now().isoformat())
            )
            await db.commit()
            return cursor.lastrowid
```

**Key Rules:**
1. ✅ First parameter is always `company_id: int`
2. ✅ Validate `company_id` at start of method
3. ✅ Every SQL query includes `WHERE company_id = ?`
4. ✅ INSERT statements include `company_id` in values

### Error Handling

#### Backend (FastAPI)

```python
from fastapi import HTTPException
from pydantic import ValidationError

# 400 Bad Request - Client error
if not team_name:
    raise HTTPException(
        status_code=400,
        detail="Team name is required"
    )

# 401 Unauthorized - Authentication failed
if not current_user:
    raise HTTPException(
        status_code=401,
        detail="Authentication required"
    )

# 403 Forbidden - Insufficient permissions
if current_user.role not in ["ADMIN", "MANAGER"]:
    raise HTTPException(
        status_code=403,
        detail="Admin or Manager role required"
    )

# 404 Not Found - Resource doesn't exist (or cross-company access)
if not team:
    raise HTTPException(
        status_code=404,
        detail="Team not found"
    )

# 422 Unprocessable Entity - Validation error
try:
    team = TeamCreate(**request_data)
except ValidationError as e:
    raise HTTPException(status_code=422, detail=str(e))

# 500 Internal Server Error - Unexpected errors
try:
    result = await storage.complex_operation()
except Exception as e:
    logging.error(f"Unexpected error: {e}")
    raise HTTPException(
        status_code=500,
        detail="Internal server error"
    )
```

#### Frontend (React)

```javascript
// API call with error handling
try {
  const response = await apiClient.get(`/teams/${teamName}`);
  setTeam(response.data);
} catch (error) {
  if (error.response?.status === 401) {
    // Redirect to login
    navigate('/login');
  } else if (error.response?.status === 404) {
    // Show not found message
    setError("Team not found");
  } else {
    // Generic error
    setError(error.response?.data?.detail || "An error occurred");
  }
}

// Toast notifications for user feedback
import { toast } from 'react-toastify';

try {
  await apiClient.post('/teams', teamData);
  toast.success("Team created successfully");
  navigate('/teams');
} catch (error) {
  toast.error(error.response?.data?.detail || "Failed to create team");
}
```

### Async/Await Patterns

#### Backend

```python
# ✅ Good - Proper async/await usage
async def sync_worklogs(
    company_id: int,
    start_date: str,
    end_date: str
) -> dict:
    storage = get_storage()
    instances = await storage.get_jira_instances(company_id)

    total_synced = 0
    for instance in instances:
        client = JiraClient(instance)
        worklogs = await client.get_worklogs_in_range(start_date, end_date)
        await storage.bulk_upsert_worklogs(company_id, worklogs)
        total_synced += len(worklogs)

    return {"synced": total_synced}

# ❌ Bad - Blocking I/O in async function
async def bad_sync():
    result = requests.get(url)  # Blocks event loop!
    time.sleep(5)  # Blocks event loop!
```

#### Frontend

```javascript
// ✅ Good - Proper async/await with error handling
const fetchTeamData = async (teamName) => {
  setLoading(true);
  try {
    const [team, worklogs, members] = await Promise.all([
      apiClient.get(`/teams/${teamName}`),
      apiClient.get(`/teams/${teamName}/worklogs`),
      apiClient.get(`/teams/${teamName}/members`),
    ]);

    setTeam(team.data);
    setWorklogs(worklogs.data);
    setMembers(members.data);
  } catch (error) {
    setError(error.message);
  } finally {
    setLoading(false);
  }
};

// ❌ Bad - Not handling errors, forgetting finally
const badFetch = async () => {
  setLoading(true);
  const data = await apiClient.get('/teams');  // No try/catch!
  setTeams(data);  // Loading never set to false!
};
```

---

## Documentation Standards

### Docstrings (Python)

```python
async def get_team_worklogs(
    self,
    company_id: int,
    team_name: str,
    start_date: str,
    end_date: str
) -> list[dict]:
    """
    Get all worklogs for a team within a date range.

    Aggregates worklogs from all team members across all JIRA instances.
    Respects complementary instance groups to avoid double-counting.

    Args:
        company_id: Company ID for multi-tenant filtering
        team_name: Name of the team
        start_date: ISO format date (YYYY-MM-DD)
        end_date: ISO format date (YYYY-MM-DD)

    Returns:
        List of worklog dicts, each containing:
            - id (str): Worklog ID
            - author_email (str): User email
            - issue_key (str): JIRA issue key
            - time_spent_seconds (int): Time logged
            - started (str): ISO timestamp
            - epic_name (str | None): Associated epic

    Raises:
        ValueError: If company_id is missing or dates are invalid

    Example:
        >>> worklogs = await storage.get_team_worklogs(
        ...     company_id=1,
        ...     team_name="Engineering",
        ...     start_date="2024-01-01",
        ...     end_date="2024-01-31"
        ... )
        >>> len(worklogs)
        245
    """
    pass
```

### JSDoc Comments (JavaScript - Optional)

```javascript
/**
 * Fetch team details including members and worklog summary.
 *
 * @param {string} teamName - Name of the team to fetch
 * @param {Object} dateRange - Date range for worklog aggregation
 * @param {string} dateRange.startDate - ISO date string (YYYY-MM-DD)
 * @param {string} dateRange.endDate - ISO date string (YYYY-MM-DD)
 * @returns {Promise<Object>} Team object with members and worklogs
 *
 * @example
 * const team = await fetchTeamData('Engineering', {
 *   startDate: '2024-01-01',
 *   endDate: '2024-01-31'
 * });
 */
async function fetchTeamData(teamName, dateRange) {
  // Implementation
}
```

### Inline Comments

```python
# Use comments to explain WHY, not WHAT

# ✅ Good - Explains reasoning
# Return 404 instead of 403 to prevent leaking resource existence
if not team:
    raise HTTPException(status_code=404, detail="Team not found")

# ❌ Bad - States the obvious
# Check if team is None
if not team:
    raise HTTPException(status_code=404, detail="Team not found")

# ✅ Good - Explains complex logic
# Exclude secondary instance hours from "All" view to avoid double-counting
# when complementary groups are configured (e.g., JIRA + Tempo instances)
if selected_instance == "All":
    worklogs = filter_complementary_instances(worklogs, groups)

# ✅ Good - Documents known issues or TODOs
# TODO: Add pagination to avoid memory issues with >10K worklogs
worklogs = await storage.get_all_worklogs(company_id)

# FIXME: This query is slow (1.2s) - needs composite index on (company_id, started)
cursor = await db.execute("SELECT * FROM worklogs WHERE company_id = ?", ...)
```

---

## Testing Patterns

### Backend Tests

```python
# tests/test_multi_tenant.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_team_isolation(client: AsyncClient, company1_user, company2_team):
    """
    Test that users cannot access teams from other companies.

    Security: Cross-company access should return 404 (not 403).
    """
    # Authenticate as Company 1 user
    headers = {"Authorization": f"Bearer {company1_user['token']}"}

    # Try to access Company 2 team
    response = await client.get(
        f"/api/teams/{company2_team['name']}",
        headers=headers
    )

    # Should return 404 (not 403 to avoid leaking existence)
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

@pytest.mark.asyncio
async def test_create_team_requires_auth(client: AsyncClient):
    """Test that creating a team requires authentication."""
    response = await client.post(
        "/api/teams",
        json={"name": "Test Team"}
    )

    assert response.status_code == 401
```

### Frontend Tests (Example with React Testing Library)

```javascript
// __tests__/Dashboard.test.jsx
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';

test('displays total hours from API', async () => {
  // Mock API call
  global.fetch = jest.fn(() =>
    Promise.resolve({
      json: () => Promise.resolve({ total_hours: 160 }),
    })
  );

  render(
    <BrowserRouter>
      <Dashboard />
    </BrowserRouter>
  );

  await waitFor(() => {
    expect(screen.getByText(/160 hours/i)).toBeInTheDocument();
  });
});
```

---

## Performance Best Practices

### Database Queries

```python
# ✅ Good - Single query with JOINs
async def get_team_with_members(self, company_id: int, team_id: int):
    query = """
        SELECT
            t.id, t.name,
            u.id as user_id, u.email, u.display_name
        FROM teams t
        LEFT JOIN users u ON u.team_id = t.id AND u.company_id = t.company_id
        WHERE t.company_id = ? AND t.id = ?
    """
    # Returns team with all members in one query

# ❌ Bad - N+1 queries
async def get_team_with_members_slow(self, company_id: int, team_id: int):
    team = await self.get_team(company_id, team_id)  # Query 1
    for member_id in team['member_ids']:
        member = await self.get_user(company_id, member_id)  # Query N
        team['members'].append(member)
    return team

# ✅ Good - Bulk operations
async def bulk_upsert_worklogs(self, company_id: int, worklogs: list):
    async with aiosqlite.connect(self.db_path) as db:
        await db.executemany(
            "INSERT OR REPLACE INTO worklogs (...) VALUES (?, ?, ...)",
            [(company_id, w.id, w.issue_key, ...) for w in worklogs]
        )
        await db.commit()

# ❌ Bad - One at a time
async def insert_worklogs_slow(self, company_id: int, worklogs: list):
    for worklog in worklogs:
        await self.insert_worklog(company_id, worklog)  # Slow!
```

### React Optimization

```javascript
// ✅ Good - Memoization to prevent re-renders
import { useMemo, memo } from 'react';

const TeamCard = memo(function TeamCard({ team, worklogs }) {
  const totalHours = useMemo(() => {
    return worklogs.reduce((sum, w) => sum + w.time_spent_seconds, 0) / 3600;
  }, [worklogs]);

  return <div>Total: {totalHours}h</div>;
});

// ✅ Good - Lazy loading for large lists
import { lazy, Suspense } from 'react';

const WorklogCalendar = lazy(() => import('../components/WorklogCalendar'));

function UserView() {
  return (
    <Suspense fallback={<div>Loading calendar...</div>}>
      <WorklogCalendar worklogs={worklogs} />
    </Suspense>
  );
}

// ❌ Bad - Re-creating arrays on every render
function TeamList({ teams }) {
  const sortedTeams = teams.sort((a, b) => a.name.localeCompare(b.name));  // Sorts on every render!
  return <div>{sortedTeams.map(t => <TeamCard team={t} />)}</div>;
}
```

---

## Security Checklist

Before merging code, verify:

- [ ] All router endpoints use `Depends(get_current_user)`
- [ ] All storage methods accept `company_id` as first parameter
- [ ] All SQL queries include `WHERE company_id = ?`
- [ ] Cross-company access returns 404 (not 403)
- [ ] No `company_id` accepted from request body/params
- [ ] Pydantic models validate all inputs
- [ ] JIRA credentials not exposed in API responses
- [ ] No SQL injection vulnerabilities (use parameterized queries)
- [ ] Sensitive operations logged for audit trail
- [ ] Tests verify multi-tenant isolation

---

## Code Review Guidelines

### What to Look For

**Security:**
- Multi-tenant isolation patterns followed
- Authentication/authorization present
- Input validation with Pydantic
- No SQL injection risks

**Performance:**
- Queries use indexes
- No N+1 queries
- Bulk operations for large datasets
- Async/await used correctly

**Code Quality:**
- Type hints present
- Functions focused (single responsibility)
- No code duplication
- Clear variable names
- Complex logic has comments

**Testing:**
- Unit tests for new functionality
- Multi-tenant isolation tests
- Edge cases covered

### Review Comments Template

```markdown
**Security:** ⚠️ Missing company_id filter on line 42
**Performance:** 💡 Consider adding index on (company_id, created_at)
**Code Quality:** ✅ Well-structured, clear naming
**Testing:** ❌ Need test for cross-company access scenario
```

---

## Git Commit Messages

```bash
# Format: <type>(<scope>): <subject>

# Types:
feat:     # New feature
fix:      # Bug fix
docs:     # Documentation
style:    # Formatting, missing semicolons
refactor: # Code restructuring
perf:     # Performance improvement
test:     # Adding tests
chore:    # Maintenance

# Examples:
feat(teams): add team member bulk import endpoint
fix(auth): return 404 instead of 403 for cross-company access
perf(worklogs): add composite index on (company_id, started)
docs(api): update endpoint documentation in API reference
test(billing): add tests for rate override cascade
refactor(storage): extract common query logic to helper method
```

---

## Resources

- [FastAPI Best Practices](https://fastapi.tiangolo.com/tutorial/)
- [React Hooks Best Practices](https://react.dev/reference/react)
- [Python Type Hints (PEP 484)](https://peps.python.org/pep-0484/)
- [SQLite Performance Tips](https://www.sqlite.org/performance.html)
- [Pydantic Documentation](https://docs.pydantic.dev/)
