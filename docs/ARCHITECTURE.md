# Architecture Overview

## Stack Tecnologico

| Layer | Tecnologia | Versione | Scopo |
|-------|-----------|----------|-------|
| **Backend API** | FastAPI | 0.109.0 | Framework web async |
| **Server** | Uvicorn | 0.27.0 | ASGI server |
| **Database** | SQLite | aiosqlite 0.19.0 | Storage locale async |
| **HTTP Client** | httpx | 0.26.0 | Chiamate API JIRA/Tempo |
| **Auth** | OAuth 2.0 + JWT | authlib 1.3.0 | Autenticazione Google |
| **Validazione** | Pydantic | 2.5.3 | Data models & validation |
| **Frontend** | React | 18.2.0 | UI library |
| **Build Tool** | Vite | 5.0.10 | Bundler + HMR |
| **Styling** | Tailwind CSS | 3.4.0 | Utility-first CSS |
| **Charts** | Recharts | 2.10.3 | Visualizzazione dati |
| **Routing** | React Router | 6.21.0 | SPA navigation |
| **Date Utility** | date-fns | 3.2.0 | Gestione date |
| **Desktop** | Tauri | 2.9.5 | App nativa cross-platform |
| **Desktop Runtime** | Rust | 1.77+ | Tauri backend |
| **Excel Export** | openpyxl | 3.1.2 | Export fatture |
| **Email** | aiosmtplib + SendGrid | 3.0.1 / 6.11.0 | Inviti e notifiche |

---

## Architettura Generale

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                 │
│                                                                     │
│  ┌──────────────────┐    ┌──────────────────┐                      │
│  │   Web Browser     │    │   Tauri Desktop   │                     │
│  │   (React SPA)     │    │   (React + Rust)  │                     │
│  │   Port 5173       │    │   Window 1280x800 │                     │
│  └────────┬─────────┘    └────────┬─────────┘                      │
│           │ /api proxy            │ http://localhost:8000/api        │
└───────────┼───────────────────────┼─────────────────────────────────┘
            │                       │
            ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND LAYER (FastAPI)                        │
│                      Port 8000 - Uvicorn ASGI                       │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    MIDDLEWARE STACK                            │   │
│  │  ┌──────────┐  ┌──────────────────┐  ┌──────────────────┐   │   │
│  │  │   CORS   │→│ CompanyContext MW  │→│  Logging MW       │   │   │
│  │  │          │  │ (JWT → company_id)│  │ (req/res capture) │   │   │
│  │  └──────────┘  └──────────────────┘  └──────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    API ROUTERS (14)                            │   │
│  │                                                               │   │
│  │  /api/auth        → OAuth login, JWT, refresh, logout         │   │
│  │  /api/dashboard   → Statistiche globali, trend giornalieri    │   │
│  │  /api/teams       → Metriche team, membri, distribuzione      │   │
│  │  /api/users       → Worklog utente, ore giornaliere           │   │
│  │  /api/epics       → Vista epic con ore e contributori         │   │
│  │  /api/issues      → Dettaglio issue con worklogs              │   │
│  │  /api/sync        → Trigger sync JIRA/Tempo manuale           │   │
│  │  /api/settings    → CRUD team, utenti, istanze, holidays      │   │
│  │  /api/billing     → Clienti, progetti, fatturazione           │   │
│  │  /api/packages    → Template pacchetti, creazione issue        │   │
│  │  /api/logs        → Log applicativi con filtri                 │   │
│  │  /api/factorial   → Integrazione HR, ferie/assenze            │   │
│  │  /api/invitations → Gestione inviti utenti                     │   │
│  │  /api/health      → Health check (pubblico)                    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    BUSINESS LOGIC                              │   │
│  │                                                               │   │
│  │  billing.py      → Calcolo ore fatturabili, rate, invoice     │   │
│  │  holidays.py     → Gestione festività e giorni lavorativi     │   │
│  │  demo_data.py    → Generazione dati demo                      │   │
│  │  email_service.py→ Invio email (SMTP / SendGrid)              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    DATA LAYER                                  │   │
│  │                                                               │   │
│  │  cache.py (WorklogStorage)                                    │   │
│  │  ├── 24 tabelle SQLite con aiosqlite                          │   │
│  │  ├── 40+ indici per performance                               │   │
│  │  ├── TTL-based caching per worklogs/epics                     │   │
│  │  └── Multi-tenant: ogni query filtra per company_id           │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
            │                               │
            ▼                               ▼
