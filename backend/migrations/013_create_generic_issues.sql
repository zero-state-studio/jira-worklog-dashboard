-- Migration 013: Create generic_issues table
-- Date: 2026-02-14
-- Purpose: Store generic issue definitions that map issue codes + types to teams.
-- Used by the discrepancy matching system to automatically assign worklogs
-- to teams based on issue_type when no parent-linking match is found.

CREATE TABLE IF NOT EXISTS generic_issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    issue_code TEXT NOT NULL,
    issue_type TEXT NOT NULL,
    team_id INTEGER,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, issue_code, issue_type, team_id),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- Index for fast lookup by company
CREATE INDEX IF NOT EXISTS idx_generic_issues_company ON generic_issues(company_id);

-- Composite index for matching queries: lookup by company + issue_code + issue_type
CREATE INDEX IF NOT EXISTS idx_generic_issues_lookup ON generic_issues(company_id, issue_code, issue_type);

-- Index for team-based queries
CREATE INDEX IF NOT EXISTS idx_generic_issues_team ON generic_issues(company_id, team_id);
