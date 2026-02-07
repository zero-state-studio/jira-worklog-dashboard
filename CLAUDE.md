# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A JIRA Worklog Dashboard that fetches, caches, and visualizes worklog data from multiple JIRA instances. Built as a web app (React + FastAPI) with optional Tauri desktop distribution. Supports multi-team tracking, Epic/Issue analytics, billing/package management, and complementary instance groups.

## Common Commands

### Backend (Python/FastAPI)

```bash
# Development server
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
uvicorn app.main:app --reload --port 8000

# Install dependencies
pip install -r requirements.txt

# Create/activate virtual environment
python -m venv venv
source venv/bin/activate
```

### Frontend (React/Vite)

```bash
# Development server
cd frontend
npm run dev

# Build for production
npm run build

# Install dependencies
npm install
```

### Desktop App (Tauri)

```bash
# Run desktop app in dev mode (requires backend running separately)
cd frontend
npm run tauri:dev

# Build desktop app for distribution
./scripts/build-backend.sh  # First build backend as executable
npm run tauri:build
```

## Architecture

### Backend Structure

**Configuration System** (`config.py`):
- Dual-mode configuration: YAML file (`config.yaml`) OR SQLite database
- Database configuration takes precedence over YAML
- Functions like `get_teams_from_db()`, `get_users_from_db()`, `get_jira_instances_from_db()` automatically fall back to YAML if DB is empty
- Demo mode available when no config exists

**Data Flow**:
1. JIRA API clients (`jira_client.py`, `tempo_client.py`) fetch raw data
2. Cache layer (`cache.py`) stores worklogs, epics, issues, users, teams in SQLite
3. Routers aggregate and transform data for frontend consumption
4. Complementary instances: groups of JIRA instances that should be counted together (e.g., main instance + time-tracking instance)

**Key Clients**:
- `JiraClient`: JIRA REST API v3 (issues, epics, projects, user search)
- `TempoClient`: Tempo Timesheets API v4 (more granular worklog data with date filtering)
- Both clients use async httpx with proper auth headers

**Storage** (`cache.py`):
- SQLite with aiosqlite for async operations
- Tables: worklogs, epics, issues, teams, users, jira_instances, complementary_instance_groups, holidays, package_templates, packages, logs
- TTL-based caching with `cache_timestamp` columns
- Database handles both configuration (teams, users, instances) and cached data (worklogs, epics)

**API Routers** (`app/routers/`):
- `dashboard.py`: Global overview with total hours, daily trends, team breakdowns
- `teams.py`: Team-specific metrics, member hours, epic distribution
- `users.py`: Individual user worklog details, daily hours, epic breakdown
- `epics.py`: Epic-centric view with total hours and contributors
- `issues.py`: Issue detail with worklogs and metadata
- `sync.py`: Manual sync triggers for JIRA data
- `settings.py`: CRUD for teams, users, JIRA instances, holidays
- `billing.py`: Package/billing management with hour tracking
- `logs.py`: Application logging with database storage

### Frontend Structure

**State Management**:
- Global date range state in `App.jsx` passed down to all pages
- Global JIRA instance selector (null = all instances combined)
- Custom hooks in `src/hooks/useData.js` for data fetching

**Routing** (`App.jsx`):
- Dashboard (`/`) - Global view
- Teams (`/teams`, `/teams/:teamName`)
- Users (`/users`, `/users/:email`)
- Epics (`/epics`, `/epics/:epicKey`)
- Issues (`/issues/:issueKey`)
- Billing (`/billing`)
- Settings (`/settings`)

**Key Components**:
- `Layout.jsx`: Header with date picker and instance selector
- `WorklogCalendar/`: Calendar view with daily worklog details
- `settings/`: Configuration panels for teams, users, instances, holidays, packages
- Pages consume `dateRange` and `selectedInstance` props from App

**Styling**: Tailwind CSS with dark theme, Recharts for visualizations

### Complementary Instances

**Concept**: Some organizations use multiple JIRA instances where one is primary (issues) and others are complementary (time tracking). Hours should only be counted once in "All instances" view.

**Implementation**:
- Defined in database via `complementary_instance_groups` table
- Each group has a primary instance and secondary instances
- When aggregating "All" view, secondary instance hours are excluded
- Individual instance views show full data
- Managed via Settings UI (`JiraInstancesSection.jsx`)

### Tempo vs Native JIRA Worklogs

**Tempo** (preferred when available):
- Dedicated time tracking API with better filtering
- Requires separate Tempo API token
- More efficient for date-range queries
- Used by `TempoClient` class

**JIRA Native** (fallback):
- Built into JIRA REST API
- Less efficient (no direct date filtering)
- Used by `JiraClient` class
- Activated when `tempo_api_token` is not configured

## Important Patterns

### Adding a New API Endpoint

1. Create router function in appropriate `app/routers/*.py` file
2. Use async/await for all database and HTTP operations
3. Leverage `get_storage()` for database access
4. Return Pydantic models or plain dicts
5. Register router in `app/main.py` with `app.include_router()`

### Data Fetching Flow

```python
# 1. Check cache first
storage = get_storage()
cached = await storage.get_worklogs_in_range(start, end, user_emails)

if cached and not force_refresh:
    return cached

# 2. Fetch from JIRA/Tempo
instances = await get_jira_instances_from_db()
for instance in instances:
    if instance.tempo_api_token:
        client = TempoClient(instance.tempo_api_token, ...)
    else:
        client = JiraClient(instance)

    worklogs = await client.get_worklogs_in_range(...)
    await storage.cache_worklogs(worklogs)

# 3. Return fresh data
return await storage.get_worklogs_in_range(start, end, user_emails)
```

### Logging System

- Custom logging setup in `logging_config.py`
- Logs stored in SQLite (`logs` table) with request correlation
- Request ID tracking via context vars
- Access via `/api/logs` endpoint with filtering
- Middleware captures request/response bodies for debugging

## Configuration Files

**backend/config.yaml** (optional, overridden by database):
```yaml
jira_instances:
  - name: "Company Main"
    url: "https://company.atlassian.net"
    email: "user@company.com"
    api_token: "token"
    tempo_api_token: "optional-tempo-token"

teams:
  - name: "Team Name"
    members:
      - email: "user@company.com"
        first_name: "First"
        last_name: "Last"

settings:
  daily_working_hours: 8
  timezone: "Europe/Rome"
  cache_ttl_seconds: 900
  demo_mode: false
  complementary_instances: {}  # Deprecated, use database
```

**Demo Mode**: Set `demo_mode: true` or run without config.yaml to use generated sample data

## Development Workflow

1. Backend changes: Edit Python files, uvicorn auto-reloads
2. Frontend changes: Edit JSX files, Vite HMR updates instantly
3. Database schema changes: Update `cache.py` storage class, run migrations manually if needed
4. New API endpoint: Add router → update frontend hook → use in component
5. Testing JIRA integration: Use demo mode first, then configure real credentials

## Tauri Desktop Distribution

**Architecture**:
- Backend compiled to standalone executable via PyInstaller (see `scripts/build-backend.sh`)
- Executable bundled as Tauri sidecar in `frontend/src-tauri/binaries/`
- Frontend webview connects to local backend server
- Single-file distribution for end users

**Build Process**:
```bash
./scripts/build-backend.sh      # Creates backend binary
cd frontend && npm run tauri:build  # Bundles everything
```

**Sidecar**: Backend runs as subprocess managed by Tauri, accessible at `http://127.0.0.1:8000`
