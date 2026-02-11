# Setup & Commands

> **Navigation:** [Architecture](./architecture.md) | [Database Schema](./database-schema.md) | [API Reference](./api-reference.md) | [Conventions](./conventions.md)

Complete setup instructions and common development commands for the JIRA Worklog Dashboard.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Development](#development)
4. [Testing](#testing)
5. [Building](#building)
6. [Deployment](#deployment)
7. [Maintenance](#maintenance)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

**Backend:**
- Python 3.11+ ([Download](https://www.python.org/downloads/))
- pip (included with Python)

**Frontend:**
- Node.js 18+ ([Download](https://nodejs.org/))
- npm 9+ (included with Node.js)

**Desktop App (optional):**
- Rust 1.77+ ([Install](https://rustup.rs/))
- Tauri CLI: `cargo install tauri-cli`

### Optional Tools

- **Git** - Version control
- **SQLite Browser** - Database inspection
- **Postman** - API testing
- **VS Code** - Recommended editor

### System Requirements

- **OS:** macOS, Windows, or Linux
- **RAM:** 4GB minimum, 8GB recommended
- **Disk:** 500MB free space
- **Network:** Internet access for JIRA/Tempo APIs

---

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/jira-worklog-dashboard.git
cd jira-worklog-dashboard
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# macOS/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Verify installation
python -c "import fastapi; print('FastAPI installed')"
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Verify installation
npm list react
```

### 4. Environment Configuration

**Backend `.env` file:**

```bash
# Create .env file in backend/ directory
cd backend
cat > .env << 'EOF'
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/callback

# JWT
JWT_SECRET_KEY=$(openssl rand -hex 32)
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=30

# Email (SMTP for development)
EMAIL_PROVIDER=smtp
SMTP_HOST=localhost
SMTP_PORT=1025
FROM_EMAIL=noreply@localhost

# Optional: Development mode
DEV_MODE=true
EOF
```

**Frontend `.env` file:**

```bash
# Create .env file in frontend/ directory
cd frontend
cat > .env << 'EOF'
VITE_API_URL=http://localhost:8000/api
EOF
```

### 5. Database Initialization

```bash
# Backend automatically creates database on first run
cd backend
source venv/bin/activate
python -c "from app.cache import WorklogStorage; import asyncio; asyncio.run(WorklogStorage().initialize())"
```

### 6. Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - **Application type:** Web application
   - **Authorized redirect URIs:**
     - `http://localhost:8000/api/auth/callback` (development)
     - `https://your-domain.com/api/auth/callback` (production)
5. Copy Client ID and Client Secret to backend `.env`

---

## Development

### Start Backend Server

```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

**Output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

**Access:**
- API: http://localhost:8000/api
- Swagger Docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Start Frontend Server

```bash
cd frontend
npm run dev
```

**Output:**
```
VITE v5.0.10  ready in 342 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

**Access:** http://localhost:5173

### Development Workflow

**Terminal 1 (Backend):**
```bash
cd backend && source venv/bin/activate && uvicorn app.main:app --reload
```

**Terminal 2 (Frontend):**
```bash
cd frontend && npm run dev
```

**Terminal 3 (Optional - Fake SMTP server):**
```bash
python -m smtpd -n -c DebuggingServer localhost:1025
```

### Hot Reload

**Backend:**
- Uvicorn auto-reloads on `.py` file changes
- Database changes require server restart

**Frontend:**
- Vite HMR updates instantly on `.jsx`, `.css` changes
- Full reload on configuration changes

### Development Mode Features

When `DEV_MODE=true`:

- Bypass Google OAuth with `/api/auth/dev/login`
- Switch companies with `/api/auth/dev/switch-company`
- Mock SMTP server for email testing
- Detailed error messages in responses
- CORS permissive (all origins)

---

## Testing

### Backend Tests

```bash
cd backend
source venv/bin/activate

# Run all tests
pytest tests/ -v

# Run specific test file
pytest tests/test_multi_tenant.py -v

# Run with coverage report
pytest tests/ --cov=app --cov-report=html

# View coverage report
open htmlcov/index.html  # macOS
# or
xdg-open htmlcov/index.html  # Linux
# or
start htmlcov/index.html  # Windows
```

### Test Database

Tests use isolated `test_worklog_storage.db`:

```bash
# Clean test database
rm backend/test_worklog_storage.db

# Run tests with fresh database
pytest tests/ -v
```

### Frontend Tests (if implemented)

```bash
cd frontend

# Run tests
npm test

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

### API Testing with Postman/curl

**Example: Get Teams**
```bash
# 1. Get access token (dev mode)
TOKEN=$(curl -X POST http://localhost:8000/api/auth/dev/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@localhost","role":"ADMIN"}' \
  | jq -r '.access_token')

# 2. Call API
curl http://localhost:8000/api/teams \
  -H "Authorization: Bearer $TOKEN"
```

---

## Building

### Production Backend Build

```bash
cd backend

# Create optimized requirements (remove dev dependencies)
pip freeze > requirements-prod.txt

# Create executable with PyInstaller
./scripts/build-backend.sh
```

**Output:** `backend/dist/worklog-backend` executable

### Production Frontend Build

```bash
cd frontend

# Build static files
npm run build

# Preview production build
npm run preview
```

**Output:** `frontend/dist/` directory with static assets

### Desktop App Build

**Prerequisites:**
1. Backend executable must be built first
2. Place backend binary in `frontend/src-tauri/binaries/`

```bash
# 1. Build backend
cd backend
./scripts/build-backend.sh

# 2. Copy binary to Tauri
cp dist/worklog-backend ../frontend/src-tauri/binaries/worklog-backend-$(uname -m)-apple-darwin  # macOS

# 3. Build Tauri app
cd ../frontend
npm run tauri:build
```

**Output:**
- macOS: `frontend/src-tauri/target/release/bundle/dmg/*.dmg`
- Windows: `frontend/src-tauri/target/release/bundle/msi/*.msi`
- Linux: `frontend/src-tauri/target/release/bundle/appimage/*.AppImage`

### Desktop Development Mode

```bash
# Terminal 1: Start backend manually
cd backend
source venv/bin/activate
uvicorn app.main:app --port 8000

# Terminal 2: Run Tauri dev
cd frontend
npm run tauri:dev
```

---

## Deployment

### Web Deployment (Backend + Frontend)

**Backend (Example: Ubuntu server)**

```bash
# 1. Clone repository
git clone https://github.com/your-org/jira-worklog-dashboard.git
cd jira-worklog-dashboard/backend

# 2. Setup Python environment
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
nano .env  # Edit production values

# 4. Create systemd service
sudo nano /etc/systemd/system/worklog-api.service
```

**worklog-api.service:**
```ini
[Unit]
Description=JIRA Worklog Dashboard API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/jira-worklog-dashboard/backend
Environment="PATH=/opt/jira-worklog-dashboard/backend/venv/bin"
ExecStart=/opt/jira-worklog-dashboard/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# 5. Start service
sudo systemctl daemon-reload
sudo systemctl enable worklog-api
sudo systemctl start worklog-api
sudo systemctl status worklog-api
```

**Frontend (Nginx)**

```bash
# 1. Build frontend
cd frontend
npm run build

# 2. Copy to web root
sudo cp -r dist/* /var/www/worklog-dashboard/

# 3. Configure Nginx
sudo nano /etc/nginx/sites-available/worklog-dashboard
```

**Nginx configuration:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/worklog-dashboard;
    index index.html;

    # Frontend
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# 4. Enable site
sudo ln -s /etc/nginx/sites-available/worklog-dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**SSL with Let's Encrypt:**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Desktop Distribution

**macOS:**
1. Build `.dmg` with Tauri
2. Sign with Apple Developer ID (optional)
3. Notarize with Apple (optional)
4. Distribute via website or Mac App Store

**Windows:**
1. Build `.msi` with Tauri
2. Sign with code signing certificate (optional)
3. Distribute via website or Microsoft Store

**Linux:**
1. Build `.AppImage` with Tauri
2. Create `.deb`/`.rpm` packages (optional)
3. Distribute via website or package managers

---

## Maintenance

### Database Backup

```bash
# Create backup
cp backend/worklog_storage.db backend/backups/worklog_$(date +%Y%m%d).db

# Automated daily backup (crontab)
0 2 * * * cp /opt/jira-worklog-dashboard/backend/worklog_storage.db /backups/worklog_$(date +\%Y\%m\%d).db
```

### Database Maintenance

```bash
# Vacuum database (reclaim space)
sqlite3 backend/worklog_storage.db "VACUUM;"

# Update query planner statistics
sqlite3 backend/worklog_storage.db "ANALYZE;"

# Check integrity
sqlite3 backend/worklog_storage.db "PRAGMA integrity_check;"
```

### Log Rotation

```bash
# Delete old application logs (via API)
curl -X DELETE "http://localhost:8000/api/logs?before_date=2024-01-01" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Or via SQL
sqlite3 backend/worklog_storage.db "DELETE FROM logs WHERE timestamp < datetime('now', '-90 days');"
```

### Update Dependencies

**Backend:**
```bash
cd backend
source venv/bin/activate

# Check outdated packages
pip list --outdated

# Update all packages
pip install --upgrade -r requirements.txt

# Update specific package
pip install --upgrade fastapi
```

**Frontend:**
```bash
cd frontend

# Check outdated packages
npm outdated

# Update all packages
npm update

# Update specific package
npm install react@latest
```

### Monitor System Health

```bash
# Check API health
curl http://localhost:8000/health

# Check database size
ls -lh backend/worklog_storage.db

# Check disk usage
df -h

# Check memory usage
free -h

# Check backend logs
journalctl -u worklog-api.service -n 100
```

---

## Troubleshooting

### Backend Won't Start

**Error: `ModuleNotFoundError: No module named 'fastapi'`**

```bash
# Solution: Install dependencies
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

**Error: `Port 8000 is already in use`**

```bash
# Solution: Kill existing process
lsof -ti:8000 | xargs kill -9
# Or use different port
uvicorn app.main:app --port 8001
```

**Error: `database is locked`**

```bash
# Solution: Close other connections
sqlite3 backend/worklog_storage.db ".quit"
# Or restart backend
```

### Frontend Won't Build

**Error: `Cannot find module 'vite'`**

```bash
# Solution: Reinstall dependencies
cd frontend
rm -rf node_modules package-lock.json
npm install
```

**Error: `ENOSPC: System limit for number of file watchers reached`**

```bash
# Solution (Linux): Increase inotify limit
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### Database Issues

**Error: `no such table: teams`**

```bash
# Solution: Initialize database
cd backend
source venv/bin/activate
python -c "from app.cache import WorklogStorage; import asyncio; asyncio.run(WorklogStorage().initialize())"
```

**Corrupt database:**

```bash
# Solution: Restore from backup
cd backend
cp worklog_storage.db worklog_storage.db.corrupt
cp backups/worklog_20240211.db worklog_storage.db
```

### Authentication Issues

**Error: `Invalid OAuth credentials`**

```bash
# Solution: Check .env file
cd backend
cat .env | grep GOOGLE_CLIENT_ID
# Verify ID matches Google Cloud Console
```

**Error: `JWT token expired`**

```bash
# Solution: Refresh token via /api/auth/refresh
# Or re-login via /api/auth/google/authorize
```

### Tauri Build Issues

**Error: `Backend binary not found`**

```bash
# Solution: Build backend first
cd backend
./scripts/build-backend.sh
cp dist/worklog-backend ../frontend/src-tauri/binaries/
```

**Error: `Rust compilation failed`**

```bash
# Solution: Update Rust toolchain
rustup update stable
cd frontend
npm run tauri:build
```

---

## Performance Optimization

### Backend Optimization

```bash
# Use Gunicorn for production (multiple workers)
cd backend
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000

# Enable HTTP/2 (with uvicorn + httptools)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --http h11
```

### Frontend Optimization

```bash
# Analyze bundle size
cd frontend
npm run build -- --mode analyze

# Enable gzip compression (Nginx)
# Add to nginx.conf:
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;
```

### Database Optimization

```sql
-- Add missing indexes (if needed)
CREATE INDEX idx_custom ON table_name(company_id, column_name);

-- Vacuum to reclaim space
VACUUM;

-- Analyze to update query planner
ANALYZE;
```

---

## Development Tools

### Recommended VS Code Extensions

- **Python** - ms-python.python
- **Pylance** - ms-python.vscode-pylance
- **ESLint** - dbaeumer.vscode-eslint
- **Prettier** - esbenp.prettier-vscode
- **Tailwind CSS IntelliSense** - bradlc.vscode-tailwindcss
- **SQLite Viewer** - qwtel.sqlite-viewer

### VS Code Settings

```json
{
  "python.defaultInterpreterPath": "${workspaceFolder}/backend/venv/bin/python",
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": true,
  "python.formatting.provider": "black",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  }
}
```

### Git Hooks (Optional)

**Pre-commit hook:**
```bash
#!/bin/sh
# .git/hooks/pre-commit

# Run tests before commit
cd backend
source venv/bin/activate
pytest tests/ || exit 1

cd ../frontend
npm test || exit 1
```

---

## Environment Variables Reference

See [env-variables.md](./env-variables.md) for complete list.

---

## Common Commands Quick Reference

```bash
# Backend
cd backend && source venv/bin/activate && uvicorn app.main:app --reload

# Frontend
cd frontend && npm run dev

# Tests
cd backend && pytest tests/ -v
cd frontend && npm test

# Build
cd backend && ./scripts/build-backend.sh
cd frontend && npm run build
cd frontend && npm run tauri:build

# Database
sqlite3 backend/worklog_storage.db
sqlite3 backend/worklog_storage.db "VACUUM; ANALYZE;"

# Logs
journalctl -u worklog-api.service -f
tail -f /var/log/nginx/access.log
```

---

## Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Tauri Documentation](https://tauri.app/v1/guides/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Python Virtual Environments](https://docs.python.org/3/tutorial/venv.html)
- [npm Documentation](https://docs.npmjs.com/)

---

## Getting Help

- **Issues:** https://github.com/your-org/jira-worklog-dashboard/issues
- **Discussions:** https://github.com/your-org/jira-worklog-dashboard/discussions
- **Documentation:** See `/docs` directory
- **Code Examples:** See `CLAUDE.md` for development patterns
