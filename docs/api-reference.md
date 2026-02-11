# API Reference

> **Navigation:** [Architecture](./architecture.md) | [Database Schema](./database-schema.md) | [Conventions](./conventions.md) | [Setup](./setup-and-commands.md)

Complete API endpoint documentation for the JIRA Worklog Dashboard. All endpoints (except `/health`) require JWT authentication.

**Base URL:** `http://localhost:8000/api` (development) | `https://your-domain.com/api` (production)

---

## Table of Contents

1. [Authentication](#1-authentication-11-endpoints)
2. [Dashboard](#2-dashboard-6-endpoints)
3. [Teams](#3-teams-8-endpoints)
4. [Users](#4-users-9-endpoints)
5. [Epics](#5-epics-7-endpoints)
6. [Issues](#6-issues-5-endpoints)
7. [Sync](#7-sync-5-endpoints)
8. [Settings](#8-settings-18-endpoints)
9. [Billing](#9-billing-23-endpoints)
10. [Packages](#10-packages-9-endpoints)
11. [Factorial](#11-factorial-7-endpoints)
12. [Logs](#12-logs-12-endpoints)
13. [Invitations](#13-invitations-5-endpoints)
14. [Health](#14-health-1-endpoint)

**Total: 111 endpoints**

---

## Authentication

All endpoints except `/health` require a valid JWT token in the `Authorization` header:

```http
Authorization: Bearer <access_token>
```

### Authentication Errors

| Code | Description |
|------|-------------|
| 401 | Missing or invalid token |
| 403 | Insufficient permissions |
| 404 | Resource not found (or cross-company access) |

---

## 1. Authentication (11 endpoints)

### POST /api/auth/google/authorize

Initiate Google OAuth flow.

**Auth:** Public

**Request:**
```json
{
  "redirect_uri": "http://localhost:5173/auth/callback"
}
```

**Response:**
```json
{
  "authorization_url": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

---

### POST /api/auth/google/callback

Handle OAuth callback from Google.

**Auth:** Public

**Query Params:**
- `code` (required) - OAuth authorization code

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 1800,
  "user": {
    "id": 1,
    "email": "user@company.com",
    "display_name": "John Doe",
    "company_id": 1,
    "role": "ADMIN"
  }
}
```

---

### POST /api/auth/refresh

Refresh expired access token.

**Auth:** Refresh token required

**Request:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

---

### POST /api/auth/logout

Revoke current session.

**Auth:** Bearer token

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

---

### GET /api/auth/me

Get current user info.

**Auth:** Bearer token

**Response:**
```json
{
  "id": 1,
  "email": "user@company.com",
  "display_name": "John Doe",
  "company_id": 1,
  "role": "ADMIN",
  "is_active": true,
  "created_at": "2024-01-01T00:00:00Z",
  "last_login_at": "2024-02-11T10:30:00Z"
}
```

---

### PUT /api/auth/me

Update current user profile.

**Auth:** Bearer token

**Request:**
```json
{
  "display_name": "John Smith"
}
```

**Response:**
```json
{
  "id": 1,
  "display_name": "John Smith",
  "updated_at": "2024-02-11T11:00:00Z"
}
```

---

### GET /api/auth/sessions

List active sessions for current user.

**Auth:** Bearer token

**Response:**
```json
[
  {
    "id": 42,
    "jti": "unique-token-id",
    "created_at": "2024-02-11T10:00:00Z",
    "last_used_at": "2024-02-11T11:30:00Z",
    "expires_at": "2024-03-13T10:00:00Z",
    "user_agent": "Mozilla/5.0...",
    "ip_address": "192.168.1.100",
    "is_current": true
  }
]
```

---

### DELETE /api/auth/sessions/{session_id}

Revoke a specific session.

**Auth:** Bearer token

**Response:**
```json
{
  "message": "Session revoked"
}
```

---

### GET /api/auth/audit-log

Get auth audit log for current user.

**Auth:** Bearer token

**Query Params:**
- `limit` (optional, default: 100) - Max results
- `offset` (optional, default: 0) - Pagination offset

**Response:**
```json
[
  {
    "id": 123,
    "event_type": "login_success",
    "email": "user@company.com",
    "ip_address": "192.168.1.100",
    "user_agent": "Mozilla/5.0...",
    "created_at": "2024-02-11T10:00:00Z",
    "details": {}
  }
]
```

---

### POST /api/auth/dev/login

Development mode login (bypasses OAuth).

**Auth:** Public (only works if `DEV_MODE=true`)

**Request:**
```json
{
  "email": "dev@localhost",
  "role": "ADMIN"
}
```

**Response:**
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "user": { ... }
}
```

---

### POST /api/auth/dev/switch-company

Development mode company switching.

**Auth:** Bearer token (DEV_MODE only)

**Request:**
```json
{
  "company_id": 2
}
```

**Response:**
```json
{
  "access_token": "...",
  "message": "Switched to company 2"
}
```

---

## 2. Dashboard (6 endpoints)

### GET /api/dashboard/overview

Global overview statistics.

**Auth:** Bearer token

**Query Params:**
- `start_date` (required) - ISO date (YYYY-MM-DD)
- `end_date` (required) - ISO date
- `instance` (optional) - JIRA instance name (null = all)

**Response:**
```json
{
  "total_hours": 1234.5,
  "total_worklogs": 5678,
  "active_users": 42,
  "top_epics": [
    {
      "epic_key": "PROJ-123",
      "epic_name": "Big Feature",
      "total_hours": 234.5,
      "worklog_count": 456
    }
  ],
  "daily_trend": [
    {
      "date": "2024-02-01",
      "hours": 64.5,
      "worklog_count": 123
    }
  ]
}
```

---

### GET /api/dashboard/teams

Team breakdown statistics.

**Auth:** Bearer token

**Query Params:**
- `start_date`, `end_date`, `instance` (same as overview)

**Response:**
```json
[
  {
    "team_name": "Engineering",
    "member_count": 12,
    "total_hours": 567.5,
    "avg_hours_per_member": 47.3,
    "top_contributor": {
      "email": "top.dev@company.com",
      "hours": 120.5
    }
  }
]
```

---

### GET /api/dashboard/daily

Daily hours breakdown.

**Auth:** Bearer token

**Query Params:**
- `start_date`, `end_date`, `instance`

**Response:**
```json
{
  "dates": ["2024-02-01", "2024-02-02", ...],
  "totals": [64.5, 72.3, ...],
  "by_team": {
    "Engineering": [48.0, 52.5, ...],
    "Design": [16.5, 19.8, ...]
  }
}
```

---

### GET /api/dashboard/top-users

Top contributors.

**Auth:** Bearer token

**Query Params:**
- `start_date`, `end_date`, `instance`
- `limit` (optional, default: 10)

**Response:**
```json
[
  {
    "email": "user@company.com",
    "display_name": "John Doe",
    "team": "Engineering",
    "total_hours": 120.5,
    "worklog_count": 234,
    "avg_daily_hours": 6.5
  }
]
```

---

### GET /api/dashboard/epic-distribution

Epic hours distribution.

**Auth:** Bearer token

**Query Params:**
- `start_date`, `end_date`, `instance`

**Response:**
```json
[
  {
    "epic_key": "PROJ-123",
    "epic_name": "Big Feature",
    "total_hours": 234.5,
    "percentage": 19.0,
    "contributor_count": 8
  }
]
```

---

### GET /api/dashboard/workload

Team workload comparison.

**Auth:** Bearer token

**Query Params:**
- `start_date`, `end_date`, `instance`

**Response:**
```json
[
  {
    "team_name": "Engineering",
    "total_hours": 567.5,
    "expected_hours": 480.0,
    "utilization_rate": 1.18,
    "status": "over_capacity"
  }
]
```

---

## 3. Teams (8 endpoints)

### GET /api/teams

List all teams.

**Auth:** Bearer token

**Response:**
```json
[
  {
    "id": 1,
    "company_id": 1,
    "name": "Engineering",
    "description": "Product development team",
    "member_count": 12,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

---

### POST /api/teams

Create a new team.

**Auth:** Bearer token (ADMIN only)

**Request:**
```json
{
  "name": "Engineering",
  "description": "Product development team"
}
```

**Response:**
```json
{
  "id": 1,
  "company_id": 1,
  "name": "Engineering",
  "description": "Product development team",
  "created_at": "2024-02-11T12:00:00Z"
}
```

---

### GET /api/teams/{team_name}

Get team details.

**Auth:** Bearer token

**Response:**
```json
{
  "id": 1,
  "company_id": 1,
  "name": "Engineering",
  "description": "Product development team",
  "member_count": 12,
  "members": [
    {
      "id": 42,
      "email": "user@company.com",
      "display_name": "John Doe",
      "is_active": true
    }
  ],
  "created_at": "2024-01-01T00:00:00Z"
}
```

---

### PUT /api/teams/{team_name}

Update team details.

**Auth:** Bearer token (ADMIN or MANAGER)

**Request:**
```json
{
  "description": "Updated description"
}
```

**Response:**
```json
{
  "id": 1,
  "name": "Engineering",
  "description": "Updated description",
  "updated_at": "2024-02-11T12:30:00Z"
}
```

---

### DELETE /api/teams/{team_name}

Delete a team.

**Auth:** Bearer token (ADMIN only)

**Response:**
```json
{
  "message": "Team deleted successfully"
}
```

**Note:** Members are not deleted, just unassigned from team.

---

### GET /api/teams/{team_name}/worklogs

Get team worklogs.

**Auth:** Bearer token

**Query Params:**
- `start_date`, `end_date`, `instance`

**Response:**
```json
{
  "team_name": "Engineering",
  "total_hours": 567.5,
  "worklog_count": 1234,
  "worklogs": [
    {
      "id": "worklog-id",
      "author_email": "user@company.com",
      "author_display_name": "John Doe",
      "issue_key": "PROJ-123",
      "issue_summary": "Fix login bug",
      "epic_key": "PROJ-100",
      "epic_name": "Authentication",
      "time_spent_seconds": 3600,
      "started": "2024-02-11T09:00:00Z",
      "comment": "Implemented OAuth flow"
    }
  ]
}
```

---

### GET /api/teams/{team_name}/statistics

Team statistics.

**Auth:** Bearer token

**Query Params:**
- `start_date`, `end_date`, `instance`

**Response:**
```json
{
  "team_name": "Engineering",
  "member_count": 12,
  "total_hours": 567.5,
  "avg_hours_per_member": 47.3,
  "top_epic": {
    "epic_key": "PROJ-123",
    "epic_name": "Big Feature",
    "hours": 123.5
  },
  "daily_hours": [
    {"date": "2024-02-01", "hours": 48.0},
    {"date": "2024-02-02", "hours": 52.5}
  ]
}
```

---

### GET /api/teams/{team_name}/members

Get team members only.

**Auth:** Bearer token

**Response:**
```json
[
  {
    "id": 42,
    "email": "user@company.com",
    "first_name": "John",
    "last_name": "Doe",
    "display_name": "John Doe",
    "is_active": true
  }
]
```

---

## 4. Users (9 endpoints)

### GET /api/users

List all users.

**Auth:** Bearer token

**Response:**
```json
[
  {
    "id": 42,
    "company_id": 1,
    "email": "user@company.com",
    "display_name": "John Doe",
    "team_id": 1,
    "team_name": "Engineering",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

---

### POST /api/users

Create a new user.

**Auth:** Bearer token (ADMIN only)

**Request:**
```json
{
  "email": "newuser@company.com",
  "first_name": "Jane",
  "last_name": "Smith",
  "team_id": 1,
  "is_active": true
}
```

**Response:**
```json
{
  "id": 43,
  "company_id": 1,
  "email": "newuser@company.com",
  "display_name": "Jane Smith",
  "team_id": 1,
  "created_at": "2024-02-11T13:00:00Z"
}
```

---

### GET /api/users/{email}

Get user details.

**Auth:** Bearer token

**Response:**
```json
{
  "id": 42,
  "company_id": 1,
  "email": "user@company.com",
  "first_name": "John",
  "last_name": "Doe",
  "display_name": "John Doe",
  "team_id": 1,
  "team_name": "Engineering",
  "is_active": true,
  "jira_accounts": [
    {
      "jira_instance": "Company Main",
      "account_id": "5f1234567890abcdef123456"
    }
  ],
  "created_at": "2024-01-01T00:00:00Z"
}
```

---

### PUT /api/users/{email}

Update user details.

**Auth:** Bearer token (ADMIN or MANAGER)

**Request:**
```json
{
  "team_id": 2,
  "is_active": true
}
```

**Response:**
```json
{
  "id": 42,
  "email": "user@company.com",
  "team_id": 2,
  "team_name": "Design",
  "updated_at": "2024-02-11T13:30:00Z"
}
```

---

### DELETE /api/users/{email}

Delete a user.

**Auth:** Bearer token (ADMIN only)

**Response:**
```json
{
  "message": "User deleted successfully"
}
```

**Note:** Soft delete (sets `is_active=false`). Worklogs are preserved.

---

### GET /api/users/{email}/worklogs

Get user worklogs.

**Auth:** Bearer token (USER can only see own worklogs)

**Query Params:**
- `start_date`, `end_date`, `instance`

**Response:**
```json
{
  "user_email": "user@company.com",
  "total_hours": 120.5,
  "worklog_count": 234,
  "worklogs": [
    {
      "id": "worklog-id",
      "issue_key": "PROJ-123",
      "issue_summary": "Fix login bug",
      "epic_key": "PROJ-100",
      "epic_name": "Authentication",
      "time_spent_seconds": 3600,
      "started": "2024-02-11T09:00:00Z",
      "jira_instance": "Company Main"
    }
  ]
}
```

---

### GET /api/users/{email}/statistics

User statistics.

**Auth:** Bearer token (USER can only see own stats)

**Query Params:**
- `start_date`, `end_date`, `instance`

**Response:**
```json
{
  "user_email": "user@company.com",
  "team": "Engineering",
  "total_hours": 120.5,
  "avg_daily_hours": 6.5,
  "worklog_count": 234,
  "top_epic": {
    "epic_key": "PROJ-123",
    "epic_name": "Big Feature",
    "hours": 45.5
  },
  "daily_hours": [
    {"date": "2024-02-01", "hours": 8.0},
    {"date": "2024-02-02", "hours": 7.5}
  ]
}
```

---

### GET /api/users/{email}/calendar

Calendar view of user worklogs.

**Auth:** Bearer token (USER can only see own calendar)

**Query Params:**
- `month` (required) - YYYY-MM format

**Response:**
```json
{
  "month": "2024-02",
  "days": [
    {
      "date": "2024-02-01",
      "total_hours": 8.0,
      "worklog_count": 12,
      "worklogs": [
        {
          "issue_key": "PROJ-123",
          "time_spent_seconds": 3600,
          "started": "2024-02-01T09:00:00Z"
        }
      ]
    }
  ]
}
```

---

### GET /api/users/{email}/jira-accounts

Get user's JIRA account mappings.

**Auth:** Bearer token

**Response:**
```json
[
  {
    "jira_instance": "Company Main",
    "account_id": "5f1234567890abcdef123456",
    "email": "user@company.atlassian.net",
    "display_name": "John Doe"
  }
]
```

---

## 5. Epics (7 endpoints)

### GET /api/epics

List all epics.

**Auth:** Bearer token

**Query Params:**
- `instance` (optional) - Filter by JIRA instance

**Response:**
```json
[
  {
    "epic_key": "PROJ-100",
    "epic_name": "Authentication System",
    "jira_instance": "Company Main",
    "status": "In Progress",
    "worklog_count": 234,
    "created_at": "2024-01-15T00:00:00Z"
  }
]
```

---

### GET /api/epics/{epic_key}

Get epic details.

**Auth:** Bearer token

**Response:**
```json
{
  "epic_key": "PROJ-100",
  "epic_name": "Authentication System",
  "summary": "Implement OAuth and JWT authentication",
  "jira_instance": "Company Main",
  "status": "In Progress",
  "created": "2024-01-15T00:00:00Z",
  "updated": "2024-02-11T10:00:00Z"
}
```

---

### GET /api/epics/{epic_key}/worklogs

Get epic worklogs.

**Auth:** Bearer token

**Query Params:**
- `start_date`, `end_date`

**Response:**
```json
{
  "epic_key": "PROJ-100",
  "epic_name": "Authentication System",
  "total_hours": 234.5,
  "worklog_count": 456,
  "contributor_count": 8,
  "worklogs": [
    {
      "id": "worklog-id",
      "author_email": "user@company.com",
      "author_display_name": "John Doe",
      "issue_key": "PROJ-123",
      "issue_summary": "Implement OAuth",
      "time_spent_seconds": 3600,
      "started": "2024-02-11T09:00:00Z"
    }
  ]
}
```

---

### GET /api/epics/{epic_key}/statistics

Epic statistics.

**Auth:** Bearer token

**Query Params:**
- `start_date`, `end_date`

**Response:**
```json
{
  "epic_key": "PROJ-100",
  "epic_name": "Authentication System",
  "total_hours": 234.5,
  "worklog_count": 456,
  "contributor_count": 8,
  "top_contributor": {
    "email": "user@company.com",
    "hours": 45.5
  },
  "daily_hours": [
    {"date": "2024-02-01", "hours": 12.5}
  ],
  "by_issue": [
    {
      "issue_key": "PROJ-123",
      "issue_summary": "Implement OAuth",
      "hours": 45.5
    }
  ]
}
```

---

### GET /api/epics/{epic_key}/contributors

Epic contributors.

**Auth:** Bearer token

**Query Params:**
- `start_date`, `end_date`

**Response:**
```json
[
  {
    "email": "user@company.com",
    "display_name": "John Doe",
    "team": "Engineering",
    "hours": 45.5,
    "worklog_count": 89,
    "percentage": 19.4
  }
]
```

---

### GET /api/epics/{epic_key}/issues

Epic issues.

**Auth:** Bearer token

**Response:**
```json
[
  {
    "issue_key": "PROJ-123",
    "summary": "Implement OAuth",
    "issue_type": "Story",
    "status": "Done",
    "worklog_count": 23,
    "total_hours": 45.5
  }
]
```

---

### POST /api/epics/refresh

Refresh epic metadata from JIRA.

**Auth:** Bearer token (ADMIN or MANAGER)

**Request:**
```json
{
  "instance": "Company Main",
  "epic_keys": ["PROJ-100", "PROJ-101"]
}
```

**Response:**
```json
{
  "synced_count": 2,
  "updated": ["PROJ-100", "PROJ-101"]
}
```

---

## 6. Issues (5 endpoints)

### GET /api/issues/{issue_key}

Get issue details.

**Auth:** Bearer token

**Response:**
```json
{
  "issue_key": "PROJ-123",
  "summary": "Implement OAuth login",
  "description": "Add Google OAuth...",
  "issue_type": "Story",
  "status": "Done",
  "epic_key": "PROJ-100",
  "epic_name": "Authentication System",
  "jira_instance": "Company Main",
  "created": "2024-02-01T00:00:00Z",
  "updated": "2024-02-11T10:00:00Z"
}
```

---

### GET /api/issues/{issue_key}/worklogs

Get issue worklogs.

**Auth:** Bearer token

**Response:**
```json
{
  "issue_key": "PROJ-123",
  "total_hours": 45.5,
  "worklog_count": 89,
  "worklogs": [
    {
      "id": "worklog-id",
      "author_email": "user@company.com",
      "author_display_name": "John Doe",
      "time_spent_seconds": 3600,
      "started": "2024-02-11T09:00:00Z",
      "comment": "Implemented OAuth flow"
    }
  ]
}
```

---

### POST /api/issues/search

Search issues.

**Auth:** Bearer token

**Request:**
```json
{
  "query": "summary ~ 'OAuth'",
  "instance": "Company Main",
  "max_results": 50
}
```

**Response:**
```json
[
  {
    "issue_key": "PROJ-123",
    "summary": "Implement OAuth login",
    "issue_type": "Story",
    "status": "Done",
    "epic_key": "PROJ-100"
  }
]
```

---

### POST /api/issues/refresh

Refresh issue metadata from JIRA.

**Auth:** Bearer token (ADMIN or MANAGER)

**Request:**
```json
{
  "instance": "Company Main",
  "issue_keys": ["PROJ-123", "PROJ-124"]
}
```

**Response:**
```json
{
  "synced_count": 2,
  "updated": ["PROJ-123", "PROJ-124"]
}
```

---

### GET /api/issues/{issue_key}/linked

Get linked issues (cross-instance).

**Auth:** Bearer token

**Response:**
```json
[
  {
    "link_type": "relates_to",
    "target_instance": "Test Instance",
    "target_issue_key": "TEST-456",
    "target_summary": "QA Testing for OAuth"
  }
]
```

---

## 7. Sync (5 endpoints)

### POST /api/sync/worklogs

Sync worklogs from JIRA/Tempo.

**Auth:** Bearer token (ADMIN or MANAGER)

**Request:**
```json
{
  "start_date": "2024-02-01",
  "end_date": "2024-02-11",
  "instance": "Company Main",
  "force": false
}
```

**Response:**
```json
{
  "synced_count": 1234,
  "instance": "Company Main",
  "start_date": "2024-02-01",
  "end_date": "2024-02-11",
  "duration_seconds": 12.5,
  "errors": []
}
```

**Note:** Long-running operation. Consider Server-Sent Events for progress updates.

---

### POST /api/sync/epics

Sync epic metadata.

**Auth:** Bearer token (ADMIN or MANAGER)

**Request:**
```json
{
  "instance": "Company Main",
  "epic_keys": ["PROJ-100", "PROJ-101"]
}
```

**Response:**
```json
{
  "synced_count": 2,
  "instance": "Company Main",
  "duration_seconds": 2.3
}
```

---

### POST /api/sync/all

Full sync (worklogs + epics + issues).

**Auth:** Bearer token (ADMIN or MANAGER)

**Request:**
```json
{
  "start_date": "2024-02-01",
  "end_date": "2024-02-11",
  "instance": "Company Main"
}
```

**Response:**
```json
{
  "worklogs_synced": 1234,
  "epics_synced": 45,
  "issues_synced": 567,
  "duration_seconds": 45.6
}
```

---

### GET /api/sync/history

Get sync history.

**Auth:** Bearer token

**Query Params:**
- `limit` (optional, default: 50)
- `offset` (optional, default: 0)

**Response:**
```json
[
  {
    "id": 123,
    "sync_type": "worklogs",
    "instance": "Company Main",
    "start_date": "2024-02-01",
    "end_date": "2024-02-11",
    "status": "completed",
    "worklogs_synced": 1234,
    "started_at": "2024-02-11T10:00:00Z",
    "completed_at": "2024-02-11T10:00:45Z",
    "duration_seconds": 45.6
  }
]
```

---

### GET /api/sync/progress/{sync_id}

Get sync progress (Server-Sent Events).

**Auth:** Bearer token

**Response:** (text/event-stream)
```
data: {"status": "in_progress", "worklogs_synced": 500, "total_estimated": 1234}

data: {"status": "in_progress", "worklogs_synced": 1000, "total_estimated": 1234}

data: {"status": "completed", "worklogs_synced": 1234}
```

---

## 8. Settings (18 endpoints)

### GET /api/settings/company

Get company settings.

**Auth:** Bearer token

**Response:**
```json
{
  "id": 1,
  "name": "ACME Corp",
  "domain": "acme.com",
  "settings": {
    "daily_working_hours": 8,
    "timezone": "Europe/Rome",
    "currency": "EUR"
  },
  "is_active": true
}
```

---

### PUT /api/settings/company

Update company settings.

**Auth:** Bearer token (ADMIN only)

**Request:**
```json
{
  "name": "ACME Corporation",
  "settings": {
    "daily_working_hours": 7.5,
    "timezone": "America/New_York"
  }
}
```

**Response:**
```json
{
  "id": 1,
  "name": "ACME Corporation",
  "settings": {
    "daily_working_hours": 7.5,
    "timezone": "America/New_York",
    "currency": "EUR"
  },
  "updated_at": "2024-02-11T14:00:00Z"
}
```

---

### GET /api/settings/jira-instances

List JIRA instances.

**Auth:** Bearer token

**Response:**
```json
[
  {
    "id": 1,
    "company_id": 1,
    "name": "Company Main",
    "url": "https://company.atlassian.net",
    "email": "bot@company.com",
    "has_tempo": true,
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

**Note:** API tokens not returned for security.

---

### POST /api/settings/jira-instances

Add JIRA instance.

**Auth:** Bearer token (ADMIN only)

**Request:**
```json
{
  "name": "Company Main",
  "url": "https://company.atlassian.net",
  "email": "bot@company.com",
  "api_token": "ATATT3xFfGF0...",
  "tempo_api_token": "tempo-token"
}
```

**Response:**
```json
{
  "id": 1,
  "name": "Company Main",
  "url": "https://company.atlassian.net",
  "has_tempo": true,
  "created_at": "2024-02-11T14:30:00Z"
}
```

---

### PUT /api/settings/jira-instances/{instance_id}

Update JIRA instance.

**Auth:** Bearer token (ADMIN only)

**Request:**
```json
{
  "name": "Company Main (Updated)",
  "is_active": true
}
```

**Response:**
```json
{
  "id": 1,
  "name": "Company Main (Updated)",
  "updated_at": "2024-02-11T15:00:00Z"
}
```

---

### DELETE /api/settings/jira-instances/{instance_id}

Delete JIRA instance.

**Auth:** Bearer token (ADMIN only)

**Response:**
```json
{
  "message": "JIRA instance deleted"
}
```

**Note:** Cascades to worklogs and other related data.

---

### GET /api/settings/holidays

List holidays.

**Auth:** Bearer token

**Query Params:**
- `year` (optional) - Filter by year

**Response:**
```json
[
  {
    "id": 1,
    "date": "2024-12-25",
    "name": "Christmas Day",
    "country": "US",
    "is_working_day": false
  }
]
```

---

### POST /api/settings/holidays

Add holiday.

**Auth:** Bearer token (ADMIN or MANAGER)

**Request:**
```json
{
  "date": "2024-12-25",
  "name": "Christmas Day",
  "country": "US",
  "is_working_day": false
}
```

**Response:**
```json
{
  "id": 1,
  "date": "2024-12-25",
  "name": "Christmas Day",
  "created_at": "2024-02-11T15:30:00Z"
}
```

---

### DELETE /api/settings/holidays/{holiday_id}

Delete holiday.

**Auth:** Bearer token (ADMIN or MANAGER)

**Response:**
```json
{
  "message": "Holiday deleted"
}
```

---

### POST /api/settings/holidays/import

Bulk import holidays.

**Auth:** Bearer token (ADMIN or MANAGER)

**Request:**
```json
{
  "country": "US",
  "year": 2024,
  "holidays": [
    {"date": "2024-01-01", "name": "New Year's Day"},
    {"date": "2024-07-04", "name": "Independence Day"}
  ]
}
```

**Response:**
```json
{
  "imported_count": 2,
  "skipped_count": 0
}
```

---

### GET /api/settings/complementary-groups

List complementary instance groups.

**Auth:** Bearer token

**Response:**
```json
[
  {
    "id": 1,
    "name": "Main + Time Tracker",
    "primary_instance": "Company Main",
    "secondary_instances": ["Time Tracker"],
    "created_at": "2024-01-15T00:00:00Z"
  }
]
```

---

### POST /api/settings/complementary-groups

Create complementary group.

**Auth:** Bearer token (ADMIN only)

**Request:**
```json
{
  "name": "Main + Time Tracker",
  "primary_instance_id": 1,
  "secondary_instance_ids": [2]
}
```

**Response:**
```json
{
  "id": 1,
  "name": "Main + Time Tracker",
  "created_at": "2024-02-11T16:00:00Z"
}
```

---

### DELETE /api/settings/complementary-groups/{group_id}

Delete complementary group.

**Auth:** Bearer token (ADMIN only)

**Response:**
```json
{
  "message": "Complementary group deleted"
}
```

---

### GET /api/settings/factorial

Get Factorial HR configuration.

**Auth:** Bearer token (ADMIN only)

**Response:**
```json
{
  "id": 1,
  "company_id": 1,
  "company_identifier": "acme-corp",
  "is_active": true,
  "created_at": "2024-01-01T00:00:00Z"
}
```

**Note:** API key not returned for security.

---

### POST /api/settings/factorial

Configure Factorial HR.

**Auth:** Bearer token (ADMIN only)

**Request:**
```json
{
  "api_key": "factorial-api-key",
  "company_identifier": "acme-corp",
  "is_active": true
}
```

**Response:**
```json
{
  "id": 1,
  "company_identifier": "acme-corp",
  "is_active": true,
  "created_at": "2024-02-11T16:30:00Z"
}
```

---

### GET /api/settings/migration/check

Check multi-tenant migration status.

**Auth:** Bearer token (ADMIN only)

**Response:**
```json
{
  "needs_migration": false,
  "tables_checked": 13,
  "null_company_id_count": 0,
  "migration_applied_at": "2024-02-01T00:00:00Z"
}
```

---

### POST /api/settings/migration/execute

Execute multi-tenant migration.

**Auth:** Bearer token (ADMIN only)

**Request:**
```json
{
  "target_company_id": 1
}
```

**Response:**
```json
{
  "migrated_count": 1234,
  "tables_migrated": [
    {"table": "teams", "rows_updated": 5},
    {"table": "users", "rows_updated": 42},
    {"table": "worklogs", "rows_updated": 1187}
  ]
}
```

---

### GET /api/settings/database/stats

Get database statistics.

**Auth:** Bearer token (ADMIN only)

**Response:**
```json
{
  "database_size_mb": 45.3,
  "table_counts": {
    "worklogs": 12345,
    "epics": 234,
    "teams": 5,
    "users": 42,
    "logs": 56789
  },
  "oldest_worklog": "2023-01-01T00:00:00Z",
  "newest_worklog": "2024-02-11T16:00:00Z"
}
```

---

## 9. Billing (23 endpoints)

*(Due to length, showing key endpoints. Full list available in codebase)*

### GET /api/billing/clients

List billing clients.

**Auth:** Bearer token (MANAGER or ADMIN)

**Response:**
```json
[
  {
    "id": 1,
    "company_id": 1,
    "name": "Client Corp",
    "code": "CLTC",
    "default_rate": 80.0,
    "currency": "EUR",
    "is_active": true
  }
]
```

---

### POST /api/billing/clients

Create billing client.

**Auth:** Bearer token (MANAGER or ADMIN)

---

### GET /api/billing/projects

List billing projects.

---

### POST /api/billing/projects

Create billing project.

---

### GET /api/billing/preview

Generate billing preview for period.

**Auth:** Bearer token (MANAGER or ADMIN)

**Query Params:**
- `client_id`, `start_date`, `end_date`, `instance`

**Response:**
```json
{
  "client_name": "Client Corp",
  "period_start": "2024-02-01",
  "period_end": "2024-02-11",
  "total_hours": 234.5,
  "billable_hours": 210.3,
  "non_billable_hours": 24.2,
  "total_amount": 16824.0,
  "currency": "EUR",
  "projects": [
    {
      "project_name": "Product Development",
      "hours": 180.5,
      "rate": 80.0,
      "amount": 14440.0
    }
  ]
}
```

---

### POST /api/billing/invoices

Create invoice from billing preview.

**Auth:** Bearer token (MANAGER or ADMIN)

---

### GET /api/billing/invoices

List invoices.

---

### GET /api/billing/invoices/{invoice_id}

Get invoice details.

---

### PUT /api/billing/invoices/{invoice_id}

Update invoice (DRAFT only).

---

### POST /api/billing/invoices/{invoice_id}/issue

Issue invoice (DRAFT → ISSUED).

---

### POST /api/billing/invoices/{invoice_id}/mark-paid

Mark invoice as paid (ISSUED → PAID).

---

### GET /api/billing/invoices/{invoice_id}/export

Export invoice as Excel.

**Auth:** Bearer token (MANAGER or ADMIN)

**Response:** Excel file download

---

*(See billing.py for remaining 12 endpoints: rates, classifications, mappings, etc.)*

---

## 10. Packages (9 endpoints)

*(Package templates for cross-instance issue creation)*

### GET /api/packages/templates

List package templates.

---

### POST /api/packages/templates

Create package template.

---

### POST /api/packages/templates/{template_id}/create-issues

Create issues from template.

**Auth:** Bearer token (ADMIN or MANAGER)

**Request:**
```json
{
  "epic_name": "New Feature",
  "epic_project_key": "ENG",
  "epic_summary": "Implement new feature X"
}
```

**Response:**
```json
{
  "created_issues": [
    {
      "instance": "Company Main",
      "issue_key": "ENG-234",
      "issue_type": "Epic"
    },
    {
      "instance": "Company Main",
      "issue_key": "ENG-235",
      "issue_type": "Story",
      "parent": "ENG-234"
    }
  ],
  "linked_count": 2
}
```

---

*(See packages.py for remaining 6 endpoints)*

---

## 11. Factorial (7 endpoints)

*(Factorial HR integration)*

### GET /api/factorial/employees

List employees.

---

### GET /api/factorial/leaves

List employee absences.

**Query Params:**
- `start_date`, `end_date`, `employee_id`

---

### POST /api/factorial/sync

Sync absences from Factorial.

---

*(See factorial.py for remaining 4 endpoints)*

---

## 12. Logs (12 endpoints)

### GET /api/logs

Query application logs.

**Auth:** Bearer token (ADMIN only)

**Query Params:**
- `level` (optional) - DEBUG, INFO, WARNING, ERROR
- `start_date`, `end_date` (optional)
- `request_id` (optional)
- `endpoint` (optional)
- `limit` (default: 100), `offset` (default: 0)

**Response:**
```json
[
  {
    "id": 12345,
    "timestamp": "2024-02-11T10:30:45Z",
    "level": "INFO",
    "logger_name": "app.routers.teams",
    "message": "Team created: Engineering",
    "request_id": "req-uuid",
    "endpoint": "/api/teams",
    "method": "POST",
    "status_code": 201,
    "duration_ms": 45.6
  }
]
```

---

### DELETE /api/logs

Delete old logs.

**Auth:** Bearer token (ADMIN only)

**Query Params:**
- `before_date` (required) - Delete logs before this date

**Response:**
```json
{
  "deleted_count": 12345
}
```

---

*(See logs.py for remaining 10 endpoints)*

---

## 13. Invitations (5 endpoints)

### POST /api/invitations

Send user invitation.

**Auth:** Bearer token (ADMIN only)

**Request:**
```json
{
  "email": "newuser@company.com",
  "role": "USER"
}
```

**Response:**
```json
{
  "id": 1,
  "email": "newuser@company.com",
  "token": "invitation-uuid",
  "expires_at": "2024-02-14T17:00:00Z",
  "created_at": "2024-02-11T17:00:00Z"
}
```

---

### GET /api/invitations

List pending invitations.

**Auth:** Bearer token (ADMIN only)

---

### POST /api/invitations/{token}/accept

Accept invitation.

**Auth:** Public (requires Google OAuth first)

---

### DELETE /api/invitations/{invitation_id}

Revoke invitation.

**Auth:** Bearer token (ADMIN only)

---

### POST /api/invitations/{invitation_id}/resend

Resend invitation email.

**Auth:** Bearer token (ADMIN only)

---

## 14. Health (1 endpoint)

### GET /health

Health check endpoint.

**Auth:** Public

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-02-11T17:30:00Z",
  "database": "connected",
  "version": "1.0.0"
}
```

---

## Error Responses

All endpoints may return these error formats:

### 400 Bad Request

```json
{
  "detail": "Invalid date format. Expected YYYY-MM-DD"
}
```

### 401 Unauthorized

```json
{
  "detail": "Authentication required"
}
```

### 403 Forbidden

```json
{
  "detail": "Admin role required"
}
```

### 404 Not Found

```json
{
  "detail": "Team not found"
}
```

### 422 Unprocessable Entity

```json
{
  "detail": [
    {
      "loc": ["body", "name"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

### 500 Internal Server Error

```json
{
  "detail": "Internal server error"
}
```

---

## Rate Limiting

**Not currently implemented** - planned for Phase 2.

Recommended limits:
- 300 requests/minute per user
- 1000 requests/minute per company
- 100 requests/minute for sync operations

---

## Pagination

Endpoints returning lists support pagination via:

**Query Params:**
- `limit` (default: 100, max: 1000)
- `offset` (default: 0)

**Response Headers:**
```
X-Total-Count: 1234
X-Page-Limit: 100
X-Page-Offset: 0
```

---

## OpenAPI Documentation

Interactive API docs available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

---

## Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OAuth 2.0 Specification](https://oauth.net/2/)
- [JIRA REST API v3](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
- [Tempo API v4](https://tempo-io.github.io/tempo-api-docs/)
