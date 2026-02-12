# Product Vision & Roadmap

## Vision Statement

**JIRA Worklog Dashboard** is a multi-tenant SaaS platform that consolidates worklog data from multiple JIRA instances, providing companies with unified reporting, automated billing, and team productivity insights.

### Core Problem

Companies using JIRA for project management face these challenges:

1. **Fragmented Data** - Multiple JIRA instances (per-client, per-department) create siloed worklog data
2. **Manual Billing** - Extracting worklogs for invoicing is time-consuming and error-prone
3. **Limited Analytics** - JIRA's native reporting doesn't aggregate across instances or provide billing-focused views
4. **Compliance Overhead** - Tracking billable vs. non-billable hours requires manual spreadsheet work

### Solution

A centralized platform that:
- ✅ Syncs worklogs from unlimited JIRA instances
- ✅ Provides unified dashboard with cross-instance analytics
- ✅ Automates invoice generation with flexible rate cascades
- ✅ Tracks team productivity and workload distribution
- ✅ Exports data for compliance and client reporting

---

## Target Users

### Primary Persona: Billing Manager
**Pain Points:**
- Spends 10+ hours/month manually extracting worklogs
- Juggles different rate structures across clients/projects
- Struggles to verify billable hours against contracts
- Needs to generate client invoices quickly at month-end

**Goals:**
- Automated worklog collection from all JIRA instances
- One-click invoice generation with correct rates
- Quick verification of billable vs. non-billable hours
- Export capabilities for accounting systems

### Secondary Persona: Team Lead
**Pain Points:**
- No visibility into team workload distribution
- Hard to identify over/under-utilized team members
- Can't easily track progress on epics across projects
- Lacks historical data for sprint planning

**Goals:**
- Dashboard showing team worklog distribution
- Epic/project progress tracking
- Historical velocity for capacity planning
- Identify blockers (team members with unusually high hours)

### Tertiary Persona: Company Admin
**Pain Points:**
- Managing multiple JIRA instance credentials
- Ensuring data security across departments
- Controlling who can see what data
- Compliance with client NDAs (data isolation)

**Goals:**
- Centralized JIRA instance management
- Role-based access control
- Multi-tenant data isolation for client confidentiality
- Audit logs for compliance

---

## Key Features (Current)

### 1. Multi-Instance Sync
**What:** Connects to unlimited JIRA + Tempo instances
**Value:** Consolidates fragmented data into single source of truth
**Implementation:** Manual sync via UI button (not real-time)

### 2. Unified Worklog Dashboard
**What:** Searchable, filterable view of all worklogs across instances
**Value:** Eliminates need to log into multiple JIRA instances
**Filters:** Date range, team, user, JIRA instance, issue, epic, project

### 3. Billing Automation
**What:** 6-level rate cascade system for automated rate assignment
**Value:** Reduces billing prep time from hours to minutes
**Cascade:** Package → Issue → Epic → Project → Client → Default (first match wins)

### 4. Invoice Generation
**What:** Create invoices from worklog data with PDF export
**Value:** Professional invoices ready to send to clients
**Features:** Logo upload, custom notes, multiple currencies, rate adjustments

### 5. Team Analytics
**What:** Visualizations of team workload, velocity, and distribution
**Value:** Data-driven insights for capacity planning and resource allocation
**Metrics:** Hours/person, billable ratio, project distribution, trend analysis

### 6. Multi-Tenant Security
**What:** Complete data isolation between companies
**Value:** Safe for agencies managing confidential client data
**Implementation:** 176 security modifications, 20 test cases

### 7. Desktop App
**What:** Cross-platform desktop application (Tauri)
**Value:** Works offline, faster than web, integrated with OS
**Distribution:** PyInstaller + Tauri for native builds

---

## Roadmap

### Phase 1: Foundation (COMPLETED ✅)
**Timeline:** Q3 2025 - Q1 2026
**Status:** Shipped

- [x] Multi-tenant architecture with company_id isolation
- [x] Google OAuth authentication + JWT
- [x] JIRA/Tempo API integration
- [x] Basic worklog sync and storage
- [x] Team management
- [x] Security testing suite

### Phase 2: Billing System (COMPLETED ✅)
**Timeline:** Q4 2025 - Q1 2026
**Status:** Shipped

- [x] 6-level rate cascade system
- [x] Invoice generation with PDF export
- [x] Client/project hierarchy
- [x] Package templates for recurring rates
- [x] Billing client/project management

