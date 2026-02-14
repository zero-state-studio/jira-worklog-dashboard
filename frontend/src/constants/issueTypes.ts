/**
 * Static list of common JIRA issue types
 *
 * This avoids API calls to Atlassian and provides a consistent list
 * of issue types for generic issue mapping.
 */

export const JIRA_ISSUE_TYPES = [
  'Task',
  'Bug',
  'Story',
  'Epic',
  'Sub-task',
  'Incident',
  'Request',
  'Change',
  'Problem',
  'Service Request',
  'Support',
  'Improvement',
  'New Feature',
] as const

export type JiraIssueType = typeof JIRA_ISSUE_TYPES[number]
