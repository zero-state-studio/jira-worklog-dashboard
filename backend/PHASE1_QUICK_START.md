# Phase 1 Quick Start Guide

**Status**: ✅ Ready for Execution
**Expected Duration**: 30 minutes (5-10 min actual execution)
**Downtime**: 0 minutes
**Risk**: LOW

---

## One-Command Execution (Recommended)

```bash
# From project root
cd backend

# 1. Validate database is ready
python scripts/validate_migration.py --db ../worklog.db --migration migrations/001_add_composite_indexes.sql

# 2. If validation passes, run migration with benchmarks
python scripts/run_migration.py --db ../worklog.db --migration migrations/001_add_composite_indexes.sql --benchmark

# 3. Check results
cat migration_validation_report.json | jq '.overall_status'
```

---

## Manual Step-by-Step Execution

### Step 1: Pre-Migration Checks (5 minutes)

```bash
# Make sure you're in the backend directory
cd backend

# Run validation script
python scripts/validate_migration.py --db ../worklog.db

# Look for: "✅ Database is READY for Phase 1 migration"
```

**Checklist:**
- [ ] Connectivity: ✅
- [ ] Tables exist: ✅
- [ ] Data integrity: ✅
- [ ] Disk space: ✅ (need 200MB+ free)
- [ ] Migration script: ✅

### Step 2: Create Backup (2 minutes)

```bash
# Create timestamped backup
cp ../worklog.db ../worklog.db.backup-$(date +%Y%m%d_%H%M%S)

# Verify backup exists
ls -lh ../worklog.db.backup-*

# Test backup is readable
sqlite3 ../worklog.db.backup-* "SELECT COUNT(*) FROM worklogs LIMIT 1;"
```

### Step 3: Run Migration (5-10 minutes)

```bash
# Execute migration with full diagnostics
python scripts/run_migration.py \
  --db ../worklog.db \
  --migration migrations/001_add_composite_indexes.sql \
  --benchmark

# Script will:
# 1. Backup database (if not done manually)
# 2. Execute SQL migration
# 3. Verify indexes created
# 4. Validate data integrity
# 5. Run performance benchmarks
```

**Monitor during execution:**
- No errors in output
- CPU usage stays < 50%
- Disk usage doesn't spike

### Step 4: Verify Results (3 minutes)

```bash
# Check that all 4 indexes were created
sqlite3 ../worklog.db << EOF
SELECT name, tbl_name FROM sqlite_master
WHERE type='index' AND (
  name = 'idx_worklogs_user_range' OR
  name = 'idx_worklogs_instance_range' OR
  name = 'idx_billing_rates_lookup' OR
  name = 'idx_factorial_leaves_company_status'
);
EOF

# Expected output (4 rows):
# idx_worklogs_user_range|worklogs
# idx_worklogs_instance_range|worklogs
# idx_billing_rates_lookup|billing_rates
# idx_factorial_leaves_company_status|factorial_leaves

# Verify query plans use new indexes
sqlite3 ../worklog.db << EOF
.timer on
EXPLAIN QUERY PLAN
SELECT * FROM worklogs
WHERE company_id = 1 AND author_email = 'test@example.com'
AND date(started) >= '2025-01-01' AND date(started) <= '2025-01-31';
EOF

# Look for: "USING INDEX idx_worklogs_user_range"
```

### Step 5: Performance Validation (5 minutes)

```bash
# Run benchmark tests
python scripts/run_migration.py \
  --db ../worklog.db \
  --benchmark \
  --no-backup

# Expected results:
# User Worklogs Range: ~150ms (was ~1200ms) ✅
# Sync Instance Range: ~350ms (was ~2800ms) ✅
# Billing Rate Lookup: ~750ms (was ~1000ms) ✅
```

---

## Expected Output

### Successful Migration

```
============================================================
Database Migration Runner - Phase 1
============================================================

Database: ../worklog.db
Migration: migrations/001_add_composite_indexes.sql

============================================================
Step 1: Creating Backup...
✅ Backup created: ../worklog.db.backup-20260210_143022

Step 2: Executing Migration...
✅ Migration executed successfully

Step 3: Verifying Indexes Created...
  ✅ idx_worklogs_user_range
  ✅ idx_worklogs_instance_range
  ✅ idx_billing_rates_lookup
  ✅ idx_factorial_leaves_company_status

Step 4: Validating Data Integrity...
✓ Validating Migration...
  Testing index usage...
    ✅ idx_worklogs_user_range used
  Testing data integrity...
    ✅ Worklogs count: 125000
  Testing constraint enforcement...
    ✅ Teams count: 8

✅ All validations passed

Step 5: Running Performance Benchmarks...
🏃 Running Performance Benchmarks...

User Worklogs Range
  Execution time: 152.45ms
  Rows: 1200
  Index used: idx_worklogs_user_range

Sync Instance Range
  Execution time: 348.20ms
  Rows: 1500
  Index used: idx_worklogs_instance_range

Billing Rate Lookup
  Execution time: 756.10ms
  Rows: 25
  Index used: idx_billing_rates_lookup

============================================================
✅ Migration Completed Successfully!
Backup: ../worklog.db.backup-20260210_143022
============================================================
```

