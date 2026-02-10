# Roadmap

## Overview

Questa roadmap definisce le direttrici di sviluppo del JIRA Worklog Dashboard, organizzate per priorità e impatto. Le feature sono raggruppate in fasi incrementali che possono essere sviluppate in parallelo.

---

## Fase 1: Fondamenta per la Scalabilità

> Priorità: **CRITICA** | Timeline: Q1 2026

### 1.1 Migrazione a PostgreSQL

**Motivazione**: SQLite non supporta accessi concorrenti in scrittura, limitando il deployment multi-server e la scalabilità oltre ~100 utenti simultanei.

**Scope**:
- [ ] Astrazione database layer (supporto dual SQLite/PostgreSQL)
- [ ] Schema migration da SQLite a PostgreSQL
- [ ] Connection pooling con asyncpg
- [ ] Adattamento query SQLite-specifiche (es. `REPLACE INTO` → `INSERT ON CONFLICT`)
- [ ] Backup automatici e point-in-time recovery
- [ ] Migration tool per clienti esistenti (SQLite → PostgreSQL)

**Impatto**: Sblocca deployment cloud multi-server, auto-scaling, e supporto per centinaia di aziende contemporaneamente.

**Rischi**:
- Alcune query SQLite-specifiche richiedono riscrittura
- Test regression su tutte le 24 tabelle
- Periodo di transizione con supporto dual-database

---

### 1.2 Fix Constraint Multi-Tenant

**Motivazione**: Attualmente i constraint UNIQUE su `teams(name)`, `users(email)`, `jira_instances(name)` sono globali invece che per company. Questo impedisce a due aziende di avere team con lo stesso nome.

**Scope**:
- [ ] `UNIQUE(name)` → `UNIQUE(company_id, name)` su teams
- [ ] `UNIQUE(email)` → `UNIQUE(company_id, email)` su users
- [ ] `UNIQUE(name)` → `UNIQUE(company_id, name)` su jira_instances
- [ ] Aggiunta `company_id` esplicito a `complementary_group_members`
- [ ] Migration con ricreazione tabelle (limitazione SQLite)

**Impatto**: Isolamento tenant completo, prerequisito per onboarding di nuove aziende.

**Downtime stimato**: ~30 minuti per migrazione tabelle.

---

### 1.3 Gestione Crescita Logs

**Motivazione**: La tabella `logs` cresce di 50-100K righe/mese senza meccanismo di pulizia. A regime: ~3.6M righe in 3 anni.

**Scope**:
- [ ] Policy di retention configurabile (es. 90 giorni)
- [ ] Job di pulizia automatico (cron o background task)
- [ ] Archivio logs storici su file system
- [ ] Monitoring: alert quando DB > 2GB
- [ ] Dashboard di sistema con metriche DB size

**Impatto**: Previene degradazione performance nel lungo periodo.

---

## Fase 2: Report e Analytics Avanzati

> Priorità: **ALTA** | Timeline: Q2 2026

### 2.1 Report PDF / Excel Avanzati

**Motivazione**: I clienti necessitano di report formali da condividere con stakeholder che non accedono alla dashboard.

**Scope**:
- [ ] Generazione report PDF (template personalizzabili)
- [ ] Report settimanale/mensile con grafici embedded
- [ ] Export Excel avanzato con multiple sheet (summary + dettaglio)
- [ ] Template report per tipo: team summary, user detail, billing summary
- [ ] Branding personalizzabile (logo azienda, colori)

---

### 2.2 Scheduled Reports via Email

**Scope**:
- [ ] Configurazione schedule (giornaliero, settimanale, mensile)
- [ ] Selezione destinatari per report
- [ ] Report automatici con allegato PDF/Excel
- [ ] Dashboard personalizzabili per ruolo (Admin vs Manager vs User)

---

### 2.3 Analytics Predittivi

