# Dashboard Refactor Plan — Instance-Centric View

## Obiettivo

Trasformare la Dashboard da una view generica con troppi dati a una **view focalizzata sulle istanze JIRA**, dove le discrepanze tra istanze complementari sono il dato più importante e visibile. Design enterprise-grade ispirato a Linear/Stripe — niente pattern consumer.

---

## Analisi dello Stato Attuale

### Cosa c'è ora (dall'alto in basso)

1. **Date Range Selector** — This Week / This Month / Last Month / This Quarter / Custom Range
2. **Summary Cards** — WORKLOGS (42), HOURS (160h), ACTIVE USERS (1), AVG/DAY (8h)
3. **Complementary Instance Card** — OT–MMFG, 20 discrepancies, delta +30h (piccolo, compresso)
4. **Utilization by Instance** — Donut chart (ridondante con la tabella)
5. **Hours by Team** — Horizontal bar chart con MMFG/OT per team (utile ma chart non ideale)
6. **Instance Comparison** — Tabella espandibile con ore, worklogs, contributors, available, utilization (dato più utile, ma sezione piccola e in basso)
7. **By Project** — Horizontal bar chart top 5 progetti con toggle MMFG/OT
8. **Recent Worklogs** — Tabella con issue, summary, author, duration, date

### Problemi identificati

| Elemento | Problema |
|----------|----------|
| Summary Cards | Dati generici, poco azionabili. AVG/DAY e ACTIVE USERS non guidano decisioni |
| Donut Chart (Utilization) | Ridondante — stessa informazione della tabella Instance Comparison, in forma meno leggibile |
| Complementary Instance Card | Il dato più critico (discrepanze) è relegato a un box piccolo in alto, non prominente |
| Instance Comparison | Sezione corretta nei dati, ma troppo piccola e posizionata in mezzo alla pagina |
| Recent Worklogs | Appartiene alla pagina Worklogs, non alla Dashboard. Occupa spazio prezioso |
| By Project | Utile ma secondario rispetto alle istanze. Toggle MMFG/OT è un buon pattern |
| Hours by Team | Utile, ma il bar chart orizzontale semplice non sfrutta bene la dimensione multi-istanza |

---

## Proposta di Nuova Struttura

### Layout Gerarchico (dall'alto in basso)

```
┌─────────────────────────────────────────────────────────────┐
│  Date Range Selector (invariato)                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  SEZIONE 1: Instance Overview (HERO)                         │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  Tabella principale istanze — espansa, prominente   │     │
│  │  Con alert inline per discrepanze complementari     │     │
│  │  Riga espandibile → dettaglio sub-istanze           │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  SEZIONE 2: Discrepancy Detail Panel                         │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  Visibile SOLO se ci sono istanze complementari      │     │
│  │  Dettaglio discrepanze: worklogs mancanti per istanza│     │
│  │  Tabella comparativa fianco a fianco                 │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  SEZIONE 3: Team Hours (2-column)                            │
│  ┌──────────────────────┐  ┌──────────────────────────┐     │
│  │ Hours by Team         │  │ Hours by Project          │     │
│  │ (grouped bar chart    │  │ (horizontal bar chart     │     │
│  │  per istanza)         │  │  con toggle istanza)      │     │
│  └──────────────────────┘  └──────────────────────────┘     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Dettaglio per Sezione

### SEZIONE 1: Instance Overview (HERO SECTION)

Questa è la sezione principale della dashboard. Deve occupare la parte più ampia e visibile dello schermo.

**Struttura tabella:**

```
INSTANCE              HOURS    WORKLOGS   CONTRIBUTORS   AVAILABLE   UTILIZATION   STATUS
─────────────────────────────────────────────────────────────────────────────────────────
▸ OT – MMFG           160h     42         1              160h        100% ████     ⚠ 20 discrepanze
▸ Altra Istanza        80h     28         3               80h        100% ████     ✓ OK
─────────────────────────────────────────────────────────────────────────────────────────
TOTAL                 240h     70         4              240h        100% ████
```

**Comportamento espansione (click sulla riga):**

```
▾ OT – MMFG           160h     42         1              160h        100% ████     ⚠ 20 discrepanze
  └ OT (primary)       160h     42         1              160h        100% ████
  └ MMFG               130h     55         1              160h         81% ███░
                       ─────
                       Δ +30h   Δ -13
