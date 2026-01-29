# PRD: Financial Views - Layer di Interpretazione Economica

## Introduction

Aggiungere un layer di contabilità analitica soft alla jira-worklog-dashboard che permetta di interpretare i dati di worklog in chiave economica. La feature fornisce tre viste finanziarie — Marginalità, Contratti e Perdite — che trasformano le ore tracciate su Jira in informazioni su costi, ricavi, margini, burn rate e scostamenti. I dati economici (costi orari, prezzi vendita, budget) vengono gestiti a DB tramite una nuova sezione "Budget" nella configurazione. Non sostituisce un ERP, ma offre visibilità finanziaria immediata basata sui worklog reali.

## Goals

- Fornire visibilità economica sui progetti senza dipendere da sistemi ERP esterni
- Permettere il calcolo automatico di marginalità per progetto, epic e cliente
- Monitorare il consumo del budget (burn rate) e proiettare la data di esaurimento (forecast)
- Identificare perdite: ore non fatturate, overdelivery e scostamenti rispetto al pianificato
- Gestire costi orari differenziati per ruolo (default) e per persona (override)
- Supportare sia contratti a corpo (prezzo fisso) che a consuntivo (ore × tariffa)

## User Stories

### US-001: Creare le tabelle DB per i dati economici
**Description:** Come amministratore, voglio che il sistema persista i dati economici (costi orari, tariffe, budget, contratti) nel database SQLite, così da poterli consultare e aggiornare.

**Acceptance Criteria:**
- [ ] Nuova tabella `roles` (id, name, default_hourly_cost) per definire ruoli con costo orario di default
- [ ] Nuova tabella `user_costs` (id, user_id, role_id, hourly_cost_override, valid_from, valid_to) per override costo per utente
- [ ] Nuova tabella `contracts` (id, name, client_name, type ENUM['fixed_price','time_material'], budget_amount, hourly_sell_rate, estimated_hours, start_date, end_date, notes)
- [ ] Nuova tabella `contract_epics` (contract_id, epic_key, jira_instance) per associare epic a contratti
- [ ] Nuova tabella `contract_projects` (contract_id, project_key, jira_instance) per associare progetti a contratti
- [ ] Le tabelle vengono create automaticamente all'avvio dell'app (init DB in cache.py)
- [ ] Typecheck/lint passes

### US-002: Sezione Budget nel pannello Settings - Gestione Ruoli
**Description:** Come amministratore, voglio gestire i ruoli e i relativi costi orari di default dalla sezione Budget nelle impostazioni, così da definire la base di costo per il calcolo della marginalità.

**Acceptance Criteria:**
- [ ] Nuova tab "Budget" nella pagina Settings
- [ ] Sotto-sezione "Ruoli" con lista dei ruoli esistenti (nome, costo orario default)
- [ ] CRUD completo per i ruoli (crea, modifica, elimina)
- [ ] Validazione: costo orario >= 0, nome ruolo unico
- [ ] Conferma prima della cancellazione se ci sono utenti associati
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-003: Sezione Budget nel pannello Settings - Costi Utente
**Description:** Come amministratore, voglio assegnare un ruolo ad ogni utente e opzionalmente sovrascrivere il costo orario di default, così da riflettere i costi reali per persona.

**Acceptance Criteria:**
- [ ] Sotto-sezione "Costi Utente" nella tab Budget
- [ ] Lista utenti con: nome, ruolo assegnato, costo orario effettivo (default ruolo o override)
- [ ] Possibilità di assegnare ruolo a ogni utente
- [ ] Possibilità di impostare un override del costo orario per utente
- [ ] Supporto per validità temporale dell'override (valid_from / valid_to opzionali)
- [ ] Se nessun override, si usa il costo del ruolo
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-004: Sezione Budget nel pannello Settings - Gestione Contratti
**Description:** Come amministratore, voglio creare e gestire contratti che definiscono il budget e le condizioni economiche per un insieme di epic/progetti, così da monitorare la redditività.

