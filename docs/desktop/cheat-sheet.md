# Quick Reference Cheat Sheet

One-page reference for common patterns, commands, and workflows.

---

## 🚀 Quick Start Commands

```bash
# Backend
cd backend && source venv/bin/activate && uvicorn app.main:app --reload

# Frontend
cd frontend && npm run dev

# Tests
cd backend && pytest tests/test_multi_tenant.py -v

# Database
sqlite3 backend/worklog_storage.db
```

**Access:** Frontend at `http://localhost:5173` → Backend at `http://localhost:8000`

---

## 🔒 Security Pattern (MANDATORY)

### Router Endpoint
```python
@router.get("/resource")
async def get_resource(current_user: CurrentUser = Depends(get_current_user)):
    storage = get_storage()
    return await storage.get_resource(current_user.company_id)
```

### Storage Method
```python
async def get_resource(self, company_id: int):
    if not company_id:
        raise ValueError("company_id required")
    # ... WHERE company_id = ? ...
```

**Rules:**
- ✅ Use `Depends(get_current_user)` on ALL endpoints
- ✅ Pass `current_user.company_id` to storage
- ✅ Return 404 (not 403) for cross-company access
- ❌ NEVER accept `company_id` from request body

---

## 📡 API Patterns

### List Resources
```python
@router.get("/teams", response_model=list[TeamResponse])
async def list_teams(current_user: CurrentUser = Depends(get_current_user)):
    storage = get_storage()
    return await storage.get_all_teams(current_user.company_id)
```

### Get by ID
```python
@router.get("/teams/{team_id}")
async def get_team(team_id: int, current_user: CurrentUser = Depends(get_current_user)):
    storage = get_storage()
    team = await storage.get_team_by_id(team_id, current_user.company_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team
```

### Create
```python
@router.post("/teams", status_code=201)
async def create_team(
    team_data: TeamCreate,
    current_user: CurrentUser = Depends(get_current_user)
):
    storage = get_storage()
    return await storage.create_team(
        company_id=current_user.company_id,  # Force user's company
        name=team_data.name
    )
```

### Update
```python
@router.put("/teams/{team_id}")
async def update_team(
    team_id: int,
    team_data: TeamUpdate,
    current_user: CurrentUser = Depends(get_current_user)
):
    storage = get_storage()
    team = await storage.update_team(
        team_id=team_id,
        company_id=current_user.company_id,
        **team_data.dict(exclude_unset=True)
    )
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team
```

### Delete
```python
@router.delete("/teams/{team_id}", status_code=204)
async def delete_team(team_id: int, current_user: CurrentUser = Depends(get_current_user)):
    storage = get_storage()
    deleted = await storage.delete_team(team_id, current_user.company_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Team not found")
```

---

## 💾 Database Patterns

### Select with Isolation
```python
async def get_all_teams(self, company_id: int):
    if not company_id:
        raise ValueError("company_id required")

    cursor = await self.db.execute(
        "SELECT * FROM teams WHERE company_id = ? ORDER BY name",
        (company_id,)
    )
    rows = await cursor.fetchall()
    return [dict(row) for row in rows]
```

### Insert
```python
async def create_team(self, company_id: int, name: str):
    if not company_id:
        raise ValueError("company_id required")

    cursor = await self.db.execute(
        "INSERT INTO teams (company_id, name, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
        (company_id, name)
    )
    await self.db.commit()
    return await self.get_team_by_id(cursor.lastrowid, company_id)
```

### Update with Ownership Check
```python
async def update_team(self, team_id: int, company_id: int, name: str):
    if not company_id:
        raise ValueError("company_id required")

    # Verify ownership first
    existing = await self.get_team_by_id(team_id, company_id)
    if not existing:
        return None

    await self.db.execute(
        "UPDATE teams SET name = ? WHERE id = ? AND company_id = ?",
        (name, team_id, company_id)
    )
    await self.db.commit()
    return await self.get_team_by_id(team_id, company_id)
```

