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

## Design System

**Frontend follows an enterprise-grade design system based on "Functional Density" principles** (inspired by Linear, Stripe, Metabase). All UI components use design tokens from `frontend/src/styles/design-tokens.css` - **zero hardcoded values allowed**.

### Key Principles

1. **Flat Design** - No gradients, no glass morphism, minimal shadows
2. **High Density** - Compact spacing, maximum information per viewport
3. **Single Accent** - One accent color (#2563EB blue), semantic colors for status only
4. **Design Tokens Only** - All colors, spacing, typography from CSS variables
5. **Component Library** - Use 8 core components (Button, Badge, Card, Input, Select, Modal, KpiBar, DataTable)

### Typography Rules

- **Max size:** 24px (text-2xl) - never larger, even for headings
- **Body text:** 14px (text-sm) - default for all content
- **Table text:** 13px - optimized for data density
- **Labels/captions:** 11-12px (text-xs) - for secondary info
- **Numbers:** JetBrains Mono (font-mono) - for metrics, hours, currency
- **Font:** DM Sans (--font-sans) - primary font family

### Color Rules

- **Background:** #FAFAFA (--color-bg) - subtle off-white, not pure white
- **Cards:** #FFFFFF (--color-surface) - pure white for elevated surfaces
- **Accent:** #2563EB (--color-accent) - single blue accent, no purple/teal/multi-color
- **Borders:** #E4E4E7 (--color-border) - subtle gray borders
- **Status colors:** Green (success), yellow (warning), red (error) - semantic only
- **Text hierarchy:** Primary (#000), Secondary (#52525B), Tertiary (#A1A1AA)
- **Rule:** ALL colors via CSS variables (`var(--color-*)`) - no hex hardcoded in components

### Shadow Rules

- **Cards:** NO shadow-lg - only border + subtle shadow-sm
- **Modals:** shadow-lg OK - intentional elevation for dialogs
- **Dropdowns:** shadow-lg OK - floating UI elements
- **Buttons:** NO shadows - flat design
- **Rule:** If it's not a modal or dropdown, it doesn't need shadow-lg

### Component Usage

**Always use the component library - never inline styles:**

```tsx
// ✅ CORRECT - Use components
import { Button, Badge, Input } from '@/components/common'
<Button variant="primary">Save</Button>

// ❌ WRONG - Inline styles
<button className="px-5 py-2 bg-blue-600">Save</button>
```

**Core Components:**
- `Button` - 4 variants (primary, secondary, outline, ghost), 3 sizes, loading state
- `Badge` - Dot + text pattern, semantic colors, no pill backgrounds
- `Input` - Height 36px, built-in label/error, design tokens only
- `Select` - Searchable dropdown, keyboard nav, consistent height
- `Card` - Flat design, border + subtle shadow, max radius 8px
- `Modal` - sm/md/lg sizes, slide-up animation, shadow-lg allowed
- `KpiBar` - Compact metrics row, font-mono values, no gradients
- `DataTable` - Row height 36px, text 13px, sortable, pagination

### Spacing Rules

- **4px grid system:** Use p-3 (12px), p-4 (16px), p-6 (24px)
- **Avoid excessive padding:** No p-8, p-10, p-12 on regular cards
- **Table rows:** 36px height (--input-height)
- **Page padding:** 24px (p-6) standard
- **Section gaps:** 16-24px between major sections

### Reference Files

- **Design tokens:** `frontend/src/styles/design-tokens.css` (single source of truth)
- **Component docs:** `frontend/src/components/common/README.md`
- **Design system guide:** `frontend/DESIGN_SYSTEM.md`
- **Quality review:** `frontend/QUALITY_REVIEW_COMPLETE.md`

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

10 specialized roles: Backend-Core, Database, Frontend, Security, Integration, Billing, QA, DevOps, Tech-Lead, Docs. See [agents/roles/README.md](./agents/roles/README.md)

---

## Resources

- **Project Overview:** [docs/project-overview.md](./docs/project-overview.md)
- **Multi-Tenant Security Tests:** [backend/tests/README.md](./backend/tests/README.md)
- **Database Optimization:** [backend/OPTIMIZATION_PLAN.md](./backend/OPTIMIZATION_PLAN.md)