**Acceptance Criteria:**
- [ ] Sotto-sezione "Contratti" nella tab Budget
- [ ] Form creazione/modifica contratto con campi: nome, cliente, tipo (a corpo / a consuntivo), budget, tariffa oraria vendita, date inizio/fine, note
- [ ] Per contratti "a corpo": campo budget obbligatorio, tariffa oraria vendita opzionale, campo ore stimate opzionale (alternativa a budget/tariffa per calcolo overdelivery)
- [ ] Per contratti "a consuntivo": campo tariffa oraria vendita obbligatorio, budget opzionale (come cap), campo ore stimate opzionale
- [ ] Associazione di epic e/o progetti Jira al contratto (selezione multipla con autocomplete dalle epic/progetti in DB). Il matching progetti avviene tramite prefisso della issue_key (es. "PROJ-123" → progetto "PROJ")
- [ ] Un'epic/progetto può appartenere a un solo contratto
- [ ] Lista contratti con stato visuale (attivo, completato, in ritardo)
- [ ] CRUD completo
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-005: API Backend per calcoli finanziari
**Description:** Come sviluppatore frontend, ho bisogno di endpoint API che calcolino marginalità, burn rate, forecast e perdite basandosi sui worklog e sui dati economici configurati.

**Acceptance Criteria:**
- [ ] `GET /api/financial/margins` — restituisce marginalità per contratto (costo interno, ricavo, margine, margine %)
- [ ] `GET /api/financial/margins?group_by=epic` — marginalità raggruppata per epic
- [ ] `GET /api/financial/margins?group_by=client` — marginalità raggruppata per cliente
- [ ] `GET /api/financial/contracts` — lista contratti con burn rate e forecast
- [ ] `GET /api/financial/contracts/:id` — dettaglio singolo contratto con breakdown per epic/utente
- [ ] `GET /api/financial/losses` — ore non fatturate, overdelivery, scostamenti
- [ ] Tutti gli endpoint accettano filtri per date (start_date, end_date) e jira_instance
- [ ] Calcolo costo interno: somma(ore_utente × costo_orario_utente) per ogni worklog nel periodo
- [ ] Calcolo ricavo: per contratti a consuntivo = ore × tariffa vendita; per contratti a corpo = budget fisso (con indicazione % completamento basata su ore stimate o budget/tariffa)
- [ ] Burn rate: calcolato solo per contratti con budget definito; budget_consumato / giorni_trascorsi (media giornaliera in euro). Per contratti a consuntivo senza budget, il burn rate non viene calcolato
- [ ] Forecast: data_attuale + (budget_rimanente / burn_rate_giornaliero). Solo per contratti con budget definito
- [ ] Ore non fatturate: worklog non associati a nessun contratto
- [ ] Overdelivery: per contratti a corpo, ore che superano le ore pianificate. Ore pianificate = campo estimated_hours se presente, altrimenti budget / tariffa (richiede tariffa configurata). Se nessuno dei due disponibile, overdelivery non calcolabile (mostrare "N/D")
- [ ] Scostamenti: differenza tra ore pianificate (estimated_hours o budget/tariffa) e ore effettive. Non calcolabile se mancano sia estimated_hours che tariffa
- [ ] Typecheck/lint passes

### US-006: API Backend per CRUD dati economici
**Description:** Come sviluppatore frontend, ho bisogno di endpoint CRUD per gestire ruoli, costi utente e contratti.

**Acceptance Criteria:**
- [ ] `GET/POST /api/settings/roles` — lista e creazione ruoli
- [ ] `PUT/DELETE /api/settings/roles/:id` — modifica e cancellazione ruoli
- [ ] `GET/PUT /api/settings/user-costs` — lista e aggiornamento costi utente (ruolo + override)
- [ ] `GET/POST /api/settings/contracts` — lista e creazione contratti
- [ ] `PUT/DELETE /api/settings/contracts/:id` — modifica e cancellazione contratti
- [ ] `POST /api/settings/contracts/:id/epics` — associa epic a contratto
- [ ] `DELETE /api/settings/contracts/:id/epics/:epicKey` — rimuovi associazione epic
- [ ] Validazione input con Pydantic models
- [ ] Typecheck/lint passes

### US-007: Pagina Vista Marginalità
**Description:** Come manager, voglio visualizzare la marginalità dei progetti così da capire quali sono profittevoli e quali no.

**Acceptance Criteria:**
- [ ] Nuova pagina accessibile da navigazione principale come tab "Marginalità"
- [ ] Tabella riepilogativa con colonne: Contratto/Progetto, Ore Interne, Costo Interno (ore × costo orario), Ricavo, Margine (€), Margine (%)
- [ ] Colori per margine: verde (>20%), giallo (0-20%), rosso (<0%)
- [ ] Possibilità di raggruppare per: contratto (default), epic, cliente
- [ ] Riga di totale in fondo alla tabella
- [ ] Click su riga per espandere breakdown per epic (se raggruppato per contratto) o per utente
- [ ] Filtri: date range (dal date picker globale), istanza Jira
- [ ] StatCards in alto: Ricavo totale, Costo totale, Margine totale (€ e %), Contratti in perdita (count)
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-008: Pagina Vista Contratti
**Description:** Come manager, voglio monitorare lo stato di avanzamento economico dei contratti, con burn rate e previsione di esaurimento budget.

