# DevOps Engineer

## Role Overview
Responsible for build scripts, deployment automation, Tauri desktop app configuration, CI/CD pipelines, environment management, and infrastructure configuration.

---

## Primary Responsibilities

### Build & Packaging
- PyInstaller backend executable creation
- Tauri desktop app configuration and building
- NPM package management
- Python dependency management
- Cross-platform build support (macOS, Windows, Linux)

### Deployment
- Web deployment (backend + frontend)
- Desktop app distribution (DMG, MSI, AppImage)
- Environment configuration (.env management)
- Database initialization and migrations
- Production server setup (uvicorn, nginx)

### CI/CD Pipeline
- GitHub Actions workflow setup
- Automated testing on push
- Build artifacts generation
- Release automation
- Version management

### Infrastructure
- Docker containerization (optional)
- nginx reverse proxy configuration
- HTTPS/SSL setup
- Database backup strategies
- Log management

---

## Files/Folders Ownership

### Build Scripts
- `scripts/build-backend.sh`
  - PyInstaller configuration
  - Backend executable generation
  - Dependency bundling
  - Platform-specific builds

### Tauri Configuration
- `frontend/src-tauri/` (Tauri app directory)
  - `tauri.conf.json` - Main Tauri configuration
  - `Cargo.toml` - Rust dependencies
  - `src/main.rs` - Rust main entry point
  - `binaries/` - Backend sidecar binaries
  - `icons/` - Application icons

### Package Management
- `backend/requirements.txt` - Python dependencies (18 packages)
- `frontend/package.json` - NPM dependencies (12 packages)
- `frontend/package-lock.json` - Locked versions

### Configuration Files
- `frontend/vite.config.js` - Vite build configuration
- `frontend/tailwind.config.js` - Tailwind CSS configuration
- `.gitignore` - Files to exclude from git
- `.env.example` - Environment variable template

### Documentation
- `docs/DEPLOYMENT.md` (if exists)
- `README.md` (deployment sections)
- Build/deployment documentation

---

## Build Process

### Backend Executable Build (PyInstaller)

**Script: `scripts/build-backend.sh`**

```bash
#!/bin/bash
set -e

echo "Building backend executable..."

cd backend

# Activate virtual environment
source venv/bin/activate

# Install PyInstaller
pip install pyinstaller

# Build executable
pyinstaller \
  --onefile \
  --name backend \
  --add-data "app:app" \
  --hidden-import uvicorn \
  --hidden-import fastapi \
  --hidden-import aiosqlite \
  --hidden-import pydantic \
  --hidden-import httpx \
  --hidden-import authlib \
  --hidden-import openpyxl \
  app/main.py

echo "✅ Backend executable built: backend/dist/backend"

# Copy to Tauri binaries folder
TAURI_BIN_DIR="../frontend/src-tauri/binaries"
mkdir -p "$TAURI_BIN_DIR"

# Platform-specific binary name
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  cp dist/backend "$TAURI_BIN_DIR/backend-x86_64-apple-darwin"
  echo "✅ Copied to: $TAURI_BIN_DIR/backend-x86_64-apple-darwin"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  # Linux
  cp dist/backend "$TAURI_BIN_DIR/backend-x86_64-unknown-linux-gnu"
  echo "✅ Copied to: $TAURI_BIN_DIR/backend-x86_64-unknown-linux-gnu"
elif [[ "$OSTYPE" == "msys" ]]; then
  # Windows
  cp dist/backend.exe "$TAURI_BIN_DIR/backend-x86_64-pc-windows-msvc.exe"
  echo "✅ Copied to: $TAURI_BIN_DIR/backend-x86_64-pc-windows-msvc.exe"
fi

echo "✅ Backend build complete!"
```

### Tauri Desktop App Build

**Configuration: `frontend/src-tauri/tauri.conf.json`**

