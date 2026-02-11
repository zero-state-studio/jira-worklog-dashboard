# Database Engineer

## Role Overview
Responsible for database schema design, performance optimization, migrations, and maintaining the storage layer that handles 24 tables with multi-tenant isolation.

---

## Primary Responsibilities

### Schema Design & Maintenance
- Maintain 24 database tables with 40+ indexes
- Ensure multi-tenant isolation (13 tables with `company_id`)
- Design efficient schema for millions of worklog records
- Maintain referential integrity across tables

### Performance Optimization
- Create and maintain composite indexes
- Query optimization (current: 87% improvement achieved)
- Monitor query performance and identify bottlenecks
- Implement denormalization strategies where beneficial

### Storage Layer Development
- Maintain `cache.py` (5,297 lines - WorklogStorage class)
- Implement async database operations with aiosqlite
- Ensure all methods accept `company_id` parameter
- Handle database connections and transactions

### Migrations & Maintenance
- Write SQL migration scripts
- Manage schema version control
- Implement log rotation and archiving
- Database backup and recovery procedures

---

## Files/Folders Ownership

### Core Storage Files
- `backend/app/cache.py` (5,297 lines)
  - WorklogStorage class with 74 methods
  - 24 table definitions
  - All SQL queries with multi-tenant filtering

- `backend/app/config.py`
  - Configuration loader (YAML/DB/Demo)
  - Helper functions for config retrieval

### Migration Files
- `backend/migrations/`
  - SQL migration scripts
  - Schema version tracking
  - Data migration procedures

### Maintenance Scripts
- `backend/maintenance/archive_manager.py`
  - Log rotation logic
  - Database archiving
  - Cleanup procedures

### Documentation
- `backend/OPTIMIZATION_PLAN.md`
  - Performance optimization roadmap
  - Query analysis and improvements
  - Index recommendations

---

## Database Schema Overview

### Core Tables (4)
**worklogs** - Most critical table
- Millions of rows (denormalized for performance)
- Indexed on: company_id, author_email, started, jira_instance
- 87% query performance improvement with current indexes

**epics** - Epic metadata cache
- Thousands of rows
- Multi-tenant with company_id

**issues** - Issue cache
- Thousands of rows
- NOT multi-tenant (global cache)

**sync_history** - Sync tracking
- Thousands of rows
- Multi-tenant with company_id

### Configuration Tables (9)
- teams, users, jira_instances
- complementary_groups, complementary_group_members
- holidays, package_templates, linked_issues
- user_jira_accounts

### Billing Tables (8)
- billing_clients, billing_projects
- billing_project_mappings, billing_rates
- billing_worklog_classifications
- invoices, invoice_line_items
- packages

### Authentication Tables (6)
- companies, oauth_users, auth_sessions
- invitations, auth_audit_log
- onboarding_tokens

### Utility Tables (3)
- logs (⚠️ unbounded growth - needs rotation)
- jira_instance_issue_types
- factorial_leaves

---

## Dependencies

### ⬆️ Provides To

**Backend-Core-Engineer:**
- Storage methods for all API routers
- Optimized queries for analytics endpoints
- Multi-tenant data isolation

**Billing-Engineer:**
- Complex queries for billing calculations
- Rate cascade resolution
- Invoice data aggregation

**Integration-Engineer:**
- Upsert methods for JIRA/Tempo data
- Bulk insert operations
- Sync history tracking

**Security-Engineer:**
- Company_id filtering in all queries
- Audit log storage
- Session management

### ↔️ Coordinates With

**Tech-Lead:**
- Schema design decisions
- Performance optimization priorities
- Migration planning

**QA-Engineer:**
- Test database setup
- Performance benchmarks
- Data integrity testing

---

## Required Skills

### Core Technologies
- **SQLite**: Advanced SQL, transactions, indexes, constraints
- **aiosqlite**: Async database operations in Python
- **SQL Optimization**: Query planning, index design, denormalization
- **Database Migrations**: Schema versioning, safe migrations

### Design Patterns
- **Multi-Tenant Isolation**: company_id filtering, data scoping
- **Denormalization**: When and how to denormalize
- **Index Strategy**: Composite indexes, covering indexes
- **Query Optimization**: EXPLAIN QUERY PLAN analysis