```

**Colonna STATUS — regole:**
- Se l'istanza è singola (non complementare): nessun badge status, mostra solo "—"
- Se è complementare e le ore coincidono (delta = 0): badge verde "✓ Aligned"
- Se è complementare e il delta è > 0: badge arancione/rosso "⚠ N discrepanze" (cliccabile, porta alla Sezione 2)
- La soglia di colore (arancione vs rosso) può essere configurabile. Default: arancione fino a 10 discrepanze, rosso oltre

**Design notes:**
- La tabella deve avere bordi sottili, padding generoso, tipografia chiara
- Le righe espanse devono avere sfondo leggermente diverso (es. gray-50)
- La colonna UTILIZATION mantiene il mini-bar chart inline attuale (buon pattern)
- Il delta nella riga espansa deve essere colorato: verde se positivo, rosso se negativo, con segno esplicito

---

### SEZIONE 2: Discrepancy Detail Panel

Questa sezione appare **solo se esistono gruppi complementari con discrepanze > 0**. Se tutto è allineato, non si mostra.

**Layout:**

```
┌──────────────────────────────────────────────────────────────────┐
│  ⚠  OT – MMFG: 20 discrepanze trovate                          │
│                                                                   │
│  ┌─────────────────────────┐  ┌─────────────────────────┐       │
│  │ Solo in OT (primary)    │  │ Solo in MMFG             │       │
│  │ 13 worklogs, +30h       │  │ 7 worklogs               │       │
│  │                         │  │                           │       │
│  │ ISSUE      HOURS  DATE  │  │ ISSUE      HOURS   DATE  │       │
│  │ PROJ-123   2h   30 gen  │  │ SYS-456   1h    29 gen   │       │
│  │ PROJ-124   3h   30 gen  │  │ SYS-457   2h    29 gen   │       │
│  │ ...                     │  │ ...                       │       │
│  └─────────────────────────┘  └─────────────────────────────┘    │
│                                                                   │
│  [Vedi tutti in Worklogs →]                                      │
└──────────────────────────────────────────────────────────────────┘
```

**Comportamento:**
- Due colonne affiancate: worklogs presenti solo nell'istanza primaria vs solo nella secondaria
- Mostra i primi 5-8 worklogs per lato, con link "Vedi tutti in Worklogs" che apre la pagina Worklogs con il filtro pre-applicato
- Se ci sono più gruppi complementari con discrepanze, mostra un pannello per ciascuno (collassabile)
- L'header del pannello ha il badge di severità (arancione/rosso) consistente con la tabella sopra

**Design notes:**
- Background leggermente diverso (es. amber-50/red-50 molto tenue) per comunicare attenzione
- Border-left colorata (amber o red) come pattern alert enterprise (stile Stripe)
- Tipografia compatta nella tabella interna — non serve tutto il dettaglio, solo issue key + hours + date

---

### SEZIONE 3: Team & Project Distribution

Due chart affiancati in un layout a 2 colonne.

**3A: Hours by Team (Grouped Bar Chart)**

```
         MMFG    OT
Team A   ████    ████████
Team B   ██████  ██████
Team C   ██      ████
         0h  20h  40h  60h  80h
```

- Grouped horizontal bar chart (non stacked): una barra per istanza, raggruppate per team
- Colori consistenti per istanza (stessi usati nella tabella hero)
- Se c'è solo un'istanza, diventa un bar chart semplice
- Tooltip on hover con ore esatte

**Perché grouped e non stacked:** Le ore tra istanze complementari non vanno sommate (sono lo stesso lavoro loggato su due sistemi). Il grouped chart mostra il confronto senza implicare somma.

**3B: Hours by Project (Horizontal Bar Chart)**

- Mantiene il pattern attuale (orizzontale, top 5 progetti)
- Aggiunge il toggle per istanza come già presente
- Se ci sono più istanze non complementari, mostra barre grouped come per i team

---

## Cosa RIMUOVERE

| Elemento | Motivo | Sostituzione |
|----------|--------|-------------|
| Summary Cards (WORKLOGS, HOURS, ACTIVE USERS, AVG/DAY) | Dati generici, non azionabili. Le stesse info sono nella tabella Instance Overview | Nessuna — i totali sono nella riga TOTAL della tabella hero |
| Donut Chart (Utilization by Instance) | Completamente ridondante con la colonna UTILIZATION nella tabella | Colonna con mini-bar inline nella tabella |
| Complementary Instance Card (OT-MMFG box in alto) | Sostituito dal sistema di alert nella tabella hero + Discrepancy Panel | Alert inline + Sezione 2 |
| Recent Worklogs table | Non pertinente alla Dashboard. È contenuto della pagina Worklogs | Nessuna — rimane nella pagina Worklogs |

---

## Cosa MANTENERE (con modifiche)

| Elemento | Modifica |
|----------|----------|
| Date Range Selector | Invariato. Già funzionale |
| Instance Comparison table | Diventa la HERO section, espansa e prominente, con colonna STATUS aggiunta |
| Hours by Team chart | Da bar semplice a **grouped bar chart** per istanza |
| Hours by Project chart | Mantenuto con toggle istanza, posizionato accanto a Hours by Team |

---

## Specifiche Tecniche per Claude Code

### File da modificare

```
frontend/src/pages/Dashboard.tsx          → Refactor completo del layout
frontend/src/components/dashboard/        → Nuovi componenti (o modifica esistenti)
  ├── InstanceOverviewTable.tsx            → NUOVO: tabella hero con espansione
  ├── DiscrepancyPanel.tsx                 → NUOVO: pannello dettaglio discrepanze
  ├── TeamHoursChart.tsx                   → MODIFICA: grouped bar chart
  └── ProjectHoursChart.tsx                → MODIFICA: posizionamento e layout
