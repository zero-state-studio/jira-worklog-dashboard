# Troubleshooting Guide

## Common Issues & Solutions

---

## Authentication Issues

### Issue: "Invalid token" error on all requests

**Symptoms:**
- 401 Unauthorized on every API call
- Frontend shows "Session expired"

**Possible Causes:**
1. JWT token expired (default: 7 days)
2. Token not included in request
3. Token malformed or tampered

**Solutions:**

```bash
# Check if token exists in localStorage (browser console)
localStorage.getItem('jwt_token')

# Check token expiration
# Decode JWT at https://jwt.io or use:
const token = localStorage.getItem('jwt_token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log(new Date(payload.exp * 1000));  // Expiration date

# If expired, log out and log back in
localStorage.removeItem('jwt_token');
window.location.href = '/login';
```

**Backend Check:**
```bash
# Verify JWT secret is set
cd backend
grep JWT_SECRET .env

# If missing, generate new secret
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

### Issue: Google OAuth redirect fails

**Symptoms:**
- Clicking "Sign in with Google" does nothing
- Redirect URL error from Google

**Possible Causes:**
1. Wrong redirect URI in Google Console
2. Missing Google credentials in backend
3. CORS issue

**Solutions:**

```bash
# 1. Check backend .env
cd backend
cat .env | grep GOOGLE

# Should have:
# GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
# GOOGLE_CLIENT_SECRET=GOCSPX-xxx
# GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback

# 2. Verify Google Console settings
# Go to: https://console.cloud.google.com/apis/credentials
# Check OAuth 2.0 Client > Authorized redirect URIs
# Must include: http://localhost:8000/api/auth/google/callback

# 3. Check CORS settings
# In backend/app/main.py, verify:
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Database Issues

### Issue: "Database is locked" error

**Symptoms:**
```
sqlite3.OperationalError: database is locked
```

**Possible Causes:**
1. Multiple processes accessing SQLite simultaneously
2. Long-running transaction blocking others
3. Improper connection closure

**Solutions:**

```bash
# 1. Check for multiple backend instances
ps aux | grep uvicorn
# Kill duplicate processes
kill <PID>

# 2. Increase SQLite timeout (backend/app/cache.py)
self.db = await aiosqlite.connect(
    self.db_path,
    timeout=30.0  # Increase from default 5.0
)

# 3. Enable WAL mode for better concurrency
sqlite3 worklog_storage.db "PRAGMA journal_mode=WAL;"

# 4. Check for uncommitted transactions
# Make sure all storage methods use:
await self.db.commit()  # After writes
```

---

### Issue: Migration fails with "company_id already exists"

**Symptoms:**
```
Error: column company_id already exists
```

**Possible Causes:**
Migration was already run or partially completed.

**Solutions:**

```bash
# 1. Check migration status
curl http://localhost:8000/api/settings/migration/check

# 2. If partially migrated, manually fix:
sqlite3 worklog_storage.db

# Check which tables have company_id
.schema teams
.schema users
.schema worklogs

# Tables missing company_id need manual migration
ALTER TABLE table_name ADD COLUMN company_id INTEGER;
UPDATE table_name SET company_id = 1 WHERE company_id IS NULL;

# 3. For clean slate (DESTROYS DATA):
rm worklog_storage.db
python -m app.init_db
```

---

### Issue: Queries are very slow (>5 seconds)

**Symptoms:**
- Dashboard takes 10+ seconds to load
- Worklog queries timeout

**Possible Causes:**
1. Missing indexes
2. Large dataset without pagination
3. N+1 query problem

**Solutions:**

```bash
# 1. Check query plan
sqlite3 worklog_storage.db

EXPLAIN QUERY PLAN
SELECT * FROM worklogs
WHERE company_id = 1
  AND started >= '2026-01-01'
ORDER BY started DESC;

# Look for "SCAN TABLE" (bad) vs "SEARCH TABLE USING INDEX" (good)

# 2. Add missing indexes
# See backend/OPTIMIZATION_PLAN.md for recommended indexes

CREATE INDEX idx_worklogs_company_started
ON worklogs(company_id, started DESC);

# 3. Use LIMIT for large queries
GET /api/worklogs?limit=100  # Instead of fetching all

# 4. Check database size
ls -lh worklog_storage.db
# If >2GB, consider archiving old data

# 5. Run VACUUM to reclaim space
sqlite3 worklog_storage.db "VACUUM;"
```

---

## Sync Issues

### Issue: Sync fails with "401 Unauthorized" from JIRA

**Symptoms:**
```
Error syncing main-jira: 401 Unauthorized
```