**Scope**:
- [ ] Trend analysis con proiezioni (ore rimanenti vs budget)
- [ ] Alert automatici: pacchetto ore in esaurimento, sforamento budget
- [ ] Confronto periodo-su-periodo (es. Gennaio vs Febbraio)
- [ ] Heatmap attività team (giorni più/meno produttivi)
- [ ] Velocity tracking per epic/progetto

---

## Fase 3: Integrazioni Comunicazione

> Priorità: **ALTA** | Timeline: Q2-Q3 2026

### 3.1 Integrazione Slack

**Scope**:
- [ ] Slack Bot per notifiche automatiche
- [ ] Daily digest: "Oggi il team ha loggato X ore"
- [ ] Weekly summary nel canale team
- [ ] Comando `/worklog` per consultazione rapida
- [ ] Alert: utente non ha loggato ore negli ultimi 2 giorni
- [ ] Notifica pacchetto ore in esaurimento

---

### 3.2 Integrazione Microsoft Teams

**Scope**:
- [ ] Teams Bot equivalente al Slack Bot
- [ ] Adaptive Cards per visualizzazione dati inline
- [ ] Tab Teams per embedding dashboard
- [ ] Webhook per eventi (sync completato, fattura generata)

---

### 3.3 Webhook e API Pubblica

**Scope**:
- [ ] Webhook configurabili per eventi chiave
- [ ] API pubblica documentata (OpenAPI/Swagger)
- [ ] API key management per integrazioni terze parti
- [ ] Rate limiting per API pubblica

---

## Fase 4: Mobile e Accessibilità

> Priorità: **MEDIA** | Timeline: Q3-Q4 2026

### 4.1 Progressive Web App (PWA)

**Motivazione**: Accesso rapido da smartphone per consultazione, senza necessità di app nativa.

**Scope**:
- [ ] Service Worker per offline capability
- [ ] Manifest PWA (installabile su home screen)
- [ ] Layout responsive ottimizzato per mobile
- [ ] Push notifications per alert critici
- [ ] Modalità semplificata: solo consultazione, no configurazione

---

### 4.2 App Mobile Nativa (Fase successiva)

**Scope**:
- [ ] React Native o Flutter per iOS/Android
- [ ] Biometric authentication (FaceID, fingerprint)
- [ ] Widget home screen con ore giornaliere
- [ ] Quick actions: vista ore oggi, team summary

---

## Fase 5: Enterprise Features

> Priorità: **MEDIA** | Timeline: Q4 2026 - Q1 2027

### 5.1 SSO Enterprise

**Scope**:
- [ ] SAML 2.0 support (Azure AD, Okta, OneLogin)
- [ ] SCIM provisioning per auto-sync utenti
- [ ] Multi-factor authentication (MFA)
- [ ] Custom OAuth providers

---

### 5.2 Audit e Compliance

**Scope**:
- [ ] Audit trail completo su tutte le operazioni
- [ ] Data retention policies configurabili per azienda
- [ ] Export audit log per compliance (SOC 2, GDPR)
- [ ] Right to be forgotten (GDPR data deletion)
- [ ] Data Processing Agreement (DPA) workflow

---

### 5.3 Multi-Region Deployment

**Scope**:
- [ ] Supporto deployment EU / US / APAC
- [ ] Data residency per azienda (GDPR compliance)
- [ ] CDN per frontend assets
- [ ] Database replication cross-region

---

### 5.4 White-Label

**Scope**:
- [ ] Branding personalizzabile per azienda (logo, colori, dominio)
- [ ] Custom domain mapping
- [ ] Email templates personalizzabili
- [ ] Landing page personalizzabile

---

## Technical Debt

### Priorità Alta

| Issue | Impatto | Effort |
|-------|---------|--------|
| Constraint UNIQUE globali (teams, users, instances) | Previene onboarding multi-azienda | 2-3 giorni |
| Mancanza `company_id` su `complementary_group_members` | Potenziale data leakage | 1 giorno |
| Logs table senza retention policy | Performance degradation nel tempo | 1-2 giorni |
| Nessun Docker/docker-compose | Complicato deployment e onboarding dev | 1-2 giorni |
| Test coverage limitata (solo multi-tenant) | Rischio regressioni | 1-2 settimane |

