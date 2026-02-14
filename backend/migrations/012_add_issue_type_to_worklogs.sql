-- Migration 012: Add issue_type column to worklogs table
-- Date: 2026-02-14
-- Purpose: Store the JIRA issue type (e.g., Story, Bug, Task, Sub-task) for each worklog
-- to enable issue-type-based matching and filtering in the discrepancy dashboard.

-- Add issue_type column (nullable - existing worklogs won't have this yet)
ALTER TABLE worklogs ADD COLUMN issue_type TEXT;

-- Composite index for queries filtering by company and issue type
CREATE INDEX IF NOT EXISTS idx_worklogs_issue_type ON worklogs(company_id, issue_type);
