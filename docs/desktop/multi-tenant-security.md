# Multi-Tenant Security Guide

## Critical Security Pattern - READ THIS FIRST

**Every endpoint and storage method MUST enforce company-level data isolation.**

This is a **BLOCKING REQUIREMENT**. Failure to follow these patterns creates severe security vulnerabilities (cross-tenant data leakage).

---

## The Golden Rule

> **All data access MUST be scoped by `company_id`**

- Every router endpoint uses `Depends(get_current_user)` to extract `company_id`
- Every storage method accepts `company_id: int` as a required parameter
- Every SQL query includes `WHERE company_id = ?`
- Cross-company access returns 404 (not 403) to prevent resource existence leakage

---

## Implementation Stats (Feb 2026)

### Security Modifications
- **176 total changes**: 74 storage methods + 6 config helpers + 96 router endpoints
- **13 tables** with `company_id`: teams, users, jira_instances, worklogs, epics, billing_clients, billing_projects, invoices, package_templates, holidays, factorial_config, complementary_groups, logs
- **20 security test cases** verifying isolation

### Test Coverage
- ✅ Authentication required on all endpoints
- ✅ Company isolation prevents cross-tenant access
- ✅ Credential protection (users can't see other companies' API keys)
- ✅ 404 responses for cross-company resource access
- ✅ Admin actions restricted to same company

---

## Router Pattern (Required)

### Basic Endpoint

```python
from fastapi import APIRouter, Depends
from app.auth.dependencies import get_current_user
from app.auth.models import CurrentUser
from app.cache import get_storage

router = APIRouter()

@router.get("/teams")
async def list_teams(current_user: CurrentUser = Depends(get_current_user)):
    """List all teams for the authenticated user's company."""
    storage = get_storage()
    teams = await storage.get_all_teams(current_user.company_id)
    return {"teams": teams}
```

### Endpoint with Path Parameter

```python
@router.get("/teams/{team_id}")
async def get_team(
    team_id: int,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get a specific team (only if it belongs to user's company)."""
    storage = get_storage()
    team = await storage.get_team_by_id(team_id, current_user.company_id)

    if not team:
        # Return 404 (not 403) to avoid leaking resource existence
        raise HTTPException(status_code=404, detail="Team not found")

    return team
```

### Admin-Only Endpoint

```python
from app.auth.dependencies import require_admin

@router.post("/jira-instances")
async def create_jira_instance(
    instance_data: JiraInstanceCreate,
    current_user: CurrentUser = Depends(require_admin)  # Admin only
):
    """Create JIRA instance (admin only, scoped to their company)."""
    storage = get_storage()

    # Admin can only create instances for their own company
    instance = await storage.add_jira_instance(
        company_id=current_user.company_id,  # Force user's company
        name=instance_data.name,
        url=instance_data.url,
        # ...
    )

    return instance
```

### Create with Auto-Scoping

```python
@router.post("/billing/clients")
async def create_client(
    client_data: ClientCreate,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Create billing client (auto-scoped to user's company)."""
    storage = get_storage()

    # NEVER accept company_id from request body!
    client = await storage.create_billing_client(
        company_id=current_user.company_id,  # Always use authenticated user's company
        name=client_data.name,
        code=client_data.code,
    )

    return client
```

---

## Storage Pattern (Required)

### Basic Query

```python
async def get_all_teams(self, company_id: int) -> list[dict]:
    """Get all teams for a company."""

    # Validate company_id is provided
    if not company_id:
        raise ValueError("company_id is required for get_all_teams")

    cursor = await self.db.execute(
        """
        SELECT t.id, t.name, t.description, t.created_at
        FROM teams t
        WHERE t.company_id = ?
        ORDER BY t.name
        """,
        (company_id,)
    )

    rows = await cursor.fetchall()
    return [dict(row) for row in rows]
```

### Get by ID (with isolation check)