┌──────────────────────┐     ┌──────────────────────────────────────┐
│    SQLite Database    │     │       EXTERNAL SERVICES              │
│                       │     │                                      │
│  worklog_storage.db   │     │  ┌─────────────┐  ┌──────────────┐  │
│  ├── Auth tables      │     │  │ JIRA REST    │  │ Tempo REST   │  │
│  ├── Config tables    │     │  │ API v3       │  │ API v4       │  │
│  ├── Worklog cache    │     │  │ (httpx)      │  │ (httpx)      │  │
│  ├── Billing tables   │     │  └─────────────┘  └──────────────┘  │
│  └── Log tables       │     │                                      │
└──────────────────────┘     │  ┌─────────────┐  ┌──────────────┐  │
                              │  │ Google OAuth │  │ Factorial HR │  │
                              │  │ 2.0         │  │ API          │  │
                              │  └─────────────┘  └──────────────┘  │
                              │                                      │
                              │  ┌─────────────┐                     │
                              │  │ SendGrid /   │                    │
                              │  │ SMTP Email   │                    │
                              │  └─────────────┘                     │
                              └──────────────────────────────────────┘
```

---

## Struttura Directory del Progetto

```
jira-worklog-dashboard/
│
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app, lifespan, middleware
│   │   ├── cache.py                # Storage layer (4965 righe, 24 tabelle)
│   │   ├── models.py               # 84 Pydantic models
│   │   ├── config.py               # Config loader (YAML / DB / demo)
│   │   ├── jira_client.py          # JIRA REST API v3 client
│   │   ├── tempo_client.py         # Tempo Timesheets API v4 client
│   │   ├── factorial_client.py     # Factorial HR API client
│   │   ├── billing.py              # Billing calculation engine
│   │   ├── holidays.py             # Holiday utilities
│   │   ├── demo_data.py            # Sample data generator
│   │   ├── email_service.py        # Email service (SMTP/SendGrid)
│   │   ├── logging_config.py       # Custom logging con DB persistence
│   │   ├── auth_config.py          # OAuth/JWT settings da env
│   │   │
│   │   ├── auth/
│   │   │   ├── jwt.py              # JWT creation/verification
│   │   │   ├── dependencies.py     # get_current_user, require_admin
│   │   │   └── google_oauth.py     # Google OAuth 2.0 flow
│   │   │
│   │   ├── middleware/
│   │   │   └── company_context.py  # Company context injection
│   │   │
│   │   └── routers/                # 14 API router modules
│   │       ├── auth.py             # Login, callback, refresh, logout
│   │       ├── dashboard.py        # Global stats & trends
│   │       ├── teams.py            # Team metrics & CRUD
│   │       ├── users.py            # User worklogs & CRUD
│   │       ├── epics.py            # Epic aggregation
│   │       ├── issues.py           # Issue detail
│   │       ├── sync.py             # JIRA/Tempo sync triggers
│   │       ├── settings.py         # Configuration CRUD
│   │       ├── billing.py          # Billing & invoicing
│   │       ├── packages.py         # Package templates
│   │       ├── logs.py             # Application logs
│   │       ├── factorial.py        # HR integration
│   │       └── invitations.py      # User invitations
│   │
│   ├── tests/
│   │   ├── test_multi_tenant.py    # Security isolation tests
│   │   └── conftest.py             # Test fixtures
│   │
│   ├── requirements.txt            # Python dependencies
│   └── config.yaml                 # Local config (gitignored)
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                 # Routes, global state (dateRange, instance)
│   │   ├── main.jsx                # React entry point
│   │   ├── index.css               # Tailwind + custom utilities
│   │   │
│   │   ├── api/
│   │   │   └── client.js           # API client (858 righe, Tauri-aware)
│   │   │
│   │   ├── hooks/
│   │   │   └── useData.js          # useFetch, formatters, chart colors
│   │   │
│   │   ├── components/
│   │   │   ├── Layout.jsx          # Header, sidebar, navigation (533 righe)
│   │   │   ├── Cards.jsx           # StatCard, ProgressBar, TeamCard, etc.
│   │   │   ├── Charts.jsx          # TrendChart, BarChart, PieChart
│   │   │   ├── ProtectedRoute.jsx  # Auth guard (JWT check)
│   │   │   ├── SyncModal.jsx       # Sync workflow con SSE progress
│   │   │   ├── CreatePackageModal.jsx
│   │   │   ├── MultiJiraStats.jsx  # Multi-instance views
│   │   │   │
│   │   │   ├── WorklogCalendar/    # Calendar view suite
│   │   │   │   ├── WorklogCalendar.jsx
│   │   │   │   ├── CalendarDayCell.jsx
│   │   │   │   ├── WorklogDrawer.jsx
│   │   │   │   └── calendarUtils.js
│   │   │   │
│   │   │   └── settings/           # 13 configuration components
│   │   │       ├── TeamsSection.jsx
│   │   │       ├── UsersSection.jsx
│   │   │       ├── JiraInstancesSection.jsx
│   │   │       ├── HolidaysSection.jsx
│   │   │       ├── PackageTemplatesSection.jsx
│   │   │       ├── FactorialSection.jsx
│   │   │       └── LogsSection.jsx
│   │   │
│   │   └── pages/                  # 11 route pages
│   │       ├── Dashboard.jsx
│   │       ├── TeamsListView.jsx / TeamView.jsx
│   │       ├── UsersListView.jsx / UserView.jsx
│   │       ├── EpicView.jsx
│   │       ├── IssueView.jsx
│   │       ├── Billing.jsx         # (54KB - largest file)
│   │       ├── Settings.jsx
│   │       ├── MultiJiraOverview.jsx
│   │       └── Login.jsx
│   │
│   ├── src-tauri/                  # Tauri desktop wrapper
│   │   ├── tauri.conf.json         # App config (1280x800, CSP, sidecar)
│   │   ├── Cargo.toml              # Rust dependencies
│   │   └── capabilities/           # Security policies
│   │
│   ├── package.json
│   ├── vite.config.js              # Proxy /api → localhost:8000
│   └── tailwind.config.js          # Dark theme, custom colors
│
├── scripts/
│   └── build-backend.sh            # PyInstaller build per Tauri sidecar
│
├── docs/                           # Documentazione
├── CLAUDE.md                       # Developer guidelines
└── README.md                       # Quick start (Italian)
```

---

## Authentication Flow

### Google OAuth 2.0 + JWT

```
┌──────────┐     ┌──────────────┐     ┌───────────────┐     ┌──────────┐
│  Browser  │     │   FastAPI     │     │  Google OAuth  │     │  SQLite  │
│  (React)  │     │   Backend     │     │  2.0 Server    │     │    DB    │
└─────┬─────┘     └──────┬───────┘     └───────┬───────┘     └────┬─────┘
      │                  │                      │                  │
      │ 1. Click "Login  │                      │                  │
      │    with Google"  │                      │                  │
      │─────────────────>│                      │                  │
      │                  │                      │                  │
      │ 2. Redirect to   │                      │                  │
      │    Google consent │                      │                  │
      │<─────────────────│                      │                  │
      │                  │                      │                  │
      │ 3. User consents │                      │                  │
      │──────────────────┼─────────────────────>│                  │
      │                  │                      │                  │
      │ 4. Redirect with │                      │                  │
      │    auth code     │                      │                  │
      │─────────────────>│                      │                  │
      │                  │ 5. Exchange code for  │                  │
      │                  │    user info          │                  │
      │                  │─────────────────────>│                  │
      │                  │                      │                  │
      │                  │ 6. Google user data   │                  │
      │                  │<─────────────────────│                  │
      │                  │                      │                  │
      │                  │ 7. Lookup/create user │                  │
      │                  │────────────────────────────────────────>│
      │                  │                      │                  │
      │                  │ 8. User record        │                  │
      │                  │<────────────────────────────────────────│
      │                  │                      │                  │
      │ 9. JWT tokens    │                      │                  │
      │    (access +     │                      │                  │
      │     refresh)     │                      │                  │
      │<─────────────────│                      │                  │
      │                  │                      │                  │
      │ 10. API calls    │                      │                  │
      │  Authorization:  │                      │                  │
      │  Bearer <JWT>    │                      │                  │
      │─────────────────>│                      │                  │
      │                  │ 11. Verify JWT,       │                  │
      │                  │     extract company_id│                  │
      │                  │     + role             │                  │
      │                  │────────────────────────────────────────>│
      │                  │     WHERE company_id=? │                  │
      │ 12. Scoped data  │                      │                  │
      │<─────────────────│                      │                  │