### Priorità Media

| Issue | Impatto | Effort |
|-------|---------|--------|
| SQLite per produzione multi-tenant | Limita scalabilità e concorrenza | 2-4 settimane |
| Billing.jsx 54KB (file più grande) | Manutenibilità frontend | 3-5 giorni |
| Nessun CI/CD pipeline (GitHub Actions) | Deploy manuale, rischio errori | 2-3 giorni |
| JIRA credentials stored plain text in DB | Rischio sicurezza se DB compromesso | 3-5 giorni |
| Frontend senza TypeScript | Type safety, refactoring più rischioso | 2-4 settimane |

### Priorità Bassa

| Issue | Impatto | Effort |
|-------|---------|--------|
| Nessuna documentazione API (Swagger auto-gen) | Difficoltà integrazioni | 2-3 giorni |
| Props drilling per global state | Complessità componenti deep-nested | 1 settimana |
| Mancanza monitoring/alerting produzione | Visibilità operativa limitata | 1 settimana |
| Nessun rate limiting su API | Rischio abuse | 1-2 giorni |

---

## Piano di Scalabilità

### Architettura Target (12-18 mesi)

```
                    ┌──────────────┐
                    │   CDN/Edge   │
                    │  (Frontend)  │
                    └──────┬───────┘
                           │
                    ┌──────┴───────┐
                    │ Load Balancer │
                    │   (nginx)     │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────┴─────┐ ┌───┴────┐ ┌────┴─────┐
        │ FastAPI #1 │ │ API #2 │ │  API #3  │
        │ (Worker)   │ │        │ │          │
        └─────┬──────┘ └───┬────┘ └────┬─────┘
              │            │            │
              └────────────┼────────────┘
                           │
                    ┌──────┴───────┐
                    │  PostgreSQL   │
                    │  (Primary)    │
                    │               │
                    │  + Read       │
                    │    Replicas   │
                    └──────┬───────┘
                           │
                    ┌──────┴───────┐
                    │    Redis     │
                    │  (Cache +    │
                    │   Sessions)  │
                    └──────────────┘
```

### Milestone di Scalabilità

| Utenti Simultanei | Architettura Richiesta |
|-------------------|----------------------|
| 1-50 | SQLite + Uvicorn singolo (attuale) |
| 50-200 | PostgreSQL + Uvicorn multi-worker |
| 200-1000 | PostgreSQL + Load Balancer + Redis cache |
| 1000+ | Multi-region + Read replicas + CDN |

---

## Feature Backlog (Non Prioritizzato)

Idee e richieste raccolte per valutazione futura:

- **Importazione dati storici**: Bulk import worklog da CSV/Excel per periodi precedenti alla configurazione
- **Timesheet approval workflow**: Manager approva ore prima della fatturazione
- **Budget tracking per progetto**: Ore previste vs effettive con alert
- **Gantt chart view**: Visualizzazione timeline epic/progetti
- **Custom fields JIRA**: Supporto campi personalizzati nelle aggregazioni
- **Multi-language UI**: Inglese, Italiano, Spagnolo, Tedesco
- **Dark/Light theme toggle**: Attualmente solo dark theme
- **Bulk operations**: Azioni massive su worklogs (reclassifica, sposta)
- **Keyboard shortcuts**: Navigazione rapida da tastiera
- **Favoriti e bookmarks**: Salvataggio viste frequenti
- **Esportazione dati completa**: GDPR data portability
- **Integrazione Confluence**: Link documentazione a epic/progetti
- **Notifiche in-app**: Centro notifiche per eventi importanti
- **Grafici personalizzabili**: Drag & drop dashboard builder

---

## Come Contribuire alla Roadmap

1. **Segnalazione feature**: Aprire issue su GitHub con label `enhancement`
2. **Prioritizzazione**: Le feature vengono valutate per impatto/effort
3. **Community input**: Votazione su feature request più richieste
4. **Pull requests**: Contributi esterni benvenuti (seguire CLAUDE.md per pattern)
