# System Architecture

> **Navigation:** [Database Schema](./database-schema.md) | [API Reference](./api-reference.md) | [Conventions](./conventions.md) | [Setup](./setup-and-commands.md)

## Overview

The JIRA Worklog Dashboard is a multi-tenant SaaS application built with a 3-tier architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  React 18 + Vite (Web) / Tauri (Desktop)                    │
│  - 14 pages, 48 reusable components                          │
│  - Recharts for visualizations                               │
│  - Tailwind CSS styling                                      │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API (JSON)
┌────────────────────────▼────────────────────────────────────┐
│                    Application Layer                         │
│  FastAPI (Python 3.11+) - Async/Await                       │
│  - 111 API endpoints across 11 routers                       │
│  - 84 Pydantic models for validation                         │
│  - JWT authentication + RBAC                                 │
└────────────────────────┬────────────────────────────────────┘
                         │ aiosqlite
┌────────────────────────▼────────────────────────────────────┐
│                     Data Layer                               │
│  SQLite Database (local file)                                │
│  - 24 tables with 40+ indexes                                │
│  - Multi-tenant isolation via company_id                     │
│  - Denormalized worklogs for performance                     │
└──────────────────────────────────────────────────────────────┘

External Integrations:
- JIRA REST API v3 (issues, epics, projects)
- Tempo API v4 (worklog time tracking)
- Factorial HR API (absences, holidays)
- Google OAuth 2.0 (authentication)
```

## Component Architecture

### Backend Components

#### 1. FastAPI Routers (`backend/app/routers/`)

**Purpose:** HTTP request handling, business logic orchestration

**Key Routers:**
- `dashboard.py` (6 endpoints) - Global metrics, team breakdowns
- `teams.py` (8 endpoints) - Team-specific analytics
- `users.py` (9 endpoints) - Individual user worklogs
- `epics.py` (7 endpoints) - Epic-centric views
- `issues.py` (5 endpoints) - Issue details
- `sync.py` (5 endpoints) - Manual JIRA sync triggers
- `settings.py` (18 endpoints) - CRUD for teams, users, instances
- `billing.py` (23 endpoints) - Package management, invoicing
- `auth.py` (11 endpoints) - OAuth, JWT, user management
- `factorial.py` (7 endpoints) - HR integration
- `logs.py` (12 endpoints) - Application logging

**Common Pattern:**
```python
@router.get("/api/teams")
async def list_teams(
    current_user: CurrentUser = Depends(get_current_user)
):
    storage = get_storage()
    teams = await storage.get_all_teams(current_user.company_id)
    return teams
```

#### 2. WorklogStorage Class (`backend/app/cache.py`)

**Purpose:** Database abstraction layer, multi-tenant data isolation

**Key Responsibilities:**
- 74 async storage methods (CRUD + analytics queries)
- Enforces company_id filtering on all queries
- Manages cache invalidation and TTL
- Handles database migrations

**Critical Pattern:**
```python
async def get_all_teams(self, company_id: int) -> list[dict]:
    if not company_id:
        raise ValueError("company_id is required")

    async with aiosqlite.connect(self.db_path) as db:
        async with db.execute(
            "SELECT * FROM teams WHERE company_id = ?",
            (company_id,)
        ) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]
```

#### 3. External API Clients

**JiraClient (`backend/app/jira_client.py`):**
- JIRA REST API v3 integration
- Async httpx client with Basic Auth
- Methods: get_worklogs, get_epics, get_issues, search_users
- Fallback when Tempo API unavailable

**TempoClient (`backend/app/tempo_client.py`):**
- Tempo Timesheets API v4 (preferred)
- More efficient date-range worklog queries
- Requires separate Tempo API token
- Better performance than native JIRA worklogs

**FactorialClient (`backend/app/factorial_client.py`):**
- HR system integration
- Fetch absences, holidays, employee data
- OAuth 2.0 authentication

#### 4. Authentication System (`backend/app/auth/`)

**Files:**
- `jwt.py` - Token generation and validation
- `dependencies.py` - FastAPI dependency functions
- `google_oauth.py` - Google OAuth 2.0 flow

**Security Model:**
```python
# JWT Payload
{
  "user_id": 123,
  "company_id": 1,
  "email": "user@company.com",
  "role": "ADMIN",  # ADMIN | MANAGER | USER
  "exp": 1234567890
}

