# API Quick Reference

## Base URL
- **Development:** `http://localhost:8000`
- **Production:** `https://your-domain.com`

## Authentication
All endpoints (except OAuth callbacks) require JWT token in Authorization header:
```
Authorization: Bearer <jwt_token>
```

---

## Quick Index

- [Authentication](#authentication-endpoints)
- [Worklogs](#worklogs-endpoints)
- [Teams](#teams-endpoints)
- [Users](#users-endpoints)
- [Billing](#billing-endpoints)
- [JIRA Instances](#jira-instances-endpoints)
- [Settings](#settings-endpoints)
- [Sync](#sync-endpoints)

---

## Authentication Endpoints

### Login with Google OAuth
```http
GET /api/auth/google/login
```
Redirects to Google OAuth consent screen.

**Response:** Redirect to Google

---

### OAuth Callback
```http
GET /api/auth/google/callback?code={auth_code}
```
Exchanges Google auth code for JWT token.

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "ADMIN",
    "company_id": 1
  }
}
```

---

### Get Current User
```http
GET /api/auth/me
```

**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "role": "ADMIN",
  "company_id": 1,
  "created_at": "2026-01-15T10:30:00"
}
```

---

## Worklogs Endpoints

### List Worklogs
```http
GET /api/worklogs?start_date=2026-01-01&end_date=2026-01-31&limit=100&offset=0
```

**Query Parameters:**
- `start_date` (optional) - Filter by start date (YYYY-MM-DD)
- `end_date` (optional) - Filter by end date (YYYY-MM-DD)
- `author_email` (optional) - Filter by author email
- `jira_instance` (optional) - Filter by JIRA instance name
- `issue_key` (optional) - Filter by issue key (e.g., "PROJ-123")
- `limit` (optional, default: 100) - Max results
- `offset` (optional, default: 0) - Pagination offset

**Response:**
```json
{
  "worklogs": [
    {
      "id": 1,
      "worklog_id": "12345",
      "issue_key": "PROJ-123",
      "issue_summary": "Implement login feature",
      "author_email": "dev@example.com",
      "author_name": "John Doe",
      "started": "2026-01-15T09:00:00",
      "time_spent_seconds": 7200,
      "time_spent_display": "2h",
      "comment": "Implemented OAuth flow",
      "jira_instance": "main-jira",
      "epic_key": "PROJ-100",
      "epic_name": "Authentication Epic",
      "project_key": "PROJ",
      "project_name": "Main Project",
      "billing_client_id": 1,
      "billing_project_id": 1,
      "rate": 150.0
    }
  ],
  "total": 250,
  "limit": 100,
  "offset": 0
}
```

---

### Get Worklog by ID
```http
GET /api/worklogs/{worklog_id}
```

**Response:** Single worklog object (same structure as list)

---

### Get Worklog Summary
```http
GET /api/worklogs/summary?start_date=2026-01-01&end_date=2026-01-31
```

**Response:**
```json
{
  "total_worklogs": 1250,
  "total_seconds": 450000,
  "total_hours": 125.0,
  "unique_authors": 15,
  "unique_issues": 85,
  "by_author": [
    {
      "author_email": "dev1@example.com",
      "author_name": "John Doe",
      "total_seconds": 28800,
      "worklog_count": 12
    }
  ],
  "by_project": [
    {
      "project_key": "PROJ",
      "project_name": "Main Project",
      "total_seconds": 180000,
      "worklog_count": 500
    }
  ]
}
```

---

## Teams Endpoints

### List Teams
```http
GET /api/teams
```

**Response:**
```json
{
  "teams": [
    {
      "id": 1,
      "name": "Engineering",
      "description": "Engineering team",
      "created_at": "2026-01-01T00:00:00",
      "member_count": 12
    }
  ]
}
```

---

### Get Team by ID
```http
GET /api/teams/{team_id}
```

**Response:**
```json
{
  "id": 1,
  "name": "Engineering",
  "description": "Engineering team",
  "created_at": "2026-01-01T00:00:00",
  "members": [
    {
      "user_id": 1,
      "email": "dev1@example.com",
      "name": "John Doe",
      "role": "MEMBER"
    }
  ]
}
```

---

### Create Team
```http
POST /api/teams
```

**Request Body:**
```json
{
  "name": "Product Team",
  "description": "Product management team"
}
```

**Response:** Created team object (201 status)

---

### Update Team
```http
PUT /api/teams/{team_id}
```

**Request Body:**
```json
{
  "name": "Updated Team Name",
  "description": "Updated description"
}
```

**Response:** Updated team object

---

### Delete Team
```http
DELETE /api/teams/{team_id}
```

**Response:** 204 No Content

---

### Add Team Member
```http
POST /api/teams/{team_id}/members
```

**Request Body:**
```json
{
  "user_email": "newmember@example.com",
  "role": "MEMBER"
}
```

**Response:** 201 Created

---

### Remove Team Member
```http
DELETE /api/teams/{team_id}/members/{user_id}
```

**Response:** 204 No Content

---

## Users Endpoints

### List Users
```http
GET /api/users
```

**Response:**
```json
{
  "users": [
    {
      "id": 1,
      "email": "user@example.com",
      "name": "John Doe",
      "role": "ADMIN",
      "is_active": true,
      "created_at": "2026-01-01T00:00:00"
    }
  ]
}
```

---

### Get User by ID
```http
GET /api/users/{user_id}
```

**Response:** Single user object

---

### Update User Role (Admin Only)
```http
PUT /api/users/{user_id}/role
```

**Request Body:**
```json
{
  "role": "MANAGER"
}
```

**Response:** Updated user object

---

## Billing Endpoints

### List Clients
```http
GET /api/billing/clients
```

**Response:**
```json
{
  "clients": [
    {
      "id": 1,
      "name": "Acme Corp",
      "code": "ACME",
      "default_rate": 150.0,
      "created_at": "2026-01-01T00:00:00"
    }
  ]
}
```

---

### Create Client
```http
POST /api/billing/clients
```

**Request Body:**
```json
{
  "name": "New Client Inc",
  "code": "NEWCL",
  "default_rate": 120.0
}
```

**Response:** Created client (201)

---

### List Projects
```http
GET /api/billing/projects?client_id=1
```

**Response:**
```json
{
  "projects": [
    {
      "id": 1,
      "name": "Website Redesign",
      "code": "WEB",
      "client_id": 1,
      "client_name": "Acme Corp",
      "rate": 175.0,
      "created_at": "2026-01-01T00:00:00"
    }
  ]
}
```

---

### Create Project
```http
POST /api/billing/projects
```

**Request Body:**
```json
{
  "name": "Mobile App",
  "code": "MOBILE",
  "client_id": 1,
  "rate": 200.0
}
```

**Response:** Created project (201)

---

### List Invoices
```http
GET /api/billing/invoices?status=draft&start_date=2026-01-01
```

**Query Parameters:**
- `status` - Filter by status (draft, sent, paid)
- `client_id` - Filter by client
- `start_date` - Filter by invoice date

**Response:**
```json
{
  "invoices": [
    {
      "id": 1,
      "invoice_number": "INV-2026-001",
      "client_id": 1,
      "client_name": "Acme Corp",
      "invoice_date": "2026-01-31",
      "period_start": "2026-01-01",
      "period_end": "2026-01-31",
      "subtotal": 15000.0,
      "tax_rate": 0.0,
      "total": 15000.0,
      "status": "draft",
      "created_at": "2026-01-31T10:00:00"
    }
  ]
}
```

---

### Create Invoice
```http
POST /api/billing/invoices
```

**Request Body:**
```json
{
  "client_id": 1,
  "period_start": "2026-01-01",
  "period_end": "2026-01-31",
  "filters": {
    "billing_project_id": 1,
    "include_non_billable": false
  },
  "notes": "Monthly invoice for January"
}
```

**Response:** Created invoice with line items (201)

---

### Generate Invoice PDF
```http
GET /api/billing/invoices/{invoice_id}/pdf
```

**Response:** PDF file (application/pdf)

---

### Update Invoice Status
```http
PUT /api/billing/invoices/{invoice_id}/status
```

**Request Body:**
```json
{
  "status": "sent"
}
```

**Response:** Updated invoice

---

## JIRA Instances Endpoints

### List JIRA Instances (Admin Only)
```http
GET /api/settings/jira-instances
```

**Response:**
```json
{
  "instances": [
    {
      "id": 1,
      "name": "main-jira",
      "url": "https://company.atlassian.net",
      "jira_email": "bot@example.com",
      "has_jira_token": true,
      "has_tempo_token": true,
      "created_at": "2026-01-01T00:00:00"
    }
  ]
}
```

---

### Create JIRA Instance (Admin Only)
```http
POST /api/settings/jira-instances
```

**Request Body:**
```json
{
  "name": "client-jira",
  "url": "https://client.atlassian.net",
  "jira_email": "bot@example.com",
  "jira_token": "ATATT3xFf...",
  "tempo_token": "Bearer ..."
}
```

**Response:** Created instance (201)

---

### Update JIRA Instance (Admin Only)
```http
PUT /api/settings/jira-instances/{instance_id}
```

**Request Body:** Same as create (all fields optional)

**Response:** Updated instance

---

### Delete JIRA Instance (Admin Only)
```http
DELETE /api/settings/jira-instances/{instance_id}
```

**Response:** 204 No Content

---

### Test JIRA Connection (Admin Only)
```http
POST /api/settings/jira-instances/{instance_id}/test
```

**Response:**
```json
{
  "jira_connection": "success",
  "tempo_connection": "success",
  "jira_user": "bot@example.com",
  "message": "All connections successful"
}
```

---

## Sync Endpoints

### Sync All Instances
```http
POST /api/sync/all
```

Triggers background sync for all JIRA instances.

**Response:**
```json
{
  "status": "started",
  "instances": 3,
  "message": "Sync started in background"
}
```

---

### Sync Single Instance
```http
POST /api/sync/instance/{instance_id}
```

**Request Body:**
```json
{
  "start_date": "2026-01-01",
  "end_date": "2026-01-31"
}
```

**Response:**
```json
{
  "status": "started",
  "instance": "main-jira",
  "period": "2026-01-01 to 2026-01-31"
}
```

---

### Get Sync Status
```http
GET /api/sync/status
```

**Response:**
```json
{
  "syncs": [
    {
      "instance": "main-jira",
      "status": "running",
      "started_at": "2026-02-11T10:00:00",
      "progress": "65%",
      "worklogs_synced": 1250
    }
  ]
}
```

---

## Settings Endpoints

### Get Company Settings (Admin Only)
```http
GET /api/settings/company
```

**Response:**
```json
{
  "id": 1,
  "name": "My Company",
  "logo_url": "https://...",
  "default_rate": 100.0,
  "currency": "USD",
  "tax_rate": 0.0,
  "invoice_prefix": "INV",
  "created_at": "2026-01-01T00:00:00"
}
```

---

### Update Company Settings (Admin Only)
```http
PUT /api/settings/company
```

**Request Body:**
```json
{
  "name": "Updated Company Name",
  "default_rate": 120.0,
  "currency": "EUR",
  "tax_rate": 0.21
}
```

**Response:** Updated settings

---

### Check Migration Status (Admin Only)
```http
GET /api/settings/migration/check
```

**Response:**
```json
{
  "migration_needed": false,
  "tables_checked": 13,
  "tables_missing_company_id": []
}
```

---

### Execute Migration (Admin Only)
```http
POST /api/settings/migration/execute
```

Adds `company_id` to all tables, migrates data, creates indexes.

**Response:**
```json
{
  "status": "completed",
  "tables_migrated": 13,
  "rows_migrated": 125000,
  "duration_seconds": 45.2
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "detail": "Validation error: start_date is required"
}
```

### 401 Unauthorized
```json
{
  "detail": "Invalid token"
}
```

### 403 Forbidden
```json
{
  "detail": "Admin access required"
}
```

### 404 Not Found
```json
{
  "detail": "Team not found"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error",
  "trace_id": "abc-123-def"
}
```

---

## Rate Limiting

**Not currently implemented** - Future consideration for production.

Recommended limits:
- Auth endpoints: 10 req/min per IP
- Sync endpoints: 5 req/min per user
- Read endpoints: 100 req/min per user
- Write endpoints: 30 req/min per user

---

## Pagination Pattern

For endpoints returning lists:

**Request:**
```http
GET /api/worklogs?limit=50&offset=100
```

**Response:**
```json
{
  "worklogs": [...],
  "total": 1250,
  "limit": 50,
  "offset": 100,
  "has_more": true
}
```

Calculate pages:
- **Total pages:** `ceil(total / limit)` = ceil(1250 / 50) = 25
- **Current page:** `floor(offset / limit) + 1` = floor(100 / 50) + 1 = 3
- **Has next page:** `offset + limit < total`

---

## Filtering Best Practices

### Date Ranges
Always use ISO 8601 format: `YYYY-MM-DD`

```http
GET /api/worklogs?start_date=2026-01-01&end_date=2026-01-31
```

### Multiple Filters
Combine filters with `&`:

```http
GET /api/worklogs?author_email=dev@example.com&jira_instance=main-jira&start_date=2026-01-01
```

### Search
Use URL encoding for special characters:

```http
GET /api/worklogs?issue_key=PROJ-123
GET /api/worklogs?author_email=user%2Btest%40example.com
```

---

## Common Use Cases

### 1. Generate Monthly Invoice

```bash
# Step 1: Get client ID
GET /api/billing/clients

# Step 2: Create invoice
POST /api/billing/invoices
{
  "client_id": 1,
  "period_start": "2026-01-01",
  "period_end": "2026-01-31"
}

# Step 3: Download PDF
GET /api/billing/invoices/{invoice_id}/pdf
```

### 2. Team Worklog Report

```bash
# Step 1: Get team ID
GET /api/teams

# Step 2: Get team member emails
GET /api/teams/{team_id}

# Step 3: Get worklogs for each member
GET /api/worklogs?author_email=member@example.com&start_date=2026-01-01&end_date=2026-01-31

# Step 4: Get summary
GET /api/worklogs/summary?start_date=2026-01-01&end_date=2026-01-31
```

### 3. Sync New JIRA Instance

```bash
# Step 1: Create instance (admin only)
POST /api/settings/jira-instances
{
  "name": "client-jira",
  "url": "https://client.atlassian.net",
  "jira_email": "bot@example.com",
  "jira_token": "...",
  "tempo_token": "..."
}

# Step 2: Test connection
POST /api/settings/jira-instances/{instance_id}/test

# Step 3: Trigger sync
POST /api/sync/instance/{instance_id}
{
  "start_date": "2025-01-01",
  "end_date": "2026-02-11"
}

# Step 4: Check status
GET /api/sync/status
```

---

## Resources

### Full Documentation
- **Complete API reference:** `docs/api-reference.md` (all 111 endpoints)
- **Architecture:** `docs/architecture.md`
- **Database schema:** `docs/database-schema.md`

### Related Files
- **Backend routers:** `backend/app/routers/*.py`
- **Pydantic models:** `backend/app/models/*.py`
- **Storage methods:** `backend/app/cache.py`
