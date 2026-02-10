# Value Proposition

## Il Problema

Le organizzazioni che utilizzano JIRA per il project management affrontano sfide critiche nel tracciamento e nella valorizzazione del tempo lavorato:

### Frammentazione dei Dati

- **Multiple istanze JIRA**: Software house e agenzie gestiscono spesso 2-5+ istanze JIRA separate (una per cliente, una interna, una per time tracking). I dati sono frammentati e non aggregabili nativamente.
- **Nessuna vista unificata**: JIRA non offre dashboard cross-instance. Ogni istanza è un silo isolato.
- **Worklog dispersi**: Le ore logate sono distribuite su centinaia di issue, epics e progetti senza un punto di aggregazione centrale.

### Inefficienza Operativa

- **Reportistica manuale**: Team lead e PMO passano ore ogni settimana a esportare dati da JIRA, aggregarli in Excel e produrre report per il management.
- **Mancanza di visibilità real-time**: Non esiste un modo semplice per sapere "quanto ha lavorato il team questa settimana?" senza query manuali.
- **Nessun collegamento ore-fatturazione**: Il passaggio da "ore logate su JIRA" a "fattura al cliente" richiede processi manuali, fogli Excel e riconciliazione manuale.

### Limiti degli Strumenti Esistenti

- **Tempo Timesheets**: Plugin costoso per singola istanza JIRA, non aggrega cross-instance, pricing per utente elevato.
- **Clockify / Toggl / Harvest**: Time tracker generici senza integrazione nativa JIRA, richiedono doppio inserimento dati.
- **Excel / Google Sheets**: Soluzione manuale, error-prone, non real-time, non scalabile.
- **JIRA native reporting**: Limitato a singola istanza, nessun filtro avanzato per date range, nessuna fatturazione.

---

## La Soluzione

**JIRA Worklog Dashboard** è una piattaforma SaaS multi-tenant che aggrega, analizza e valorizza i worklog da multiple istanze JIRA in un'unica dashboard unificata, con sistema di fatturazione integrato.

### Core Capabilities

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  AGGREGATE          ANALYZE            MONETIZE                  │
│                                                                  │
│  Multi-JIRA         Dashboard          Billing                   │
│  sync engine        real-time          engine                    │
│                                                                  │
│  ┌─────────┐       ┌─────────┐        ┌─────────┐              │
│  │ JIRA #1 │       │ Team    │        │ Clienti │              │
│  │ JIRA #2 │──────>│ Users   │───────>│ Tariffe │              │
│  │ JIRA #3 │       │ Epics   │        │ Invoice │              │
│  │ Tempo   │       │ Trends  │        │ Export  │              │
│  └─────────┘       └─────────┘        └─────────┘              │
│                                                                  │
│  + Complementary    + Calendar view     + Rate override          │
│    instance groups  + Period compare    + Multi-currency         │
│  + Tempo + Native   + Export reports    + DRAFT→ISSUED→PAID     │
│    JIRA support                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Target Audience

### 1. Software House e Agenzie Digitali

**Profilo**: Aziende che vendono servizi a ore/progetto, con team di 10-100+ sviluppatori che lavorano su JIRA per più clienti contemporaneamente.

**Pain points risolti**:
- Aggregazione automatica ore da più istanze JIRA (es. istanza cliente + istanza interna)
- Fatturazione diretta basata sugli orari JIRA realmente loggati
- Visibilità su marginalità progetto (ore previste vs ore effettive)
- Eliminazione dei fogli Excel per timesheet mensili

**Valore quantificabile**:
- Risparmio 4-8h/settimana per PMO in reportistica manuale
- Riduzione errori di fatturazione (dati da fonte unica: JIRA)
- Visibilità real-time su utilizzo risorse e distribuzione team

### 2. PMO e Team Lead

**Profilo**: Project manager e team lead che devono monitorare produttività, distribuzione carico di lavoro e avanzamento progetti.

**Pain points risolti**:
- Dashboard immediata su ore team per giorno/settimana/mese
- Vista per epic/iniziativa con contributori e ore totali
- Calendario worklog per singolo utente con dettaglio giornaliero
- Confronto multi-istanza quando i team lavorano su più JIRA

**Valore quantificabile**:
- Identificazione immediata di scostamenti dal piano
- Distribuzione equa del carico di lavoro tra membri del team
- Dati oggettivi per standup e retrospettive

---

## Competitive Advantages

### 1. Aggregazione Multi-JIRA Nativa

Nessun competitor sul mercato offre aggregazione trasparente di worklog da multiple istanze JIRA con gestione di **istanze complementari** (grouping di istanze che tracciano lo stesso lavoro per evitare doppio conteggio).

### 2. Billing Integrato End-to-End

Il percorso da "ore logate su JIRA" a "fattura al cliente" è completamente automatizzato:

