# Agent Roles - JIRA Worklog Dashboard

This directory contains detailed role definitions for specialized agents working on the JIRA Worklog Dashboard project.

---

## Overview

The project uses **10 specialized agent roles**, each with clear responsibilities, file ownership, and dependencies. This structure enables efficient parallel work while maintaining code quality and consistency.

---

## Agent Roles

### 1. Backend Core Engineer
**Focus:** API routers, business logic, Pydantic models

**Key Responsibilities:**
- Develop and maintain 18 API endpoints (dashboard, teams, users, epics, issues, logs)
- Implement business logic for analytics
- Manage 84 Pydantic models

**Files:**
- `backend/app/main.py`, `backend/app/models.py`
- `backend/app/routers/` (6 router files)

**Dependencies:**
- ⬇️ Database-Engineer (storage methods)
- ⬇️ Security-Engineer (auth decorators)
- ⬆️ Frontend-Engineer (API endpoints)

[📄 Full Documentation](./backend-core-engineer.md)

---

### 2. Database Engineer
**Focus:** Database schema, performance, migrations

**Key Responsibilities:**
- Maintain 24 tables with 40+ indexes
- Optimize queries (87% improvement achieved)
- Multi-tenant isolation (company_id filtering)
- SQL migrations and maintenance

**Files:**
- `backend/app/cache.py` (5,297 lines - WorklogStorage)
- `backend/migrations/`
- `backend/OPTIMIZATION_PLAN.md`

**Dependencies:**
- ⬆️ All Engineers (provides storage methods)
- ↔️ Security-Engineer (company_id filtering)

[📄 Full Documentation](./database-engineer.md)

---

### 3. Frontend Engineer
**Focus:** React UI, components, state management

**Key Responsibilities:**
- Develop 14 page components + 48 reusable components
- Implement routing and navigation
- Data visualization with Recharts
- API integration and state management

**Files:**
- `frontend/src/App.jsx`, `frontend/src/pages/`, `frontend/src/components/`
- 71 total React files

**Dependencies:**
- ⬇️ Backend-Core-Engineer (consumes API)
- ⬇️ Security-Engineer (JWT tokens)
- ⬇️ Billing-Engineer (billing UI)

[📄 Full Documentation](./frontend-engineer.md)

---

### 4. Security Engineer
**Focus:** Authentication, authorization, multi-tenant security

**Key Responsibilities:**
- Google OAuth 2.0 integration
- JWT token management (access + refresh)
- Role-based access control (ADMIN/MANAGER/USER)
- Multi-tenant isolation (176 security modifications)
- Security test suite (20 test cases)

**Files:**
- `backend/app/auth/` (3 files)
- `backend/app/routers/auth.py` (11 endpoints)
- `backend/tests/test_multi_tenant.py`

**Dependencies:**
- ⬆️ All Engineers (provides auth decorators)
- ↔️ Database-Engineer (company_id filtering)

[📄 Full Documentation](./security-engineer.md)

---

### 5. Integration Engineer
**Focus:** External API integrations (JIRA, Tempo, Factorial)

**Key Responsibilities:**
- JIRA REST API v3 client
- Tempo API v4 client (preferred for worklogs)
- Factorial HR API integration
- Sync operations and error handling
- Package creation (cross-instance issues)

**Files:**
- `backend/app/jira_client.py`, `backend/app/tempo_client.py`
- `backend/app/routers/sync.py` (5 endpoints)
- `backend/app/routers/factorial.py` (7 endpoints)
- `backend/app/routers/packages.py` (9 endpoints)

**Dependencies:**
- ⬇️ Database-Engineer (bulk upsert)
- ⬇️ Security-Engineer (credential filtering)
- ⬆️ Backend-Core-Engineer (synced data)

[📄 Full Documentation](./integration-engineer.md)

---

### 6. Billing Engineer
**Focus:** Billing calculations, invoicing, rate management

**Key Responsibilities:**
- Rate cascade system (6-level priority)
- Billing preview generation
- Invoice creation and management
- Excel export with formatting
- Client/project/rate CRUD operations

**Files:**
- `backend/app/billing.py` (calculation engine)
- `backend/app/routers/billing.py` (23 endpoints)
- `frontend/src/pages/Billing.jsx` (54KB complex UI)

**Dependencies:**
- ⬇️ Database-Engineer (complex queries)
- ⬇️ Security-Engineer (manager/admin auth)
- ⬆️ Frontend-Engineer (billing data)

[📄 Full Documentation](./billing-engineer.md)

---

### 7. QA Engineer
**Focus:** Testing, quality assurance, performance benchmarking

**Key Responsibilities:**
- Maintain 20+ security/isolation test cases
- API endpoint testing (111 endpoints)
- Performance benchmarking
- Bug reproduction and regression testing
- Test coverage monitoring (target: 80%)

**Files:**
- `backend/tests/` (4 files, ~1,300 lines)
- `backend/tests/README.md`

**Dependencies:**
- ⬇️ All Engineers (tests all code)
- ⬆️ Tech-Lead (quality metrics)

[📄 Full Documentation](./qa-engineer.md)

---

