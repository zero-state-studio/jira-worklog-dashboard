-- Migration: Create matching_algorithms table for configurable worklog matching
-- This table stores configuration for different matching algorithms used to identify
-- related worklogs across complementary JIRA instances.

CREATE TABLE IF NOT EXISTS matching_algorithms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    algorithm_type TEXT NOT NULL,
    algorithm_name TEXT NOT NULL,
    description TEXT NOT NULL,
    enabled BOOLEAN DEFAULT 0,
    config TEXT DEFAULT '{}',  -- JSON config (threshold, regex patterns, etc.)
    priority INTEGER DEFAULT 0,  -- Order of execution (lower = higher priority)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    UNIQUE(company_id, algorithm_type)
);

-- Index for fast lookup by company
CREATE INDEX IF NOT EXISTS idx_matching_algorithms_company
ON matching_algorithms(company_id, enabled);

-- Insert default algorithm: Parent Linking Match
-- This will be inserted for each company via backend initialization
-- INSERT INTO matching_algorithms (company_id, algorithm_type, algorithm_name, description, enabled, priority)
-- VALUES (?, 'parent_linking', 'Parent Linking Match', 'Groups worklogs by parent Epic/Project key...', 0, 1);
