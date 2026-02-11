# Project Context - JIRA Worklog Dashboard

## Quick Overview

**Multi-tenant SaaS application** for syncing, caching, and analyzing JIRA worklog data from multiple instances. Built for companies that need consolidated worklog reporting, billing automation, and team productivity insights.

### Key Metrics
- **176 security modifications** for multi-tenant isolation
- **111 API endpoints** across 11 routers
- **24 database tables** with 40+ performance indexes
- **9 specialized agent roles** for autonomous development
- **20 security test cases** ensuring tenant isolation

---

## Tech Stack

### Backend (Python 3.11+)
- **FastAPI** - Modern async web framework
- **SQLite** - Main database with async support (aiosqlite)
- **Pydantic** - Data validation and settings management
- **JWT** - Authentication tokens
- **httpx** - Async HTTP client for API integrations

### Frontend (React 18+)
- **React + TypeScript** - UI framework
- **Vite** - Build tool and dev server
- **TanStack Query** - Server state management
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first styling

### Desktop Distribution
- **Tauri** - Cross-platform desktop wrapper
- **PyInstaller** - Backend bundling as sidecar

### External Integrations
- **JIRA API** - Issue and project data
- **Tempo API** - Worklog data (primary source)
- **Factorial API** - HR/time-off data
- **Google OAuth 2.0** - Authentication

---

## Architecture Highlights

### Multi-Tenant Security Model
```
User Login (Google OAuth)
    ↓
JWT Token (contains company_id)
    ↓
Every Request → Extract company_id
    ↓
Storage Layer → Filter by company_id
    ↓
Database → WHERE company_id = ?
```

**Critical Pattern:** All data access MUST be scoped by `company_id` to prevent cross-tenant data leakage.

### Data Flow
```
Manual Sync Trigger
    ↓
Fetch from JIRA/Tempo APIs
    ↓
Cache in SQLite (denormalized)
    ↓
Serve via REST API
    ↓
Frontend displays cached data
```

**Note:** Not real-time! Users manually trigger syncs (button in UI).

### Key Components

1. **WorklogStorage** (`app/cache.py`)
   - 74 async methods for data operations
   - All methods require `company_id` parameter
   - Handles denormalization for performance

2. **Authentication** (`app/auth/`)
   - Google OAuth flow
   - JWT token generation/validation
   - Role-based access control (ADMIN/MANAGER/USER)

3. **Routers** (`app/routers/`)
   - 11 routers (worklogs, teams, billing, settings, etc.)
   - Every endpoint uses `Depends(get_current_user)`
   - Returns 404 for cross-company access

4. **Billing System** (`app/routers/billing.py`)
   - 6-level rate cascade
   - Invoice generation with PDF export
   - Client/project hierarchy

---

## Critical Files

### Must-Read
- **CLAUDE.md** - Primary development instructions
- **docs/architecture.md** - Complete system design
- **docs/database-schema.md** - All 24 tables with SQL
- **backend/tests/README.md** - Security verification checklist

