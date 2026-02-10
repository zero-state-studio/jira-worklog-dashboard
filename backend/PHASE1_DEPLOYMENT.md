# Phase 1 Deployment Guide - Composite Indexes

**Date**: 2026-02-10
**Status**: Ready for Deployment
**Downtime**: 0 minutes
**Estimated Duration**: 5-10 minutes
**Risk Level**: LOW ✅

---

## Pre-Deployment Checklist

- [ ] Review `OPTIMIZATION_PLAN.md` sections 1-3
- [ ] Backup production database
- [ ] Verify `backend/scripts/run_migration.py` exists
- [ ] Verify `backend/migrations/001_add_composite_indexes.sql` exists
- [ ] Confirm application performance baseline
- [ ] Schedule notification to stakeholders

---

## Deployment Steps

### Step 1: Verify Prerequisites

```bash
# Verify migration file exists
ls -la backend/migrations/001_add_composite_indexes.sql

# Verify migration script exists
ls -la backend/scripts/run_migration.py

# Check current database health
python backend/scripts/health_check.py
```

### Step 2: Create Backup (IMPORTANT!)

```bash
# Make backup before any changes
cp worklog.db worklog.db.backup-$(date +%Y%m%d_%H%M%S)

# Verify backup
sqlite3 worklog.db.backup-* ".tables"
```

### Step 3: Execute Migration

```bash
# Run migration with benchmarks
cd backend
python scripts/run_migration.py \
  --db ../worklog.db \
  --migration migrations/001_add_composite_indexes.sql \
  --benchmark

# Expected output:
# ✅ Backup created
# ✅ Migration executed successfully
# ✅ All validations passed
# 📊 Performance Benchmarks: [results]
```

### Step 4: Verify Migration Success

```bash
# Check that indexes were created
sqlite3 worklog.db << EOF
SELECT name FROM sqlite_master WHERE type='index'
AND name LIKE 'idx_worklogs%' OR name LIKE 'idx_billing%' OR name LIKE 'idx_factorial%';
EOF

# Expected output:
# idx_worklogs_user_range
# idx_worklogs_instance_range
# idx_billing_rates_lookup
# idx_factorial_leaves_company_status

# Verify query plans use new indexes
sqlite3 worklog.db << EOF
.timer on
EXPLAIN QUERY PLAN
SELECT * FROM worklogs
WHERE company_id = 1 AND author_email = 'user@example.com'
AND date(started) >= '2025-01-01' AND date(started) <= '2025-01-31'
ORDER BY started DESC;
EOF

# Expected: Should mention idx_worklogs_user_range
```

### Step 5: Run Performance Tests

```bash
# Run full benchmark suite
python scripts/run_migration.py \
  --db worklog.db \
  --benchmark \
  --no-backup  # Skip backup since already done

# Compare results with OPTIMIZATION_PLAN.md benchmarks
```

### Step 6: Monitor Application

```bash
# Check application logs for errors
tail -f /var/log/jira-worklog-dashboard.log

# Monitor API response times
# Expected: User queries <200ms, Sync <400ms

# Test key endpoints
curl http://localhost:8000/api/dashboard  # Should be faster
curl http://localhost:8000/api/sync       # Should be faster
```

---

## Expected Performance Improvements

### Query Benchmarks

**Before Migration:**
```
User Worklogs Range (30 days, 100K rows):
  Time: 1,200ms
  Rows scanned: 45,000
  Index: idx_worklogs_company_started

Sync JIRA Instance (daily):
  Time: 2,800ms
  Rows scanned: 120,000
  Index: idx_worklogs_company + full scan

Billing Rate Lookup:
  Time: 1,000ms
  Index: No composite index
```

**After Migration (EXPECTED):**
```
User Worklogs Range:
  Time: 150ms (87% faster ✅)
  Rows scanned: 1,200 (direct index)
  Index: idx_worklogs_user_range

Sync JIRA Instance:
  Time: 350ms (87% faster ✅)
  Rows scanned: 1,500 (direct index)
  Index: idx_worklogs_instance_range

Billing Rate Lookup:
  Time: 750ms (25% faster ✅)
  Index: idx_billing_rates_lookup
```

### Storage Impact
- Index creation: ~100-200MB per 1M worklogs
- No table data changes
- No downtime required

---

## Rollback Procedure (If Needed)

```bash
# If migration fails or causes issues:

# Option 1: Restore from backup
cp worklog.db.backup-YYYYMMDD_HHMMSS worklog.db

# Option 2: Drop indexes manually
sqlite3 worklog.db << EOF
DROP INDEX IF EXISTS idx_worklogs_user_range;
DROP INDEX IF EXISTS idx_worklogs_instance_range;
DROP INDEX IF EXISTS idx_billing_rates_lookup;
DROP INDEX IF EXISTS idx_factorial_leaves_company_status;
ANALYZE;
EOF

# Restart application
systemctl restart jira-worklog-dashboard
```