### Delete with Ownership Check
```python
async def delete_team(self, team_id: int, company_id: int):
    if not company_id:
        raise ValueError("company_id required")

    existing = await self.get_team_by_id(team_id, company_id)
    if not existing:
        return False

    await self.db.execute(
        "DELETE FROM teams WHERE id = ? AND company_id = ?",
        (team_id, company_id)
    )
    await self.db.commit()
    return True
```

---

## ⚛️ Frontend Patterns

### API Call with TanStack Query
```typescript
const { data, error, isLoading } = useQuery({
  queryKey: ['teams'],
  queryFn: () => apiClient.get('/api/teams'),
  staleTime: 5 * 60 * 1000  // Cache for 5 minutes
});

if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
return <TeamList teams={data} />;
```

### Mutation (POST/PUT/DELETE)
```typescript
const mutation = useMutation({
  mutationFn: (teamData: TeamCreate) =>
    apiClient.post('/api/teams', teamData),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['teams'] });
  }
});

const handleSubmit = (data: TeamCreate) => {
  mutation.mutate(data);
};
```

### Debounced Search
```typescript
const [search, setSearch] = useState('');
const debouncedSearch = useDebounce(search, 300);

const { data } = useQuery({
  queryKey: ['worklogs', debouncedSearch],
  queryFn: () => fetchWorklogs({ search: debouncedSearch })
});
```

---

## 🧪 Testing Patterns

### Basic Test
```python
@pytest.mark.asyncio
async def test_create_team(storage, company1):
    team = await storage.create_team(
        company_id=company1["id"],
        name="Test Team"
    )
    assert team is not None
    assert team["name"] == "Test Team"
```

### Isolation Test
```python
@pytest.mark.asyncio
async def test_team_isolation(storage, company1, company2):
    # Company 1 creates team
    team = await storage.create_team(company1["id"], "Company 1 Team")

    # Company 2 cannot see it
    result = await storage.get_team_by_id(team["id"], company2["id"])
    assert result is None
```

### Auth Test
```python
def test_endpoint_requires_auth(client):
    response = client.get("/api/teams")
    assert response.status_code == 401
```

---

## 🛠️ Common Commands

### Database
```bash
# Open database
sqlite3 backend/worklog_storage.db

# Show tables
.tables

# Show schema
.schema worklogs

# Show indexes
.indexes worklogs

# Count records
SELECT COUNT(*) FROM worklogs;

# Check company isolation
SELECT company_id, COUNT(*) FROM worklogs GROUP BY company_id;

# Vacuum (reclaim space)
VACUUM;

# Backup
.backup worklog_storage_backup.db
```

### Testing
```bash
# All tests
pytest

# Specific file
pytest tests/test_multi_tenant.py

# Specific test
pytest tests/test_multi_tenant.py::test_auth_required

# With coverage
pytest --cov=app tests/

# Verbose
pytest -v

# Stop on first failure
pytest -x
```

### Git
```bash
# Status
git status

# Create branch
git checkout -b feature/my-feature

# Commit
git add .
git commit -m "feat: add my feature"

# Push
git push origin feature/my-feature

# Pull request
gh pr create --title "Add my feature" --body "Description"
```

### API Testing
```bash
# Health check
curl http://localhost:8000/health

# Login (get token from response)
curl http://localhost:8000/api/auth/google/login

# List teams (with auth)
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/teams

# Create team
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"New Team"}' \
  http://localhost:8000/api/teams

# Test JIRA connection
curl -X POST \
  -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/settings/jira-instances/1/test
```

---

## 📝 Code Conventions

### Python
```python
# Variables/functions: snake_case
user_email = "test@example.com"
async def get_user_by_email(email: str):
    pass

# Classes: PascalCase
class WorklogStorage:
    pass

# Constants: UPPER_SNAKE_CASE
DEFAULT_RATE = 100.0
```

### TypeScript
```typescript
// Variables/functions: camelCase
const userName = "John Doe";
function fetchWorklogs() {}

// Components/types: PascalCase
interface WorklogItem {}
function WorklogTable() {}

// Constants: UPPER_SNAKE_CASE
const API_BASE_URL = "http://localhost:8000";
```