### Agent Roles
- **agents/roles/*.md** - 9 specialized roles (Backend-Core, Database, Frontend, Security, etc.)
- **agents/roles/README.md** - Role selection guide

### Configuration
- **backend/.env** - Backend environment variables
- **frontend/.env** - Frontend configuration
- **backend/app/config.py** - Settings management

---

## Development Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git

### Setup (5 minutes)

```bash
# Clone and navigate
cd jira-worklog-dashboard

# Backend setup
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # Configure Google OAuth credentials

# Frontend setup
cd ../frontend
npm install
cp .env.example .env

# Database initialization (creates all 24 tables)
cd ../backend
python -m app.init_db
```

### Running Dev Servers

```bash
# Terminal 1 - Backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
# → http://localhost:8000

# Terminal 2 - Frontend
cd frontend
npm run dev
# → http://localhost:5173
```

### First Login
1. Open http://localhost:5173
2. Click "Sign in with Google"
3. After OAuth, you're auto-assigned to `company_id=1`
4. First user in a company gets ADMIN role

---

## Common Tasks

### Run Tests
```bash
cd backend
pytest tests/test_multi_tenant.py -v  # Security tests
pytest tests/ -v  # All tests
```

### Check Multi-Tenant Security
```bash
# Verify all endpoints are protected
cd backend
pytest tests/test_multi_tenant.py::test_auth_required -v
pytest tests/test_multi_tenant.py::test_company_isolation -v
```

### Database Migrations
```bash
# Check if migration needed
curl http://localhost:8000/api/settings/migration/check

# Execute migration (adds company_id to all tables)
curl -X POST http://localhost:8000/api/settings/migration/execute
```

### Build Desktop App
```bash
# Backend bundle
cd backend
pyinstaller backend.spec

# Frontend build
cd frontend
npm run build

# Tauri bundle
cd src-tauri
cargo build --release
```

---

## Project Structure

```
jira-worklog-dashboard/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry
│   │   ├── cache.py             # WorklogStorage (2500+ lines)
│   │   ├── config.py            # Settings
│   │   ├── auth/                # Authentication
│   │   │   ├── jwt.py
│   │   │   ├── dependencies.py  # get_current_user
│   │   │   └── google_oauth.py
│   │   └── routers/             # 11 routers
│   │       ├── worklogs.py      # 15 endpoints
│   │       ├── billing.py       # 18 endpoints
│   │       ├── teams.py         # 12 endpoints
│   │       └── ...
│   ├── tests/
│   │   ├── test_multi_tenant.py # Security tests
│   │   └── conftest.py          # Test fixtures
│   ├── migrations/              # Database migrations
│   └── maintenance/             # Archive/cleanup scripts
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Main component
│   │   ├── components/          # Reusable UI
│   │   ├── pages/               # Route pages
│   │   └── api/                 # API client
│   └── public/
├── docs/
│   ├── architecture.md          # System design
│   ├── database-schema.md       # Schema reference
│   ├── api-reference.md         # All 111 endpoints
│   ├── conventions.md           # Code standards
│   └── desktop/                 # Claude Desktop context
├── agents/
│   └── roles/                   # 9 agent role definitions
├── CLAUDE.md                    # Primary instructions
└── README.md
```

---

## Important Constraints

### What This System IS
- ✅ Multi-tenant SaaS with isolated data
- ✅ Manual sync from JIRA/Tempo (user-triggered)
- ✅ Cached worklog storage for fast queries
- ✅ Billing automation with rate cascades
- ✅ Desktop-first (Tauri app) with web access

### What This System IS NOT
- ❌ Real-time sync (no webhooks)
- ❌ JIRA replacement (read-only integration)
- ❌ Time tracking tool (imports existing worklogs)
- ❌ Public API (internal company use only)

---

## Security Principles

### Multi-Tenant Isolation (CRITICAL)

**Every database query MUST include `WHERE company_id = ?`**

```python
# ✅ CORRECT
async def get_teams(self, company_id: int):
    if not company_id:
        raise ValueError("company_id required")
    return await self.db.execute(
        "SELECT * FROM teams WHERE company_id = ?",
        (company_id,)
    )

# ❌ WRONG - Data leakage!
async def get_teams(self):
    return await self.db.execute("SELECT * FROM teams")
```

### Authentication Flow

1. User clicks "Sign in with Google"
2. Google OAuth redirects back with auth code
3. Backend exchanges code for Google user info
4. Backend creates/updates user in database
5. Backend generates JWT with `{user_id, company_id, email, role}`
6. Frontend stores JWT in localStorage
7. All API requests include `Authorization: Bearer <JWT>`
8. Middleware validates JWT and extracts `company_id`

### Authorization Levels

- **USER** - View own worklogs, create invoices
- **MANAGER** - View team worklogs, manage team settings
- **ADMIN** - Full access, manage company settings, JIRA instances

---

## Performance Considerations

### Database Optimization
- **40+ indexes** on frequently queried columns
- **Denormalized worklogs** (includes author_name, issue_key, etc.)
- **Composite indexes** on `(company_id, started DESC)` for fast range queries
- **Archiving strategy** for old data (>2 years)

### API Response Times (Target)
- User worklog queries: <200ms
- Team aggregations: <500ms
- Sync operations: 5-30s (depends on JIRA API)

### Bottlenecks
1. **JIRA API rate limits** - 100-300 req/min depending on plan
2. **Large sync operations** - 10K+ worklogs can take 30s+
3. **Complex billing queries** - Rate cascade calculations are CPU-bound

---

## Next Steps for New Contributors

1. **Read CLAUDE.md** - Primary development instructions
2. **Review docs/architecture.md** - Understand system design
3. **Run security tests** - `pytest tests/test_multi_tenant.py -v`
4. **Check agent roles** - `agents/roles/README.md` to pick your role
5. **Review recent commits** - See what patterns are being used

### Before Making Changes

1. Understand multi-tenant security pattern (see desktop/multi-tenant-security.md)
2. Read relevant router/storage code
3. Check if similar endpoints exist (follow existing patterns)
4. Run tests before committing
5. Verify no cross-tenant data leakage

---

## Helpful Resources

### Documentation
- Complete docs in `/docs/`
- Agent roles in `/agents/roles/`
- API examples in `/docs/api-reference.md`

### Testing
- Security tests: `backend/tests/test_multi_tenant.py`
- Test README: `backend/tests/README.md`
- Run all tests: `cd backend && pytest -v`

### Optimization
- Database plan: `backend/OPTIMIZATION_PLAN.md`
- Archive manager: `backend/maintenance/archive_manager.py`

### Memory/Context
- Auto memory: `~/.claude/projects/.../memory/MEMORY.md`
- Multi-tenant implementation notes
- Database optimization findings