# Role hierarchy
ADMIN > MANAGER > USER
- ADMIN: Full access to all company data + settings
- MANAGER: Read all, write billing/packages
- USER: Read own worklogs only
```

### Frontend Components

**Architecture:** Enterprise-grade design system with reusable component library. All components use design tokens from `styles/design-tokens.css` for consistent styling.

#### 1. Pages (`frontend/src/pages/`)

**New Pages (Redesigned with Design System):**
- `NewLayout.tsx` - Main layout wrapper (sidebar 220px→48px collapsible, header with breadcrumbs)
- `NewDashboard.tsx` - Global overview with KpiBar, charts, max text 24px
- `Worklogs.tsx` - Complete worklog list with inline filters, DataTable, export
- `NewBilling.tsx` - Billing with tab navigation, slide-in panel, modals (replaces Billing.jsx)
- `NewTeams.tsx` - Master-detail team management with DataTable (replaces Teams.jsx)

**Legacy Pages (Being Migrated):**
- `IssueView.jsx` - Issue worklogs and metadata
- `EpicView.jsx` - Epic-centric views with charts
- `TeamView.jsx` - Individual team analytics
- `UserView.jsx` - User worklog details
- `UsersListView.jsx` - User list overview
- `Settings.jsx` - Configuration panels with sections

**State Management:**
- Global state in `App.jsx`: `dateRange`, `selectedInstance`
- Passed down via props to all pages
- Custom hook `useData.js` for API fetching with error handling

#### 2. Component Library (`frontend/src/components/common/`)

**Core Components (8 total):**

| Component | Purpose | Key Props | Design Notes |
|-----------|---------|-----------|--------------|
| `Button.tsx` | Primary actions | variant (4), size (3), loading | No gradients, flat design |
| `Badge.tsx` | Status indicators | variant (semantic), dot | Dot + text, no pill background |
| `Card.tsx` | Content containers | flat design | Border + shadow-sm, max radius 8px |
| `Input.tsx` | Form inputs | label, error, height 36px | Built-in validation display |
| `Select.tsx` | Dropdowns | searchable, keyboard nav | Consistent 36px height |
| `Modal.tsx` | Dialogs | size (sm/md/lg) | slide-up 200ms, shadow-lg allowed |
| `KpiBar.tsx` | Metrics display | compact, font-mono values | No gradients, high density |
| `DataTable.tsx` | Data grids | sortable, pagination | Row 36px, text 13px, no stripes |

**Import Pattern:**
```tsx
import { Button, Badge, Card, Input, Select, Modal, KpiBar, DataTable } from '@/components/common'
```

**Design System Rules:**
- All components use CSS variables (`var(--color-*)`, `var(--space-*)`)
- Zero hardcoded hex colors or spacing values
- Typography: max 24px (text-2xl), body 14px, tables 13px
- Colors: Single accent #2563EB, semantic status colors only
- Shadows: No shadow-lg on cards, only modals/dropdowns
- Animations: Micro-interactions under 200ms (slide-up, fade-in)

#### 3. Legacy Components (`frontend/src/components/`)

**Being Migrated to Component Library:**
- `settings/` - 10 configuration panels (JiraInstancesSection, TeamsSection, UsersSection, etc.)
- `charts/` - Recharts wrappers for data visualization
- `WorklogCalendar/` - Calendar view with daily details

**Migration Status:**
- New pages: 100% component library usage ✅
- Old pages: 0% component library usage (inline styles) 🔄
- Settings: Partial migration (buttons need conversion) 🔄

#### 4. Routing (`frontend/src/App.jsx`)

**Routes:**
```javascript
<BrowserRouter>
  <Routes>
    <Route path="/" element={<Dashboard />} />
    <Route path="/teams" element={<Teams />} />
    <Route path="/teams/:teamName" element={<TeamDetail />} />
    <Route path="/users" element={<Users />} />
    <Route path="/users/:email" element={<UserDetail />} />
    <Route path="/epics" element={<Epics />} />
    <Route path="/epics/:epicKey" element={<EpicDetail />} />
    <Route path="/issues/:issueKey" element={<IssueDetail />} />
    <Route path="/billing" element={<Billing />} />
    <Route path="/settings" element={<Settings />} />
  </Routes>