**Possible Causes:**
1. Expired or invalid JIRA API token
2. Wrong email for JIRA API
3. Insufficient JIRA permissions

**Solutions:**

```bash
# 1. Test JIRA connection
curl -X POST http://localhost:8000/api/settings/jira-instances/1/test

# 2. Generate new JIRA API token
# Go to: https://id.atlassian.com/manage-profile/security/api-tokens
# Create token, update in settings:

PUT http://localhost:8000/api/settings/jira-instances/1
{
  "jira_token": "ATATT3xFf..."
}

# 3. Verify email matches JIRA account
# In JIRA instance settings, jira_email must match Atlassian account

# 4. Check JIRA permissions
# User must have "Browse Projects" + "Work on Issues" permissions
```

---

### Issue: Tempo sync fails but JIRA sync works

**Symptoms:**
- JIRA connection test passes
- Tempo connection test fails: "Invalid token"

**Possible Causes:**
1. Wrong Tempo token format
2. Token missing "Bearer " prefix
3. Tempo API subscription inactive

**Solutions:**

```bash
# 1. Check Tempo token format
# Should start with "Bearer " (note the space)

# Correct:
"tempo_token": "Bearer eyJhbGc..."

# Wrong:
"tempo_token": "eyJhbGc..."

# 2. Generate new Tempo token
# Go to: https://app.tempo.io/settings/api-integration
# Copy token WITH "Bearer " prefix

# 3. Verify Tempo subscription
# Tempo Timesheets must be active in JIRA instance
# Check: https://{instance}.atlassian.net/jira/marketplace/discover/app/tempo-timesheets

# 4. Test manually
curl -H "Authorization: Bearer {tempo_token}" \
  https://api.tempo.io/4/worklogs
```

---

### Issue: Sync runs but no worklogs imported

**Symptoms:**
- Sync completes without errors
- Worklog count remains 0

**Possible Causes:**
1. No worklogs in date range
2. User filter excluding all worklogs
3. Tempo account ID mismatch

**Solutions:**

```bash
# 1. Check date range
# Default sync range is last 30 days
# Expand range:

POST http://localhost:8000/api/sync/instance/1
{
  "start_date": "2025-01-01",
  "end_date": "2026-02-11"
}

# 2. Check JIRA for actual worklogs
# Log into JIRA, go to issue, verify worklogs exist

# 3. Check sync logs
GET http://localhost:8000/api/logs?level=error&source=sync

# 4. Manual test of Tempo API
curl -H "Authorization: Bearer {tempo_token}" \
  "https://api.tempo.io/4/worklogs?from=2026-01-01&to=2026-01-31"

# Should return worklog array
```

---

## Billing Issues

### Issue: Invoice shows $0 total despite worklogs

**Symptoms:**
- Worklogs exist for client/project
- Invoice generated but total is $0

**Possible Causes:**
1. No rates configured in cascade
2. Worklogs not linked to billing project
3. All worklogs marked non-billable

**Solutions:**

```bash
# 1. Check rate cascade
# Order: Package > Issue > Epic > Project > Client > Default

# Verify each level:
GET /api/billing/clients/1  # Check client default_rate
GET /api/billing/projects/1  # Check project rate

# 2. Set default company rate (fallback)
PUT /api/settings/company
{
  "default_rate": 100.0
}

# 3. Check worklog billing assignment
GET /api/worklogs?billing_project_id=null

# Assign billing project:
PUT /api/worklogs/{worklog_id}
{
  "billing_project_id": 1,
  "billing_client_id": 1
}

# 4. Verify worklogs are billable
# Check time_spent_seconds > 0
# Check not explicitly marked as non-billable
```

---

### Issue: PDF generation fails

**Symptoms:**
```
Error generating PDF: WeasyPrint not found
```

**Possible Causes:**
1. WeasyPrint not installed
2. Missing system dependencies (cairo, pango)

**Solutions:**

```bash
# macOS
brew install cairo pango gdk-pixbuf libffi
pip install weasyprint

# Ubuntu/Debian
sudo apt-get install python3-cffi python3-brotli libpango-1.0-0 libpangoft2-1.0-0
pip install weasyprint

# Windows
# Download GTK3 runtime: https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer/releases
# Then: pip install weasyprint

# Verify installation
python -c "import weasyprint; print(weasyprint.__version__)"
```

---

## Performance Issues

### Issue: Frontend loads slowly (10+ seconds)

**Symptoms:**
- Dashboard blank for several seconds
- React DevTools shows many re-renders

**Possible Causes:**
1. Fetching too much data at once
2. No query caching
3. Inefficient React rendering

**Solutions:**