```python
async def get_team_by_id(self, team_id: int, company_id: int) -> dict | None:
    """Get team by ID (only if it belongs to the company)."""

    if not company_id:
        raise ValueError("company_id is required")

    cursor = await self.db.execute(
        """
        SELECT t.id, t.name, t.description, t.created_at
        FROM teams t
        WHERE t.id = ? AND t.company_id = ?
        """,
        (team_id, company_id)  # Both ID and company check
    )

    row = await cursor.fetchone()
    return dict(row) if row else None
```

### Create with Company Scoping

```python
async def create_team(
    self,
    company_id: int,
    name: str,
    description: str | None = None
) -> dict:
    """Create a new team."""

    if not company_id:
        raise ValueError("company_id is required")

    cursor = await self.db.execute(
        """
        INSERT INTO teams (company_id, name, description, created_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        """,
        (company_id, name, description)
    )

    await self.db.commit()
    team_id = cursor.lastrowid

    # Return the created team
    return await self.get_team_by_id(team_id, company_id)
```

### Update with Ownership Check

```python
async def update_team(
    self,
    team_id: int,
    company_id: int,
    name: str | None = None,
    description: str | None = None
) -> dict | None:
    """Update team (only if it belongs to the company)."""

    if not company_id:
        raise ValueError("company_id is required")

    # First verify ownership
    existing = await self.get_team_by_id(team_id, company_id)
    if not existing:
        return None  # Team doesn't exist or doesn't belong to company

    # Build update query
    updates = []
    params = []

    if name is not None:
        updates.append("name = ?")
        params.append(name)

    if description is not None:
        updates.append("description = ?")
        params.append(description)

    if not updates:
        return existing  # No changes

    params.extend([team_id, company_id])

    await self.db.execute(
        f"""
        UPDATE teams
        SET {', '.join(updates)}
        WHERE id = ? AND company_id = ?
        """,
        params
    )

    await self.db.commit()
    return await self.get_team_by_id(team_id, company_id)
```

### Delete with Ownership Check

```python
async def delete_team(self, team_id: int, company_id: int) -> bool:
    """Delete team (only if it belongs to the company)."""

    if not company_id:
        raise ValueError("company_id is required")

    # Check ownership first
    existing = await self.get_team_by_id(team_id, company_id)
    if not existing:
        return False  # Team doesn't exist or doesn't belong to company

    await self.db.execute(
        "DELETE FROM teams WHERE id = ? AND company_id = ?",
        (team_id, company_id)
    )

    await self.db.commit()
    return True
```

### Complex Query with Joins

```python
async def get_team_worklog_summary(
    self,
    team_id: int,
    company_id: int,
    start_date: str,
    end_date: str
) -> dict:
    """Get worklog summary for a team."""

    if not company_id:
        raise ValueError("company_id is required")

    # Verify team ownership
    team = await self.get_team_by_id(team_id, company_id)
    if not team:
        return None

    cursor = await self.db.execute(
        """
        SELECT
            COUNT(w.id) as total_worklogs,
            SUM(w.time_spent_seconds) as total_seconds,
            COUNT(DISTINCT w.author_email) as unique_authors
        FROM worklogs w
        INNER JOIN users u ON w.author_email = u.email
        INNER JOIN team_members tm ON u.id = tm.user_id
        WHERE tm.team_id = ?
          AND w.company_id = ?          -- Critical: company_id filter
          AND u.company_id = ?           -- Paranoid: double-check user
          AND tm.company_id = ?          -- Paranoid: double-check membership
          AND DATE(w.started) BETWEEN ? AND ?
        """,
        (team_id, company_id, company_id, company_id, start_date, end_date)
    )

    row = await cursor.fetchone()
    return dict(row) if row else None
```

---

## Authentication & Authorization

### JWT Token Structure

```python
{
    "user_id": 42,
    "company_id": 1,
    "email": "user@example.com",
    "role": "ADMIN",  # ADMIN | MANAGER | USER
    "exp": 1234567890  # Expiration timestamp
}
```

### CurrentUser Model

