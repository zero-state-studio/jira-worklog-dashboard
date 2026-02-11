# Claude Desktop Context Files

This directory contains comprehensive context files for use with the Claude Desktop app (claude.ai). These files provide Claude with deep knowledge about the JIRA Worklog Dashboard project.

---

## Quick Start

### Loading Context in Claude Desktop

1. Open Claude Desktop app
2. Create a new project or open existing
3. Click "Add files" or drag files into the chat
4. Select files from this directory based on your needs

### Recommended File Sets

**For General Development:**
- `project-context.md` (start here!)
- `multi-tenant-security.md` (critical security patterns)
- `development-guide.md` (conventions and best practices)

**For New Features:**
- `project-context.md` (overview)
- `agent-roles.md` (pick the right role)
- `api-quick-reference.md` (API patterns)
- `development-guide.md` (coding standards)

**For Bug Fixes:**
- `troubleshooting.md` (common issues)
- `multi-tenant-security.md` (if security-related)
- `development-guide.md` (testing patterns)

**For Architecture Work:**
- `project-context.md` (current architecture)
- `product-vision.md` (roadmap and constraints)
- `agent-roles.md` (tech-lead role)

**For Product Planning:**
- `product-vision.md` (vision and roadmap)
- `project-context.md` (current capabilities)
- `api-quick-reference.md` (existing APIs)

---

## File Descriptions

### 📘 project-context.md
**What:** Complete project overview and technical context
**Size:** ~3,500 words
**Use When:** Starting any task, onboarding, getting general context

**Contains:**
- Tech stack (FastAPI, React, SQLite, Tauri)
- Architecture overview (multi-tenant security model)
- Key metrics (176 security mods, 111 endpoints, 24 tables)
- Development setup (5-minute quickstart)
- Common tasks and project structure
- Security principles and constraints

**Best For:** First file to load for any task

---

### 🔒 multi-tenant-security.md
**What:** Detailed multi-tenant security patterns (MANDATORY reading)
**Size:** ~4,500 words
**Use When:** Working on any endpoint, storage method, or data access

**Contains:**
- Router pattern (every endpoint MUST follow)
- Storage pattern (company_id filtering)
- Authentication flow (JWT tokens)
- Common pitfalls (what NOT to do)
- Testing security (pytest examples)
- Error responses (404 vs 403)

**Best For:** Understanding and implementing security correctly

**⚠️ CRITICAL:** Load this for ANY backend work

---

### 👥 agent-roles.md
**What:** 9 specialized agent roles and responsibilities
**Size:** ~3,800 words
**Use When:** Multi-role tasks, understanding responsibilities, team collaboration

**Contains:**
- Role descriptions (Backend-Core, Database, Frontend, Security, etc.)
- Decision authority by role
- Typical tasks per role
- Multi-role collaboration examples
- Best practices per role

**Best For:** Picking the right role, coordinating complex tasks

---

### 🎯 product-vision.md
**What:** Product vision, roadmap, and business context
**Size:** ~3,200 words
**Use When:** Planning features, understanding priorities, making product decisions

**Contains:**
- Vision statement and core problems solved
- Target users (personas)
- Current features (6 major features)
- Roadmap (6 phases from Foundation to Scale)
- Success metrics
- Competitive analysis
- Use cases with ROI

**Best For:** Product planning, feature prioritization, understanding "why"

---

### 💻 development-guide.md
**What:** Code conventions, patterns, and workflows
**Size:** ~4,200 words
**Use When:** Writing code, reviewing PRs, setting up development environment

**Contains:**
- Code organization (backend/frontend structure)
- Naming conventions (Python, TypeScript)
- Critical patterns (security, error handling, async/await)
- API design (REST patterns)
- Testing (pytest, fixtures)
- Git workflow (branches, commits, PRs)
- Performance best practices

**Best For:** Ensuring code consistency and quality

---

### 📡 api-quick-reference.md
**What:** Quick reference for 111 API endpoints
**Size:** ~3,600 words
**Use When:** Implementing API calls, understanding endpoint patterns, debugging

**Contains:**
- All major endpoints (Auth, Worklogs, Teams, Billing, etc.)
- Request/response examples
- Query parameters and filtering
- Common use cases
- Error responses
- Pagination patterns

**Best For:** API integration, understanding existing endpoints

**Note:** For complete API docs, see `docs/api-reference.md`

---

### 🔧 troubleshooting.md
**What:** Common issues and solutions
**Size:** ~4,000 words
**Use When:** Debugging errors, performance issues, deployment problems

**Contains:**
- Authentication issues (invalid token, OAuth failures)
- Database issues (locked DB, slow queries, migrations)
- Sync issues (JIRA/Tempo connection failures)
- Billing issues (zero totals, PDF generation)
- Performance issues (slow frontend, memory leaks)
- Desktop app issues (PyInstaller, Tauri)
- Testing issues
- Quick diagnostic commands

**Best For:** Fixing bugs, debugging errors

---

## Usage Recommendations

### Scenario 1: "Add a new feature"

**Recommended Files:**
1. `project-context.md` - Understand current architecture
2. `agent-roles.md` - Pick appropriate role(s)
3. `multi-tenant-security.md` - Ensure security compliance
4. `development-guide.md` - Follow code conventions

**Example Task:** "Add recurring invoice templates"