```typescript
// 1. Use pagination
const { data } = useQuery({
  queryKey: ['worklogs', page],
  queryFn: () => fetchWorklogs({ limit: 50, offset: page * 50 })
});

// 2. Increase TanStack Query cache time
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // 5 minutes
      cacheTime: 10 * 60 * 1000  // 10 minutes
    }
  }
});

// 3. Memoize expensive components
import { memo } from 'react';

const WorklogRow = memo(({ worklog }) => {
  // ...
});

// 4. Use React DevTools Profiler
// Identify components with slow renders
// Optimize with useMemo, useCallback
```

---

### Issue: Backend memory usage keeps growing

**Symptoms:**
- Backend process RAM usage increases over time
- Eventually crashes with "Out of memory"

**Possible Causes:**
1. Database connections not closed
2. Large objects kept in memory
3. Memory leak in third-party library

**Solutions:**

```python
# 1. Ensure connections are closed
# In app/cache.py, add cleanup:

async def close(self):
    """Close database connection."""
    if self.db:
        await self.db.close()

# In app/main.py:
@app.on_event("shutdown")
async def shutdown():
    storage = get_storage()
    await storage.close()

# 2. Use generators for large result sets
async def get_all_worklogs_chunked(self, company_id: int):
    """Yield worklogs in chunks to avoid loading all in memory."""
    offset = 0
    limit = 1000

    while True:
        cursor = await self.db.execute(
            "SELECT * FROM worklogs WHERE company_id = ? LIMIT ? OFFSET ?",
            (company_id, limit, offset)
        )
        rows = await cursor.fetchall()

        if not rows:
            break

        for row in rows:
            yield dict(row)

        offset += limit

# 3. Monitor memory usage
import tracemalloc

tracemalloc.start()
# ... run code ...
snapshot = tracemalloc.take_snapshot()
top_stats = snapshot.statistics('lineno')
for stat in top_stats[:10]:
    print(stat)
```

---

## Desktop App Issues

### Issue: PyInstaller build fails

**Symptoms:**
```
Error: Unable to find module 'app.main'
```

**Possible Causes:**
1. Missing hidden imports
2. Incorrect PyInstaller spec file

**Solutions:**

```bash
# 1. Update backend.spec hidden imports
# In backend/backend.spec:

hiddenimports=[
    'app',
    'app.main',
    'app.cache',
    'app.auth',
    'app.routers',
    'fastapi',
    'uvicorn',
    'aiosqlite',
    'pydantic',
    'httpx'
]

# 2. Clean build
cd backend
rm -rf build/ dist/
pyinstaller backend.spec

# 3. Test bundled backend
cd dist/
./backend  # Should start server
```

---

### Issue: Tauri app fails to start backend

**Symptoms:**
- Desktop app opens but shows "Cannot connect to backend"
- Backend sidecar not starting

**Possible Causes:**
1. Backend binary not in sidecar path
2. Port conflict (8000 already in use)
3. Permissions issue

**Solutions:**

```bash
# 1. Check sidecar configuration
# In src-tauri/tauri.conf.json:

"bundle": {
  "externalBin": [
    "binaries/backend"  # Check this path exists
  ]
}

# 2. Build backend first
cd backend
pyinstaller backend.spec
cp dist/backend ../src-tauri/binaries/

# 3. Check port availability
lsof -i :8000
# If port is used, change in Tauri config

# 4. Check logs
# macOS/Linux: ~/Library/Logs/jira-worklog-dashboard/
# Windows: %APPDATA%/jira-worklog-dashboard/logs/
```

---

## Testing Issues

### Issue: Tests fail with "company_id = None"

**Symptoms:**
```
ValueError: company_id is required
```

**Possible Causes:**
Test fixtures not providing company_id.

**Solutions:**

```python
# In tests/conftest.py, ensure company fixtures:

@pytest.fixture
async def company1(storage):
    """Create test company 1."""
    cursor = await storage.db.execute(
        "INSERT INTO companies (name) VALUES (?)",
        ("Test Company 1",)
    )
    await storage.db.commit()

    company_id = cursor.lastrowid

    # Return dict with id
    return {"id": company_id, "name": "Test Company 1"}

# In tests, use fixture:
@pytest.mark.asyncio
async def test_create_team(storage, company1):
    team = await storage.create_team(
        company_id=company1["id"],  # Use fixture
        name="Test Team"
    )
    assert team is not None
```

---

### Issue: Tests pass locally but fail in CI

**Symptoms:**
- Local: `pytest` passes
- GitHub Actions: tests fail

**Possible Causes:**
1. Database file conflicts
2. Environment variables missing
3. Different Python versions

**Solutions:**