**Acceptance Criteria:**
- [ ] Nuova pagina accessibile da navigazione principale come tab "Contratti"
- [ ] Lista cards contratti con: nome, cliente, tipo, budget totale, budget consumato, % completamento, burn rate giornaliero, data forecast fine budget
- [ ] Barra di progresso visuale per budget consumato (verde/giallo/rosso in base a %)
- [ ] Indicatore di rischio: se forecast < end_date del contratto = verde, altrimenti rosso con warning
- [ ] Click su card per pagina dettaglio con: breakdown ore per epic, breakdown ore per utente, trend burn rate nel tempo (grafico lineare), confronto pianificato vs consuntivo
- [ ] Filtri: date range, istanza Jira, stato contratto (attivo/completato/tutti)
- [ ] StatCards in alto: Contratti attivi, Budget totale, Budget consumato, Contratti a rischio (forecast supera end_date)
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-009: Pagina Vista Perdite
**Description:** Come manager, voglio identificare le aree di perdita economica così da prendere azioni correttive.

**Acceptance Criteria:**
- [ ] Nuova pagina accessibile da navigazione principale come tab "Perdite"
- [ ] Sezione "Ore Non Fatturate": tabella con worklog non associati a nessun contratto, raggruppati per utente e per epic/progetto, con totale ore e costo stimato
- [ ] Sezione "Overdelivery": lista contratti a corpo dove le ore lavorate superano le ore previste (estimated_hours o budget/tariffa), con delta ore e costo dell'overdelivery. Contratti senza ore pianificate calcolabili mostrano "N/D"
- [ ] Sezione "Scostamenti": tabella contratti con colonne ore pianificate, ore effettive, delta, delta % — ordinata per scostamento maggiore
- [ ] StatCards in alto: Totale ore non fatturate, Costo ore non fatturate, Totale overdelivery (€), Numero contratti con scostamento > 10%
- [ ] Filtri: date range, istanza Jira
- [ ] Colori di evidenziazione per severità degli scostamenti
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-010: Navigazione e routing per le viste finanziarie
**Description:** Come utente, voglio accedere facilmente alle tre viste finanziarie dalla navigazione principale dell'applicazione.

**Acceptance Criteria:**
- [ ] Nuove route: `/financial/margins`, `/financial/contracts`, `/financial/contracts/:id`, `/financial/losses`
- [ ] Voce "Financial" nella sidebar/navbar con sotto-menu: Marginalità, Contratti, Perdite
- [ ] Le viste finanziarie utilizzano lo stesso date range picker globale delle altre pagine
- [ ] Le viste finanziarie rispettano il filtro istanza Jira globale
- [ ] Breadcrumb navigation nelle pagine di dettaglio
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: Il sistema deve persistere ruoli, costi utente, contratti e associazioni epic-contratto nel database SQLite
- FR-2: Ogni ruolo ha un nome univoco e un costo orario di default (€/ora)
- FR-3: Ogni utente può avere un ruolo assegnato e un override opzionale del costo orario con validità temporale
- FR-4: Il costo orario effettivo di un utente è: override (se presente e valido nel periodo) > costo default del ruolo > 0
- FR-5: Un contratto può essere di tipo "a corpo" (budget fisso) o "a consuntivo" (ore × tariffa)
- FR-6: Un contratto raggruppa una o più epic/progetti Jira; ogni epic/progetto può appartenere a un solo contratto
- FR-7: Il costo interno di un contratto è calcolato come somma di (ore_worklog × costo_orario_autore) per tutti i worklog delle epic/progetti associati
- FR-8: Il ricavo di un contratto a corpo è il budget fisso (nella vista marginalità mostrare anche la % completamento basata sulle ore stimate); il ricavo di un contratto a consuntivo è ore_totali × tariffa_oraria_vendita
- FR-9: Il margine è calcolato come ricavo - costo interno, espresso sia in valore assoluto che in percentuale
- FR-10: Il burn rate è calcolato come budget_consumato / giorni_lavorativi_trascorsi (media giornaliera). Applicabile solo a contratti con budget definito; per contratti a consuntivo senza budget, il burn rate non è disponibile
- FR-11: Il forecast di fine budget è: data_attuale + (budget_rimanente / burn_rate_giornaliero), con proiezione lineare. Applicabile solo a contratti con budget definito
- FR-12: Le ore non fatturate sono worklog il cui epic/progetto non è associato a nessun contratto
- FR-13: L'overdelivery si applica ai contratti a corpo ed è la differenza tra ore lavorate e ore pianificate. Le ore pianificate si determinano da: campo estimated_hours (prioritario) oppure budget / tariffa_vendita (fallback). Se nessuno dei due è disponibile, l'overdelivery non è calcolabile
- FR-14: Gli scostamenti sono la differenza tra ore pianificate (estimated_hours o budget/tariffa) e ore effettive per ogni contratto
- FR-15: Tutte le viste finanziarie rispettano i filtri globali (date range, istanza Jira)
- FR-16: I dati economici sono gestiti nella sezione "Budget" della pagina Settings