```

### JWT Token Structure

```json
{
  "sub": "42",                    // user_id
  "email": "user@company.com",
  "company_id": 1,               // tenant isolation key
  "role": "ADMIN",               // ADMIN | MANAGER | USER
  "jti": "unique-token-id",      // per-token revocation
  "exp": 1707580800,             // 30 min expiry (configurable)
  "type": "access"
}
```

### User Registration Logic

```
OAuth Callback →
  ├── Utente esistente?    → Aggiorna last_login, genera JWT
  ├── Invito pendente?     → Crea utente da invito, assegna company_id
  ├── Primo utente in DB?  → Auto-crea company + utente ADMIN
  └── Nessun invito?       → 403 Forbidden (invito obbligatorio)
```

### Role-Based Access Control

| Ruolo | Lettura dati | Gestione team | Billing | Impostazioni | Inviti |
|-------|:----------:|:----------:|:-------:|:------------:|:------:|
| USER | propri dati | - | - | - | - |
| MANAGER | tutti | team propri | preview | limitato | - |
| ADMIN | tutti | tutti | completo | completo | crea/gestisci |

---

## Pattern Multi-Tenant

### Principio: Explicit Parameter Passing

Ogni livello dell'architettura passa esplicitamente `company_id` come parametro. Non vengono usate variabili di contesto implicite.

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────────┐
│   JWT Token   │────>│  Router Layer     │────>│   Storage Layer      │
│               │     │                   │     │                      │
│ company_id: 1 │     │ current_user      │     │ company_id: int      │
│ role: ADMIN   │     │   .company_id → 1 │     │ WHERE company_id = ? │
└──────────────┘     └──────────────────┘     └──────────────────────┘
```

