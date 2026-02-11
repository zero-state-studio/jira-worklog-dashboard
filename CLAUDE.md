# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

A **multi-tenant JIRA Worklog Dashboard** that syncs, caches, and visualizes worklog data from multiple JIRA instances. Built with **FastAPI** (backend) and **React** (frontend), with optional **Tauri** desktop distribution.

**Key Features:**
- Multi-tenant SaaS with `company_id` isolation (176 security modifications)
- Google OAuth 2.0 authentication with JWT tokens
- 111 API endpoints across 11 routers
- 24 database tables with 40+ performance indexes
- Manual sync from JIRA/Tempo APIs (not real-time)
- Billing system with 6-level rate cascade
- Desktop app with PyInstaller + Tauri sidecar

---

## Quick Start

```bash
# Backend (Terminal 1)
cd backend && source venv/bin/activate && uvicorn app.main:app --reload

# Frontend (Terminal 2)
cd frontend && npm run dev

# Access: http://localhost:5173 (frontend) → http://localhost:8000 (backend)
```

**First time setup:** See [Setup & Commands](./docs/setup-and-commands.md)

---

## Critical Multi-Tenant Security Pattern

**Every router endpoint MUST follow this pattern:**

```python
from app.auth.dependencies import get_current_user

@router.get("/resource")
async def get_resource(current_user: CurrentUser = Depends(get_current_user)):
    storage = get_storage()
    return await storage.get_resource(current_user.company_id)  # Explicit company_id!
```

**Every storage method MUST filter by company_id:**

```python
async def get_resource(self, company_id: int):
    if not company_id:
        raise ValueError("company_id is required")
    # ... WHERE company_id = ? ...
```

**Security Rules:**
- ✅ Always pass `company_id` explicitly (not context variables)
- ✅ Return 404 (not 403) for cross-company access (prevents resource existence leakage)
- ❌ Never accept `company_id` from request body/params

---

## Documentation

**Complete documentation in `/docs/`:**

- **[Architecture](./docs/architecture.md)** - System design, data flow, multi-tenant patterns, key decisions
- **[Database Schema](./docs/database-schema.md)** - All 24 tables with SQL, indexes, relationships
- **[API Reference](./docs/api-reference.md)** - All 111 endpoints with request/response examples
- **[Conventions](./docs/conventions.md)** - Code standards, naming, patterns, best practices
- **[Setup & Commands](./docs/setup-and-commands.md)** - Installation, development, building, deployment
- **[Environment Variables](./docs/env-variables.md)** - All required/optional env vars

**Agent roles in `/agents/roles/`:**

9 specialized roles: Backend-Core, Database, Frontend, Security, Integration, Billing, QA, DevOps, Tech-Lead. See [agents/roles/README.md](./agents/roles/README.md)

---

## Resources

- **Project Overview:** [docs/project-overview.md](./docs/project-overview.md)
- **Multi-Tenant Security Tests:** [backend/tests/README.md](./backend/tests/README.md)
- **Database Optimization:** [backend/OPTIMIZATION_PLAN.md](./backend/OPTIMIZATION_PLAN.md)
