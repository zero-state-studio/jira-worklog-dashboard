# Development Guide

## Overview

This guide covers best practices, conventions, and workflows for developing the JIRA Worklog Dashboard.

---

## Code Organization

### Backend Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app, CORS, startup/shutdown
│   ├── cache.py             # WorklogStorage class (2500+ lines)
│   ├── config.py            # Settings (Pydantic BaseSettings)
│   ├── auth/                # Authentication & authorization
│   │   ├── jwt.py           # Token encode/decode
│   │   ├── dependencies.py  # get_current_user, require_admin
│   │   ├── google_oauth.py  # OAuth flow
│   │   └── models.py        # CurrentUser, UserRole
│   ├── routers/             # API endpoints (11 routers)
│   │   ├── worklogs.py      # Worklog CRUD & queries
│   │   ├── billing.py       # Invoices, clients, projects
│   │   ├── teams.py         # Team management
│   │   ├── settings.py      # JIRA instances, config
│   │   └── ...
│   ├── models/              # Pydantic request/response models
│   └── utils/               # Helper functions
├── tests/                   # pytest test suite
│   ├── conftest.py          # Test fixtures
│   ├── test_multi_tenant.py # Security tests
│   └── test_*.py            # Feature tests
├── migrations/              # Database migration scripts
├── maintenance/             # Archive/cleanup scripts
├── requirements.txt         # Python dependencies
└── .env                     # Environment variables (not committed)
```

### Frontend Structure

```
frontend/
├── src/
│   ├── App.tsx              # Root component, routing
│   ├── main.tsx             # React entry point
│   ├── api/                 # API client & types
│   │   ├── client.ts        # Axios instance with auth
│   │   └── endpoints/       # Typed API functions
│   ├── components/          # Reusable UI components
│   │   ├── common/          # Buttons, inputs, modals
│   │   ├── layout/          # Header, sidebar, footer
│   │   └── features/        # Feature-specific components
│   ├── pages/               # Route pages
│   │   ├── Dashboard.tsx
│   │   ├── Worklogs.tsx
│   │   ├── Billing.tsx
│   │   └── ...
│   ├── hooks/               # Custom React hooks
│   ├── contexts/            # React contexts (auth, theme)
│   ├── utils/               # Helper functions
│   └── types/               # TypeScript type definitions
├── public/                  # Static assets
└── .env                     # Environment variables (not committed)
```

---

## Naming Conventions

### Backend (Python)

**Files & Modules:**
- `snake_case.py` - All Python files
- Routers named after resource: `worklogs.py`, `teams.py`, `billing.py`

**Variables & Functions:**
```python
# snake_case for variables, functions, methods
user_email = "test@example.com"
async def get_worklog_by_id(worklog_id: int, company_id: int):
    pass

# PascalCase for classes
class WorklogStorage:
    pass

# UPPER_SNAKE_CASE for constants
DEFAULT_RATE = 100.0
MAX_SYNC_RETRIES = 3
```

**Database:**
```python
# Table names: plural, snake_case
teams, users, worklogs, billing_clients

# Column names: singular, snake_case
company_id, author_email, time_spent_seconds

# Indexes: idx_{table}_{columns}
idx_worklogs_company_started
idx_teams_company_name
```

### Frontend (TypeScript/React)

**Files:**
```typescript
// PascalCase for components
Dashboard.tsx, WorklogTable.tsx, TeamSelector.tsx

// camelCase for utilities
apiClient.ts, formatDate.ts, useAuth.ts

// kebab-case for styles (if using CSS modules)
worklog-table.module.css
```

**Variables & Functions:**
```typescript
// camelCase for variables, functions
const userName = "John Doe";
function fetchWorklogs(filters: WorklogFilters) {}

// PascalCase for components, types, interfaces
interface WorklogItem {}
type UserRole = "ADMIN" | "MANAGER" | "USER";
function WorklogTable() {}

// UPPER_SNAKE_CASE for constants
const API_BASE_URL = "http://localhost:8000";
const MAX_RETRIES = 3;
```

---

## Critical Patterns

### 1. Multi-Tenant Security (MANDATORY)

**Every endpoint:**
```python
@router.get("/resource")
async def get_resource(current_user: CurrentUser = Depends(get_current_user)):
    storage = get_storage()
    return await storage.get_resource(current_user.company_id)
```

**Every storage method:**
```python
async def get_resource(self, company_id: int):
    if not company_id:
        raise ValueError("company_id is required")
    # ... WHERE company_id = ? ...
```

**Security checklist:**
- [ ] Endpoint uses `Depends(get_current_user)` or `Depends(require_admin)`
- [ ] `company_id` passed from `current_user.company_id` (never from request body)
- [ ] Storage method validates `company_id` is not None
- [ ] SQL query includes `WHERE company_id = ?`
- [ ] Cross-company access returns 404 (not 403)

### 2. Error Handling

**Backend:**
```python
from fastapi import HTTPException