### Router Pattern

```python
@router.get("/teams")
async def list_teams(current_user: CurrentUser = Depends(get_current_user)):
    storage = get_storage()
    return await storage.get_all_teams(current_user.company_id)
```

### Storage Pattern

```python
async def get_all_teams(self, company_id: int) -> list[dict]:
    if not company_id:
        raise ValueError("company_id required")
    async with aiosqlite.connect(self.db_path) as db:
        cursor = await db.execute(
            "SELECT * FROM teams WHERE company_id = ?",
            (company_id,)
        )
        return await cursor.fetchall()
```

### Tabelle con company_id (13 tabelle)

| Tabella | Scopo |
|---------|-------|
| `teams` | Definizioni team |
| `users` | Membri dei team |
| `jira_instances` | Istanze JIRA collegate |
| `worklogs` | Cache worklog JIRA |
| `epics` | Metadata epic |
| `billing_clients` | Clienti fatturazione |
| `billing_projects` | Progetti fatturazione |
| `invoices` | Fatture generate |
| `package_templates` | Template pacchetti |
| `holidays` | Festività |
| `factorial_config` | Config HR |
| `complementary_groups` | Gruppi istanze |
| `logs` | Log applicativi |

### Sicurezza: 404 vs 403

L'accesso cross-company restituisce **404 Not Found** (non 403 Forbidden) per evitare di rivelare l'esistenza di risorse appartenenti ad altri tenant.

---

## Integrazione JIRA e Tempo

### Dual-Client Architecture

L'applicazione supporta due modalità di fetching worklog, selezionate automaticamente per istanza JIRA:

```
┌───────────────────────────────────────────────────────────────────┐
│                     SYNC ENGINE (sync.py)                         │
│                                                                   │
│  Per ogni JIRA Instance:                                          │
│                                                                   │
│  ┌─────────────────┐          ┌─────────────────┐                │
│  │ tempo_api_token  │── YES ──>│  TempoClient     │               │
│  │ configurato?     │          │  REST API v4     │               │
│  │                  │          │  Bearer token    │               │
│  │                  │          │  /worklogs       │               │
│  │                  │── NO ───>│  JiraClient      │               │
│  │                  │          │  REST API v3     │               │
│  │                  │          │  Basic Auth      │               │
│  └─────────────────┘          │  /issue/worklog  │               │
│                                └────────┬────────┘                │
│                                         │                         │
│                                         ▼                         │
│                              ┌──────────────────┐                │
│                              │  WorklogStorage   │                │
│                              │  UPSERT worklogs  │                │
│                              │  + epic enrichment│                │
│                              └──────────────────┘                │
└───────────────────────────────────────────────────────────────────┘
```

