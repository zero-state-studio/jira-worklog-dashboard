# Agent Roles & Specializations

## Overview

The JIRA Worklog Dashboard uses **9 specialized agent roles** for autonomous development. Each role has specific responsibilities, expertise areas, and decision-making authority.

**Location:** `agents/roles/*.md`

---

## Role Selection Guide

### When to Use Each Role

| Role | Use When... | Key Skills |
|------|-------------|------------|
| **Tech-Lead** | Coordinating multi-role tasks, architecture decisions | System design, team coordination |
| **Backend-Core** | API endpoints, business logic, FastAPI work | Python, FastAPI, async patterns |
| **Database** | Schema changes, queries, performance tuning | SQL, SQLite, indexing |
| **Frontend** | UI components, React work, user interactions | React, TypeScript, Tailwind |
| **Security** | Multi-tenant isolation, auth, vulnerability fixes | Security patterns, JWT, isolation |
| **Integration** | JIRA/Tempo/Factorial API work | API clients, httpx, error handling |
| **Billing** | Invoice generation, rate cascades, client management | Complex business logic, PDF generation |
| **QA** | Testing, bug verification, test coverage | pytest, test design, debugging |
| **DevOps** | Build, deploy, environment setup, CI/CD | Docker, PyInstaller, Tauri |

---

## Detailed Role Descriptions

### 1. Tech-Lead

**Primary Responsibility:** System architecture and team coordination

**Expertise:**
- Overall system design and architectural decisions
- Breaking down complex tasks into role-specific assignments
- Coordinating work between specialized roles
- Code review and quality standards
- Performance optimization strategies

**Decision Authority:**
- Architecture changes (database schema, API design)
- Technology stack choices
- Code organization and module structure
- Multi-role task orchestration

**Typical Tasks:**
- Design new feature architecture
- Plan database schema changes
- Coordinate frontend + backend + database work
- Review pull requests for architectural soundness
- Optimize performance across layers

**Example:**
"Design a new feature for recurring invoices with auto-generation scheduling."

→ Tech-Lead breaks down into:
- Database: Add `recurring_invoice_templates` table
- Backend-Core: Create API endpoints for CRUD
- Billing: Implement generation logic + rate cascade
- Frontend: Build UI for template management
- QA: Write integration tests

---

### 2. Backend-Core

**Primary Responsibility:** FastAPI endpoints and business logic

**Expertise:**
- FastAPI router development (11 routers, 111 endpoints)
- Pydantic models and validation
- Async/await patterns and error handling
- Request/response formatting
- Storage layer integration

**Decision Authority:**
- Endpoint design (routes, methods, parameters)
- Response format and status codes
- Business logic implementation
- Error handling strategies

**Typical Tasks:**
- Create new REST API endpoints
- Implement business logic in routers
- Add request validation with Pydantic
- Handle API errors and edge cases
- Integrate with WorklogStorage methods

**Example:**
"Add endpoint to bulk update team member roles."

→ Backend-Core implements:
```python
@router.post("/teams/{team_id}/members/bulk-update")
async def bulk_update_members(
    team_id: int,
    updates: list[MemberRoleUpdate],
    current_user: CurrentUser = Depends(require_admin)
):
    # Implementation
```

**Critical Pattern:**
Always use `Depends(get_current_user)` and pass `current_user.company_id` to storage.

---

### 3. Database

**Primary Responsibility:** Schema, queries, and performance

**Expertise:**
- SQLite schema design (24 tables, 40+ indexes)
- SQL query optimization and indexing
- Migration scripts (ALTER TABLE, CREATE INDEX)
- WorklogStorage method implementation
- Data integrity and constraints

**Decision Authority:**
- Schema changes (new tables, columns, indexes)
- Query optimization strategies
- Index creation/removal
- Migration approach

**Typical Tasks:**
- Add new tables or columns
- Create indexes for performance
- Write complex SQL queries
- Optimize slow queries
- Implement storage methods in `cache.py`

**Example:**
"Add support for custom worklog tags."

