# JIRA Worklog Dashboard

Dashboard locale per visualizzare i worklog JIRA con supporto multi-team e multi-istanza.

![Dashboard Screenshot](docs/screenshot.png)

## ✨ Funzionalità

- 📊 **Dashboard Globale**: totale ore, trend giornaliero, breakdown per team
- 👥 **Vista Team**: ore per membro, distribuzione su Epic
- 👤 **Vista Utente**: dettaglio worklog, ore per Epic, grafico giornaliero
- ⚡ **Vista Epic**: tutte le Epic con ore totali e contributori
- 🔗 **Multi-istanza**: connessione a 2+ istanze JIRA Cloud
- 📅 **Filtro Date**: date picker per selezionare il periodo
- 💾 **Cache Locale**: SQLite per non sovraccaricare le API JIRA
- 🌙 **Tema Scuro**: design moderno con grafici interattivi

## 🚀 Quick Start

### Demo Mode (senza credenziali JIRA)

```bash
# Avvia il backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# In un altro terminale, avvia il frontend
cd frontend
npm install
npm run dev
```

Apri http://localhost:5173 per vedere la dashboard con dati demo.

### Produzione (con credenziali JIRA reali)

1. **Crea un API Token JIRA**:
   - Vai su https://id.atlassian.com/manage-profile/security/api-tokens
   - Crea un nuovo token e copialo

2. **Configura le credenziali**:
   ```bash
   cd backend
   cp config.yaml.example config.yaml
   # Modifica config.yaml con le tue credenziali
   ```

3. **Disabilita demo mode** in `config.yaml`:
   ```yaml
   settings:
     demo_mode: false
   ```

4. **Avvia i servizi** come nel Quick Start

## 📁 Struttura Progetto

```
jira-worklog-dashboard/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI entry point
│   │   ├── config.py         # YAML config loader
│   │   ├── jira_client.py    # JIRA REST API client
│   │   ├── cache.py          # SQLite cache
│   │   ├── models.py         # Pydantic models
│   │   ├── demo_data.py      # Demo data generator
│   │   └── routers/          # API endpoints
│   ├── config.yaml           # Configuration (demo)
│   ├── config.yaml.example   # Configuration template
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── pages/           # Page views
│   │   ├── api/             # API client
│   │   └── hooks/           # Custom hooks
│   ├── src-tauri/            # Tauri desktop app
│   │   ├── src/lib.rs        # Tauri Rust code
│   │   ├── tauri.conf.json   # Tauri configuration
│   │   └── binaries/         # Backend sidecar
│   ├── package.json
│   └── tailwind.config.js
├── scripts/
│   └── build-backend.sh      # Script per build backend
└── README.md
```

## ⚙️ Configurazione

### config.yaml

```yaml
# Istanze JIRA
jira_instances:
  - name: "Company Main"
    url: "https://your-company.atlassian.net"
    email: "your.email@company.com"
    api_token: "your-api-token"

# Team e membri
teams:
  - name: "Frontend Team"
    members:
      - email: "mario.rossi@company.com"
        first_name: "Mario"
        last_name: "Rossi"

# Impostazioni
settings:
  daily_working_hours: 8
  timezone: "Europe/Rome"
  cache_ttl_seconds: 900
  demo_mode: false
```

## 🔌 API Endpoints

| Endpoint | Descrizione |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET /api/config` | Configurazione (non sensibile) |
| `GET /api/dashboard?start_date=&end_date=` | Dashboard globale |
| `GET /api/teams` | Lista team |
| `GET /api/teams/{name}?start_date=&end_date=` | Dettaglio team |
| `GET /api/users` | Lista utenti |
| `GET /api/users/{email}?start_date=&end_date=` | Dettaglio utente |
| `GET /api/epics?start_date=&end_date=` | Lista epic |
| `GET /api/epics/{key}?start_date=&end_date=` | Dettaglio epic |
| `POST /api/cache/clear` | Svuota cache |

## 🖥️ Desktop App (Tauri)

L'applicazione può essere eseguita anche come app desktop nativa usando Tauri.

### Sviluppo Desktop

```bash
# 1. Avvia il backend Python (in un terminale)
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# 2. Avvia l'app desktop (in un altro terminale)
cd frontend
npm run tauri:dev
```

### Build Desktop per Distribuzione

```bash
# 1. Compila il backend Python come eseguibile
./scripts/build-backend.sh

# 2. Compila l'app desktop
cd frontend
npm run tauri:build
```

L'app compilata sarà disponibile in `frontend/src-tauri/target/release/bundle/`.

### Requisiti Tauri

- **Rust** - `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- **Xcode Command Line Tools** (macOS) - `xcode-select --install`

## 🛠️ Stack Tecnico

### Backend
- **Python 3.11+**
- **FastAPI** - Framework web async
- **httpx** - Client HTTP async per JIRA API
- **aiosqlite** - Database SQLite async per cache
- **pydantic** - Validazione dati
- **PyYAML** - Parsing configurazione

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Recharts** - Grafici
- **React Router** - Routing
- **date-fns** - Utilità date

### Desktop (opzionale)
- **Tauri 2** - Framework per app desktop native
- **Rust** - Backend Tauri

## 📝 License

MIT

---

Made with ❤️ for JIRA users
