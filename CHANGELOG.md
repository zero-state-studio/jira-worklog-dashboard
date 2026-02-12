# Changelog

All notable changes to the JIRA Worklog Dashboard project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Multi-tenant SaaS architecture with company_id isolation (176 security modifications)
- 111 API endpoints across 11 routers
- 24 database tables with 40+ performance indexes
- Google OAuth 2.0 authentication with JWT tokens
- Desktop app distribution via Tauri + PyInstaller sidecar
- Billing system with 6-level rate cascade
- Factorial HR integration for absences and holidays

---

## [2.0.0] - 2026-02-12

### Changed - UI Redesign (Complete)

**Major visual and architectural overhaul** of the entire frontend to enterprise-grade design system.

#### Design System Implementation
- **New Philosophy:** "Functional Density" inspired by Linear, Stripe, and Metabase
- **Design Tokens:** Complete CSS variable system (`design-tokens.css`) - zero hardcoded values
- **Typography:** Reduced scale (max 24px, body 14px, tables 13px) for high information density
- **Colors:** Single accent (#2563EB blue), semantic status colors only
- **Spacing:** Compact 4px grid system (p-4, p-6 standard)
- **Visual Style:** Flat design, no gradients, no glass morphism, minimal shadows

#### Component Library (8 Core Components)
- **Button:** 4 variants (primary, secondary, outline, ghost), 3 sizes, loading state
- **Badge:** Dot + text pattern, semantic colors, no pill backgrounds
- **Card:** Flat design with border + subtle shadow, max radius 8px
- **Input:** Consistent 36px height, built-in label/error handling
- **Select:** Searchable dropdown with keyboard navigation
- **Modal:** sm/md/lg sizes, slide-up animation (200ms), shadow-lg allowed
- **KpiBar:** Compact metrics row with font-mono values
- **DataTable:** 36px row height, 13px text, sortable, pagination

**Import Pattern:**
```tsx
import { Button, Badge, Card, Input, Select, Modal, KpiBar, DataTable } from '@/components/common'
```

#### Redesigned Pages (5 total)
- **NewLayout.tsx:** Main wrapper with collapsible sidebar (220px→48px), header with breadcrumbs
- **NewDashboard.tsx:** Global overview with KpiBar, charts, max text 24px
- **Worklogs.tsx:** Complete worklog list with inline filters, DataTable, export functionality
- **NewBilling.tsx:** Billing management with tab navigation, slide-in panel, modal workflows
- **NewTeams.tsx:** Master-detail team management with DataTable, avatar-based UI

#### Micro-Interactions
- Modal entrance: slide-up 200ms + scale(0.95→1)
- Button hover: 150ms color transition
- Table row hover: 150ms background transition
- Sidebar collapse: 200ms width transition
- All animations under 200ms (subtle, not elaborate)

#### Responsive Design
- Desktop-first approach (1920px → 1024px)
- Sidebar auto-collapses at 1280px
- Tables scroll horizontally at smaller viewports
- Verified at 1920px, 1440px, 1280px, 1024px

#### Documentation Created
- `frontend/DESIGN_SYSTEM.md` - Complete design system guide (color palette, typography, components)
- `frontend/QUALITY_REVIEW_COMPLETE.md` - Quality review summary and status
- `frontend/FIX_PATTERNS.md` - Copy-paste patterns for migrating old pages
- `frontend/POLISH_LOG.md` - Detailed audit log with all findings
- `CLAUDE.md` - Added "Design System" section for AI agents
- `docs/architecture.md` - Updated Frontend Components section
- `docs/conventions.md` - Added "Frontend Conventions" section

#### Migration Status
- ✅ New components: 100% design tokens, production-ready
- ✅ New pages: 100% component library usage
- 🔄 Old pages: Being migrated gradually (IssueView, EpicView, TeamView, UserView, Settings)

#### Breaking Changes
- **Visual:** Complete redesign - screenshots and recorded demos need updating
- **Components:** Old `glass-card` class deprecated, use `flat-card` instead
- **Typography:** Body text changed from 16px to 14px (higher density)
- **Colors:** Removed gradient utilities (`bg-gradient-primary`, `shadow-glow`)

#### Performance Impact
- Build time: ~1.9s (unchanged)
- Bundle size: Minimal increase (<5KB) due to new components
- Runtime: Faster (fewer inline styles, optimized DataTable)

#### Files Changed
- **Created:** 8 new TypeScript components (Button, Badge, Card, Input, Select, Modal, KpiBar, DataTable)
- **Created:** 5 new redesigned pages (NewLayout, NewDashboard, Worklogs, NewBilling, NewTeams)
- **Created:** design-tokens.css with 200+ design tokens
- **Modified:** index.css with new animations and utilities
- **Created:** 5 documentation files (DESIGN_SYSTEM.md, QUALITY_REVIEW_COMPLETE.md, etc.)

#### Developer Impact
- **Required:** All new UI components must use design tokens from `design-tokens.css`
- **Required:** Import components from `@/components/common`, not inline styles
- **Required:** Follow typography rules (max 24px, body 14px, tables 13px)
- **Required:** Use single accent color (#2563EB), no gradients
- **Required:** All animations under 200ms

---

## [1.0.0] - Initial Release

### Added - Core Features
- Multi-JIRA instance worklog synchronization
- Manual sync from JIRA REST API v3 and Tempo API v4
- SQLite-based local caching for fast queries
- Dashboard with global metrics, trends, and team breakdowns
- Team-centric views with member analytics
- User worklog details with calendar visualization
- Epic and issue worklog tracking
- Settings management for teams, users, JIRA instances
- Recharts-based data visualizations
- React 18 + Vite frontend
- FastAPI + Python 3.11 backend
- Tailwind CSS styling

---

## References

- **Design System:** [frontend/DESIGN_SYSTEM.md](./frontend/DESIGN_SYSTEM.md)
- **Component Library:** [frontend/src/components/common/README.md](./frontend/src/components/common/README.md)
- **Architecture:** [docs/architecture.md](./docs/architecture.md)
- **Conventions:** [docs/conventions.md](./docs/conventions.md)
- **Setup Guide:** [docs/setup-and-commands.md](./docs/setup-and-commands.md)