# User-facing errors
if not team:
    raise HTTPException(status_code=404, detail="Team not found")

if current_user.role != "ADMIN":
    raise HTTPException(status_code=403, detail="Admin access required")

# Validation errors (Pydantic handles automatically)
class TeamCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
```

**Frontend:**
```typescript
// Using TanStack Query
const { data, error, isLoading } = useQuery({
  queryKey: ['teams'],
  queryFn: fetchTeams
});

if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;

return <TeamList teams={data} />;
```

### 3. Async/Await

**Backend:**
```python
# Always use async/await for I/O operations
async def get_worklogs(self, company_id: int):
    cursor = await self.db.execute(...)  # Await database calls
    rows = await cursor.fetchall()       # Await cursor operations
    return [dict(row) for row in rows]

# Use aiosqlite, not sqlite3
import aiosqlite
db = await aiosqlite.connect("db.sqlite")
```

**Frontend:**
```typescript
// Use async/await in API calls
async function fetchWorklogs(filters: WorklogFilters): Promise<Worklog[]> {
  const response = await apiClient.get('/api/worklogs', { params: filters });
  return response.data;
}

// TanStack Query handles async automatically
const { data } = useQuery({
  queryKey: ['worklogs', filters],
  queryFn: () => fetchWorklogs(filters)
});
```

### 4. Database Transactions

**When to use:**
- Multi-step operations that must succeed/fail together
- Updates that affect multiple tables
- Creating related records (team + team_members)

**Example:**
```python
async def create_team_with_members(
    self,
    company_id: int,
    team_name: str,
    member_emails: list[str]
):
    # Start transaction
    await self.db.execute("BEGIN")

    try:
        # Create team
        cursor = await self.db.execute(
            "INSERT INTO teams (company_id, name) VALUES (?, ?)",
            (company_id, team_name)
        )
        team_id = cursor.lastrowid

        # Add members
        for email in member_emails:
            user = await self.get_user_by_email(email, company_id)
            if user:
                await self.db.execute(
                    "INSERT INTO team_members (team_id, user_id, company_id) VALUES (?, ?, ?)",
                    (team_id, user["id"], company_id)
                )

        # Commit transaction
        await self.db.commit()
        return await self.get_team_by_id(team_id, company_id)

    except Exception as e:
        # Rollback on error
        await self.db.rollback()
        raise
```

---

## API Design

### Request/Response Patterns

**List Resources:**
```python
@router.get("/teams", response_model=list[TeamResponse])
async def list_teams(current_user: CurrentUser = Depends(get_current_user)):
    storage = get_storage()
    teams = await storage.get_all_teams(current_user.company_id)
    return teams
```

**Get Single Resource:**
```python
@router.get("/teams/{team_id}", response_model=TeamResponse)
async def get_team(
    team_id: int,
    current_user: CurrentUser = Depends(get_current_user)
):
    storage = get_storage()
    team = await storage.get_team_by_id(team_id, current_user.company_id)

    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    return team
```

**Create Resource:**
```python
@router.post("/teams", response_model=TeamResponse, status_code=201)
async def create_team(
    team_data: TeamCreate,
    current_user: CurrentUser = Depends(get_current_user)
):
    storage = get_storage()
    team = await storage.create_team(
        company_id=current_user.company_id,
        name=team_data.name,
        description=team_data.description
    )
    return team
```

**Update Resource:**
```python
@router.put("/teams/{team_id}", response_model=TeamResponse)
async def update_team(
    team_id: int,
    team_data: TeamUpdate,
    current_user: CurrentUser = Depends(get_current_user)
):
    storage = get_storage()
    team = await storage.update_team(
        team_id=team_id,
        company_id=current_user.company_id,
        name=team_data.name,
        description=team_data.description
    )

    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    return team
```

**Delete Resource:**
```python
@router.delete("/teams/{team_id}", status_code=204)
async def delete_team(
    team_id: int,
    current_user: CurrentUser = Depends(get_current_user)
):
    storage = get_storage()
    deleted = await storage.delete_team(team_id, current_user.company_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="Team not found")

    return  # 204 No Content (no body)
```

### Filtering & Pagination

**Query Parameters:**
```python
@router.get("/worklogs")
async def list_worklogs(
    start_date: str | None = None,
    end_date: str | None = None,
    author_email: str | None = None,
    limit: int = 100,
    offset: int = 0,
    current_user: CurrentUser = Depends(get_current_user)
):
    storage = get_storage()
    worklogs = await storage.get_worklogs(
        company_id=current_user.company_id,
        start_date=start_date,
        end_date=end_date,
        author_email=author_email,
        limit=limit,
        offset=offset
    )
    return {"worklogs": worklogs, "limit": limit, "offset": offset}