---

## Troubleshooting

### Issue: "Database locked"

```bash
# Solution: Ensure application is stopped
systemctl stop jira-worklog-dashboard

# Verify no other connections
lsof | grep worklog.db

# Run migration
python scripts/run_migration.py --db ../worklog.db --migration migrations/001_add_composite_indexes.sql

# Restart application
systemctl start jira-worklog-dashboard
```

### Issue: "Insufficient disk space"

```bash
# Check available space
df -h /path/to/database

# If space low, clean up old backups
rm worklog.db.backup-202501*

# Then retry migration
python scripts/run_migration.py --db ../worklog.db --migration migrations/001_add_composite_indexes.sql
```

### Issue: "Validation failed - data integrity"

```bash
# Restore from backup
cp worklog.db.backup-LATEST worklog.db

# Run integrity check on backup
sqlite3 worklog.db "PRAGMA integrity_check;"

# If still failing, contact DBA
```

### Issue: "Indexes not used by queries"

```bash
# Force query planner to recognize new indexes
sqlite3 worklog.db << EOF
ANALYZE;
VACUUM;
EOF

# Re-check query plans
sqlite3 worklog.db << EOF
.timer on
EXPLAIN QUERY PLAN SELECT * FROM worklogs
WHERE company_id = 1 AND author_email = 'test@example.com'
AND date(started) >= '2025-01-01';
EOF

# If still not using index, check:
# 1. Index name spelling
# 2. Column names and types
# 3. Verify index actually created: SELECT name FROM sqlite_master WHERE type='index';
```

---

## Quick Reference

### Files Involved

| File | Purpose |
|------|---------|
| `migrations/001_add_composite_indexes.sql` | SQL migration script |
| `scripts/run_migration.py` | Migration executor with benchmarks |
| `scripts/validate_migration.py` | Pre-flight validation |
| `PHASE1_DEPLOYMENT.md` | Detailed deployment guide |
| `PHASE1_QUICK_START.md` | This file (quick reference) |

### Key Metrics to Track

| Metric | Before | Target | Success Criteria |
|--------|--------|--------|------------------|
| User queries (30 days) | 1,200ms | 150ms | < 200ms |
| Sync operations (daily) | 2,800ms | 350ms | < 400ms |
| Billing calculations | 1,000ms | 750ms | < 850ms |
| DB file size | 500MB | 550MB | +10% max |
| Index size | N/A | 100-200MB | Acceptable |

### Rollback Commands

```bash
# Quick rollback (if migration causes issues)
cp worklog.db.backup-LATEST worklog.db

# Or manually drop indexes
sqlite3 worklog.db << EOF
DROP INDEX IF EXISTS idx_worklogs_user_range;
DROP INDEX IF EXISTS idx_worklogs_instance_range;
DROP INDEX IF EXISTS idx_billing_rates_lookup;
DROP INDEX IF EXISTS idx_factorial_leaves_company_status;
ANALYZE;
EOF
```

---

## Success Verification Checklist

After migration completes, verify these items:

**Structural:**
- [ ] All 4 indexes exist in database
- [ ] Query plans show index usage
- [ ] Data integrity check passes
- [ ] Foreign key constraints intact

**Performance:**
- [ ] User queries: < 200ms ✅
- [ ] Sync operations: < 400ms ✅
- [ ] No query regression on other tables
- [ ] Application starts without errors

**Operational:**
- [ ] Database backup created ✅
- [ ] Migration took < 15 minutes
- [ ] Zero downtime (no restart needed)
- [ ] Backup is restorable

---

## When to Proceed to Phase 2

- [ ] Phase 1 migration completely successful
- [ ] All performance targets met
- [ ] No errors in application logs for 24 hours
- [ ] Stakeholders notified of improvements

Then schedule Phase 2 for next maintenance window.

---

## Additional Resources

- Full analysis: `OPTIMIZATION_PLAN.md`
- Detailed deployment: `PHASE1_DEPLOYMENT.md`
- Multi-tenant info: `../../CLAUDE.md`
- Archive/cleanup: `maintenance/archive_manager.py`

---

**Ready to execute?** Run:
```bash
python scripts/validate_migration.py --db ../worklog.db && \
python scripts/run_migration.py --db ../worklog.db --benchmark
```

**Need help?** Check `PHASE1_DEPLOYMENT.md` Section 10 (Troubleshooting)

---

**Version**: 1.0
**Updated**: 2026-02-10
**Status**: ✅ Ready for Production
