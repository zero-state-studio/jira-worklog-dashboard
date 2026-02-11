# Environment Variables

> **Navigation:** [Architecture](./architecture.md) | [Database Schema](./database-schema.md) | [API Reference](./api-reference.md) | [Setup](./setup-and-commands.md)

Complete reference for all environment variables used in the JIRA Worklog Dashboard.

---

## Table of Contents

1. [Backend Variables](#backend-variables)
2. [Frontend Variables](#frontend-variables)
3. [Environment Examples](#environment-examples)
4. [Security Best Practices](#security-best-practices)

---

## Backend Variables

### Google OAuth Configuration

**Required for production**

#### `GOOGLE_CLIENT_ID`
- **Type:** String
- **Required:** Yes (unless `DEV_MODE=true`)
- **Description:** Google OAuth 2.0 Client ID from Google Cloud Console
- **Example:** `123456789-abc123def456.apps.googleusercontent.com`
- **Where to get:** [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials

#### `GOOGLE_CLIENT_SECRET`
- **Type:** String
- **Required:** Yes (unless `DEV_MODE=true`)
- **Description:** Google OAuth 2.0 Client Secret
- **Example:** `GOCSPX-abc123def456ghi789jkl`
- **Security:** Never commit to version control
- **Where to get:** Same as Client ID

#### `GOOGLE_REDIRECT_URI`
- **Type:** URL
- **Required:** Yes
- **Description:** OAuth callback URL for web application
- **Development:** `http://localhost:8000/api/auth/callback`
- **Production:** `https://your-domain.com/api/auth/callback`
- **Note:** Must match exactly with Google Cloud Console configuration

#### `GOOGLE_REDIRECT_URI_TAURI`
- **Type:** URL
- **Required:** Yes (for desktop app)
- **Description:** OAuth callback URL for Tauri desktop application
- **Default:** `jira-worklog://auth/callback`
- **Note:** Custom protocol handler configured in Tauri

---

### JWT Configuration

**All required for production**

#### `JWT_SECRET_KEY`
- **Type:** String (hexadecimal, 64+ characters)
- **Required:** Yes
- **Description:** Secret key for signing JWT tokens
- **Generate:** `openssl rand -hex 32`
- **Example:** `a1b2c3d4e5f6...` (64 characters)
- **Security:**
  - Never commit to version control
  - Use different keys for dev/staging/prod
  - Rotate periodically (invalidates all tokens)

#### `JWT_ALGORITHM`
- **Type:** String
- **Required:** No
- **Default:** `HS256`
- **Description:** JWT signing algorithm
- **Options:** `HS256`, `HS384`, `HS512`, `RS256`, `RS384`, `RS512`
- **Recommended:** `HS256` (sufficient for most use cases)

#### `ACCESS_TOKEN_EXPIRE_MINUTES`
- **Type:** Integer
- **Required:** No
- **Default:** `30`
- **Description:** Access token lifetime in minutes
- **Range:** 5 - 120 minutes
- **Recommended:**
  - Development: 60
  - Production: 15-30

#### `REFRESH_TOKEN_EXPIRE_DAYS`
- **Type:** Integer
- **Required:** No
- **Default:** `30`
- **Description:** Refresh token lifetime in days
- **Range:** 1 - 90 days
- **Recommended:** 30 days

#### `INVITATION_EXPIRE_HOURS`
- **Type:** Integer
- **Required:** No
- **Default:** `72`
- **Description:** User invitation token lifetime in hours
- **Range:** 24 - 168 hours
- **Recommended:** 72 hours (3 days)

---

### Email Configuration

**Required for user invitations**

#### `EMAIL_PROVIDER`
- **Type:** String (enum)
- **Required:** Yes (if using invitations)
- **Description:** Email service provider
- **Options:**
  - `smtp` - Standard SMTP server
  - `sendgrid` - SendGrid API
- **Default:** `smtp`

#### SMTP Provider (`EMAIL_PROVIDER=smtp`)

##### `SMTP_HOST`
- **Type:** String
- **Required:** Yes (if `EMAIL_PROVIDER=smtp`)
- **Description:** SMTP server hostname
- **Development:** `localhost` (with fake SMTP server)
- **Production Examples:**
  - Gmail: `smtp.gmail.com`
  - Office 365: `smtp.office365.com`
  - AWS SES: `email-smtp.us-east-1.amazonaws.com`

##### `SMTP_PORT`
- **Type:** Integer
- **Required:** Yes (if `EMAIL_PROVIDER=smtp`)
- **Description:** SMTP server port
- **Common Ports:**
  - `587` - TLS (recommended)
  - `465` - SSL
  - `25` - Unencrypted (not recommended)
  - `1025` - Development (fake SMTP)

##### `SMTP_USERNAME`
- **Type:** String
- **Required:** No (depends on server)
- **Description:** SMTP authentication username
- **Example:** `noreply@company.com`

##### `SMTP_PASSWORD`
- **Type:** String
- **Required:** No (depends on server)
- **Description:** SMTP authentication password
- **Security:** Never commit to version control

##### `SMTP_USE_TLS`
- **Type:** Boolean
- **Required:** No
- **Default:** `true`
- **Description:** Use TLS encryption
- **Options:** `true`, `false`
- **Recommended:** `true`

#### SendGrid Provider (`EMAIL_PROVIDER=sendgrid`)

##### `SENDGRID_API_KEY`
- **Type:** String
- **Required:** Yes (if `EMAIL_PROVIDER=sendgrid`)
- **Description:** SendGrid API key
- **Example:** `SG.abc123def456...`
- **Security:** Never commit to version control
- **Where to get:** [SendGrid Dashboard](https://app.sendgrid.com/settings/api_keys)

##### `FROM_EMAIL`
- **Type:** Email address
- **Required:** Yes
- **Description:** Sender email address for all outgoing emails
- **Development:** `noreply@localhost`
- **Production:** `noreply@your-domain.com`
- **Note:** Must be verified in SendGrid (for SendGrid provider)

##### `FROM_NAME`
- **Type:** String
- **Required:** No
- **Default:** `"JIRA Worklog Dashboard"`
- **Description:** Sender display name
- **Example:** `"ACME Corp Worklog System"`

---

### Database Configuration

#### `DATABASE_URL`
- **Type:** File path or connection string
- **Required:** No
- **Default:** `sqlite:///./worklog_storage.db`
- **Description:** Database connection string
- **Examples:**
  - SQLite: `sqlite:///./worklog_storage.db`
  - PostgreSQL: `postgresql://user:pass@localhost:5432/worklog_db`
- **Note:** PostgreSQL support planned for Phase 2

#### `DATABASE_POOL_SIZE`
- **Type:** Integer
- **Required:** No
- **Default:** `10`
- **Description:** Database connection pool size (PostgreSQL only)
- **Range:** 5 - 50
- **Recommended:** 10-20

---

### Application Settings

#### `DEV_MODE`
- **Type:** Boolean
- **Required:** No
- **Default:** `false`
- **Description:** Enable development mode features
- **Options:** `true`, `false`
- **When enabled:**
  - Bypass Google OAuth with `/api/auth/dev/login`
  - Switch companies with `/api/auth/dev/switch-company`
  - Detailed error messages
  - Permissive CORS
- **Security:** **NEVER set to `true` in production**

#### `LOG_LEVEL`
- **Type:** String (enum)
- **Required:** No
- **Default:** `INFO`
- **Description:** Application logging level
- **Options:** `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`
- **Recommended:**
  - Development: `DEBUG`
  - Production: `INFO`

#### `CORS_ORIGINS`
- **Type:** Comma-separated URLs
- **Required:** No
- **Default:** `http://localhost:5173,http://localhost:3000,tauri://localhost`
- **Description:** Allowed CORS origins
- **Example:** `https://app.company.com,https://app-staging.company.com`
- **Development:** `*` (all origins) when `DEV_MODE=true`

#### `BACKEND_PORT`
- **Type:** Integer
- **Required:** No
- **Default:** `8000`
- **Description:** Backend server port
- **Range:** 1024 - 65535
- **Note:** Port 80/443 require root privileges

---

### External API Configuration

#### `JIRA_RATE_LIMIT_PER_MINUTE`
- **Type:** Integer
- **Required:** No
- **Default:** `300`
- **Description:** Max JIRA API requests per minute
- **Note:** JIRA Cloud default is 300 req/min

#### `TEMPO_RATE_LIMIT_PER_MINUTE`
- **Type:** Integer
- **Required:** No
- **Default:** `180`
- **Description:** Max Tempo API requests per minute
- **Note:** Tempo default is 180 req/min

#### `HTTP_TIMEOUT_SECONDS`
- **Type:** Integer
- **Required:** No
- **Default:** `30`
- **Description:** HTTP client timeout for external APIs
- **Range:** 10 - 120 seconds

---

### Caching & Performance

#### `CACHE_TTL_SECONDS`
- **Type:** Integer
- **Required:** No
- **Default:** `900` (15 minutes)
- **Description:** Default cache TTL for JIRA data
- **Range:** 300 - 3600 seconds
- **Note:** Currently not used (manual sync strategy)

#### `WORKLOG_BATCH_SIZE`
- **Type:** Integer
- **Required:** No
- **Default:** `100`
- **Description:** Batch size for bulk worklog operations
- **Range:** 50 - 500
- **Recommended:** 100

---

### Security Settings

#### `RATE_LIMIT_ENABLED`
- **Type:** Boolean
- **Required:** No
- **Default:** `false`
- **Description:** Enable API rate limiting
- **Options:** `true`, `false`
- **Note:** Planned for Phase 2

#### `RATE_LIMIT_PER_MINUTE`
- **Type:** Integer
- **Required:** No
- **Default:** `300`
- **Description:** API requests per minute per user
- **Note:** Requires `RATE_LIMIT_ENABLED=true`

#### `SESSION_REVOKE_ON_PASSWORD_CHANGE`
- **Type:** Boolean
- **Required:** No
- **Default:** `true`
- **Description:** Revoke all sessions when password changes
- **Options:** `true`, `false`
- **Note:** Currently not applicable (OAuth-only auth)

---

## Frontend Variables

**All frontend variables must be prefixed with `VITE_`**

### API Configuration

#### `VITE_API_URL`
- **Type:** URL
- **Required:** No
- **Default:** `/api` (proxied by Vite dev server)
- **Description:** Backend API base URL
- **Development:** `/api` or `http://localhost:8000/api`
- **Production:** `https://your-domain.com/api`
- **Tauri:** `http://localhost:8000/api`

---

### Application Settings

#### `VITE_APP_NAME`
- **Type:** String
- **Required:** No
- **Default:** `"JIRA Worklog Dashboard"`
- **Description:** Application display name
- **Example:** `"ACME Corp Worklog System"`

#### `VITE_APP_VERSION`
- **Type:** String (semver)
- **Required:** No
- **Default:** Extracted from `package.json`
- **Description:** Application version
- **Example:** `"1.0.0"`

---

### Feature Flags

#### `VITE_ENABLE_DEMO_MODE`
- **Type:** Boolean
- **Required:** No
- **Default:** `false`
- **Description:** Enable demo mode with sample data
- **Options:** `true`, `false`
- **Use Case:** Demo environments, screenshots

#### `VITE_ENABLE_ANALYTICS`
- **Type:** Boolean
- **Required:** No
- **Default:** `false`
- **Description:** Enable analytics tracking
- **Options:** `true`, `false`
- **Note:** Analytics not currently implemented

---

### Development Settings

#### `VITE_DEV_DELAY_MS`
- **Type:** Integer
- **Required:** No
- **Default:** `0`
- **Description:** Artificial delay for API calls (testing loading states)
- **Range:** 0 - 5000 ms
- **Development only**

---

## Environment Examples

### Development (.env)

**Backend (`backend/.env`):**
```bash
# Google OAuth (dev credentials)
GOOGLE_CLIENT_ID=123456789-dev.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-dev123abc
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/callback

# JWT (dev key - not secure!)
JWT_SECRET_KEY=dev_secret_key_not_for_production_use_only_32_chars
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30

# Email (fake SMTP)
EMAIL_PROVIDER=smtp
SMTP_HOST=localhost
SMTP_PORT=1025
FROM_EMAIL=noreply@localhost

# Development mode
DEV_MODE=true
LOG_LEVEL=DEBUG
CORS_ORIGINS=*
```

**Frontend (`frontend/.env`):**
```bash
VITE_API_URL=/api
VITE_ENABLE_DEMO_MODE=false
```

---

### Production (.env.production)

**Backend (`backend/.env.production`):**
```bash
# Google OAuth (production credentials)
GOOGLE_CLIENT_ID=123456789-prod.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-prod123abc
GOOGLE_REDIRECT_URI=https://worklog.company.com/api/auth/callback
GOOGLE_REDIRECT_URI_TAURI=jira-worklog://auth/callback

# JWT (strong secret key)
JWT_SECRET_KEY=$(openssl rand -hex 32)
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=30
INVITATION_EXPIRE_HOURS=72

# Email (SendGrid)
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.abc123def456...
FROM_EMAIL=noreply@company.com
FROM_NAME="ACME Worklog System"

# Database
DATABASE_URL=sqlite:///./worklog_storage.db

# Application
DEV_MODE=false
LOG_LEVEL=INFO
CORS_ORIGINS=https://worklog.company.com,tauri://localhost
BACKEND_PORT=8000

# Security
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=300

# External APIs
JIRA_RATE_LIMIT_PER_MINUTE=300
TEMPO_RATE_LIMIT_PER_MINUTE=180
HTTP_TIMEOUT_SECONDS=30
```

**Frontend (`frontend/.env.production`):**
```bash
VITE_API_URL=https://worklog.company.com/api
VITE_APP_NAME="ACME Worklog System"
VITE_ENABLE_DEMO_MODE=false
VITE_ENABLE_ANALYTICS=true
```

---

### Docker (.env.docker)

```bash
# Google OAuth
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
GOOGLE_REDIRECT_URI=https://worklog.company.com/api/auth/callback

# JWT
JWT_SECRET_KEY=${JWT_SECRET_KEY}
JWT_ALGORITHM=HS256

# Email
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=${SENDGRID_API_KEY}
FROM_EMAIL=noreply@company.com

# Database (mounted volume)
DATABASE_URL=sqlite:////data/worklog_storage.db

# Network
BACKEND_PORT=8000
CORS_ORIGINS=https://worklog.company.com

# Security
DEV_MODE=false
LOG_LEVEL=INFO
```

---

## Security Best Practices

### Secret Management

**DO:**
- ✅ Use environment variables for all secrets
- ✅ Generate strong random keys (`openssl rand -hex 32`)
- ✅ Use different keys for dev/staging/prod
- ✅ Store production secrets in secure vault (AWS Secrets Manager, HashiCorp Vault)
- ✅ Rotate secrets periodically
- ✅ Limit secret access to authorized personnel only

**DON'T:**
- ❌ Commit `.env` files to version control
- ❌ Share secrets via email or chat
- ❌ Use weak or predictable keys
- ❌ Reuse secrets across environments
- ❌ Log secrets in application logs
- ❌ Hardcode secrets in source code

### .gitignore

Ensure these patterns are in `.gitignore`:

```gitignore
# Environment files
.env
.env.local
.env.production
.env.*.local

# Secrets
*.key
*.pem
*.p12
secrets/
```

### Environment Validation

Backend validates required variables on startup:

```python
# app/main.py
from app.auth_config import validate_auth_config

@app.on_event("startup")
async def startup():
    validate_auth_config()  # Raises error if invalid
```

---

## Loading Environment Variables

### Backend (Python)

```python
from dotenv import load_dotenv
import os

# Load .env file
load_dotenv()

# Access variables
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "default-dev-key")

# Required variables
if not GOOGLE_CLIENT_ID and not os.getenv("DEV_MODE"):
    raise ValueError("GOOGLE_CLIENT_ID is required")
```

### Frontend (Vite)

```javascript
// vite automatically loads .env files

// Access variables (must start with VITE_)
const API_URL = import.meta.env.VITE_API_URL || '/api';
const APP_NAME = import.meta.env.VITE_APP_NAME;

// Check if in development
const isDev = import.meta.env.DEV;
```

---

## Troubleshooting

### Common Issues

**Error: `GOOGLE_CLIENT_ID not found`**
- Solution: Create `backend/.env` file with required variables

**Error: `Invalid JWT secret key length`**
- Solution: Generate new key with `openssl rand -hex 32`

**Frontend can't connect to backend:**
- Check `VITE_API_URL` in `frontend/.env`
- Verify backend is running on correct port
- Check CORS_ORIGINS includes frontend URL

**Emails not sending:**
- Check EMAIL_PROVIDER configuration
- Verify SMTP credentials
- Test with fake SMTP server: `python -m smtpd -n -c DebuggingServer localhost:1025`

---

## Resources

- [dotenv Documentation](https://github.com/theskumar/python-dotenv)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [12-Factor App Config](https://12factor.net/config)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
- [SendGrid API Keys](https://docs.sendgrid.com/ui/account-and-settings/api-keys)