```

---

## Testing

### Test Structure

```python
# tests/test_teams.py

import pytest
from app.cache import WorklogStorage

@pytest.mark.asyncio
async def test_create_team(storage: WorklogStorage, company1: dict):
    """Test creating a team."""

    team = await storage.create_team(
        company_id=company1["id"],
        name="Test Team",
        description="A test team"
    )

    assert team is not None
    assert team["name"] == "Test Team"
    assert team["company_id"] == company1["id"]

@pytest.mark.asyncio
async def test_team_isolation(storage: WorklogStorage, company1: dict, company2: dict):
    """Verify teams are isolated by company."""

    # Company 1 creates team
    team = await storage.create_team(
        company_id=company1["id"],
        name="Company 1 Team"
    )

    # Company 2 cannot see it
    result = await storage.get_team_by_id(team["id"], company2["id"])
    assert result is None
```

### Fixtures

```python
# tests/conftest.py

import pytest
from app.cache import WorklogStorage

@pytest.fixture
async def storage():
    """Create test storage with isolated database."""
    storage = WorklogStorage("test_worklog_storage.db")
    await storage.initialize()
    yield storage
    await storage.close()

@pytest.fixture
async def company1(storage):
    """Create test company 1."""
    cursor = await storage.db.execute(
        "INSERT INTO companies (name) VALUES (?)",
        ("Test Company 1",)
    )
    await storage.db.commit()
    return {"id": cursor.lastrowid, "name": "Test Company 1"}

@pytest.fixture
async def company2(storage):
    """Create test company 2."""
    cursor = await storage.db.execute(
        "INSERT INTO companies (name) VALUES (?)",
        ("Test Company 2",)
    )
    await storage.db.commit()
    return {"id": cursor.lastrowid, "name": "Test Company 2"}
```

### Running Tests

```bash
# All tests
pytest

# Specific file
pytest tests/test_teams.py

# Specific test
pytest tests/test_teams.py::test_create_team

# With coverage
pytest --cov=app tests/

# Verbose output
pytest -v

# Show print statements
pytest -s
```

---

## Git Workflow

### Branch Naming

```
feature/add-recurring-invoices
bugfix/fix-rate-cascade-nulls
security/audit-billing-endpoints
refactor/split-cache-module
docs/update-api-reference
```

### Commit Messages

**Format:** `type: brief description`

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `security:` Security fix or audit
- `refactor:` Code refactoring (no behavior change)
- `perf:` Performance improvement
- `test:` Add or update tests
- `docs:` Documentation changes
- `chore:` Build, dependencies, tooling

**Examples:**
```
feat: add recurring invoice templates
fix: rate cascade returns null for missing default
security: add company_id filter to team members endpoint
refactor: split cache.py into smaller modules
perf: add composite index for worklog queries
test: add security tests for billing endpoints
docs: update API reference with new endpoints
chore: upgrade FastAPI to 0.110.0
```

### Pull Requests

**Title:** Same format as commit message

**Description Template:**
```markdown
## Summary
Brief description of changes

## Changes
- Added X feature
- Fixed Y bug
- Updated Z documentation

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Security tests pass
- [ ] Manual testing completed

## Screenshots (if UI change)
[Include screenshots]

## Notes
Any additional context or gotchas
```

---

## Performance Best Practices

### Database

**Do:**
- ✅ Use indexes on frequently queried columns
- ✅ Write specific SELECT queries (avoid `SELECT *`)
- ✅ Use LIMIT for large result sets
- ✅ Denormalize for read-heavy queries

**Don't:**
- ❌ Run N+1 queries (fetch related data in joins, not loops)
- ❌ Fetch all data then filter in Python (filter in SQL)
- ❌ Use `LIKE '%search%'` without index (slow)

**Example:**
```python
# ❌ BAD - N+1 queries
teams = await storage.get_all_teams(company_id)
for team in teams:
    members = await storage.get_team_members(team["id"], company_id)  # N queries!
    team["members"] = members

# ✅ GOOD - Single query with join
cursor = await db.execute("""
    SELECT
        t.id, t.name,
        u.id as member_id, u.email as member_email
    FROM teams t
    LEFT JOIN team_members tm ON t.id = tm.team_id
    LEFT JOIN users u ON tm.user_id = u.id
    WHERE t.company_id = ?
    ORDER BY t.id, u.email
""", (company_id,))
```

### API

**Do:**
- ✅ Paginate large result sets
- ✅ Cache frequently accessed data
- ✅ Use background tasks for slow operations
- ✅ Return only needed fields

**Don't:**
- ❌ Return entire database in single request
- ❌ Block requests waiting for external APIs
- ❌ Compute expensive aggregations on every request

**Example:**
```python
# ❌ BAD - Blocks request for 30s
@router.post("/sync")
async def sync_all():
    await sync_all_jira_instances()  # Slow!
    return {"status": "complete"}