### Phase 3: Advanced Analytics (IN PROGRESS 🚧)
**Timeline:** Q1 2026 - Q2 2026
**Status:** 60% complete

- [x] Team worklog distribution charts
- [x] Billable vs. non-billable tracking
- [ ] Epic progress tracking with burndown
- [ ] Custom reporting templates
- [ ] Export to Excel/CSV with formatting
- [ ] Forecasting based on historical velocity

### Phase 4: Automation & Intelligence (PLANNED 📋)
**Timeline:** Q2 2026 - Q3 2026
**Status:** Design phase

- [ ] Auto-sync scheduling (hourly/daily/weekly)
- [ ] Smart rate suggestions (ML-based)
- [ ] Anomaly detection (unusual work patterns)
- [ ] Budget alerts (project over/under budget)
- [ ] Time-off integration (Factorial API)
- [ ] Recurring invoice automation

### Phase 5: Enterprise Features (PLANNED 📋)
**Timeline:** Q3 2026 - Q4 2026
**Status:** Scoping

- [ ] SSO integration (SAML, Okta)
- [ ] Advanced RBAC (custom roles)
- [ ] Audit logs with retention policies
- [ ] Multi-currency with real-time rates
- [ ] Client portal (view their invoices)
- [ ] API for third-party integrations

### Phase 6: Scale & Optimize (FUTURE 🔮)
**Timeline:** Q4 2026+
**Status:** Ideas

- [ ] PostgreSQL migration (from SQLite)
- [ ] Microservices architecture
- [ ] Real-time sync via webhooks
- [ ] Mobile apps (iOS/Android)
- [ ] Slack/Teams integration
- [ ] AI-powered worklog analysis

---

## Success Metrics

### User Metrics
- **Time Saved:** 80% reduction in billing prep time (10h → 2h/month)
- **Accuracy:** 95%+ correct rate assignment via cascade
- **Adoption:** 80% of team using dashboard vs. JIRA directly
- **Satisfaction:** 4.5+ star rating from users

### Business Metrics
- **MRR Growth:** 20% month-over-month
- **Churn Rate:** <5% monthly
- **NPS Score:** 50+ (promoters minus detractors)
- **Support Tickets:** <2% of monthly active users

### Technical Metrics
- **Sync Reliability:** 99.5% success rate
- **API Latency:** <500ms p95 for dashboard queries
- **Uptime:** 99.9% availability
- **Data Security:** Zero cross-tenant data leaks

---

## Competitive Analysis

### vs. JIRA Native Reporting
**Advantages:**
- ✅ Multi-instance consolidation (JIRA is single-instance)
- ✅ Billing-focused features (JIRA lacks rate cascades)
- ✅ Better analytics (cross-instance, custom reports)

**Disadvantages:**
- ❌ Not real-time (JIRA is live)
- ❌ Manual sync required (JIRA auto-updates)

### vs. Tempo Timesheets
**Advantages:**
- ✅ Multi-instance support (Tempo is per-instance)
- ✅ Cross-JIRA analytics (Tempo limited to one instance)
- ✅ Cheaper for small teams (Tempo pricing scales per-user)

**Disadvantages:**
- ❌ Tempo has better time tracking UX (focus of their product)
- ❌ Tempo has more integrations (Salesforce, etc.)

### vs. Generic Time Tracking (Harvest, Toggl)
**Advantages:**
- ✅ No duplicate entry (imports from existing JIRA worklogs)
- ✅ JIRA-native context (issues, epics, projects)
- ✅ Better for dev teams (already using JIRA)

**Disadvantages:**
- ❌ Requires existing JIRA setup (not standalone)
- ❌ Less flexible for non-JIRA workflows

**Positioning:** "Worklog Dashboard is for teams already using JIRA who need better billing and analytics, not a replacement for JIRA itself."

---

## Use Cases

### Use Case 1: Agency with Multiple Client JIRAs
**Scenario:** Digital agency manages 15 client projects, each with separate JIRA instance.

**Without Dashboard:**
1. Log into 15 different JIRA instances
2. Manually export worklogs to spreadsheet
3. Apply client-specific rates (lookup in separate document)
4. Calculate totals and create invoice
5. **Time:** 12 hours/month

**With Dashboard:**
1. Click "Sync All Instances" (runs in background)
2. Go to Billing → Create Invoice
3. Select client, date range
4. Review auto-calculated totals (rates from cascade)
5. Click "Generate PDF"
6. **Time:** 30 minutes/month