| Step | Manuale (Oggi) | Con Worklog Dashboard |
|------|----------------|----------------------|
| Raccolta ore | Export CSV da JIRA, copia in Excel | Sync automatico |
| Classificazione | Revisione manuale riga per riga | Mark billable/non-billable in UI |
| Calcolo importo | Formule Excel con tariffe | Engine con rate gerarchiche |
| Generazione fattura | Creazione manuale documento | Un click → DRAFT → ISSUED |
| Export | Copia-incolla su template | Export Excel automatico |

### 3. Multi-Tenant SaaS

Architettura progettata per servire multiple aziende sulla stessa piattaforma con isolamento totale dei dati:
- Ogni company ha i propri team, utenti, istanze JIRA, fatturazione
- Sicurezza enterprise: OAuth 2.0, JWT, RBAC (Admin/Manager/User)
- Onboarding self-service con sistema di inviti

### 4. Dual Deployment: Web + Desktop

Unica soluzione che offre sia accesso web (SaaS) che distribuzione desktop nativa via Tauri:
- **Web**: Zero installazione, accesso da browser
- **Desktop**: App nativa macOS/Windows/Linux per uso offline o reti aziendali restrittive
- Stessa codebase, stessa esperienza utente

### 5. Supporto Tempo + JIRA Nativo

Funziona sia con il plugin Tempo Timesheets (API dedicata, più efficiente) sia con i worklog nativi di JIRA, senza richiedere plugin aggiuntivi.

### 6. Integrazioni HR

Collegamento con Factorial HR per gestione ferie/assenze, permettendo una vista completa della disponibilità del team.

---

## Use Cases Principali

### Use Case 1: Reportistica Settimanale Automatica

**Scenario**: Il PMO di un'agenzia con 30 sviluppatori su 3 istanze JIRA deve preparare un report settimanale per il management.

**Prima**: 3-4 ore ogni lunedì per esportare dati da JIRA, consolidare in Excel, formattare grafici.

**Dopo**: Apertura dashboard → selezione range "ultima settimana" → tutti i dati aggregati in tempo reale con trend, distribuzione team ed epic breakdown.

---

### Use Case 2: Fatturazione Mensile a Cliente

**Scenario**: Una software house fattura 5 clienti diversi, ognuno con JIRA instance dedicata + istanza interna per tracking.

**Prima**: Export worklog per istanza, riconciliazione manuale tra istanza cliente e interna, calcolo ore fatturabili, applicazione tariffe differenziate per seniority, creazione fattura manuale.

**Dopo**:
1. Sync automatico da tutte le istanze
2. Worklog classificati come billable/non-billable
3. Tariffe impostate per cliente/progetto/utente
4. Preview fattura → approvazione → export Excel

---

### Use Case 3: Monitoraggio Produttività Team

**Scenario**: Un team lead gestisce un team di 8 persone e deve capire come viene distribuito il tempo tra feature development, bug fixing e supporto.

**Prima**: Chiedere a ogni membro di compilare un timesheet separato, o navigare manualmente le issue JIRA una per una.

**Dopo**: Vista team con breakdown per epic/progetto, calendar view per singolo utente con dettaglio giornaliero, identificazione immediata di sbilanciamenti nel carico di lavoro.

---

### Use Case 4: Gestione Pacchetti a Ore

**Scenario**: L'agenzia vende "pacchetti di ore" ai clienti (es. 100h/mese di manutenzione). Deve tracciare il consumo e sapere quando il pacchetto sta per esaurirsi.

**Prima**: Conteggio manuale mensile su Excel.

**Dopo**: Package templates con issue JIRA linkate, tracciamento automatico consumo ore, visibilità real-time su ore residue per pacchetto.

---

### Use Case 5: Onboarding Nuovo Team

**Scenario**: L'azienda assume 5 nuovi sviluppatori che devono essere aggiunti ai team e alle istanze JIRA corrette.

**Prima**: Configurazione manuale in ogni strumento, rischio di dimenticanze.

**Dopo**: Admin invita utenti via email → accettazione invito → assegnazione team → mapping JIRA account automatico. Tutto tracciato con audit log.

---

## Metriche di Successo

| Metrica | Target |
|---------|--------|
| Tempo risparmiato in reportistica | -80% (da 4h a <1h/settimana) |
| Errori di fatturazione | -95% (dati da fonte unica) |
| Time-to-insight | Da giorni a secondi (real-time dashboard) |
| Copertura multi-JIRA | 100% (aggregazione automatica) |
| Costo vs Tempo plugin | -60% (nessun costo per utente JIRA) |

---

## Modello di Business

### SaaS Multi-Tenant

L'applicazione è progettata come piattaforma SaaS dove multiple aziende condividono la stessa infrastruttura con isolamento totale dei dati.

**Vantaggi del modello**:
- **Per i clienti**: Zero installazione, aggiornamenti automatici, supporto incluso
- **Per il provider**: Economia di scala, deployment unico, monitoring centralizzato
- **Sicurezza**: OAuth 2.0, JWT, RBAC, audit trail, isolamento dati per company_id

**Opzione Desktop**: Per aziende con requisiti di sicurezza stringenti o reti restrittive, l'app Tauri offre un'alternativa self-contained senza dipendenza da server esterni.