# ✅ GOOD - Background task
from fastapi import BackgroundTasks

@router.post("/sync")
async def sync_all(background_tasks: BackgroundTasks):
    background_tasks.add_task(sync_all_jira_instances)
    return {"status": "started"}  # Returns immediately
```

### Frontend

**Do:**
- ✅ Use TanStack Query for caching
- ✅ Debounce search inputs
- ✅ Lazy load large lists
- ✅ Memoize expensive computations

**Don't:**
- ❌ Fetch same data multiple times
- ❌ Re-render entire tree on every keystroke
- ❌ Load all data upfront (paginate)

**Example:**
```typescript
// ✅ GOOD - TanStack Query caches automatically
const { data: teams } = useQuery({
  queryKey: ['teams'],
  queryFn: fetchTeams,
  staleTime: 5 * 60 * 1000  // Cache for 5 minutes
});

// ✅ GOOD - Debounced search
const [search, setSearch] = useState('');
const debouncedSearch = useDebounce(search, 300);

const { data } = useQuery({
  queryKey: ['worklogs', debouncedSearch],
  queryFn: () => fetchWorklogs({ search: debouncedSearch })
});
```

---

## Security Checklist

Before merging any PR:

- [ ] All endpoints use `Depends(get_current_user)` or `Depends(require_admin)`
- [ ] All storage methods accept `company_id` parameter
- [ ] All SQL queries include `WHERE company_id = ?`
- [ ] No `company_id` accepted from request body/params
- [ ] Cross-company access returns 404 (not 403)
- [ ] Sensitive data (API keys, tokens) encrypted at rest
- [ ] No SQL injection vulnerabilities (parameterized queries)
- [ ] No XSS vulnerabilities (sanitize user input)
- [ ] Tests verify multi-tenant isolation
- [ ] Admin-only endpoints properly restricted

---

## Common Mistakes to Avoid

### 1. Forgetting company_id Filter
```python
# ❌ WRONG - Leaks data across companies
async def get_teams(self):
    return await self.db.execute("SELECT * FROM teams")

# ✅ CORRECT
async def get_teams(self, company_id: int):
    if not company_id:
        raise ValueError("company_id required")
    return await self.db.execute(
        "SELECT * FROM teams WHERE company_id = ?",
        (company_id,)
    )
```

### 2. Accepting company_id from User Input
```python
# ❌ WRONG - User can impersonate other companies
@router.post("/teams")
async def create_team(team_data: TeamCreate):
    return await storage.create_team(
        company_id=team_data.company_id  # User-controlled!
    )

# ✅ CORRECT
@router.post("/teams")
async def create_team(
    team_data: TeamCreate,
    current_user: CurrentUser = Depends(get_current_user)
):
    return await storage.create_team(
        company_id=current_user.company_id  # From JWT!
    )
```

### 3. Returning 403 for Cross-Company Access
```python
# ❌ WRONG - Leaks resource existence
team = await storage.get_team_by_id_unscoped(team_id)
if team.company_id != current_user.company_id:
    raise HTTPException(status_code=403)  # Reveals team exists!

# ✅ CORRECT
team = await storage.get_team_by_id(team_id, current_user.company_id)
if not team:
    raise HTTPException(status_code=404)  # Ambiguous
```

### 4. Blocking Requests for Slow Operations
```python
# ❌ WRONG - Blocks for 30s
@router.post("/sync")
async def sync():
    await sync_all_instances()  # Slow!
    return {"status": "complete"}

# ✅ CORRECT
@router.post("/sync")
async def sync(background_tasks: BackgroundTasks):
    background_tasks.add_task(sync_all_instances)
    return {"status": "started"}
```

---

## Resources

### Documentation
- **CLAUDE.md** - Primary development instructions
- **docs/architecture.md** - System design
- **docs/conventions.md** - Detailed conventions
- **docs/desktop/multi-tenant-security.md** - Security patterns

### Code Examples
- **Routers:** `backend/app/routers/*.py`
- **Storage:** `backend/app/cache.py`
- **Tests:** `backend/tests/*.py`
- **Frontend:** `frontend/src/pages/*.tsx`

### External Docs
- **FastAPI:** https://fastapi.tiangolo.com
- **Pydantic:** https://docs.pydantic.dev
- **React:** https://react.dev
- **TanStack Query:** https://tanstack.com/query/latest