### TempoClient (Preferito)

- **API**: Tempo Timesheets REST API v4
- **Auth**: Bearer token (Tempo API token separato)
- **Endpoint**: `GET /worklogs` con filtri `from`, `to`, `worker`
- **Vantaggi**: Query diretta per data range e utente, paginazione efficiente
- **Metodo principale**: `get_worklogs_in_range(start_date, end_date, account_ids)`

### JiraClient (Fallback)

- **API**: JIRA REST API v3
- **Auth**: Basic Auth (email + API token)
- **Endpoint**: `GET /rest/api/3/issue/{key}/worklog`
- **Limiti**: Nessun filtro diretto per data, richiede ricerca issue prima
- **Metodo**: `search_issues_with_worklogs()` → `get_worklogs_for_issue()`

### Complementary Instances

Alcune organizzazioni usano multiple istanze JIRA dove una è primaria (issue) e le altre sono complementari (time tracking). Le ore vanno contate una sola volta.

```
┌─────────────────────────────────────────────────┐
│           Complementary Instance Group            │
│                                                   │
│  ┌──────────────────┐   ┌──────────────────┐    │
│  │ PRIMARY Instance  │   │ SECONDARY Instance│    │
│  │ "Company Main"    │   │ "Time Tracker"    │    │
│  │                   │   │                   │    │
│  │ Issues + Worklogs │   │ Solo Worklogs     │    │
│  └──────────────────┘   └──────────────────┘    │
│                                                   │
│  Vista "All Instances": solo PRIMARY ore           │
│  Vista singola istanza: ore complete               │
└─────────────────────────────────────────────────┘
```

---

## Database Schema

### Schema Overview (24 tabelle)

```
┌─────────────────────────────────────────────────────────────────┐
│                        AUTHENTICATION                            │
│                                                                  │
│  companies ─────┬──── oauth_users ──── auth_sessions            │
│                 │                                                │
│                 ├──── invitations                                │
│                 │                                                │
│                 └──── auth_audit_log                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     CONFIGURATION                                │
│                                                                  │
│  teams ──── users ──── user_jira_accounts                       │
│                  └──── user_factorial_accounts                   │
│                                                                  │
│  jira_instances ──── complementary_groups                       │
│              └────── complementary_group_members                 │
│              └────── jira_instance_issue_types                  │
│                                                                  │
│  holidays                                                        │
│  factorial_config                                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     WORKLOG CACHE                                 │
│                                                                  │
│  worklogs (company_id, issue_key, author_email, seconds, date)  │
│  epics (company_id, key, name, summary, jira_instance)          │
│  sync_history (start_date, end_date, status, worklogs_synced)   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        BILLING                                    │
│                                                                  │
│  billing_clients ──── billing_projects ──── billing_rates       │
│                            │                                     │
│                            ├── billing_project_mappings          │
│                            └── billing_worklog_classifications   │
│                                                                  │
│  invoices ──── invoice_line_items                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       PACKAGES                                    │
│                                                                  │
│  package_templates ──── package_template_elements                │
│                    └──── package_template_instances               │
│                                                                  │
│  linked_issues (cross-instance issue linking)                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       HR INTEGRATION                              │
│                                                                  │
│  factorial_config                                                │
│  factorial_leaves                                                │
│  factorial_sync_history                                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       LOGGING                                     │
│                                                                  │
│  logs (timestamp, level, message, request_id, endpoint,         │
│        method, status_code, duration_ms, company_id)            │
└─────────────────────────────────────────────────────────────────┘
```

### Indici Principali