</BrowserRouter>
```

## Data Flow Diagrams

### 1. Worklog Query Flow

```
User selects date range in UI
         ↓
React component calls /api/dashboard/overview
         ↓
FastAPI router → get_current_user() dependency
         ↓
Extract company_id from JWT token
         ↓
storage.get_worklogs_in_range(company_id, start_date, end_date)
         ↓
SQLite query with company_id filter
         ↓
Return JSON response to frontend
         ↓
React renders charts/tables
```

### 2. JIRA Sync Flow

```
User clicks "Sync" button
         ↓
POST /api/sync/worklogs { start_date, end_date }
         ↓
Router extracts company_id from current_user
         ↓
Get JIRA instances for company_id
         ↓
For each instance:
  ├─ Check if Tempo API token exists
  ├─ If yes: TempoClient.get_worklogs_in_range()
  ├─ If no: JiraClient.get_worklogs_for_users()
  └─ storage.bulk_upsert_worklogs(company_id, worklogs)
         ↓
Fetch epics and issues for worklog issue keys
         ↓
storage.bulk_upsert_epics(company_id, epics)
storage.bulk_upsert_issues(company_id, issues)
         ↓
Return sync summary (worklogs synced, errors)
```

### 3. Authentication Flow

```
User clicks "Login with Google"
         ↓
Frontend redirects to /api/auth/google/authorize
         ↓
Backend redirects to Google OAuth consent screen
         ↓
User approves → Google redirects to /api/auth/google/callback?code=XXX
         ↓
Backend exchanges code for Google access token
         ↓
Fetch user email from Google API
         ↓
Check if user exists in database
  ├─ If yes: Load user record with company_id
  └─ If no: Create new user (company_id from invite or new company)
         ↓
Generate JWT token with user_id, company_id, email, role
         ↓
Set HTTP-only cookie with refresh token
         ↓
Redirect to frontend with access token
         ↓
Frontend stores token in localStorage
         ↓
All subsequent API calls include Authorization: Bearer {token}
```

## Multi-Tenant Architecture

### Design Principles

**1. Explicit Parameter Passing (NOT Context Variables)**

❌ **Avoid:**
```python
# Using context variables - hard to debug, implicit
from contextvars import ContextVar
current_company_id = ContextVar('company_id')

async def get_teams():
    company_id = current_company_id.get()
    # ...
```

✅ **Use:**
```python
# Explicit parameter - clear, testable
async def get_teams(company_id: int):
    if not company_id:
        raise ValueError("company_id is required")
    # ...
```

**2. SQL Filtering on Every Query**

Every SELECT/UPDATE/DELETE includes `WHERE company_id = ?`:

```python
# Good - isolated by company_id
async with db.execute(
    "SELECT * FROM worklogs WHERE company_id = ? AND started >= ?",
    (company_id, start_date)
) as cursor:
    return await cursor.fetchall()

# Bad - missing company_id filter (data leakage!)
async with db.execute(
    "SELECT * FROM worklogs WHERE started >= ?",
    (start_date,)
) as cursor:
    return await cursor.fetchall()