```python
from pydantic import BaseModel

class CurrentUser(BaseModel):
    user_id: int
    company_id: int
    email: str
    role: str  # "ADMIN" | "MANAGER" | "USER"
```

### Dependency: get_current_user

```python
# app/auth/dependencies.py

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.auth.jwt import decode_token
from app.auth.models import CurrentUser

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> CurrentUser:
    """Extract and validate JWT token from Authorization header."""

    token = credentials.credentials
    payload = decode_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    return CurrentUser(
        user_id=payload["user_id"],
        company_id=payload["company_id"],
        email=payload["email"],
        role=payload["role"]
    )
```

### Dependency: require_admin

```python
async def require_admin(
    current_user: CurrentUser = Depends(get_current_user)
) -> CurrentUser:
    """Require user to be an admin."""

    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    return current_user
```

---

## Error Responses

### 401 Unauthorized
**When:** No token or invalid token
**Response:**
```json
{
  "detail": "Invalid token"
}
```

### 403 Forbidden
**When:** User lacks required role (e.g., not admin)
**Response:**
```json
{
  "detail": "Admin access required"
}
```

### 404 Not Found (IMPORTANT!)
**When:** Resource doesn't exist OR belongs to different company
**Response:**
```json
{
  "detail": "Team not found"
}
```

**Why 404 instead of 403?**
Returning 403 for cross-company access leaks information about resource existence. Attackers could probe IDs to map resources across companies.

```python
# ✅ CORRECT - Return 404 for cross-company access
team = await storage.get_team_by_id(team_id, current_user.company_id)
if not team:
    raise HTTPException(status_code=404, detail="Team not found")

# ❌ WRONG - Leaks resource existence
team = await storage.get_team_by_id_unscoped(team_id)  # No company check!
if team.company_id != current_user.company_id:
    raise HTTPException(status_code=403, detail="Access denied")  # Reveals team exists!
```

---

## Common Pitfalls (DO NOT DO THESE)

### ❌ WRONG: Accepting company_id from Request

```python
# NEVER DO THIS!
@router.post("/teams")
async def create_team(
    team_data: TeamCreate,
    current_user: CurrentUser = Depends(get_current_user)
):
    storage = get_storage()

    # ❌ WRONG - Allows user to create team for ANY company!
    return await storage.create_team(
        company_id=team_data.company_id,  # User-controlled input!
        name=team_data.name
    )
```

**Fix:** Always use `current_user.company_id`

```python
# ✅ CORRECT
return await storage.create_team(
    company_id=current_user.company_id,  # Authenticated user's company only
    name=team_data.name
)
```

### ❌ WRONG: Skipping company_id Filter

```python
# ❌ WRONG - Returns teams from ALL companies!
async def get_all_teams(self):
    cursor = await self.db.execute("SELECT * FROM teams")
    return await cursor.fetchall()
```

**Fix:** Always include `WHERE company_id = ?`

```python
# ✅ CORRECT
async def get_all_teams(self, company_id: int):
    if not company_id:
        raise ValueError("company_id required")

    cursor = await self.db.execute(
        "SELECT * FROM teams WHERE company_id = ?",
        (company_id,)
    )
    return await cursor.fetchall()
```

### ❌ WRONG: Using Global/Context Variables

```python
# ❌ WRONG - Implicit, hard to debug, error-prone
from contextvars import ContextVar

current_company_id: ContextVar[int] = ContextVar("company_id")

async def get_teams(self):
    company_id = current_company_id.get()  # Where did this come from?
    # ...
```

**Fix:** Explicit parameter passing

```python
# ✅ CORRECT - Explicit, traceable, testable
async def get_teams(self, company_id: int):
    if not company_id:
        raise ValueError("company_id required")
    # ...
```

### ❌ WRONG: Forgetting Ownership Check on Updates

```python
# ❌ WRONG - Can update ANY team, regardless of company!
async def update_team(self, team_id: int, name: str):
    await self.db.execute(
        "UPDATE teams SET name = ? WHERE id = ?",
        (name, team_id)
    )
```

**Fix:** Always verify ownership first