```sql
-- Worklog queries ottimizzate
idx_worklogs_company_started     (company_id, started DESC)
idx_worklogs_user_range          (company_id, author_email, started DESC)
idx_worklogs_instance_range      (company_id, jira_instance, started DESC)
idx_worklogs_issue               (company_id, issue_key)

-- Team/User lookups
idx_teams_company                (company_id)
idx_users_company_email          (company_id, email)
idx_users_team                   (team_id)

-- Billing queries
idx_billing_clients_company      (company_id)
idx_invoices_company_period      (company_id, period_start, period_end)

-- Log queries
idx_logs_company_timestamp       (company_id, timestamp DESC)
idx_logs_request_id              (request_id)
```

---

## Frontend Architecture

### Routing e State Management

```
App.jsx (Global State)
├── dateRange: { startDate, endDate }      ← Passato a tutte le pagine
├── selectedInstance: string | null         ← null = tutte le istanze
│
├── /login          → Login.jsx            (OAuth / Dev mode)
│
└── <ProtectedRoute>                       (JWT guard)
    └── <Layout>                           (Header + Sidebar + Content)
        ├── /                → Dashboard.jsx
        ├── /teams           → TeamsListView.jsx
        ├── /teams/:name     → TeamView.jsx
        ├── /users           → UsersListView.jsx
        ├── /users/:email    → UserView.jsx
        ├── /epics           → EpicView.jsx
        ├── /epics/:key      → EpicView.jsx
        ├── /issues/:key     → IssueView.jsx
        ├── /billing         → Billing.jsx
        └── /settings        → Settings.jsx
```

### API Client (Tauri-Aware)

```javascript
// Rilevamento automatico ambiente
const isTauri = () => window.__TAURI_INTERNALS__ !== undefined;
const API_BASE = isTauri() ? 'http://localhost:8000/api' : '/api';

// Tutte le chiamate includono JWT Bearer token
headers['Authorization'] = `Bearer ${getAccessToken()}`;

// Error handling: 401 → redirect a /login
if (response.status === 401) {
    handleAuthError();  // Clear tokens, redirect
}
```

### Design System