### Database
```sql
-- Tables: plural, snake_case
teams, users, worklogs

-- Columns: singular, snake_case
company_id, author_email, created_at

-- Indexes: idx_{table}_{columns}
idx_worklogs_company_started
```

---

## 🔍 Debugging

### Backend Logs
```python
# Add logging
import logging
logger = logging.getLogger(__name__)

logger.debug(f"Processing worklog: {worklog_id}")
logger.info(f"Created team: {team_id}")
logger.error(f"Failed to sync: {error}")
```

### Frontend Logs
```typescript
// Console logging
console.log('Data:', data);
console.error('Error:', error);

// API interceptor
apiClient.interceptors.request.use(request => {
  console.log('Request:', request);
  return request;
});
```

### SQL Debugging
```bash
# Enable query logging in SQLite
sqlite3 worklog_storage.db

.trace stdout  # Print all queries
.timer on      # Show execution time

# Explain query plan
EXPLAIN QUERY PLAN SELECT * FROM worklogs WHERE company_id = 1;
```

---

## ⚠️ Common Mistakes

### ❌ Accepting company_id from Request
```python
# WRONG
@router.post("/teams")
async def create_team(team_data: TeamCreate):
    return await storage.create_team(team_data.company_id)  # User-controlled!
```

### ✅ Always Use current_user.company_id
```python
# CORRECT
@router.post("/teams")
async def create_team(
    team_data: TeamCreate,
    current_user: CurrentUser = Depends(get_current_user)
):
    return await storage.create_team(current_user.company_id)  # From JWT!
```

---

### ❌ Forgetting company_id Filter
```python
# WRONG - Leaks all companies' data
async def get_teams(self):
    return await self.db.execute("SELECT * FROM teams")
```

### ✅ Always Filter by company_id
```python
# CORRECT
async def get_teams(self, company_id: int):
    if not company_id:
        raise ValueError("company_id required")
    return await self.db.execute(
        "SELECT * FROM teams WHERE company_id = ?",
        (company_id,)
    )
```

---

### ❌ Returning 403 for Cross-Company Access
```python
# WRONG - Reveals resource existence
team = await storage.get_team_unscoped(team_id)
if team.company_id != current_user.company_id:
    raise HTTPException(status_code=403)  # Leaks info!
```

### ✅ Return 404 for All Not Found Cases
```python
# CORRECT - Ambiguous response
team = await storage.get_team_by_id(team_id, current_user.company_id)
if not team:
    raise HTTPException(status_code=404)  # Could be missing or wrong company
```

---

## 🎯 Quick Checklist

### Before Merging PR
- [ ] All endpoints use `Depends(get_current_user)`
- [ ] All storage methods accept `company_id`
- [ ] All SQL queries include `WHERE company_id = ?`
- [ ] Tests verify multi-tenant isolation
- [ ] No `company_id` from request body
- [ ] Cross-company access returns 404
- [ ] Code follows conventions
- [ ] Documentation updated

### Before Deploying
- [ ] All tests pass (`pytest -v`)
- [ ] Security tests pass (`pytest tests/test_multi_tenant.py`)
- [ ] Database backed up
- [ ] Environment variables set
- [ ] Frontend built (`npm run build`)
- [ ] Backend bundle tested (`pyinstaller backend.spec`)

---

## 📚 Resources

- **Full docs:** `/docs/` directory
- **CLAUDE.md:** Primary instructions
- **Multi-tenant security:** `docs/desktop/multi-tenant-security.md`
- **API reference:** `docs/desktop/api-quick-reference.md`
- **Troubleshooting:** `docs/desktop/troubleshooting.md`

---

## 🆘 Getting Help

1. Check `docs/desktop/troubleshooting.md`
2. Search GitHub issues
3. Review similar code in codebase
4. Load relevant context files in Claude Desktop
5. Ask with specific error message + context
