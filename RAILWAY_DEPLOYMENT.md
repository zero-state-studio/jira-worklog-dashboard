# 🚂 Railway Deployment Guide

Deploy JIRA Worklog Dashboard to Railway with **PostgreSQL** in 5 minuti.

---

## ✅ Prerequisites Completed

- [x] Backend migrated from SQLite to PostgreSQL
- [x] All 77 storage methods converted to asyncpg
- [x] Local PostgreSQL tested and working
- [x] Database schema migration ready

---

## 📋 Pre-Deploy Setup

1. **Account Railway** - Registrati gratis su [railway.app](https://railway.app)
2. **GitHub Repository** - Il progetto deve essere su GitHub
3. **Google OAuth Credentials** - Dalla Google Cloud Console

---

## 🚀 Deploy in 5 Passi

### **1. Push PostgreSQL Migration to GitHub**

```bash
# Commit migrations e modifiche
git add backend/migrations/ backend/app/database.py backend/app/cache.py
git commit -m "Migrate from SQLite to PostgreSQL"
git push origin main
```

### **2. Crea Progetto Railway con PostgreSQL**

**Via Dashboard:**
1. Vai su [railway.app/new](https://railway.app/new)
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Seleziona `jira-worklog-dashboard`
4. Click **"Add PostgreSQL"** (Railway crea automaticamente il database)

**Via CLI (alternativa):**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create project
railway init

# Add PostgreSQL
railway add postgresql
```

### **3. Applica Database Migration**

```bash
# Get PostgreSQL connection string from Railway
railway variables

# Copy the DATABASE_URL (sarà tipo):
# postgresql://postgres:xxxxx@containers-us-west-xxx.railway.app:5432/railway

# Apply schema migration
export DATABASE_URL="<paste your Railway DATABASE_URL here>"
cd backend/migrations
psql "$DATABASE_URL" -f 001_initial_schema.sql
```

Output atteso:
```
CREATE EXTENSION
CREATE TABLE (x24)
CREATE INDEX (x40+)
INSERT 0 1 ✅
```

### **4. Configura Environment Variables**

Nel dashboard Railway, vai su **Variables** e aggiungi:

#### **Obbligatorie:**

```bash
# Database (auto-configurata da Railway)
DATABASE_URL=postgresql://postgres:xxx@containers-us-west-xxx.railway.app:5432/railway

# Encryption (genera con: openssl rand -hex 32)
ENCRYPTION_KEY=your-encryption-key-64-chars-hex

# JWT (genera con: openssl rand -hex 32)
JWT_SECRET_KEY=your-jwt-secret-64-chars-hex
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
REFRESH_TOKEN_EXPIRE_DAYS=30

# Google OAuth (dalla Google Cloud Console)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Redirect URI (aggiorna con il tuo Railway domain)
GOOGLE_REDIRECT_URI=https://your-app.railway.app/api/auth/callback
GOOGLE_REDIRECT_URI_TAURI=jira-worklog://auth/callback
```

#### **Opzionali:**

```bash
# Invitation Settings
INVITATION_EXPIRE_HOURS=72

# Email Configuration (SMTP o SendGrid)
EMAIL_PROVIDER=smtp
SMTP_HOST=localhost
SMTP_PORT=1025
FROM_EMAIL=noreply@jira-worklog.app

# Application Settings
ENVIRONMENT=production
LOG_LEVEL=INFO
DEV_MODE=false

# Frontend URL
FRONTEND_URL=https://your-app.railway.app

# JIRA/Tempo (configurabili dopo via UI)
JIRA_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_TOKEN=your-jira-api-token
TEMPO_TOKEN=your-tempo-api-token
```

### **5. Configurazione Google OAuth**

1. Vai su [Google Cloud Console](https://console.cloud.google.com)
2. Crea un nuovo progetto (o usa esistente)
3. Abilita **Google+ API**
4. Vai su **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Tipo applicazione: **Web application**
6. **Authorized redirect URIs:** Aggiungi:
   ```
   https://your-app-name.up.railway.app/api/auth/callback
   ```
   *(Sostituisci `your-app-name` con il tuo domain Railway)*

7. Copia **Client ID** e **Client Secret**
8. Aggiungili alle env vars su Railway (passo 4)

---

## ✅ Verifica Deploy

### **1. Check Build Logs**

Nel dashboard Railway, apri **Deployments** → **View Logs** e verifica:

```
✓ Installing Python dependencies...
✓ asyncpg==0.29.0 installed
✓ PostgreSQL connection pool created
✓ Application startup complete
```

### **2. Test Health Endpoint**

```bash
curl https://your-app.railway.app/api/health
```

Risposta attesa:
```json
{
  "status": "healthy",
  "database": "connected",
  "demo_mode": false,
  "jira_instances": 1
}
```

### **3. Verifica Database PostgreSQL**

```bash
# Get database URL
railway variables | grep DATABASE_URL

# Connect to database
psql "<DATABASE_URL>"

# Check tables
\dt

# Verify default company
SELECT * FROM companies;
```

### **3. Accedi all'App**

Apri il browser su:
```
https://your-app-name.up.railway.app
```

Dovresti vedere la UI React. Login con Google OAuth per iniziare.

---

## 🔧 Troubleshooting

### **Problema: Database Connection Error**

**Errore:** `ValueError: DATABASE_URL environment variable is required`

**Soluzione:**
1. Verifica che Railway abbia aggiunto PostgreSQL al progetto
2. Check Variables tab → `DATABASE_URL` deve esistere
3. Railway lo setta automaticamente quando aggiungi PostgreSQL

### **Problema: Migration Fails**

**Errore:** `relation "companies" already exists`

**Soluzione:** Database già migrato - puoi saltare la migration o usare:
```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
-- Poi riesegui 001_initial_schema.sql
```

### **Problema: Connection Pool Error**

**Errore:** `too many connections for role "postgres"`

**Soluzione:** Railway Hobby plan ha limite di 20 connessioni. Nel codice:
```python
# In database.py, riduci pool size
max_size=10  # invece di 20
```

### **Problema: Frontend Shows 404**

**Errore:** Tutte le route danno 404

**Soluzione:** Verifica che:
1. `frontend/dist/` esista nel build (check logs)
2. `backend/app/main.py` contiene il codice aggiunto per StaticFiles
3. Rebuild del deploy: Settings → Redeploy

### **Problema: Google OAuth Redirect Mismatch**

**Errore:** `redirect_uri_mismatch`

**Soluzione:**
1. Copia il domain esatto da Railway (es. `your-app-123abc.up.railway.app`)
2. Aggiorna Google Cloud Console → Credentials → Authorized redirect URIs
3. Usa HTTPS, non HTTP
4. Aggiorna `GOOGLE_REDIRECT_URI` env var su Railway

---

## 💰 Costi Stimati

| Risorsa | Uso Mensile | Costo |
|---------|-------------|-------|
| **Railway Hobby Plan** | 500 ore/mese | **$5/mese** |
| **PostgreSQL Database** | 512MB - 1GB | **~$5-10/mese** |
| **Bandwidth** | ~50GB/mese | **Incluso** |
| **TOTALE** | | **~$10-15/mese** |

**Note:**
- Piano Hobby: $5/mese per il backend
- PostgreSQL: pricing pay-per-use basato su storage e query
- 500 ore = ~20 giorni uptime continuo
- Per 24/7 uptime: upgrade a Developer Plan ($20/mese + database)
- Free tier: $5 credit/mese (può coprire sviluppo/testing)

---

## 🔄 Auto-Deploy da GitHub

Railway è già configurato per **auto-deploy ad ogni push**:

```bash
# Fai modifiche
git add .
git commit -m "Update feature X"
git push origin main

# Railway rebuilda e deploya automaticamente (2-5 min)
```

Puoi disabilitare auto-deploy in:
**Settings** → **Service** → **Auto Deploy** → OFF

---

## 📊 Monitoring

### **View Logs in Real-Time**

```bash
# Nel dashboard Railway
Deployments → Latest → View Logs

# Oppure usa Railway CLI
railway logs --tail
```

### **Metriche (CPU, RAM, Network)**

Railway mostra:
- **CPU usage** - dovrebbe stare sotto 50%
- **Memory** - FastAPI + SQLite ~200-400MB
- **Network** - bandwidth in/out

---

## 🛡️ Sicurezza & Backup

### **HTTPS Automatico**

✅ Railway fornisce **HTTPS automatico** con certificato SSL gratis

### **Environment Variables**

✅ Le env vars sono **cifrate** e non visibili nei logs

### **Database Backups (PostgreSQL)**

Railway **NON fa backup automatici** - devi configurarli manualmente.

**Soluzione consigliata:**

```bash
# Backup manuale (esegui periodicamente)
pg_dump "<DATABASE_URL>" > backup_$(date +%Y%m%d).sql

# Restore da backup
psql "<DATABASE_URL>" < backup_20260215.sql
```

**Backup automatico con GitHub Actions:**

Crea `.github/workflows/backup.yml`:
```yaml
name: Database Backup
on:
  schedule:
    - cron: '0 2 * * *'  # Ogni giorno alle 2 AM
jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Backup PostgreSQL
        env:
          DATABASE_URL: ${{ secrets.RAILWAY_DATABASE_URL }}
        run: |
          pg_dump "$DATABASE_URL" > backup.sql
      - name: Upload to S3/Dropbox
        # ... configura upload
```

---

## 🔗 Custom Domain (Opzionale)

### **Aggiungi Dominio Personalizzato**

1. Railway Dashboard → Settings → **Domains**
2. Click **Add Domain**
3. Inserisci: `dashboard.yourcompany.com`
4. Railway ti darà un CNAME record
5. Aggiungi il CNAME al tuo DNS provider:
   ```
   CNAME dashboard your-app-123abc.up.railway.app
   ```
6. Attendi propagazione DNS (5-60 min)
7. HTTPS automatico anche sul custom domain!

---

## 🎉 Deploy Completato!

Il tuo JIRA Worklog Dashboard è ora **live in production** su Railway.

**Prossimi passi:**

1. ✅ Configura JIRA instances via UI
2. ✅ Invita team members
3. ✅ Esegui prima sync da Settings → JIRA Instances
4. ✅ Configura billing clients/projects
5. ✅ Genera prima invoice!

---

## 🆘 Support

- **Railway Docs:** https://docs.railway.app
- **Railway Discord:** https://discord.gg/railway
- **Issue Tracker:** GitHub Issues del progetto

---

**Pro Tip:** Usa Railway CLI per deploy più veloci:

```bash
# Install
npm i -g @railway/cli

# Login
railway login

# Link progetto
railway link

# Deploy locale (senza push GitHub)
railway up

# Logs real-time
railway logs
```
