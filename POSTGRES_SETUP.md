# 🐘 PostgreSQL Setup Guide

Guida completa per configurare PostgreSQL locale e su Railway.

---

## 📍 Setup Locale (macOS)

### 1. Installa e Avvia PostgreSQL

```bash
# Esegui lo script di setup automatico
cd backend
./setup_local_postgres.sh
```

Lo script:
- ✅ Installa PostgreSQL 15 via Homebrew  
- ✅ Avvia il servizio
- ✅ Crea database `jira_worklog_dev`
- ✅ Crea user `jira_user` con password `dev_password_123`
- ✅ Assegna permessi

### 2. Applica Migration

```bash
# Imposta DATABASE_URL
export DATABASE_URL="postgresql://jira_user:dev_password_123@localhost:5432/jira_worklog_dev"

# Applica schema
cd migrations
./apply_migration.sh
```

### 3. Configura .env

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

### 4. Avvia Backend

```bash
cd backend
source venv/bin/activate
pip install asyncpg==0.29.0
uvicorn app.main:app --reload
```

---

## ☁️ Setup Railway

Vedi il file per i dettagli completi su Railway setup.