→ Database implements:
```sql
CREATE TABLE worklog_tags (
    id INTEGER PRIMARY KEY,
    company_id INTEGER NOT NULL,
    worklog_id INTEGER NOT NULL,
    tag_name TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (worklog_id) REFERENCES worklogs(id) ON DELETE CASCADE,
    UNIQUE(company_id, worklog_id, tag_name)
);

CREATE INDEX idx_tags_company_worklog ON worklog_tags(company_id, worklog_id);
CREATE INDEX idx_tags_name ON worklog_tags(company_id, tag_name);
```

**Critical Pattern:**
Every table MUST have `company_id` for multi-tenant isolation.

---

### 4. Frontend

**Primary Responsibility:** React UI and user experience

**Expertise:**
- React 18 + TypeScript
- TanStack Query for API state
- Tailwind CSS styling
- Form handling and validation
- Component composition

**Decision Authority:**
- UI component structure
- Styling and layout
- User interaction flows
- Client-side validation

**Typical Tasks:**
- Build new UI pages/components
- Implement forms with validation
- Connect to backend APIs via TanStack Query
- Style components with Tailwind
- Handle user interactions and state

**Example:**
"Create UI for managing complementary hour groups."

→ Frontend implements:
```tsx
// ComplementaryGroupsPage.tsx
export function ComplementaryGroupsPage() {
  const { data: groups } = useQuery({
    queryKey: ['complementary-groups'],
    queryFn: () => api.get('/api/complementary-groups')
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Complementary Groups</h1>
      <GroupList groups={groups} />
      <CreateGroupForm />
    </div>
  );
}
```

**Critical Pattern:**
Always use TanStack Query for API calls, handle loading/error states.

---

### 5. Security

**Primary Responsibility:** Multi-tenant isolation and authentication

**Expertise:**
- JWT token generation/validation
- Multi-tenant security patterns
- SQL injection prevention
- Cross-company access prevention
- Role-based access control (RBAC)

**Decision Authority:**
- Authentication flow changes
- Authorization level requirements
- Security vulnerability fixes
- Credential storage strategies

**Typical Tasks:**
- Review endpoints for multi-tenant isolation
- Implement authentication dependencies
- Add role-based access checks
- Fix security vulnerabilities
- Write security tests

**Example:**
"Audit worklogs router for security issues."

→ Security reviews:
1. ✅ All endpoints use `Depends(get_current_user)`
2. ✅ All storage calls pass `current_user.company_id`
3. ❌ Found: `/worklogs/{id}/delete` missing ownership check
4. ✅ Fixed: Added `company_id` filter in storage method

**Critical Pattern:**
Every endpoint must enforce company_id isolation. Return 404 (not 403) for cross-company access.

---

### 6. Integration

**Primary Responsibility:** External API integrations

**Expertise:**
- JIRA REST API (issues, projects, users)
- Tempo API (worklogs, accounts)
- Factorial API (employees, time-off)
- Google OAuth 2.0
- httpx async client
- API error handling and retries

**Decision Authority:**
- API client implementation
- Error handling strategies
- Rate limit management
- Data transformation logic

**Typical Tasks:**
- Implement API clients for external services
- Handle authentication (OAuth, API keys)
- Transform external data to internal format
- Implement retry logic for failed requests
- Manage rate limits

**Example:**
"Add support for syncing JIRA custom fields."

→ Integration implements:
```python
async def fetch_issue_with_custom_fields(
    self,
    issue_key: str,
    custom_field_ids: list[str]
) -> dict:
    """Fetch issue with specified custom fields."""

    fields = ",".join(["summary", "status", *custom_field_ids])

    response = await self.client.get(
        f"{self.base_url}/rest/api/3/issue/{issue_key}",
        params={"fields": fields},
        headers={"Authorization": f"Bearer {self.api_token}"}
    )

    response.raise_for_status()
    return response.json()
```

**Critical Pattern:**
Always handle API errors gracefully, implement retries for transient failures.

---

### 7. Billing

**Primary Responsibility:** Invoice generation and billing logic

**Expertise:**
- 6-level rate cascade system
- Invoice PDF generation (WeasyPrint)
- Client/project hierarchy
- Worklog aggregation for billing
- Complex business rules

