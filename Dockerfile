# ============================================================================
# STAGE 1: Build Frontend (React + Vite)
# ============================================================================
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy frontend source
COPY frontend/ ./

# Build for production
RUN npm run build

# ============================================================================
# STAGE 2: Setup Backend (FastAPI + Python)
# ============================================================================
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements
COPY backend/requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ ./backend/

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Create directory for SQLite database
RUN mkdir -p /app/data

# Set default database path (Railway volume will persist this)
ENV DATABASE_PATH=/app/data/worklog_storage.db

# Expose port (Railway sets $PORT env var)
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')" || exit 1

# Start command (Railway will override with $PORT)
CMD uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}
