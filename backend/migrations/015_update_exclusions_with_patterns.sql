-- Migration: Update jira_exclusions to use wildcard patterns
-- This enables automatic matching of all issues with a specific prefix
-- (e.g., ASS-* matches ASS-19, ASS-2, ASS-9999, etc.)

-- Remove old exact-match exclusions (without wildcard)
DELETE FROM jira_exclusions
WHERE exclusion_key IN ('ASS', 'FORM', 'ADMIN');