```yaml
# In .github/workflows/test.yml

steps:
  - name: Set up Python
    uses: actions/setup-python@v4
    with:
      python-version: '3.11'  # Match local version

  - name: Install dependencies
    run: |
      cd backend
      pip install -r requirements.txt

  - name: Run tests
    env:
      DATABASE_URL: "sqlite:///test.db"
      JWT_SECRET: "test-secret-key"
    run: |
      cd backend
      pytest -v --cov=app tests/
```

---

## Data Issues

### Issue: Duplicate worklogs after sync

**Symptoms:**
- Same worklog appears multiple times
- Worklog count doubles after each sync

**Possible Causes:**
Sync logic not using UPSERT properly.

**Solutions:**

```python
# In sync logic, use INSERT OR REPLACE

await self.db.execute("""
    INSERT OR REPLACE INTO worklogs (
        worklog_id,
        company_id,
        jira_instance,
        -- other fields
    ) VALUES (?, ?, ?, ...)
""", params)

# Or use UNIQUE constraint to prevent duplicates
CREATE UNIQUE INDEX idx_worklogs_unique
ON worklogs(company_id, jira_instance, worklog_id);

# Then INSERT OR IGNORE will skip duplicates
```

---

### Issue: Data loss after migration

**Symptoms:**
- Worklogs/teams disappeared after migration
- All data assigned to wrong company

**Possible Causes:**
Migration script had errors.

**Solutions:**

```bash
# 1. ALWAYS backup before migration
sqlite3 worklog_storage.db ".backup worklog_storage_backup.db"

# 2. If data lost, restore from backup
cp worklog_storage_backup.db worklog_storage.db

# 3. Review migration logs
GET /api/logs?source=migration&level=error

# 4. Manual data recovery
sqlite3 worklog_storage.db

# Check what data exists
SELECT company_id, COUNT(*) FROM worklogs GROUP BY company_id;

# Re-assign if needed
UPDATE worklogs SET company_id = 1 WHERE company_id IS NULL;
```

---

## Logging & Debugging

### Enable Debug Logging

**Backend:**
```python
# In backend/app/main.py or .env

import logging

logging.basicConfig(
    level=logging.DEBUG,  # Change from INFO
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

**Frontend:**
```typescript
// In src/api/client.ts

apiClient.interceptors.request.use(request => {
  console.log('API Request:', request);
  return request;
});

apiClient.interceptors.response.use(
  response => {
    console.log('API Response:', response);
    return response;
  },
  error => {
    console.error('API Error:', error.response);
    return Promise.reject(error);
  }
);
```

---

### Check Application Logs

**Backend logs:**
```bash
# If running with uvicorn
# Logs print to stdout

# If using systemd
journalctl -u jira-worklog-dashboard -f

# If using Docker
docker logs -f jira-worklog-dashboard-backend
```

**Frontend logs:**
```bash
# Browser DevTools -> Console
# Or check build logs:
cd frontend
npm run build  # Look for warnings/errors
```

**Database logs:**
```bash
# Enable SQLite tracing
sqlite3 worklog_storage.db

.trace stdout  # Print all SQL
.timer on      # Show query execution time
```

---

## Getting Help

### Before Asking for Help

1. ✅ Check this troubleshooting guide
2. ✅ Review error logs (`GET /api/logs`)
3. ✅ Search GitHub issues: https://github.com/{org}/{repo}/issues
4. ✅ Verify configuration (.env files)
5. ✅ Test with minimal example (isolate the problem)

### What to Include

When reporting issues, include:

- **Error message** (full stack trace)
- **Steps to reproduce**
- **Expected vs actual behavior**
- **Environment** (OS, Python version, Node version)
- **Configuration** (.env values, redact secrets)
- **Logs** (backend + frontend console)

### Resources

- **Documentation:** `/docs/` directory
- **GitHub Issues:** Report bugs and feature requests
- **Agent Roles:** `/agents/roles/` for specialized help
- **Security Tests:** `backend/tests/README.md`

---

## Quick Diagnostic Commands

```bash
# Backend health check
curl http://localhost:8000/health

# Database size
ls -lh backend/worklog_storage.db

# Count records
sqlite3 backend/worklog_storage.db "SELECT COUNT(*) FROM worklogs;"

# Check indexes
sqlite3 backend/worklog_storage.db ".indexes worklogs"

# Test JIRA connection
curl -X POST http://localhost:8000/api/settings/jira-instances/1/test

# Check sync status
curl http://localhost:8000/api/sync/status

# View recent errors
curl http://localhost:8000/api/logs?level=error&limit=10

# Check migration status
curl http://localhost:8000/api/settings/migration/check
```
