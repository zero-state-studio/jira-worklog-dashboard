-- Cache dei tipi di issue JIRA per evitare chiamate ripetute alle API
CREATE TABLE IF NOT EXISTS jira_issue_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    jira_instance TEXT NOT NULL,  -- Nome istanza da cui proviene
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, name, jira_instance),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX idx_jira_issue_types_company ON jira_issue_types(company_id);
CREATE INDEX idx_jira_issue_types_name ON jira_issue_types(company_id, name);