### Performance
- Query profiling and optimization
- Index maintenance and analysis
- Database size monitoring
- Archiving strategies

---

## Development Workflow

### When Adding New Table

1. **Design Schema**
   ```sql
   CREATE TABLE new_table (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       company_id INTEGER NOT NULL,
       name TEXT NOT NULL,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

       -- Multi-tenant constraint
       UNIQUE(company_id, name),

       FOREIGN KEY(company_id) REFERENCES companies(id)
   );

   -- Performance indexes
   CREATE INDEX idx_new_table_company ON new_table(company_id);
   CREATE INDEX idx_new_table_company_name ON new_table(company_id, name);
   ```

2. **Create Migration Script**
   ```sql
   -- migrations/003_add_new_table.sql
   BEGIN TRANSACTION;

   -- Create table
   CREATE TABLE new_table (...);

   -- Create indexes
   CREATE INDEX ...;

   -- Update schema version
   INSERT INTO schema_version (version, applied_at)
   VALUES (3, CURRENT_TIMESTAMP);

   COMMIT;
   ```

3. **Add Storage Methods**
   ```python
   # In cache.py
   async def create_new_resource(
       self,
       name: str,
       company_id: int
   ) -> dict:
       if not company_id:
           raise ValueError("company_id required")

       async with aiosqlite.connect(self.db_path) as db:
           cursor = await db.execute(
               """
               INSERT INTO new_table (company_id, name)
               VALUES (?, ?)
               """,
               (company_id, name)
           )
           await db.commit()
           return {"id": cursor.lastrowid, "name": name}

   async def get_all_resources(
       self,
       company_id: int
   ) -> list[dict]:
       if not company_id:
           raise ValueError("company_id required")

       async with aiosqlite.connect(self.db_path) as db:
           db.row_factory = aiosqlite.Row
           cursor = await db.execute(
               """
               SELECT id, name, created_at
               FROM new_table
               WHERE company_id = ?
               ORDER BY created_at DESC
               """,
               (company_id,)
           )
           rows = await cursor.fetchall()
           return [dict(row) for row in rows]
   ```

4. **Test Migration**
   - Run migration on test database
   - Verify indexes created
   - Test storage methods
   - Check multi-tenant isolation

5. **Document Schema**
   - Update OPTIMIZATION_PLAN.md
   - Document in project-overview.md
   - Add to migration changelog

---

## Performance Optimization

### Current Optimizations (Completed)

**Phase 1: Composite Indexes (87% improvement)**
```sql
-- User queries: 1.2s → 150ms
CREATE INDEX idx_worklogs_user_range
    ON worklogs(company_id, author_email, started DESC);

-- Sync operations: 2.8s → 350ms
CREATE INDEX idx_worklogs_instance_range
    ON worklogs(company_id, jira_instance, started DESC);

-- Dashboard queries
CREATE INDEX idx_worklogs_company_started
    ON worklogs(company_id, started DESC);
```

### Pending Optimizations (High Priority)

**Issue 1: complementary_group_members missing company_id**
```sql
-- Current (BROKEN for multi-tenant)
CREATE TABLE complementary_group_members (
    id INTEGER PRIMARY KEY,
    group_id INTEGER,
    instance_id INTEGER
    -- Missing company_id!
);

-- Fix (REQUIRES TABLE RECREATION)
CREATE TABLE complementary_group_members_new (
    id INTEGER PRIMARY KEY,
    company_id INTEGER NOT NULL,
    group_id INTEGER,
    instance_id INTEGER,
    FOREIGN KEY(company_id) REFERENCES companies(id)
);

-- Migrate data
INSERT INTO complementary_group_members_new
SELECT m.id, g.company_id, m.group_id, m.instance_id
FROM complementary_group_members m
JOIN complementary_groups g ON m.group_id = g.id;

-- Swap tables
DROP TABLE complementary_group_members;
ALTER TABLE complementary_group_members_new
    RENAME TO complementary_group_members;
```

**Issue 2: Global UNIQUE constraints (Prevents multi-tenant)**
```sql
-- Current (BROKEN)
CREATE TABLE teams (
    id INTEGER PRIMARY KEY,
    company_id INTEGER,
    name TEXT UNIQUE  -- ❌ Company A and B can't both have "Engineering"
);

-- Fix
CREATE TABLE teams_new (
    id INTEGER PRIMARY KEY,
    company_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    UNIQUE(company_id, name)  -- ✅ Each company can have "Engineering"
);
```