```
1. Load project-context.md → Understand billing system
2. Load agent-roles.md → Use Tech-Lead + Database + Backend-Core + Billing roles
3. Load multi-tenant-security.md → All tables need company_id
4. Load development-guide.md → Follow API design patterns
```

---

### Scenario 2: "Fix a bug"

**Recommended Files:**
1. `troubleshooting.md` - Check if known issue
2. `development-guide.md` - Review testing patterns
3. `multi-tenant-security.md` - If security-related

**Example Task:** "Invoice shows $0 despite worklogs"

```
1. Load troubleshooting.md → See "Invoice shows $0 total despite worklogs"
2. Follow diagnostic steps
3. Load development-guide.md → Write regression test
```

---

### Scenario 3: "Optimize performance"

**Recommended Files:**
1. `project-context.md` - Understand current metrics
2. `development-guide.md` - Performance best practices
3. `troubleshooting.md` - Known performance issues

**Example Task:** "Speed up worklog queries"

```
1. Load project-context.md → See existing indexes
2. Load development-guide.md → Database optimization section
3. Load troubleshooting.md → "Queries are very slow" section
4. Implement composite indexes
```

---

### Scenario 4: "Plan new architecture"

**Recommended Files:**
1. `product-vision.md` - Future roadmap and scale plans
2. `project-context.md` - Current architecture constraints
3. `agent-roles.md` - Use Tech-Lead role

**Example Task:** "Plan migration from SQLite to PostgreSQL"

```
1. Load product-vision.md → See Phase 6: Scale & Optimize
2. Load project-context.md → Understand current SQLite patterns
3. Load agent-roles.md → Tech-Lead coordinates migration
4. Design migration strategy
```

---

### Scenario 5: "Security audit"

**Recommended Files:**
1. `multi-tenant-security.md` (MANDATORY)
2. `development-guide.md` - Security checklist
3. `api-quick-reference.md` - Audit all endpoints

**Example Task:** "Audit billing endpoints for company isolation"

```
1. Load multi-tenant-security.md → Review all patterns
2. Load api-quick-reference.md → List all billing endpoints
3. Verify each endpoint:
   - Uses Depends(get_current_user)
   - Passes company_id to storage
   - Returns 404 for cross-company access
4. Run security tests: pytest tests/test_multi_tenant.py
```

---

## File Size & Load Times

| File | Words | Est. Tokens | Load Time |
|------|-------|-------------|-----------|
| project-context.md | ~3,500 | ~4,500 | Fast |
| multi-tenant-security.md | ~4,500 | ~5,800 | Fast |
| agent-roles.md | ~3,800 | ~4,900 | Fast |
| product-vision.md | ~3,200 | ~4,100 | Fast |
| development-guide.md | ~4,200 | ~5,400 | Fast |
| api-quick-reference.md | ~3,600 | ~4,600 | Fast |
| troubleshooting.md | ~4,000 | ~5,100 | Fast |

**Total:** ~26,800 words, ~34,400 tokens

**Note:** All files can be loaded simultaneously without hitting context limits (200K+ token window).

---

## Tips for Using with Claude

### Best Practices

1. **Start with project-context.md** - Always load this first for general understanding

2. **Load security for backend work** - Always include `multi-tenant-security.md` when working on API endpoints or database queries

3. **Use agent roles** - Reference `agent-roles.md` to understand responsibilities and decision authority

4. **Check troubleshooting first** - Before asking "why is X broken?", load `troubleshooting.md`

5. **Combine files strategically** - Load 2-4 relevant files instead of all 7 to keep context focused

### What NOT to Do

❌ Load all files for every task (unnecessary context)
❌ Skip `multi-tenant-security.md` when working on backend (security violations)
❌ Ask generic questions without loading `project-context.md` first
❌ Ignore `development-guide.md` conventions (inconsistent code)

---

## Maintenance

### Keeping Files Updated

These files should be updated when:

- **project-context.md** - Major architecture changes, new key metrics, updated tech stack
- **multi-tenant-security.md** - New security patterns discovered, security test updates
- **agent-roles.md** - New roles added, responsibility changes
- **product-vision.md** - Roadmap updates, new features, success metrics
- **development-guide.md** - New conventions, pattern changes
- **api-quick-reference.md** - New endpoints added, response format changes
- **troubleshooting.md** - New common issues discovered, new solutions

**Ownership:** All developers should contribute updates when they discover outdated information.

---

## Additional Resources

### Full Documentation
- **Complete API reference:** `../api-reference.md` (all 111 endpoints with full details)
- **Database schema:** `../database-schema.md` (all 24 tables with SQL)
- **Architecture:** `../architecture.md` (complete system design)
- **Conventions:** `../conventions.md` (detailed coding standards)

### Code Examples
- **Backend routers:** `../../backend/app/routers/*.py`
- **Storage methods:** `../../backend/app/cache.py`
- **Frontend pages:** `../../frontend/src/pages/*.tsx`
- **Tests:** `../../backend/tests/*.py`

### Project Files
- **Primary instructions:** `../../CLAUDE.md`
- **Auto memory:** `~/.claude/projects/.../memory/MEMORY.md`
- **Agent role definitions:** `../../agents/roles/*.md`

---

## Questions?

If these files don't answer your question:

1. Check full documentation in `../`
2. Review `CLAUDE.md` in project root
3. Check auto memory: `~/.claude/projects/.../memory/MEMORY.md`
4. Search codebase for examples
5. Ask Claude with relevant context files loaded

**Remember:** The more context you provide (via these files), the better Claude can help!