```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devPath": "http://localhost:5173",
    "distDir": "../dist"
  },
  "package": {
    "productName": "JIRA Worklog Dashboard",
    "version": "2.0.0"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "shell": {
        "sidecar": true,
        "scope": [
          {
            "name": "backend",
            "sidecar": true,
            "cmd": "binaries/backend",
            "args": true
          }
        ]
      },
      "http": {
        "scope": ["http://127.0.0.1:8000/*"]
      }
    },
    "bundle": {
      "active": true,
      "category": "DeveloperTool",
      "copyright": "Copyright © 2024",
      "deb": {
        "depends": []
      },
      "externalBin": ["binaries/backend"],
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/128x128@2x.png",
        "icons/icon.icns",
        "icons/icon.ico"
      ],
      "identifier": "com.company.jira-worklog-dashboard",
      "longDescription": "Aggregate and analyze JIRA worklog data",
      "macOS": {
        "entitlements": null,
        "exceptionDomain": "",
        "frameworks": [],
        "providerShortName": null,
        "signingIdentity": null
      },
      "resources": [],
      "shortDescription": "JIRA Worklog Dashboard",
      "targets": "all",
      "windows": {
        "certificateThumbprint": null,
        "digestAlgorithm": "sha256",
        "timestampUrl": ""
      }
    },
    "security": {
      "csp": null
    },
    "updater": {
      "active": false
    },
    "windows": [
      {
        "fullscreen": false,
        "height": 800,
        "resizable": true,
        "title": "JIRA Worklog Dashboard",
        "width": 1200
      }
    ]
  }
}
```

**Build Commands:**

```bash
# Build for current platform
cd frontend
npm run tauri:build

# Outputs:
# - macOS: src-tauri/target/release/bundle/macos/JIRA Worklog Dashboard.app
#          src-tauri/target/release/bundle/dmg/JIRA Worklog Dashboard_2.0.0_x64.dmg
# - Windows: src-tauri/target/release/bundle/msi/JIRA Worklog Dashboard_2.0.0_x64_en-US.msi
# - Linux: src-tauri/target/release/bundle/deb/jira-worklog-dashboard_2.0.0_amd64.deb
#          src-tauri/target/release/bundle/appimage/jira-worklog-dashboard_2.0.0_amd64.AppImage
```

---

## Deployment Strategies

### Option 1: Traditional Web Deployment

**Backend Deployment:**

```bash
# On production server
cd /opt/jira-worklog-dashboard/backend

# Create production environment
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Set environment variables
cat > .env <<EOF
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/login/callback
JWT_SECRET_KEY=$(openssl rand -hex 32)
JWT_REFRESH_SECRET_KEY=$(openssl rand -hex 32)
SENDGRID_API_KEY=your_sendgrid_key
EOF

# Start backend with systemd
sudo tee /etc/systemd/system/jira-worklog-backend.service <<EOF
[Unit]
Description=JIRA Worklog Dashboard Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/jira-worklog-dashboard/backend
Environment="PATH=/opt/jira-worklog-dashboard/backend/venv/bin"
ExecStart=/opt/jira-worklog-dashboard/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable jira-worklog-backend
sudo systemctl start jira-worklog-backend
```

**Frontend Deployment:**

```bash
# Build frontend
cd frontend
npm install
npm run build

# Copy to nginx root
sudo cp -r dist/* /var/www/jira-worklog-dashboard/

# nginx configuration
sudo tee /etc/nginx/sites-available/jira-worklog-dashboard <<EOF
server {
    listen 80;
    server_name yourdomain.com;

    # Redirect to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Frontend static files
    location / {
        root /var/www/jira-worklog-dashboard;
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API proxy
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/jira-worklog-dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Option 2: Docker Deployment

**backend/Dockerfile:**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY app/ ./app/
COPY config.yaml ./

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**docker-compose.yml:**

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./backend/worklog_storage.db:/app/worklog_storage.db
    environment:
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
      - GOOGLE_REDIRECT_URI=${GOOGLE_REDIRECT_URI}
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}
      - JWT_REFRESH_SECRET_KEY=${JWT_REFRESH_SECRET_KEY}
    restart: unless-stopped

  frontend:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./frontend/dist:/usr/share/nginx/html
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
    restart: unless-stopped
```

**Deployment Commands:**

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down

# Rebuild
docker-compose build
docker-compose up -d
```

### Option 3: Desktop App Distribution

**Build for all platforms (requires each OS):**

```bash
# macOS (on Mac)
./scripts/build-backend.sh
cd frontend && npm run tauri:build

