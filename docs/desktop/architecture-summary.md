# Architecture Summary

## Quick Overview

**JIRA Worklog Dashboard** is a multi-tenant SaaS platform built with FastAPI (backend) and React (frontend) that syncs, caches, and analyzes worklog data from multiple JIRA instances.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Layer                              │
├─────────────────────────────────────────────────────────────────┤
│  Desktop App (Tauri)  │  Web Browser (React)                    │
└─────────────────┬─────────────────────────────────────────┬─────┘
                  │                                         │
                  └─────────────────┬───────────────────────┘
                                    │ HTTPS/JWT
                        ┌───────────▼──────────┐
                        │   FastAPI Backend    │
                        │   (Python 3.11+)     │
                        └───────────┬──────────┘
                                    │
                 ┌──────────────────┼──────────────────┐
                 │                  │                  │
        ┌────────▼────────┐ ┌──────▼──────┐ ┌────────▼────────┐
        │ WorklogStorage  │ │   Auth      │ │  API Routers    │
        │   (cache.py)    │ │  (JWT/OAuth)│ │  (11 routers)   │
        └────────┬────────┘ └─────────────┘ └─────────────────┘
                 │
        ┌────────▼────────┐
        │  SQLite Database│
        │  (24 tables)    │
        │  (40+ indexes)  │
        └────────┬────────┘
                 │
                 └─────── External APIs ──────┐
                                              │
                 ┌────────────────────────────┼────────────────┐
                 │                            │                │
        ┌────────▼────────┐        ┌─────────▼──────┐  ┌──────▼──────┐
        │   JIRA API      │        │   Tempo API    │  │ Factorial   │
        │ (issues/users)  │        │   (worklogs)   │  │   (HR)      │
        └─────────────────┘        └────────────────┘  └─────────────┘
```

---

## Key Components

### 1. Backend (FastAPI)

**Location:** `backend/app/`

**Core Modules:**
- **main.py** - FastAPI app, CORS, startup/shutdown
- **cache.py** - WorklogStorage class (2,500+ lines, 74 methods)
- **config.py** - Settings management (Pydantic)
- **auth/** - JWT + Google OAuth authentication
- **routers/** - 11 routers with 111 endpoints

**Responsibilities:**
- REST API endpoints
- Multi-tenant security (company_id filtering)
- JIRA/Tempo API integration
- Billing logic (rate cascades)
- Database operations

---

### 2. Frontend (React + TypeScript)

**Location:** `frontend/src/`

**Core Structure:**
- **App.tsx** - Root component, routing
- **pages/** - Route pages (Dashboard, Worklogs, Billing, etc.)
- **components/** - Reusable UI components
- **api/** - Typed API client (TanStack Query)

**Responsibilities:**
- User interface
- API consumption
- State management (TanStack Query)
- Form handling and validation

---

### 3. Database (SQLite)

**Location:** `backend/worklog_storage.db`

**Schema:**
- **24 tables** with multi-tenant isolation
- **40+ indexes** for performance
- **Denormalized worklogs** for fast queries

**Key Tables:**
- `companies` - Multi-tenant root
- `users` - System users (scoped by company)
- `teams` - Team organization
- `jira_instances` - JIRA connection configs
- `worklogs` - Cached worklog data (main table)
- `billing_clients` - Billing clients
- `billing_projects` - Client projects
- `invoices` - Generated invoices

**All tables (except lookup tables) have `company_id` for isolation.**

---

### 4. Authentication (Google OAuth + JWT)

**Flow:**
```
1. User clicks "Sign in with Google"
2. Redirect to Google OAuth consent
3. Google redirects back with auth code
4. Backend exchanges code for Google user info
5. Backend creates/updates user in database
6. Backend generates JWT with {user_id, company_id, email, role}
7. Frontend stores JWT in localStorage
8. All API requests include Authorization: Bearer <JWT>
9. Middleware validates JWT and extracts company_id
```

**JWT Payload:**
```json
{
  "user_id": 42,
  "company_id": 1,
  "email": "user@example.com",
  "role": "ADMIN",
  "exp": 1234567890
}
```

---

## Multi-Tenant Architecture

### Isolation Strategy

**Every data access MUST be scoped by `company_id`:**

```
User Request → JWT Token → Extract company_id → Filter Database
```

**Implementation:**

1. **Router Level:**
   ```python
   @router.get("/teams")
   async def list_teams(current_user: CurrentUser = Depends(get_current_user)):
       storage = get_storage()
       return await storage.get_all_teams(current_user.company_id)
   ```

2. **Storage Level:**
   ```python
   async def get_all_teams(self, company_id: int):
       if not company_id:
           raise ValueError("company_id required")
       # ... WHERE company_id = ? ...
   ```

3. **Database Level:**
   ```sql
   SELECT * FROM teams
   WHERE company_id = ?
   ORDER BY name;
   ```

**Security Rules:**
- ✅ Always explicit `company_id` parameter passing
- ✅ Return 404 (not 403) for cross-company access
- ❌ Never accept `company_id` from request body
- ❌ Never use global/context variables

---

## Data Flow

### Worklog Sync Flow

```
Manual Sync Trigger (UI Button)
    ↓