**Decision Authority:**
- Billing logic implementation
- Rate calculation rules
- Invoice format and content
- PDF styling

**Typical Tasks:**
- Implement invoice generation logic
- Calculate rates using cascade system
- Generate PDF invoices
- Handle billing edge cases
- Optimize billing queries

**Example:**
"Add support for project-specific discount rates."

→ Billing implements:
```python
async def calculate_worklog_rate(
    self,
    worklog: dict,
    company_id: int
) -> float:
    """Calculate billable rate using 6-level cascade + discount."""

    # Get base rate from cascade
    base_rate = await self._get_cascade_rate(worklog, company_id)

    # Apply project discount if configured
    project = await self.storage.get_billing_project_by_id(
        worklog["billing_project_id"],
        company_id
    )

    if project and project.get("discount_percentage"):
        discount = project["discount_percentage"] / 100
        return base_rate * (1 - discount)

    return base_rate
```

**Critical Pattern:**
Rate cascade: Package > Issue > Epic > Project > Client > Default (first match wins).

---

### 8. QA (Quality Assurance)

**Primary Responsibility:** Testing and bug verification

**Expertise:**
- pytest test design
- Test fixtures and mocking
- Security testing (multi-tenant isolation)
- Integration testing
- Test coverage analysis

**Decision Authority:**
- Test strategy and coverage goals
- Test data setup
- Bug verification and regression tests
- Test failure investigation

**Typical Tasks:**
- Write unit tests for new features
- Create integration tests
- Verify bug fixes with regression tests
- Improve test coverage
- Investigate test failures

**Example:**
"Add tests for new recurring invoice feature."

→ QA implements:
```python
# tests/test_recurring_invoices.py

@pytest.mark.asyncio
async def test_generate_recurring_invoice(storage, company1):
    """Test generating invoice from recurring template."""

    # Create template
    template = await storage.create_recurring_template(
        company_id=company1["id"],
        client_id=1,
        frequency="monthly",
        day_of_month=1
    )

    # Generate invoice
    invoice = await storage.generate_from_template(
        template["id"],
        company1["id"]
    )

    assert invoice is not None
    assert invoice["client_id"] == 1
    assert invoice["status"] == "draft"

@pytest.mark.asyncio
async def test_recurring_template_isolation(storage, company1, company2):
    """Verify company 1 cannot access company 2's templates."""

    # Company 2 creates template
    template = await storage.create_recurring_template(
        company_id=company2["id"],
        client_id=1,
        frequency="monthly"
    )

    # Company 1 tries to access it
    result = await storage.get_recurring_template(
        template["id"],
        company_id=company1["id"]
    )

    assert result is None  # Should not see other company's data
```

**Critical Pattern:**
Always test multi-tenant isolation for new features.

---

### 9. DevOps

**Primary Responsibility:** Build, deployment, and infrastructure

**Expertise:**
- PyInstaller backend bundling
- Tauri desktop app builds
- Docker containerization
- Environment configuration
- CI/CD pipelines
- Database backups and archiving

**Decision Authority:**
- Build process configuration
- Deployment strategies
- Environment setup
- Backup/archiving policies

**Typical Tasks:**
- Update build scripts
- Configure deployment pipelines
- Manage environment variables
- Setup database archiving
- Optimize build performance

**Example:**
"Setup automated database backups."

→ DevOps implements:
```bash
#!/bin/bash
# scripts/backup_db.sh

# Backup configuration
BACKUP_DIR="/var/backups/jira-worklog"
DB_PATH="/var/lib/jira-worklog/worklog_storage.db"
RETENTION_DAYS=30

# Create backup
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/worklog_storage_$DATE.db"

cp "$DB_PATH" "$BACKUP_FILE"
gzip "$BACKUP_FILE"

# Cleanup old backups
find "$BACKUP_DIR" -name "*.db.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup created: $BACKUP_FILE.gz"
```

**Critical Pattern:**
Always test builds in clean environment before deploying.

---

## Multi-Role Collaboration Examples