**Issue 3: Logs table unbounded growth**
```sql
-- Implement log rotation (keep 30 days)
DELETE FROM logs
WHERE created_at < datetime('now', '-30 days');

-- Archive old logs before deletion
INSERT INTO logs_archive
SELECT * FROM logs
WHERE created_at < datetime('now', '-30 days');
```

### Query Optimization Checklist

When optimizing a slow query:

1. **Analyze Query Plan**
   ```sql
   EXPLAIN QUERY PLAN
   SELECT * FROM worklogs
   WHERE company_id = ? AND started >= ?;
   ```

2. **Check Index Usage**
   - Look for "SCAN" vs "SEARCH USING INDEX"
   - Ensure indexes cover WHERE, ORDER BY, JOIN columns

3. **Consider Denormalization**
   - If JOIN is expensive, consider denormalizing
   - Worklogs table already denormalized (epic_key, parent_key)

4. **Benchmark Before/After**
   ```python
   import time
   start = time.time()
   await storage.method(...)
   print(f"Query took {(time.time() - start)*1000:.2f}ms")
   ```

5. **Update Documentation**
   - Document optimization in OPTIMIZATION_PLAN.md
   - Report results to Tech-Lead

---

## Common Patterns

### Multi-Tenant Query Pattern (MANDATORY)
```python
async def get_resources(
    self,
    company_id: int,
    filters: dict = None
) -> list[dict]:
    # ALWAYS validate company_id
    if not company_id:
        raise ValueError("company_id is required for multi-tenant isolation")

    async with aiosqlite.connect(self.db_path) as db:
        db.row_factory = aiosqlite.Row

        # ALWAYS include company_id in WHERE clause
        query = """
            SELECT * FROM resources
            WHERE company_id = ?
        """
        params = [company_id]

        # Add additional filters
        if filters:
            # ... add more WHERE conditions
            pass

        cursor = await db.execute(query, params)
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
```

### Bulk Insert Pattern
```python
async def bulk_insert_worklogs(
    self,
    worklogs: list[dict],
    company_id: int
) -> int:
    if not company_id:
        raise ValueError("company_id required")

    async with aiosqlite.connect(self.db_path) as db:
        # Use executemany for bulk operations
        await db.executemany(
            """
            INSERT OR REPLACE INTO worklogs
            (id, company_id, issue_key, author_email, ...)
            VALUES (?, ?, ?, ?, ...)
            """,
            [(w['id'], company_id, w['issue_key'], ...) for w in worklogs]
        )
        await db.commit()
        return len(worklogs)
```

### Transaction Pattern
```python
async def update_with_history(
    self,
    resource_id: int,
    updates: dict,
    company_id: int
) -> dict:
    async with aiosqlite.connect(self.db_path) as db:
        try:
            # Start transaction (implicit with connection)

            # Update main record
            await db.execute(
                "UPDATE resources SET ... WHERE id = ? AND company_id = ?",
                (..., resource_id, company_id)
            )

            # Insert audit log
            await db.execute(
                "INSERT INTO audit_log (resource_id, company_id, changes) VALUES (?, ?, ?)",
                (resource_id, company_id, json.dumps(updates))
            )

            # Commit transaction
            await db.commit()

        except Exception as e:
            # Rollback on error (automatic with aiosqlite)
            raise e
```

---

## Best Practices

### Security
- **Always filter by company_id**: Every query MUST include `WHERE company_id = ?`
- **Validate company_id parameter**: Raise ValueError if None or 0
- **Use parameterized queries**: Never string interpolation (SQL injection)
- **Return 404 for cross-company**: Don't leak existence with 403

### Performance
- **Use indexes wisely**: Composite indexes for multi-column WHERE
- **Denormalize when beneficial**: Avoid JOINs in hot paths
- **Batch operations**: Use executemany() for bulk inserts
- **Monitor query times**: Log slow queries (>500ms)

### Data Integrity
- **Use transactions**: For multi-step operations
- **Foreign keys**: Enforce referential integrity where possible
- **Constraints**: UNIQUE, NOT NULL, CHECK constraints
- **Timestamps**: created_at, updated_at on all tables