**ROI:** 95% time savings = 11.5 hours/month = ~$1,500/month saved (assuming $130/hr billing manager rate)

### Use Case 2: Consulting Firm with Project-Based Billing
**Scenario:** Consulting firm bills different rates for different project types.

**Challenge:**
- Enterprise projects: $200/hr
- Startup projects: $120/hr
- Internal work: Non-billable
- Same developers work across all three

**Solution:**
Rate cascade by project:
```
IF project = "Enterprise Migration" → $200/hr
ELSE IF project = "Startup MVP" → $120/hr
ELSE IF project = "Internal Tools" → $0/hr
ELSE → Default $150/hr
```

Dashboard auto-assigns rates when generating invoices.

### Use Case 3: Remote Team Capacity Planning
**Scenario:** Distributed team of 25 developers across 6 timezones.

**Challenge:** Team lead needs to:
- Identify overworked team members (risk of burnout)
- Find under-utilized capacity (can take on more work)
- Balance workload across teams

**Solution:**
Team Analytics dashboard shows:
- Hours logged per person (last 30 days)
- Distribution by project
- Trend lines (increasing/decreasing workload)
- Alerts for >50hr/week (overworked) or <20hr/week (under-utilized)

**Outcome:** Proactive rebalancing prevents burnout, improves utilization.

---

## Technical Vision

### Current Architecture (SQLite, Monolith)
**Good For:**
- ✅ Small to medium teams (1-100 users)
- ✅ Desktop-first deployment
- ✅ Simple operations (no DB server required)
- ✅ Fast development iteration

**Limitations:**
- ❌ Concurrent writes can block (SQLite limitation)
- ❌ Single server deployment (no horizontal scaling)
- ❌ Manual backups (no replication)

### Future Architecture (PostgreSQL, Microservices)
**Planned For:** 1,000+ users per company

**Components:**
1. **API Gateway** - Authentication, rate limiting, routing
2. **Sync Service** - JIRA/Tempo API integration (background jobs)
3. **Billing Service** - Invoice generation, rate cascades
4. **Analytics Service** - Aggregations, reporting, exports
5. **Notification Service** - Alerts, webhooks, emails
6. **PostgreSQL** - Scalable, replicated database

**Benefits:**
- ✅ Horizontal scaling (add more service instances)
- ✅ Independent deployment (update billing without downtime)
- ✅ Better resilience (service failures don't crash entire app)

---

## Design Principles

### 1. Data Ownership
**Users own their data.** Export capabilities in standard formats (CSV, JSON, PDF). No vendor lock-in.

### 2. Privacy & Security
**Multi-tenant isolation is non-negotiable.** Every query filtered by company_id. Credentials encrypted at rest.

### 3. Simplicity Over Features
**Focus on core workflows.** Better to have 10 features that work perfectly than 100 half-baked features.

### 4. Performance
**Fast is a feature.** Dashboard queries <500ms, syncs run in background, no blocking operations.

### 5. Transparency
**No surprises.** Clear status messages during sync, explicit rate calculations in invoices, audit logs for all changes.

---

## Open Questions

### Product Strategy
- **Pricing Model:** Per-user SaaS subscription? One-time desktop app license? Hybrid?
- **Target Market:** Focus on agencies? Consulting firms? In-house dev teams? All three?
- **Expansion:** Add support for other project management tools (Asana, Linear, GitHub Projects)?

### Technical Decisions
- **When to migrate from SQLite?** At what scale does it become a bottleneck?
- **Real-time sync:** Worth the complexity? Webhooks unreliable, polling inefficient.
- **Mobile apps:** Desktop-first is working, but clients requesting mobile access.

### Business Model
- **Free tier?** Limited to 1 JIRA instance, 5 users? Or paid-only?
- **Marketplace?** Sell on Atlassian Marketplace vs. standalone product?
- **Services:** Offer implementation/training services? Or pure SaaS?

---

## Resources

### Internal Docs
- **Architecture:** `docs/architecture.md`
- **API Reference:** `docs/api-reference.md`
- **Database Schema:** `docs/database-schema.md`

### User-Facing
- **User Guide:** `docs-public/user-guide/` (16 files, comprehensive coverage)
- **Video Tutorials:** (TODO - needs creation)
- **FAQ:** `docs-public/faq.md` (50+ questions answered)

### Business
- **Market Research:** (TODO - competitive analysis)
- **Pricing Analysis:** (TODO - willingness to pay study)
- **Customer Interviews:** (TODO - feedback sessions)