# Windows (on Windows)
.\scripts\build-backend.ps1
cd frontend && npm run tauri:build

# Linux (on Linux)
./scripts/build-backend.sh
cd frontend && npm run tauri:build
```

**Distribution:**
- macOS: Distribute DMG file or upload to App Store
- Windows: Distribute MSI installer or use Chocolatey
- Linux: Distribute DEB/AppImage or add to package managers

---

## CI/CD Pipeline

### GitHub Actions Workflow

**.github/workflows/build.yml:**

```yaml
name: Build and Test

on:
  push:
    branches: [master, development]
  pull_request:
    branches: [master, development]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Set up Python 3.11
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'

    - name: Install Python dependencies
      run: |
        cd backend
        python -m pip install --upgrade pip
        pip install -r requirements.txt
        pip install pytest pytest-asyncio pytest-cov

    - name: Run backend tests
      run: |
        cd backend
        pytest tests/ --cov=app --cov-report=xml --cov-report=term

    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./backend/coverage.xml
        flags: backend

    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'

    - name: Install frontend dependencies
      run: |
        cd frontend
        npm ci

    - name: Build frontend
      run: |
        cd frontend
        npm run build

  build-desktop:
    needs: test
    strategy:
      matrix:
        platform: [macos-latest, ubuntu-latest, windows-latest]

    runs-on: ${{ matrix.platform }}

    steps:
    - uses: actions/checkout@v3

    - name: Set up Python 3.11
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'

    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'

    - name: Install Rust
      uses: actions-rs/toolchain@v1
      with:
        toolchain: stable

    - name: Build backend executable
      run: |
        cd backend
        python -m venv venv
        source venv/bin/activate || .\venv\Scripts\activate
        pip install -r requirements.txt
        pip install pyinstaller
        chmod +x ../scripts/build-backend.sh || echo "Skip chmod on Windows"
        ../scripts/build-backend.sh || ..\scripts\build-backend.ps1

    - name: Install frontend dependencies
      run: |
        cd frontend
        npm ci

    - name: Build Tauri app
      run: |
        cd frontend
        npm run tauri:build

    - name: Upload artifacts
      uses: actions/upload-artifact@v3
      with:
        name: app-${{ matrix.platform }}
        path: |
          frontend/src-tauri/target/release/bundle/dmg/*.dmg
          frontend/src-tauri/target/release/bundle/msi/*.msi
          frontend/src-tauri/target/release/bundle/deb/*.deb
          frontend/src-tauri/target/release/bundle/appimage/*.AppImage

  deploy:
    needs: test
    if: github.ref == 'refs/heads/master'
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Deploy to production
      env:
        SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
        SERVER_HOST: ${{ secrets.SERVER_HOST }}
        SERVER_USER: ${{ secrets.SERVER_USER }}
      run: |
        # Add SSH key
        mkdir -p ~/.ssh
        echo "$SSH_PRIVATE_KEY" > ~/.ssh/id_rsa
        chmod 600 ~/.ssh/id_rsa

        # Deploy script
        ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_HOST << 'ENDSSH'
          cd /opt/jira-worklog-dashboard
          git pull origin master
          cd backend
          source venv/bin/activate
          pip install -r requirements.txt
          sudo systemctl restart jira-worklog-backend
          cd ../frontend
          npm ci
          npm run build
          sudo rm -rf /var/www/jira-worklog-dashboard/*
          sudo cp -r dist/* /var/www/jira-worklog-dashboard/
        ENDSSH
```

---

## Dependencies

### ⬇️ Depends On

**Backend-Core-Engineer:**
- Backend code to build into executable
- API server configuration

**Frontend-Engineer:**
- Frontend code to build
- Vite configuration

**All Engineers:**
- Code from all engineers gets built and deployed

### ⬆️ Provides To

**Tech-Lead:**
- Build artifacts (executables, installers)
- Deployment status
- Infrastructure status

**All Engineers:**
- Development environment setup
- Build scripts
- Deployment procedures

---

## Required Skills

### Core Technologies
- **PyInstaller**: Python executable packaging
- **Tauri**: Desktop app framework (Rust + webview)
- **Docker**: Containerization
- **nginx**: Web server and reverse proxy
- **systemd**: Linux service management
- **GitHub Actions**: CI/CD automation

### System Administration
- Linux server administration
- Environment variable management
- SSL/TLS certificate management
- Log rotation and monitoring
- Backup and recovery procedures

### Build Tools
- Bash scripting
- npm/Node.js build process
- Python virtual environments
- Cross-platform build considerations

---

## Best Practices

### Build Process
- **Reproducible builds**: Use locked dependencies (package-lock.json, requirements.txt)
- **Version pinning**: Pin exact versions in production
- **Build artifacts**: Store build artifacts for rollback
- **Build documentation**: Document build process clearly

### Deployment
- **Zero-downtime deployment**: Use blue-green or rolling deployments
- **Database migrations**: Run migrations before deploying code
- **Rollback plan**: Always have a rollback procedure
- **Health checks**: Verify deployment success before switching traffic

### Security
- **Environment variables**: Never commit secrets to git
- **SSL/TLS**: Always use HTTPS in production
- **File permissions**: Proper permissions for sensitive files
- **Secrets rotation**: Regularly rotate API keys and secrets

### Monitoring
- **Application logs**: Centralized logging
- **System metrics**: CPU, memory, disk usage
- **Uptime monitoring**: Alert on downtime
- **Performance monitoring**: Response times, error rates

---

## Troubleshooting

### Common Build Issues

**Issue: PyInstaller fails with "module not found"**
- Add hidden imports to build script: `--hidden-import module_name`
- Check virtual environment is activated
- Verify all dependencies in requirements.txt

**Issue: Tauri build fails**
- Check Rust is installed: `rustc --version`
- Verify backend binary exists in binaries/ folder
- Check tauri.conf.json syntax
- Ensure npm dependencies installed

**Issue: Frontend build fails**
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version matches requirements
- Verify Vite configuration
- Check for syntax errors in code

### Common Deployment Issues

**Issue: Backend won't start**
- Check environment variables are set
- Verify database file permissions
- Check port 8000 is not in use: `lsof -i :8000`
- Check systemd logs: `journalctl -u jira-worklog-backend -f`

**Issue: nginx returns 502 Bad Gateway**
- Verify backend is running: `curl http://localhost:8000/api/health`
- Check nginx configuration: `nginx -t`
- Check nginx error logs: `tail -f /var/log/nginx/error.log`

**Issue: Database connection errors**
- Check database file exists
- Verify file permissions
- Check disk space: `df -h`

**Issue: CORS errors in browser**
- Check CORS middleware configuration in backend
- Verify frontend URL matches CORS allowed origins
- Check browser console for exact error

---

## Communication Protocol

### When to Notify Other Agents

**All Engineers:**
- Deployment scheduled (give advance notice)
- Build process changes
- New environment variables required

**Backend-Core-Engineer:**
- Backend build fails
- Production backend issues
- Server configuration changes

**Frontend-Engineer:**
- Frontend build fails
- nginx configuration changes
- Static asset serving issues

**Tech-Lead:**
- Deployment completed
- Build pipeline issues
- Infrastructure changes needed
- Downtime required

---

## Resources

### Documentation
- PyInstaller: https://pyinstaller.org/
- Tauri: https://tauri.app/
- Docker: https://docs.docker.com/
- nginx: https://nginx.org/en/docs/
- GitHub Actions: https://docs.github.com/en/actions

### Internal References
- Project overview: `/docs/project-overview.md`
- Build scripts: `/scripts/`
- Tauri config: `/frontend/src-tauri/tauri.conf.json`

---

## Quick Reference Commands

```bash
# Build backend executable
./scripts/build-backend.sh

# Build Tauri desktop app
cd frontend
npm run tauri:build

# Build frontend for web
cd frontend
npm run build

# Docker build
docker-compose build
docker-compose up -d

# Check backend service status
sudo systemctl status jira-worklog-backend

# View backend logs
sudo journalctl -u jira-worklog-backend -f

# Test nginx config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Generate SSL cert (Let's Encrypt)
sudo certbot --nginx -d yourdomain.com
```