## Non-Goals

- Non è un sostituto di un ERP o sistema di contabilità ufficiale
- Non gestisce fatturazione, emissione documenti fiscali o pagamenti
- Non si integra con sistemi contabili esterni (SAP, QuickBooks, etc.)
- Non gestisce IVA, tasse o altre componenti fiscali
- Non gestisce valute multiple (solo una valuta, si assume EUR)
- Non invia notifiche/alert automatici (es. "budget in esaurimento")
- Non gestisce approvazioni o workflow di approvazione budget
- Non fa previsioni basate su machine learning o analisi predittiva avanzata
- Non gestisce contratti con milestone/tranche di pagamento differenziate

## Design Considerations

- Utilizzare lo stesso design system (Tailwind CSS, dark theme) già presente nella dashboard
- Riutilizzare i componenti esistenti: `StatCard`, `TrendChart`, layout `Cards.jsx`
- La tab "Budget" in Settings segue lo stesso pattern delle tab esistenti (Teams, Users, Jira Instances)
- Le pagine finanziarie seguono il layout delle pagine esistenti (Dashboard, TeamView) con StatCards in alto e contenuto tabellare sotto
- Colori per margine/rischio: utilizzare la palette existing (green-500, yellow-500, red-500 di Tailwind)
- Le tabelle finanziarie devono essere responsive e supportare ordinamento per colonna
- I grafici di trend usano la stessa libreria Recharts già in uso

## Technical Considerations

- **Database**: Estendere `cache.py` con le nuove tabelle nella funzione `initialize()`. Usare lo stesso pattern aiosqlite
- **Backend**: Creare un nuovo router `financial.py` per gli endpoint di calcolo e estendere `settings.py` per il CRUD dei dati economici
- **Models**: Estendere `models.py` con i Pydantic models per ruoli, costi utente, contratti e risposte finanziarie
- **Frontend API**: Estendere `client.js` con le nuove funzioni per chiamare gli endpoint finanziari e CRUD
- **Performance**: I calcoli finanziari aggregano worklog esistenti nel DB — per grandi dataset, considerare query SQL ottimizzate con aggregazioni dirette in SQLite piuttosto che calcoli in Python
- **Consistenza dati**: Se un utente non ha ruolo/costo assegnato, il costo orario è 0 (non blocca i calcoli, ma evidenziare nella UI con warning "costo non configurato" e badge giallo)
- **Matching progetti**: I worklog nel DB hanno `issue_key` (es. "PROJ-123") e `jira_instance` ma non un campo `project_key` esplicito. Il matching con `contract_projects` avviene estraendo il prefisso dalla issue_key (parte prima del trattino)
- **Contratti senza dati sufficienti**: Burn rate, forecast, overdelivery e scostamenti richiedono budget e/o ore stimate. Se mancanti, la UI mostra "N/D" invece di valori errati

## Success Metrics

- L'amministratore riesce a configurare ruoli, costi e contratti in meno di 5 minuti per contratto
- Le tre viste finanziarie mostrano dati coerenti con i worklog presenti nel sistema
- Il forecast di fine budget ha un margine di errore accettabile (proiezione lineare)
- Le pagine finanziarie si caricano in meno di 2 secondi anche con 10.000+ worklog
- L'utente può identificare immediatamente i contratti a rischio e le aree di perdita

## Open Questions

- Serve un export CSV/Excel dei dati finanziari?
- Come gestire contratti che coprono periodi molto lunghi (anni)? Il burn rate medio potrebbe non essere rappresentativo
- Serve un meccanismo di "chiusura" del contratto che blocchi ulteriori calcoli?
- ~~Le ore pianificate di un contratto a consuntivo come si determinano?~~ → Risolto: aggiunto campo `estimated_hours` opzionale come alternativa a budget/tariffa
- Serve gestire tariffe di vendita differenziate per ruolo/utente all'interno dello stesso contratto? (Rimandata a fase successiva per non complicare il modello iniziale)