### 8. DevOps Engineer
**Focus:** Build, deployment, CI/CD, infrastructure

**Key Responsibilities:**
- PyInstaller backend executable creation
- Tauri desktop app configuration and building
- Web deployment (backend + frontend)
- CI/CD pipeline (GitHub Actions)
- Environment and infrastructure management

**Files:**
- `scripts/build-backend.sh`
- `frontend/src-tauri/` (Tauri configuration)
- Docker and nginx configurations
- CI/CD workflows

**Dependencies:**
- ⬇️ All Engineers (builds all code)
- ⬆️ Tech-Lead (deployment artifacts)

[📄 Full Documentation](./devops-engineer.md)

---

### 9. Tech Lead
**Focus:** Technical leadership, coordination, architecture

**Key Responsibilities:**
- Make architectural decisions
- Coordinate between all agents
- Code quality and standards enforcement
- Technical debt management
- Roadmap prioritization
- Documentation oversight

**Files:**
- `CLAUDE.md` (373 lines - developer guide)
- `docs/project-overview.md`
- `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`
- `backend/OPTIMIZATION_PLAN.md`

**Dependencies:**
- ↔️ All Agents (coordinates everyone)
- Provides guidance and makes decisions

[📄 Full Documentation](./tech-lead.md)

---

### 10. Documentation Engineer (Docs)
**Focus:** Documentation maintenance, accuracy, and completeness

**Key Responsibilities:**
- Maintain all 6 core documentation files (CLAUDE.md, architecture, database schema, API reference, conventions, security)
- Update documentation after every feature/bugfix (mandatory final step)
- Keep statistics consistent across all docs (111 endpoints, 24 tables, 40+ indexes, 74 storage methods, 10 agent roles)
- Validate code examples and cross-references
- Can block PR merge if documentation incomplete

**Files:**
- `CLAUDE.md`, `README.md`, `CHANGELOG.md`
- `docs/` (all 6+ documentation files)
- `docs/desktop/` (10 context files)
- `agents/roles/` (agent documentation)

**Dependencies:**
- ⬇️ All Agents (receives completion notifications)
- ⬆️ All Agents (provides accurate documentation)
- ↔️ Tech-Lead (can block merge, coordinates structure)

[📄 Full Documentation](./docs.md)

---

## Dependency Matrix

```
┌──────────────────────────────────────────────────────────────┐
│                        Tech-Lead                             │
│          (Coordination, Architecture, Roadmap)               │
└────────────────┬──────────────────────────┬──────────────────┘
                 │ Coordinates all          │ Approves docs
         ┌───────┼───────┐                  │
         │       │       │                  │
    ┌────▼────┐ │  ┌────▼────┐        ┌────▼────────┐
    │Security │ │  │Database │        │    Docs     │
    │Engineer │ │  │Engineer │        │  Engineer   │
    └────┬────┘ │  └────┬────┘        └─────▲───────┘
         │      │       │                    │ Receives notifications
         │      │       │                    │ from ALL agents
    ┌────▼──────┼───────▼────┐              │
    │  Backend-Core-Engineer │◄─────┐       │
    └────┬───────────────────┘      │       │
         │                           │       │
         │                      ┌────┴────┐  │
    ┌────▼────┐                │Integrat.│  │
    │Frontend │                │Engineer │  │
    │Engineer │                └────┬────┘  │
    └────┬────┘                     │       │
         │                      ┌───▼────┐  │
         │                      │Billing │  │
         │                      │Eng.    │  │
         │                      └────────┘  │
         │                                  │
    ┌────▼────┐    ┌─────────┐             │
    │   QA    │───►│ DevOps  │─────────────┘
    │Engineer │    │Engineer │  Notify Docs after completion
    └─────────┘    └─────────┘
```

**Note:** Documentation Engineer receives notifications from ALL agents after
any development completion. No PR can be merged until Docs confirms
documentation is complete and accurate.

---

## Workflow Example: Adding a New Feature

**Feature:** Budget Alerts for billing projects

**Workflow:**

1. **Tech-Lead** (Day 1)
   - Defines requirements and creates task breakdown
   - Assigns tasks to agents with dependencies

2. **Database-Engineer** (Day 1-2)
   - Creates `budget_alerts` table with company_id
   - Writes SQL migration script
   - Adds storage methods

3. **Backend-Core-Engineer** (Day 2-3)
   - Creates `/api/billing/budgets` endpoints (GET, POST, PUT, DELETE)
   - Implements basic CRUD logic

4. **Security-Engineer** (Day 2)
   - Reviews endpoints for auth requirements
   - Ensures MANAGER role required
   - Adds to test suite

5. **Billing-Engineer** (Day 3-4)
   - Implements budget calculation logic
   - Adds threshold alert logic
   - Integrates with existing billing preview

6. **Frontend-Engineer** (Day 4-5)
   - Creates `BudgetAlertsSection.jsx` component
   - Adds to Billing page
   - Implements alert notifications

7. **QA-Engineer** (Day 5-6)
   - Writes unit tests for budget calculations
   - Tests API endpoints
   - Tests multi-tenant isolation
   - Verifies UI functionality