```

**3. 404 vs 403 for Cross-Company Access**

Return 404 (not 403) to prevent resource existence leakage:

```python
# User from company_id=1 tries to access team from company_id=2
team = await storage.get_team_by_name(current_user.company_id, "TeamX")

if not team:
    # Return 404 - don't reveal if team exists in another company
    raise HTTPException(status_code=404, detail="Team not found")

# Bad - reveals team exists in system
if team and team.company_id != current_user.company_id:
    raise HTTPException(status_code=403, detail="Access denied")
```

### Implementation Stats

**176 Total Security Modifications:**
- 74 storage methods accept `company_id` parameter
- 96 router endpoints use `Depends(get_current_user)`
- 6 config helper functions filter by `company_id`

**13 Tables with company_id Column:**
- teams, users, jira_instances
- worklogs, epics, issues
- billing_clients, billing_projects, invoices, package_templates
- holidays, factorial_config, complementary_groups, logs

### Migration Strategy

For backward compatibility with existing single-tenant data:

```sql
-- Auto-migrate NULL company_id → 1
UPDATE teams SET company_id = 1 WHERE company_id IS NULL;
UPDATE users SET company_id = 1 WHERE company_id IS NULL;
-- ... (repeat for all 13 tables)

-- Then enforce constraint
ALTER TABLE teams ADD CONSTRAINT company_id_required CHECK (company_id IS NOT NULL);
```

## External Integrations

### JIRA REST API v3

**Base URL:** `https://{instance}.atlassian.net/rest/api/3/`

**Authentication:** Basic Auth (email + API token)

**Key Endpoints Used:**
- `GET /search` - JQL queries for issues/epics
- `GET /issue/{issueKey}` - Issue details
- `GET /issue/{issueKey}/worklog` - Issue worklogs (fallback)
- `GET /user/search` - User lookup

**Rate Limits:** 300 requests/min (cloud), enforced by client

### Tempo Timesheets API v4

**Base URL:** `https://api.tempo.io/4/`

**Authentication:** Bearer token

**Key Endpoints Used:**
- `GET /worklogs` - Efficient date-range queries
  - Query params: `from`, `to`, `jiraWorklogId`
  - Returns detailed worklog data with author info

**Advantages over JIRA Native:**
- Direct date filtering (no need to fetch all issues first)
- Better performance for large datasets
- Dedicated time tracking features

### Factorial HR API

**Base URL:** `https://api.factorialhr.com/api/v1/`

**Authentication:** OAuth 2.0

**Key Endpoints Used:**
- `GET /employees` - Employee list
- `GET /leaves` - Absences and holidays
- `GET /time/shifts` - Work schedules

**Use Case:** Calculate available work hours excluding absences

### Google OAuth 2.0

**Provider:** Google Cloud Platform

**Scopes:** `openid email profile`

**Flow:** Authorization Code Grant
1. Redirect to Google consent screen
2. Exchange code for access token
3. Fetch user email from `https://www.googleapis.com/oauth2/v1/userinfo`
4. Create/login user in local database

## Caching Strategy

### Philosophy: Permanent Local Storage (Not TTL Cache)

Unlike traditional APIs, this app uses **manual sync** instead of automatic polling:

**Rationale:**
- JIRA worklogs rarely change once created
- Users explicitly trigger sync when needed
- Reduces API calls and rate limiting issues
- Faster UI (no waiting for external APIs)

### Storage Model

**Denormalized Worklogs:**
```sql
CREATE TABLE worklogs (
    id TEXT PRIMARY KEY,
    company_id INTEGER NOT NULL,
    issue_key TEXT,
    issue_summary TEXT,  -- Denormalized!
    epic_key TEXT,       -- Denormalized!
    epic_name TEXT,      -- Denormalized!
    author_email TEXT,
    author_display_name TEXT,
    started TEXT,
    time_spent_seconds INTEGER,
    jira_instance TEXT,
    -- ... 20+ columns total
);
```