POST /api/sync/all (Background Task)
    ↓
For each JIRA instance:
    ↓
1. Fetch worklogs from Tempo API
    ↓
2. Fetch issue details from JIRA API
    ↓
3. Transform to internal format
    ↓
4. INSERT OR REPLACE into worklogs table
    ↓
5. Update epic/project mappings
    ↓
Return sync summary
```

**Not real-time!** Users manually trigger syncs.

---

### Invoice Generation Flow

```
User: Create Invoice (client, date range)
    ↓
POST /api/billing/invoices
    ↓
1. Fetch worklogs for client + date range
    ↓
2. For each worklog:
   - Apply 6-level rate cascade
   - Calculate billable amount
    ↓
3. Group by billing project
    ↓
4. Create invoice record
    ↓
5. Create invoice_items records
    ↓
6. Calculate totals (subtotal, tax, total)
    ↓
7. Generate PDF (WeasyPrint)
    ↓
Return invoice object + PDF download link
```

**Rate Cascade:** Package → Issue → Epic → Project → Client → Default (first match wins)

---

## API Design

### REST Patterns

**Resource Endpoints:**
- `GET /api/resource` - List resources (with pagination/filtering)
- `GET /api/resource/{id}` - Get single resource
- `POST /api/resource` - Create resource
- `PUT /api/resource/{id}` - Update resource
- `DELETE /api/resource/{id}` - Delete resource

**All endpoints require JWT authentication.**

**Response Format:**
```json
{
  "items": [...],      // For lists
  "total": 100,        // Total count
  "limit": 50,         // Page size
  "offset": 0          // Page offset
}
```

**Error Format:**
```json
{
  "detail": "Error message"
}
```

---

## Performance Optimizations

### Database

1. **Indexes on hot paths:**
   - `idx_worklogs_company_started` - Company + date range queries
   - `idx_worklogs_author` - Per-user queries
   - `idx_teams_company_name` - Team lookups

2. **Denormalization:**
   - Worklogs include `author_name`, `issue_summary`, `epic_name`, etc.
   - Avoids joins on every query
   - Trade-off: 20-30% storage overhead for 80%+ query speedup

3. **WAL mode:**
   - Better concurrency for SQLite
   - Readers don't block writers

### API

1. **Background tasks:**
   - Sync operations run in background (FastAPI BackgroundTasks)
   - Returns immediately, doesn't block request

2. **Pagination:**
   - Default limit: 100 items
   - Frontend lazy-loads more data

3. **Caching:**
   - TanStack Query caches API responses (5 min default)
   - Reduces redundant API calls

---

## Security Layers

### 1. Authentication
- Google OAuth 2.0 (no passwords)
- JWT tokens (7-day expiration)
- HTTPOnly not used (localStorage for token)

### 2. Authorization
- Role-based access control (ADMIN/MANAGER/USER)
- Endpoint-level role checks (`Depends(require_admin)`)

### 3. Multi-Tenant Isolation
- Every query filtered by `company_id`
- SQL injection prevention (parameterized queries)
- Cross-company access returns 404

### 4. Data Protection
- API keys encrypted at rest (Fernet encryption)
- Credentials never logged
- HTTPS required in production

---

## Deployment Architecture

### Development
```
Frontend (Vite dev server) → http://localhost:5173
     ↓ CORS
Backend (Uvicorn) → http://localhost:8000
     ↓
