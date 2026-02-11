-- Query per trovare worklog duplicati (stesso ID, diverse istanze JIRA)
SELECT
    id,
    COUNT(*) as occurrences,
    GROUP_CONCAT(jira_instance) as instances,
    GROUP_CONCAT(company_id) as companies
FROM worklogs
GROUP BY id
HAVING COUNT(*) > 1
ORDER BY occurrences DESC;

-- Query per vedere quanti duplicati totali ci sono
SELECT
    COUNT(*) as total_duplicate_ids,
    SUM(cnt - 1) as extra_rows
FROM (
    SELECT id, COUNT(*) as cnt
    FROM worklogs
    GROUP BY id
    HAVING cnt > 1
);