**Benefits:**
- Single query for worklogs with epic/issue data (no JOINs)
- 87% performance improvement (1.2s → 150ms for user queries)
- Acceptable 20-30% storage overhead

**Trade-offs:**
- Epic name changes require re-sync
- More complex upsert logic
- Larger database file size

### Cache Invalidation

**Manual Sync:**
- User clicks "Sync" button in UI
- Specify date range to sync
- Backend fetches from JIRA/Tempo
- Upserts into database (UPDATE or INSERT)

**No Automatic Expiration:**
- Worklogs persist indefinitely
- No `cache_timestamp` checks on read
- Only updated on explicit sync

## Desktop App Architecture

### Tauri Sidecar Pattern

```
┌──────────────────────────────────────────────┐
│  Tauri Desktop App (Rust + WebView)          │
│  ┌────────────────────────────────────────┐  │
│  │  WebView (React Frontend)              │  │
│  │  http://localhost:8000                 │  │
│  └────────────────────────────────────────┘  │
│              ↓ HTTP                           │
│  ┌────────────────────────────────────────┐  │
│  │  Sidecar Process                       │  │
│  │  (PyInstaller Backend Binary)          │  │
│  │  - FastAPI server on port 8000         │  │
│  │  - SQLite database in app data dir     │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

**Build Process:**
1. `./scripts/build-backend.sh` - PyInstaller bundles Python app
2. Binary placed in `frontend/src-tauri/binaries/backend-{platform}`
3. `npm run tauri:build` - Tauri bundles everything into installer

**Benefits:**
- Single-file distribution (.dmg, .exe, .AppImage)
- No Python installation required
- Native OS integration (system tray, notifications)
- Offline-capable (local database)

**Database Location:**
- **Development:** `backend/worklog_storage.db`
- **Production:** `{AppData}/com.jira-worklog.app/worklog_storage.db`

## Key Architectural Decisions

### 1. SQLite over PostgreSQL

**Decision:** Use SQLite for all deployments (even web)

**Rationale:**
- Simpler deployment (no separate database server)
- Sufficient for expected scale (< 100 users per company)
- Better performance for read-heavy workload (local file)
- Enables desktop app with zero setup

**Trade-offs:**
- Limited concurrency (1 writer at a time)
- No geographic distribution
- File locking issues on network drives

### 2. Denormalized Worklogs

**Decision:** Store epic/issue data redundantly in worklogs table

**Rationale:**
- 87% performance improvement on primary queries
- Most queries filter/group by epic/issue
- Worklogs rarely updated after creation

**Trade-offs:**
- 20-30% storage overhead
- Epic name changes need full re-sync
- More complex upsert logic

### 3. Manual Sync vs Real-Time

**Decision:** User-triggered sync, not automatic polling

**Rationale:**
- JIRA worklogs rarely change retroactively
- Reduces API rate limit pressure
- Faster UI (no waiting for external APIs)
- Users control when to pay API cost

**Trade-offs:**
- Data can be stale
- Requires user action
- No real-time updates

### 4. Explicit company_id Parameter Passing

**Decision:** Pass company_id as explicit parameter to all functions

**Rationale:**
- Clear in code which functions need isolation
- Easy to test (no hidden context)
- Impossible to forget filtering
- Debugging easier (no magic context)

**Trade-offs:**
- More boilerplate (every function signature)
- Can't forget to pass it (breaks immediately)

### 5. Google OAuth Only (No Email/Password)

**Decision:** Single sign-on with Google, no custom auth

**Rationale:**
- Simpler security model (no password storage/reset)
- Better UX (no password to remember)
- Enterprise-friendly (org can enforce 2FA)
- Faster onboarding

**Trade-offs:**
- Requires Google account
- Google outage blocks login
- Privacy concerns (Google knows usage)

### 6. Tauri over Electron

**Decision:** Use Tauri for desktop app instead of Electron

**Rationale:**
- 10x smaller bundle size (~15MB vs ~150MB)
- Lower memory usage (native WebView vs Chromium)
- Faster startup time
- Rust tooling more secure

**Trade-offs:**
- Smaller ecosystem than Electron
- Different WebView engines per platform (compatibility risk)
- Less mature (Tauri 1.0 released 2022)

### 7. FastAPI over Flask/Django

**Decision:** Use FastAPI for backend framework

**Rationale:**
- Native async/await support (better performance)
- Automatic OpenAPI docs generation
- Pydantic validation built-in
- Modern Python patterns (type hints)

**Trade-offs:**
- Newer framework (less Stack Overflow answers)
- Async learning curve
- Fewer third-party libraries than Flask

## Performance Characteristics

### API Response Times (95th percentile)

- Dashboard overview: **150ms** (target: <300ms) ✅
- Team detail: **180ms**
- User worklogs: **120ms** (after index optimization)
- Epic detail: **200ms**
- Sync 1,000 worklogs: **45s** (target: <60s) ✅

### Database Query Performance

**Before Optimization:**
- User worklog query: 1.2s (missing composite index)
- Sync operation: 2.8s (no instance+date index)

**After Optimization:**
- User worklog query: **150ms** (87% improvement)
- Sync operation: **350ms** (87% improvement)

**Key Indexes:**
```sql
CREATE INDEX idx_worklogs_company_started ON worklogs(company_id, started DESC);
CREATE INDEX idx_worklogs_user_range ON worklogs(company_id, author_email, started DESC);
CREATE INDEX idx_worklogs_instance_range ON worklogs(company_id, jira_instance, started DESC);
```

### Scaling Limits

**Current Architecture Supports:**
- 100 companies (multi-tenant)
- 50 users per company
- 10,000 worklogs per user per year
- Total: ~50M worklogs (SQLite max: 281TB)

**Bottlenecks:**
- SQLite write concurrency (1 writer)
- JIRA API rate limits (300 req/min)
- Frontend rendering large lists (no pagination yet)

## Security Considerations

### Multi-Tenant Isolation

**Test Coverage:** 20 test cases verify isolation

**Critical Tests:**
- User from company A cannot access company B data
- Cross-company team access returns 404 (not 403)
- Admin role limited to own company
- JIRA credentials filtered by company_id

### Current Security Gaps (Tech Debt)

1. **Plaintext JIRA Credentials**
   - Stored in `jira_instances.api_token` (TEXT)
   - Should encrypt with company-specific key
   - Priority: **HIGH**

2. **No Rate Limiting**
   - Vulnerable to API abuse
   - Should add slowapi middleware
   - Priority: **MEDIUM**

3. **Missing Audit Logs**
   - No tracking of who changed what
   - Should log sensitive operations
   - Priority: **LOW**

## Future Architecture Improvements

### Planned Enhancements

1. **PostgreSQL Migration Path**
   - For companies outgrowing SQLite
   - Same storage interface, different backend
   - Estimated effort: 40 hours

2. **Redis Caching Layer**
   - For frequently accessed aggregations
   - Reduce database queries by 50%
   - Estimated effort: 20 hours

3. **Worklog Approval Workflow**
   - Manager review before billing
   - Status: draft → pending → approved
   - Estimated effort: 30 hours

4. **Real-Time Sync (Optional)**
   - Background job polls JIRA every 15 min
   - Celery + Redis for task queue
   - Estimated effort: 40 hours

### Scalability Roadmap

**Phase 1 (Current): < 100 users**
- SQLite sufficient
- No caching needed
- Manual sync acceptable

**Phase 2 (100-1,000 users):**
- Add Redis caching
- Implement pagination
- Consider PostgreSQL

**Phase 3 (1,000+ users):**
- Mandatory PostgreSQL
- Separate read replicas
- Auto-scaling infrastructure
- CDN for frontend assets