SQLite → worklog_storage.db
```

### Production (Desktop App)
```
Tauri Window
     ↓
Frontend (bundled HTML/JS)
     ↓ IPC
Backend Sidecar (PyInstaller bundle)
     ↓
SQLite → ~/Library/Application Support/jira-worklog-dashboard/worklog_storage.db
```

### Production (Web)
```
Nginx (reverse proxy)
     ↓
Uvicorn (systemd service)
     ↓
SQLite → /var/lib/jira-worklog-dashboard/worklog_storage.db
```

---

## Technology Decisions

### Why SQLite?
- ✅ Zero-config (no DB server required)
- ✅ Fast for read-heavy workloads
- ✅ Perfect for desktop apps
- ✅ Easy backups (single file)
- ❌ Limited write concurrency
- ❌ No horizontal scaling

**When to migrate to PostgreSQL:** 1,000+ concurrent users or 10+ GB data

---

### Why FastAPI?
- ✅ Modern async/await support
- ✅ Automatic OpenAPI docs
- ✅ Pydantic validation
- ✅ High performance
- ✅ Built-in dependency injection

---

### Why React?
- ✅ Large ecosystem
- ✅ Good TypeScript support
- ✅ TanStack Query for API state
- ✅ Component reusability

---

### Why Tauri (not Electron)?
- ✅ Smaller bundle size (10MB vs 100MB)
- ✅ Lower memory usage
- ✅ Better security (no Node.js in frontend)
- ✅ Native OS integration
- ❌ More complex build process

---

## Scaling Considerations

### Current Limits (SQLite)
- **Users per company:** 1-100
- **Worklogs:** Up to 1M (tested)
- **Concurrent writes:** 10-20/second
- **Database size:** Up to 2GB (performant)

### When to Scale

**Vertical Scaling (first):**
- Add indexes for slow queries
- Optimize SQL queries
- Enable database archiving

**Horizontal Scaling (later):**
- Migrate to PostgreSQL
- Add read replicas
- Implement caching layer (Redis)
- Microservices architecture

---

## Key Constraints

### What System IS
- ✅ Multi-tenant SaaS with data isolation
- ✅ Manual sync (user-triggered)
- ✅ Desktop-first (also works as web app)
- ✅ Billing automation for agencies

### What System IS NOT
- ❌ Real-time sync (no webhooks)
- ❌ JIRA replacement
- ❌ Time tracking tool (imports existing logs)
- ❌ Public API (internal use only)

---

## Critical Files

### Must-Read for Development
1. **CLAUDE.md** - Primary instructions
2. **docs/architecture.md** - Complete architecture
3. **docs/database-schema.md** - All tables
4. **docs/desktop/multi-tenant-security.md** - Security patterns

### Code Entry Points
- **Backend:** `backend/app/main.py`
- **Frontend:** `frontend/src/App.tsx`
- **Storage:** `backend/app/cache.py`
- **Auth:** `backend/app/auth/dependencies.py`

---

## Common Patterns

### Backend Endpoint
```python
@router.get("/resource/{id}")
async def get_resource(
    id: int,
    current_user: CurrentUser = Depends(get_current_user)
):
    storage = get_storage()
    resource = await storage.get_resource(id, current_user.company_id)

    if not resource:
        raise HTTPException(status_code=404, detail="Not found")

    return resource
```

### Storage Method
```python
async def get_resource(self, id: int, company_id: int):
    if not company_id:
        raise ValueError("company_id required")

    cursor = await self.db.execute(
        "SELECT * FROM resources WHERE id = ? AND company_id = ?",
        (id, company_id)
    )

    row = await cursor.fetchone()
    return dict(row) if row else None
```

### Frontend API Call
```typescript
const { data, error, isLoading } = useQuery({
  queryKey: ['resource', id],
  queryFn: () => apiClient.get(`/api/resource/${id}`)
});

if (isLoading) return <Loading />;
if (error) return <Error error={error} />;
return <ResourceView resource={data} />;
```

---

## Resources

- **Full Architecture:** `docs/architecture.md`
- **Database Schema:** `docs/database-schema.md`
- **API Reference:** `docs/api-reference.md`
- **Security Guide:** `docs/desktop/multi-tenant-security.md`
- **Development Guide:** `docs/desktop/development-guide.md`