8. **DevOps-Engineer** (Day 6)
   - Updates deployment scripts if needed
   - Verifies migration runs correctly
   - Updates CI/CD if needed

9. **Tech-Lead** (Day 6)
   - Final code review
   - Approves pending documentation update

10. **Documentation-Engineer** (Day 6)
   - Updates `docs/api-reference.md` (4 new endpoints)
   - Updates `docs/database-schema.md` (budget_alerts table)
   - Updates `CLAUDE.md` (endpoint count)
   - Updates `CHANGELOG.md` (user-facing feature)
   - Updates `docs/desktop/api-quick-reference.md`
   - Validates all cross-references and statistics
   - Notifies Tech-Lead: documentation complete

11. **Tech-Lead** (Day 6)
   - Verifies documentation complete
   - Merges to master

**Total Time:** 6 days with 10 agents working in parallel (vs. ~3 weeks sequential)

---

## Communication Guidelines

### When to Use SendMessage

**Direct Message (`type: "message"`):**
- Responding to a specific agent
- Following up on a task
- Asking for clarification
- Sharing findings relevant to one agent

**Broadcast (`type: "broadcast"`):**
- **USE SPARINGLY** (expensive - sends to all agents)
- Critical issues requiring immediate team-wide attention
- Major announcements affecting everyone equally
- Example: "Stop all work, blocking security bug found"

### Daily Communication Flow

**Morning (Async):**
- Each agent reports: Yesterday's work, Today's plan, Blockers
- Tech-Lead reviews and addresses blockers

**During Day:**
- Agents communicate peer-to-peer as needed
- Tech-Lead available for questions and decisions

**Evening:**
- Agents mark tasks completed
- Report to Tech-Lead if blocked

---

## Getting Started

### For New Agents

1. **Read Your Role Documentation**
   - Understand your responsibilities
   - Review file ownership
   - Note dependencies

2. **Setup Development Environment**
   - Follow CLAUDE.md setup instructions
   - Run application locally
   - Run test suite

3. **Read Project Overview**
   - `/docs/project-overview.md` for complete project understanding
   - `CLAUDE.md` for development patterns

4. **Review Existing Code**
   - Look at files in your domain
   - Understand current patterns
   - Note areas for improvement

5. **Pick Up First Task**
   - Check TaskList for available work
   - Start with smaller tasks
   - Ask Tech-Lead for guidance

### For Tech-Lead

When coordinating agents:

1. **Create Clear Tasks**
   - Specific acceptance criteria
   - Clear dependencies
   - Reasonable scope

2. **Assign to Right Agent**
   - Match task to agent expertise
   - Balance workload across team

3. **Monitor Progress**
   - Daily check-ins
   - Unblock agents quickly
   - Adjust if needed

4. **Review Work**
   - Code quality
   - Security considerations
   - Documentation complete

---

## Key Success Factors

### For Individual Agents

✅ **Stay in Your Lane**: Focus on your domain expertise
✅ **Communicate Clearly**: Use SendMessage to update others
✅ **Ask for Help**: Don't stay blocked - notify Tech-Lead
✅ **Follow Patterns**: Adhere to established code patterns
✅ **Test Your Work**: Write tests for your features
✅ **Document**: Update docs when you change things

### For the Team

✅ **Parallel Work**: Work independently when possible
✅ **Clear Dependencies**: Communicate what you need from others
✅ **Quality First**: Don't compromise on security or performance
✅ **Support Each Other**: Help teammates when they're blocked
✅ **Celebrate Wins**: Acknowledge good work
✅ **Learn Together**: Share knowledge and best practices

---

## Metrics & Monitoring

### Team Metrics (Tech-Lead tracks)

- **Velocity**: Tasks completed per sprint
- **Quality**: Test coverage, bug rate
- **Performance**: API response times, query speeds
- **Security**: Test pass rate, vulnerabilities
- **Collaboration**: Blockers resolved, communication frequency

### Individual Metrics (per agent)

- **Throughput**: Tasks completed
- **Quality**: Code review feedback, test coverage
- **Collaboration**: Response time to messages, help provided to others
- **Growth**: New skills learned, areas improved

---

## Resources

### Documentation
- [Project Overview](../../docs/project-overview.md) - Complete project analysis
- [CLAUDE.md](../../CLAUDE.md) - Developer guide and patterns
- [ARCHITECTURE.md](../../docs/ARCHITECTURE.md) - System architecture
- [ROADMAP.md](../../docs/ROADMAP.md) - Product roadmap
- [OPTIMIZATION_PLAN.md](../../backend/OPTIMIZATION_PLAN.md) - Performance optimization

### External
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [React Docs](https://react.dev/)
- [Tauri Docs](https://tauri.app/)
- [SQLite Docs](https://www.sqlite.org/docs.html)

---

## Questions?

If you have questions about:
- **Your role**: Read your specific role documentation
- **Architecture**: Check ARCHITECTURE.md or ask Tech-Lead
- **Patterns**: Check CLAUDE.md for established patterns
- **Blockers**: Notify Tech-Lead immediately
- **Coordination**: Use SendMessage to communicate with team

**Remember: Effective communication is key to successful multi-agent collaboration!**
