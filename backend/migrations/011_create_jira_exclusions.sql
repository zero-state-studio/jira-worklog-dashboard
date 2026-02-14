-- Migration: Create jira_exclusions table for excluding issue/parent keys from matching algorithms
-- These exclusions represent expected discrepancies (e.g., leaves, training) that should not be flagged as errors

CREATE TABLE IF NOT EXISTS jira_exclusions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    exclusion_key TEXT NOT NULL,
    exclusion_type TEXT NOT NULL CHECK(exclusion_type IN ('issue_key', 'parent_key')),
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, exclusion_key, exclusion_type),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_jira_exclusions_company ON jira_exclusions(company_id);
CREATE INDEX IF NOT EXISTS idx_jira_exclusions_key ON jira_exclusions(company_id, exclusion_key);

-- Insert common exclusions for company_id=1 (example)
INSERT OR IGNORE INTO jira_exclusions (company_id, exclusion_key, exclusion_type, description) VALUES
(1, 'ASS', 'parent_key', 'Assenze (ferie, malattia)'),
(1, 'FORM', 'parent_key', 'Formazione'),
(1, 'ADMIN', 'parent_key', 'Attività amministrative');