- **Theme**: Dark mode (GitHub-inspired) con sfondo `#0d1117`
- **Accent colors**: Blue, Green, Purple, Orange, Red, Pink, Cyan
- **Glass morphism**: Effetto frosted glass sulle card (`.glass-card`)
- **Animazioni**: fade-in, slide-up, slide-in-right, pulse-slow
- **Gradienti**: primary (#667eea → #764ba2), success, purple
- **Responsive**: Grid adattivo `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`

---

## Sistema di Billing

### Workflow Fatturazione

```
1. STRUTTURA            2. TARIFFE           3. CLASSIFICAZIONE
┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐
│ Crea Cliente  │───>│ Rate default │───>│ Mark billable/       │
│ Crea Progetto │    │ Rate per     │    │ non-billable per     │
│ Mappa JIRA    │    │ progetto/    │    │ singolo worklog      │
│ project keys  │    │ utente/tipo  │    │                      │
└──────────────┘    └──────────────┘    └──────────┬───────────┘
                                                    │
                                                    ▼
                    4. PREVIEW              5. FATTURA
                    ┌──────────────┐    ┌──────────────────────┐
                    │ Ore fatturab. │───>│ DRAFT → ISSUED → PAID│
                    │ Totali per   │    │ Line items con        │
                    │ progetto     │    │ quantità e tariffe    │
                    └──────────────┘    │ Export Excel           │
                                        └──────────────────────┘
```

### Gerarchia Tariffe (Override Chain)

```
Client default rate (€/h)
  └── Project override rate
       └── User-specific rate
            └── Issue type rate
                 └── Date range rate
                      └── Single worklog override
```

### Invoice Status Flow

```
DRAFT ──────> ISSUED ──────> PAID
  │               │
  └── Modificabile └── Solo consultazione
```

---

## Distribuzione Desktop (Tauri)

### Build Pipeline

```
┌─────────────────────┐     ┌──────────────────────┐
│ scripts/             │     │ frontend/             │
│ build-backend.sh     │     │ npm run tauri:build   │
│                      │     │                       │
│ 1. Detect platform   │     │ 1. Vite build (dist/) │
│ 2. Create venv       │     │ 2. Tauri bundles:     │
│ 3. PyInstaller       │     │    - macOS: .dmg      │
│ 4. Output binary to  │────>│    - Windows: .msi    │
│    src-tauri/binaries/│     │    - Linux: .AppImage  │
└─────────────────────┘     └──────────────────────┘

Platform targets:
  - aarch64-apple-darwin    (macOS Apple Silicon)
  - x86_64-apple-darwin     (macOS Intel)
  - x86_64-unknown-linux-gnu (Linux)
  - x86_64-pc-windows-msvc  (Windows)
```

### Runtime Architecture (Desktop)

```
┌──────────────────────────────────────────┐
│              Tauri Application            │
│                                          │
│  ┌────────────────┐  ┌────────────────┐  │
│  │  Webview        │  │  Backend       │  │
│  │  (React SPA)    │  │  (Sidecar)     │  │
│  │                 │  │                │  │
│  │  http://        │──│ localhost:8000 │  │
│  │  localhost:5173  │  │                │  │
│  └────────────────┘  └────────────────┘  │
│                                          │
│  Window: 1280x800 (min 900x600)         │
│  CSP: self + *.atlassian.net             │
└──────────────────────────────────────────┘
```

---

## Middleware Stack

L'ordine dei middleware (dal più esterno al più interno):

```
Request →
  1. CORSMiddleware
     │  Origins: localhost:5173, localhost:3000, 127.0.0.1:5173, tauri://localhost
     ▼
  2. CompanyContextMiddleware
     │  Estrae company_id dal JWT → context variable
     ▼
  3. LoggingMiddleware
     │  - Genera Request ID (X-Request-ID)
     │  - Cattura request body (max 10KB)
     │  - Cattura response body (max 10KB)
     │  - Misura durata (ms)
     │  - Flush logs su DB
     ▼
  4. Router Handler
     │  Depends(get_current_user) → CurrentUser
     ▼
  Response ←
```

---

## Configurazione

### Gerarchia di Configurazione (Priorità)

```
1. Database SQLite     ← Massima priorità (multi-tenant)
2. config.yaml         ← Fallback per dev locale
3. Demo mode           ← Auto-attivato se nessuna config
```

### Variabili d'Ambiente (.env)

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/callback
GOOGLE_REDIRECT_URI_TAURI=jira-worklog://auth/callback

# JWT
JWT_SECRET_KEY=<openssl rand -hex 32>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=30
INVITATION_EXPIRE_HOURS=72

# Email (SMTP locale o SendGrid produzione)
EMAIL_PROVIDER=smtp|sendgrid
SENDGRID_API_KEY=SG.xxxxx
FROM_EMAIL=noreply@jira-worklog.local
```

---

## Logging e Observability

### Architettura Logging

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│ LoggingMiddleware │→│ logging_config.py │→│ SQLite logs  │
│                   │  │                   │  │ table        │
│ - Request ID      │  │ - Custom handler  │  │              │
│ - Body capture    │  │ - DB persistence  │  │ Queryable    │
│ - Duration (ms)   │  │ - Level filtering │  │ via /api/logs│
│ - Status code     │  │                   │  │              │
└──────────────────┘  └──────────────────┘  └──────────────┘
```

### Campi Log

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `timestamp` | datetime | Momento dell'evento |
| `level` | string | DEBUG, INFO, WARNING, ERROR |
| `logger_name` | string | Modulo sorgente |
| `message` | text | Messaggio log |
| `request_id` | string | Correlazione request |
| `endpoint` | string | Path API chiamato |
| `method` | string | GET, POST, PUT, DELETE |
| `status_code` | int | HTTP response code |
| `duration_ms` | float | Durata request |
| `extra_data` | json | Dati aggiuntivi |
| `company_id` | int | Tenant di appartenenza |

---

## Testing

### Framework e Struttura

- **Framework**: pytest + pytest-asyncio
- **Database test**: `test_worklog_storage.db` isolato (mai produzione)
- **Coverage**: 20 test case per sicurezza multi-tenant

### Test Principali

```
tests/
├── test_multi_tenant.py    # Isolamento tenant, auth, 401/403
└── conftest.py             # Fixtures: test DB, mock users, cleanup
```

### Cosa Testano

1. **Autenticazione**: Token invalido → 401
2. **Autorizzazione**: Ruolo insufficiente → 403
3. **Isolamento**: Company A non vede dati Company B → 404
4. **Credenziali**: JIRA tokens non esposti in API response
5. **Migration**: Legacy data (NULL company_id) → company_id=1