### Code Quality
- **Type hints**: All methods should have type annotations
- **Docstrings**: Document complex queries
- **Error handling**: Catch and log database errors
- **Test coverage**: Unit tests for all storage methods

---

## Migration Procedures

### Safe Migration Checklist

1. **Backup Database**
   ```bash
   cp worklog_storage.db worklog_storage.db.backup
   ```

2. **Test on Copy**
   ```bash
   cp worklog_storage.db test_migration.db
   # Run migration on test_migration.db
   ```

3. **Write Rollback Script**
   ```sql
   -- Always have a way to undo
   BEGIN TRANSACTION;
   -- Rollback steps
   COMMIT;
   ```

4. **Run Migration**
   ```python
   async with aiosqlite.connect(db_path) as db:
       with open('migrations/003_migration.sql') as f:
           await db.executescript(f.read())
       await db.commit()
   ```

5. **Verify Migration**
   - Check table structure: `PRAGMA table_info(table_name);`
   - Check indexes: `PRAGMA index_list(table_name);`
   - Test queries with new schema

6. **Update Version**
   ```sql
   INSERT INTO schema_version (version, description, applied_at)
   VALUES (3, 'Add new_table with company_id', CURRENT_TIMESTAMP);
   ```

---

## Troubleshooting

### Common Issues

**Issue: "database is locked"**
- Check for long-running transactions
- Ensure all connections are properly closed
- Consider increasing timeout: `await db.execute("PRAGMA busy_timeout = 5000")`

**Issue: Slow queries after adding data**
- Run ANALYZE to update query planner statistics: `ANALYZE;`
- Rebuild indexes if corrupted: `REINDEX table_name;`
- Check if indexes are being used: `EXPLAIN QUERY PLAN ...`

**Issue: Database file growing too large**
- Implement log rotation (logs table)
- Archive old worklogs (>2 years)
- Run VACUUM to reclaim space: `VACUUM;`

**Issue: Multi-tenant isolation breach**
- Audit all queries for `WHERE company_id = ?`
- Check test suite: `pytest tests/test_multi_tenant.py`
- Review recent changes with Security-Engineer

---

## Monitoring & Metrics

### Track These Metrics
- Query response times (target: <300ms for 95th percentile)
- Database file size (alert at >1GB)
- Table row counts (logs table alert at >1M rows)
- Index usage statistics
- Slow query log (>500ms)

### Regular Maintenance Tasks
- **Daily**: Monitor database size
- **Weekly**: Review slow query log
- **Monthly**: Run ANALYZE and VACUUM
- **Quarterly**: Archive old logs, review indexes

---

## Communication Protocol

### When to Notify Other Agents

**Backend-Core-Engineer:**
- New storage methods available
- Breaking changes to method signatures
- Performance improvements available

**Security-Engineer:**
- Multi-tenant isolation issues
- Audit log schema changes
- Credential storage updates

**Integration-Engineer:**
- Bulk insert optimizations
- Sync history tracking changes
- Worklog schema updates

**Tech-Lead:**
- Migration planning needed
- Performance issues requiring architecture changes
- Database size concerns

---

## Resources

### Documentation
- SQLite docs: https://www.sqlite.org/docs.html
- aiosqlite docs: https://aiosqlite.omnilib.dev/
- Project's OPTIMIZATION_PLAN.md: `/backend/OPTIMIZATION_PLAN.md`
- Project overview: `/docs/project-overview.md`

### Internal References
- Current schema: `backend/app/cache.py` (line 1-500)
- Migration scripts: `backend/migrations/`
- Test database setup: `backend/tests/conftest.py`

---

## Quick Reference Commands

```bash
# Start Python shell with storage
cd backend
source venv/bin/activate
python
>>> from app.cache import WorklogStorage
>>> storage = WorklogStorage()
>>> await storage.initialize()

# Analyze database
sqlite3 worklog_storage.db
.schema table_name
.indexes table_name
EXPLAIN QUERY PLAN SELECT ...;

# Check database size
ls -lh backend/worklog_storage.db

# Run migrations
python -m app.migrations.run_migration

# Performance test
pytest tests/test_upsert_performance.py -v
```