```python
# ✅ CORRECT
async def update_team(self, team_id: int, company_id: int, name: str):
    # Verify ownership
    team = await self.get_team_by_id(team_id, company_id)
    if not team:
        return None  # Team doesn't exist or wrong company

    # Update
    await self.db.execute(
        "UPDATE teams SET name = ? WHERE id = ? AND company_id = ?",
        (name, team_id, company_id)
    )
```

---

## Testing Security

### Test File
`backend/tests/test_multi_tenant.py`

### Running Tests

```bash
cd backend

# Run all security tests
pytest tests/test_multi_tenant.py -v

# Specific test suites
pytest tests/test_multi_tenant.py::test_auth_required -v
pytest tests/test_multi_tenant.py::test_company_isolation -v
pytest tests/test_multi_tenant.py::test_admin_restrictions -v
```

### Example Test Cases

```python
def test_teams_require_auth(client):
    """Verify endpoints reject requests without JWT token."""
    response = client.get("/api/teams")
    assert response.status_code == 401

def test_teams_isolated_by_company(client, company1_token, company2_token):
    """Verify company 1 cannot see company 2's teams."""

    # Company 1 creates team
    response = client.post(
        "/api/teams",
        headers={"Authorization": f"Bearer {company1_token}"},
        json={"name": "Company 1 Team"}
    )
    assert response.status_code == 201
    team_id = response.json()["id"]

    # Company 2 tries to access it
    response = client.get(
        f"/api/teams/{team_id}",
        headers={"Authorization": f"Bearer {company2_token}"}
    )
    assert response.status_code == 404  # Not 403!

def test_admin_restricted_to_own_company(client, company1_admin, company2_admin):
    """Verify admin from company 1 cannot manage company 2 settings."""

    response = client.post(
        "/api/settings/jira-instances",
        headers={"Authorization": f"Bearer {company1_admin}"},
        json={
            "company_id": 2,  # Try to create for company 2
            "name": "Malicious Instance",
            "url": "https://evil.atlassian.net"
        }
    )

    # Should either reject (403) or force to company 1
    assert response.status_code in [403, 201]
    if response.status_code == 201:
        assert response.json()["company_id"] == 1  # Forced to own company
```

---

## Security Checklist

Before deploying ANY new endpoint or storage method:

- [ ] Router uses `Depends(get_current_user)` or `Depends(require_admin)`
- [ ] Storage method accepts `company_id: int` parameter
- [ ] Storage method validates `company_id` is not None/0
- [ ] All SQL queries include `WHERE company_id = ?`
- [ ] Cross-company access returns 404 (not 403)
- [ ] No `company_id` accepted from request body/params (use `current_user.company_id`)
- [ ] Tests verify authentication required
- [ ] Tests verify company isolation
- [ ] Admin-only endpoints use `require_admin` dependency

---

## Migration Notes

### Adding company_id to Existing Tables

**Endpoint:** `GET /api/settings/migration/check` (check status)
**Endpoint:** `POST /api/settings/migration/execute` (run migration)

**What it does:**
1. Adds `company_id` column to 13 tables
2. Migrates existing data to `company_id = 1` (default company)
3. Adds `NOT NULL` constraints
4. Creates composite indexes for performance

**Backward Compatibility:**
All existing data assigned to `company_id = 1` (first company). New companies get `company_id > 1`.

---

## Resources

### Code References
- **Authentication:** `app/auth/dependencies.py`
- **JWT:** `app/auth/jwt.py`
- **Storage:** `app/cache.py` (all 74 methods)
- **Routers:** `app/routers/*.py` (96 endpoints)

### Documentation
- **CLAUDE.md** - Security pattern quick reference
- **docs/architecture.md** - Multi-tenant design decisions
- **backend/tests/README.md** - Security verification guide

### Tests
- **Test suite:** `tests/test_multi_tenant.py`
- **Fixtures:** `tests/conftest.py`
- **Coverage:** 20 test cases across auth, isolation, admin restrictions