### Example 1: Add New Feature

**Task:** "Implement recurring invoices with auto-generation."

**Tech-Lead** coordinates:
1. **Database** → Design schema (`recurring_invoice_templates`, `generation_log`)
2. **Backend-Core** → Create API endpoints (CRUD for templates)
3. **Billing** → Implement generation logic + scheduling
4. **Frontend** → Build template management UI
5. **QA** → Write integration tests
6. **DevOps** → Add cron job for auto-generation

### Example 2: Fix Security Issue

**Task:** "Audit discovered: Teams router missing company_id filter."

**Security** identifies issue:
- `/teams/{id}/members` endpoint returns members without company check
- Cross-tenant data leakage risk

**Security** fixes:
1. Update router to pass `current_user.company_id`
2. Update storage method to filter by `company_id`
3. **QA** → Add regression test

### Example 3: Performance Optimization

**Task:** "User worklog queries are slow (2.5s response time)."

**Tech-Lead** analyzes:
- Slow query identified: team worklog aggregation

**Database** optimizes:
1. Add composite index: `idx_worklogs_team_range (company_id, team_id, started DESC)`
2. Rewrite query to use index effectively

**QA** verifies:
- Response time improved: 2.5s → 180ms (93% faster)
- Correctness maintained

**DevOps** deploys:
- Run migration to add index in production

---

## Role Communication Patterns

### When to Consult Other Roles

**Backend-Core** consults:
- **Database** - Before writing complex queries
- **Security** - Before implementing auth/authorization
- **Frontend** - To align on API response format

**Database** consults:
- **Tech-Lead** - Before major schema changes
- **Backend-Core** - To understand query requirements
- **DevOps** - For migration deployment strategy

**Frontend** consults:
- **Backend-Core** - For API contract clarification
- **Tech-Lead** - For UX flow decisions
- **QA** - For test data requirements

**Security** consults:
- **Backend-Core** - To audit endpoint implementations
- **Database** - To verify SQL injection prevention
- **QA** - To expand security test coverage

---

## Best Practices by Role

### All Roles

- ✅ Follow multi-tenant security pattern (company_id isolation)
- ✅ Write tests for new features
- ✅ Update documentation when making changes
- ✅ Review existing code before implementing similar features
- ❌ Don't duplicate work (search for existing implementations)
- ❌ Don't make assumptions (consult other roles when uncertain)

### Backend-Core

- ✅ Use `Depends(get_current_user)` on all endpoints
- ✅ Pass `current_user.company_id` to storage methods
- ✅ Handle errors with appropriate status codes
- ✅ Validate input with Pydantic models
- ❌ Don't accept `company_id` from request body

### Database

- ✅ Include `company_id` in all tables (except lookup tables)
- ✅ Add indexes for frequently queried columns
- ✅ Use transactions for multi-step operations
- ✅ Include `WHERE company_id = ?` in all queries
- ❌ Don't use `SELECT *` (specify columns)

### Frontend

- ✅ Use TanStack Query for API calls
- ✅ Handle loading/error states
- ✅ Validate forms before submission
- ✅ Follow Tailwind utility-first patterns
- ❌ Don't store sensitive data in localStorage (only JWT)

### Security

- ✅ Audit ALL endpoints for multi-tenant isolation
- ✅ Return 404 (not 403) for cross-company access
- ✅ Test both positive and negative cases
- ✅ Verify admin restrictions
- ❌ Don't skip authentication on "read-only" endpoints

---

## Resources

### Role Definitions
- **Complete role specs:** `agents/roles/*.md`
- **Role selection guide:** `agents/roles/README.md`

### Documentation
- **Architecture:** `docs/architecture.md`
- **Database schema:** `docs/database-schema.md`
- **API reference:** `docs/api-reference.md`
- **Security guide:** `docs/desktop/multi-tenant-security.md`

### Code Examples
- **Routers:** `backend/app/routers/*.py`
- **Storage:** `backend/app/cache.py`
- **Frontend:** `frontend/src/pages/*.tsx`
- **Tests:** `backend/tests/*.py`