---

## Validation Queries

### Test 1: Verify Indexes Exist

```sql
-- Run in sqlite3
SELECT name, sql FROM sqlite_master
WHERE type='index' AND (
  name = 'idx_worklogs_user_range' OR
  name = 'idx_worklogs_instance_range' OR
  name = 'idx_billing_rates_lookup' OR
  name = 'idx_factorial_leaves_company_status'
);

-- Expected: 4 rows (all indexes created)
```

### Test 2: Verify Query Plans

```sql
-- Query 1: User worklogs
EXPLAIN QUERY PLAN
SELECT * FROM worklogs
WHERE company_id = 1 AND author_email = 'user@example.com'
AND date(started) >= '2025-01-01' AND date(started) <= '2025-01-31';
-- Expected: Uses idx_worklogs_user_range

-- Query 2: Sync instance
EXPLAIN QUERY PLAN
SELECT * FROM worklogs
WHERE company_id = 1 AND jira_instance = 'Company Main'
AND date(started) >= '2025-01-01' AND date(started) <= '2025-01-31';
-- Expected: Uses idx_worklogs_instance_range

-- Query 3: Billing rates
EXPLAIN QUERY PLAN
SELECT hourly_rate FROM billing_rates
WHERE billing_project_id = 1 AND user_email = 'user@example.com' AND issue_type = 'Task';
-- Expected: Uses idx_billing_rates_lookup
```

### Test 3: Verify Data Integrity

```sql
-- Check row counts haven't changed
SELECT COUNT(*) as worklog_count FROM worklogs;
SELECT COUNT(*) as teams_count FROM teams;
SELECT COUNT(*) as users_count FROM users;
SELECT COUNT(*) as invoices_count FROM invoices;

-- Run PRAGMA integrity_check
PRAGMA integrity_check;
-- Expected: "ok"

-- Verify foreign keys
PRAGMA foreign_key_check;
-- Expected: No rows (no constraint violations)
```

### Test 4: Verify No Performance Regression

```sql
-- Run on random table to check no other queries degraded
SELECT * FROM logs WHERE timestamp > datetime('now', '-1 hour') LIMIT 10;
-- Expected: Still fast (~50ms)
```

---

## Monitoring & Alerts

### During Migration
- Monitor CPU usage (should be moderate - background indexing)
- Monitor disk space (ensure >500MB free for indexes)
- Monitor application performance (should not degrade)

### Post Migration
- Check query response times in APM/monitoring
- Verify user dashboard loads < 500ms (was ~1200ms)
- Verify sync operations < 500ms (was ~2800ms)
- Set alerts for queries > 5s (investigate missing indexes)

### Continuous Monitoring

```bash
# Add to cron job (weekly health check)
0 2 * * 0 sqlite3 worklog.db "PRAGMA index_info(idx_worklogs_user_range);" > /var/log/db_indexes.log

# Add to monitoring dashboard:
# - Query latency p95, p99
# - Slow query log (> 500ms)
# - Index fragmentation
```

---

## Success Criteria

✅ **Phase 1 is successful when:**

1. **Indexes created**: All 4 indexes exist in database
2. **Query plans updated**: Queries use new composite indexes
3. **Performance improved**:
   - User queries: <200ms (was 1.2s)
   - Sync operations: <400ms (was 2.8s)
4. **Data integrity maintained**: No corruption, FK checks pass
5. **No errors in logs**: Application runs smoothly
6. **Zero downtime**: Migration completed without application restart

---

## Post-Deployment Tasks

- [ ] Document final benchmark results
- [ ] Update monitoring dashboards with new baselines
- [ ] Schedule Phase 2 (Multi-tenant constraints) for next maintenance window
- [ ] Review logs for any warnings or errors
- [ ] Communicate performance improvements to stakeholders

---

## Support & Questions

- **Deployment issues**: Check OPTIMIZATION_PLAN.md Section 8 (Risks & Mitigations)
- **Performance concerns**: Run `python scripts/run_migration.py --benchmark`
- **Rollback needed**: Use rollback procedure above, restore from backup

---

## Timeline

| Phase | Time | Action |
|-------|------|--------|
| Pre-deployment | -1 hour | Backup, announce to team |
| Backup | 5 min | Create backup file |
| Migration | 5-10 min | Run migration script |
| Validation | 5 min | Verify indexes and data |
| Testing | 10 min | Run benchmark queries |
| **Total** | **25-30 min** | (0 minutes downtime) |

---

**Prepared by**: Database Architect
**Date**: 2026-02-10
**Version**: 1.0
**Status**: Ready for Production Deployment ✅