```

### Dipendenze

- Recharts (già disponibile nel progetto) per i chart
- Tailwind CSS per lo styling
- TanStack Query per il data fetching (pattern già in uso)

### API Endpoints necessari

Verificare che questi endpoint esistano e restituiscano i dati necessari:

1. **GET /api/worklogs/summary** — Per dati aggregati per istanza
2. **Endpoint complementary groups** — Per sapere quali istanze sono complementari e i loro dettagli di discrepanza
3. **Endpoint discrepancy detail** — Per ottenere i worklogs specifici che differiscono tra istanze complementari (potrebbe servire un nuovo endpoint o un filtro aggiuntivo)

Se mancano endpoint per le discrepanze dettagliate, Claude Code dovrà creare anche il backend corrispondente.

### Pattern da seguire

- Usare `useQuery` di TanStack Query per tutti i fetch
- Gestire loading/error states su ogni sezione indipendentemente
- La tabella hero deve usare stato locale React per gestire l'espansione delle righe
- I chart devono essere responsive (ridimensionarsi con la finestra)
- Colori delle istanze devono essere consistenti ovunque (definire una palette fissa)

### Anti-pattern da evitare

- ❌ Niente gradients o ombre eccessive (enterprise, non consumer)
- ❌ Niente icone circolari blu "AI-style"
- ❌ Niente animazioni decorative (solo transizioni funzionali: espansione righe, hover)
- ❌ Niente donut/pie charts (bassa densità informativa per lo spazio occupato)
- ❌ Non duplicare dati tra sezioni (ogni dato appare una volta sola)
- ❌ Non mostrare sezioni vuote (se non ci sono discrepanze, la Sezione 2 non esiste)

### Palette colori istanze (suggerimento)

Usare colori distinti ma professionali per differenziare le istanze nei chart:

```
Istanza 1 (primaria):  blue-600  (#2563EB)
Istanza 2:             slate-400 (#94A3B8)
Istanza 3:             emerald-600 (#059669)
Istanza 4:             amber-500 (#F59E0B)
```

Status badges:
```
Aligned:    emerald-600 text + emerald-50 bg
Warning:    amber-600 text + amber-50 bg    (< 10 discrepanze)
Critical:   red-600 text + red-50 bg        (≥ 10 discrepanze)
```

---

## Ordine di Implementazione

### Step 1: Preparazione
- Leggere il codice attuale di `Dashboard.tsx` e dei componenti correlati
- Verificare gli endpoint API disponibili per dati istanze e discrepanze
- Identificare se serve creare nuovi endpoint backend

### Step 2: Instance Overview Table (Hero)
- Creare `InstanceOverviewTable.tsx`
- Implementare tabella con righe espandibili
- Aggiungere colonna STATUS con badge colorati
- Riga TOTAL in fondo
- Riga espansa con sub-istanze e delta

### Step 3: Discrepancy Panel
- Creare `DiscrepancyPanel.tsx`
- Layout a due colonne (worklogs solo in primaria / solo in secondaria)
- Logica di visibilità condizionale (solo se discrepanze > 0)
- Link "Vedi tutti in Worklogs"

### Step 4: Chart Refactor
- Modificare Hours by Team → grouped bar chart
- Riposizionare Hours by Project accanto
- Layout 2 colonne per i chart

### Step 5: Cleanup
- Rimuovere Summary Cards
- Rimuovere Donut Chart
- Rimuovere Complementary Instance Card
- Rimuovere Recent Worklogs
- Verificare che nessun dato utile sia andato perso

### Step 6: Polish
- Verificare responsive behavior
- Testare con dati reali
- Verificare consistenza colori tra tabella e chart
- Edge case: 0 istanze, 1 istanza (no complementari), molte istanze

---

## Risultato Atteso

Una dashboard dove:
1. Apri la pagina e vedi **immediatamente** lo stato di tutte le istanze JIRA
2. Le discrepanze tra complementari sono **impossibili da ignorare** (alert visivo prominente)
3. Con un click espandi il dettaglio di ogni gruppo complementare
4. Il pannello discrepanze ti mostra **esattamente** cosa manca e dove
5. I chart sottostanti danno contesto su distribuzione team e progetti
6. Zero rumore: niente dati ridondanti, niente sezioni vuote, niente elementi decorativi
