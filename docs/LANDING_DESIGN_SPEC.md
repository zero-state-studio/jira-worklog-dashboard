# Landing Page Design Specification

> Specifica di design completa per l'implementazione delle 14 sezioni della landing page.
> Basato su: `MARKETING_STRATEGY.md`, `UX_ANALYSIS.md`, `LANDING_COPY.md`.
> Design system derivato da: `frontend/tailwind.config.js`, `frontend/src/index.css`.

---

## 1. Design System

### 1.1 Color Palette

Mantenere il dark theme esistente, esteso con nuovi token semantici.

#### Base (da `tailwind.config.js` - invariati)
| Token | Hex | Uso |
|-------|-----|-----|
| `dark-900` | `#0d1117` | Page background |
| `dark-800` | `#161b22` | Card/section background |
| `dark-700` | `#21262d` | Elevated surfaces, input bg |
| `dark-600` | `#30363d` | Borders, dividers |
| `dark-500` | `#484f58` | Disabled text, subtle borders |
| `dark-400` | `#6e7681` | Placeholder text |
| `dark-300` | `#8b949e` | Secondary text |
| `dark-200` | `#c9d1d9` | Body text |
| `dark-100` | `#f0f6fc` | Primary text, headings |

#### Accent (da `tailwind.config.js` - invariati)
| Token | Hex | Sezione primaria |
|-------|-----|-----------------|
| `accent-blue` | `#58a6ff` | Multi-JIRA, Dashboard, links |
| `accent-green` | `#3fb950` | Trust indicators, success, Factorial |
| `accent-purple` | `#a371f7` | Analytics, integrations |
| `accent-orange` | `#d29922` | Billing (killer feature) |
| `accent-red` | `#f85149` | Alerts, urgency |
| `accent-pink` | `#db61a2` | Security |
| `accent-cyan` | `#39c5cf` | Dashboard real-time |

#### Gradient (invariato)
| Token | Valore | Uso |
|-------|--------|-----|
| `gradient-primary` | `#667eea → #764ba2` (135deg) | CTA primari, hero, accents |
| `gradient-success` | `#3fb950 → #2ea44f` (135deg) | Trust elements |
| `gradient-purple` | `#a371f7 → #8957e5` (135deg) | Feature highlights |

#### Nuovi Token Semantici (da aggiungere a `index.css`)
```css
:root {
  /* Sezione-specifici */
  --color-social-proof-bg: rgba(102, 126, 234, 0.05);  /* primary-from/5 */
  --color-pain-point-bg: rgba(248, 81, 73, 0.05);       /* accent-red/5 */
  --color-pricing-highlight: rgba(102, 126, 234, 0.1);   /* primary-from/10 */
  --color-final-cta-gradient-from: #667eea;
  --color-final-cta-gradient-to: #764ba2;
}
```

### 1.2 Typography Scale

Font family: **Inter** (invariato, da `tailwind.config.js`).

| Livello | Classe Tailwind | Size | Weight | Line Height | Uso |
|---------|----------------|------|--------|-------------|-----|
| Hero H1 | `text-5xl md:text-6xl lg:text-7xl` | 48/60/72px | `font-bold` (700) | `leading-tight` (1.1) | Headline hero unica |
| Section H2 | `text-3xl md:text-4xl lg:text-5xl` | 30/36/48px | `font-bold` (700) | `leading-tight` | Titoli sezione |
| Card H3 | `text-xl md:text-2xl` | 20/24px | `font-bold` (700) | `leading-snug` | Titoli card, feature titles |
| Sub-heading | `text-lg md:text-xl` | 18/20px | `font-semibold` (600) | `leading-relaxed` | Sub-headlines sezioni |
| Body Large | `text-lg md:text-xl` | 18/20px | `font-normal` (400) | `leading-relaxed` | Hero subheadline, descriptions |
| Body | `text-base` | 16px | `font-normal` (400) | `leading-relaxed` | Testo paragrafi |
| Body Small | `text-sm` | 14px | `font-normal` (400) | `leading-relaxed` | Trust indicators, notes |
| Caption | `text-xs` | 12px | `font-medium` (500) | `leading-normal` | Badges, labels, meta |
| Overline | `text-xs uppercase tracking-wider` | 12px | `font-semibold` (600) | `leading-normal` | Section labels, tags |

### 1.3 Spacing System (8px grid)

| Token | Value | Uso |
|-------|-------|-----|
| `space-1` | 4px | Icon-text gap interno |
| `space-2` | 8px | Gap minimo tra elementi |
| `space-3` | 12px | Padding interno badge |
| `space-4` | 16px | Padding card interno, gap tra items |
| `space-6` | 24px | Gap tra card in griglia |
| `space-8` | 32px | Margin tra blocchi di contenuto |
| `space-12` | 48px | Padding sezione (mobile) |
| `space-16` | 64px | Margin tra section header e content |
| `space-20` | 80px | Padding verticale sezione (desktop) |
| `space-24` | 96px | Separazione tra sezioni major |

**Padding sezioni standard**: `py-16 md:py-20 lg:py-24 px-4 sm:px-6 lg:px-8`
**Container**: `container mx-auto max-w-7xl` (invariato, 1280px max)

### 1.4 Component Library

#### Buttons
| Componente | Classe | Uso |
|------------|--------|-----|
| **CTA Primary Large** | `btn-primary text-lg px-8 py-4` | Hero CTA, Final CTA |
| **CTA Primary** | `btn-primary px-6 py-3` | Section CTAs |
| **CTA Secondary** | `btn-secondary px-6 py-3` | Alternative CTAs |
| **CTA Ghost** | `text-dark-300 hover:text-dark-100 transition-colors font-medium` | Nav links, "Scopri di piu" |
| **CTA Pricing** | `btn-primary w-full py-4` oppure `btn-secondary w-full py-4` | Pricing card CTAs |

#### Cards
| Componente | Classe | Uso |
|------------|--------|-----|
| **Glass Card** | `glass-card` (invariato) | Container base |
| **Glass Card Hover** | `glass-card-hover` (invariato) | Feature cards standard |
| **Killer Feature Card** | `glass-card p-8 border-l-4 border-{color}` | 3 killer features (prominenti) |
| **Pricing Card** | `glass-card p-8` | Card pricing base |
| **Pricing Card Highlight** | `glass-card p-8 border-2 border-primary-from ring-1 ring-primary-from/30 relative` | Card pricing Pro (consigliato) |
| **Testimonial Card** | `glass-card p-6` | Citazioni testimonial |
| **Pain Point Card** | `glass-card p-6 text-center` | Pain point items |
| **Integration Card** | `glass-card p-6 flex items-start gap-4` | Integration items |

#### Badges
| Componente | Classe | Uso |
|------------|--------|-----|
| **Badge Blue** | `badge-blue` (invariato) | Generico |
| **Badge Green** | `badge-green` (invariato) | Trust, success |
| **Badge Purple** | `badge-purple` (invariato) | Analytics |
| **Badge Exclusive** | `px-3 py-1 text-xs font-bold rounded-full bg-accent-blue/20 text-accent-blue border border-accent-blue/30` | "Esclusivo" su killer features |
| **Badge Recommended** | `px-3 py-1 text-xs font-bold rounded-full bg-gradient-primary text-white` | "Consigliato" su pricing Pro |
| **Badge New** | `px-3 py-1 text-xs font-bold rounded-full bg-accent-green/20 text-accent-green` | "Unico sul mercato" |

#### Dividers
| Componente | Classe | Uso |
|------------|--------|-----|
| **Section Divider** | (nessun divider visibile) | Le sezioni si dividono per background alternato |
| **Inline Divider** | `border-t border-dark-700` | Dentro card, tra blocchi |

#### Icons
- Size standard: `w-6 h-6` (24px) per card icons, `w-5 h-5` (20px) per inline
- Stile: Heroicons outline (`stroke="currentColor"`) per features, solid (`fill="currentColor"`) per checkmarks/trust
- Container: `w-12 h-12 rounded-xl bg-{color}/10 text-{color} flex items-center justify-center`
- Killer feature icon container: `w-14 h-14 rounded-2xl` (leggermente piu grande)

---

## 2. Section-by-Section Design Specifications

### 2.1 NAVBAR (Aggiornamento)

**File**: `frontend/src/components/landing/LandingNavbar.jsx`
**Stato**: Esistente, da aggiornare

#### Layout
- Sticky top, `z-50`, `h-16`
- Background: `bg-dark-800/80 backdrop-blur-xl border-b border-dark-700` (invariato)
- Container: `container mx-auto px-4 sm:px-6 lg:px-8`
- Flex: `justify-between items-center`

#### Modifiche richieste
1. **Nav links**: Cambiare da `Features / Pricing / FAQ` a `Funzionalita / Come Funziona / Prezzi / FAQ`
   - Aggiungere `scrollToSection('how-it-works')` per "Come Funziona"
   - Aggiungere `scrollToSection('features')` per "Funzionalita"
2. **Scroll spy**: Aggiungere `IntersectionObserver` per evidenziare la sezione attiva (classe `text-dark-100` sulla voce attiva)
3. **Mobile menu**: Aggiornare con gli stessi 4 link

#### Responsive
- **Desktop** (md+): Inline nav links + CTA buttons
- **Mobile** (<md): Hamburger menu, slide-up panel con i 4 link + CTA
- **Sticky CTA mobile** (NUOVO): Quando l'utente scrolla oltre l'hero, mostrare una barra sticky bottom con CTA "Inizia Gratis"
  - Classe: `fixed bottom-0 left-0 right-0 z-40 bg-dark-800/95 backdrop-blur-xl border-t border-dark-700 p-3 md:hidden`
  - Contiene: `btn-primary w-full py-3 text-base`
  - Appare con `animate-slide-up` quando `scrollY > heroHeight`

#### Visual Hierarchy
1. Logo (sinistra)
2. Nav links (centro)
3. Login ghost + CTA primary (destra)

---

### 2.2 HERO SECTION (Aggiornamento major)

**File**: `frontend/src/components/landing/HeroSection.jsx`
**Stato**: Esistente, da riscrivere quasi completamente

#### Layout
```
Desktop (lg+):
┌─────────────────────────────────────────────────────┐
│  [Radial gradient bg overlay - invariato]            │
│                                                       │
│  ┌──────────────────┐  ┌─────────────────────────┐  │
│  │                    │  │                           │  │
│  │  Headline H1       │  │  Dashboard Screenshot     │  │
│  │  (gradient text)   │  │  (real product image      │  │
│  │                    │  │   in glass-card frame)    │  │
│  │  Sub-headline      │  │                           │  │
│  │                    │  │                           │  │
│  │  [CTA Primary]     │  │                           │  │
│  │  [CTA Secondary]   │  │                           │  │
│  │                    │  └─────────────────────────┘  │
│  │  ✓ ✓ ✓ Trust      │                               │
│  └──────────────────┘                                │
│                                                       │
│  ▼ Scroll indicator (chevron animato)                │
│                                                       │
└─────────────────────────────────────────────────────┘
```

```
Mobile (<lg):
┌─────────────────────┐
│                       │
│  Headline H1          │
│  (centered)           │
│                       │
│  Sub-headline         │
│                       │
│  [CTA Primary]        │
│  [CTA Secondary]      │
│                       │
│  ✓ ✓ ✓ Trust         │
│                       │
│  Dashboard Screenshot │
│  (smaller, 60% width) │
│                       │
│  ▼ Scroll indicator   │
│                       │
└─────────────────────┘
```

#### Struttura
- Griglia: `grid lg:grid-cols-2 gap-12 items-center`
- **Cambiare** `min-h-screen` a `min-h-[85vh] lg:min-h-screen` (mobile: mostra hint di contenuto sotto)
- Background: mantenere `bg-gradient-radial from-primary-from/10` ma aggiungere dots pattern sottile

#### Headline
```
"Smetti di Fare Report."        → text-dark-100
"Inizia a Decidere."            → bg-gradient-primary bg-clip-text text-transparent
```
- Font: `text-5xl md:text-6xl lg:text-7xl font-bold leading-hero tracking-tightest`
- La seconda riga con gradient e la parte ad alto impatto visivo

#### Sub-headline
- "Connetti le tue istanze JIRA, visualizza i worklog del team in tempo reale e genera fatture con un click. Setup in 5 minuti, gratis per sempre."
- Classe: `text-lg md:text-xl text-dark-300 leading-relaxed max-w-xl`

#### Dashboard Screenshot
- **CRITICO**: Sostituire il mockup placeholder grigio con uno screenshot reale del prodotto
- Screenshot della vista Dashboard principale con grafici e stat cards
- Incorniciato nel `glass-card` con browser chrome (mantenere struttura esistente per i 3 dots)
- Aggiungere leggero effetto `shadow-2xl` e rotazione prospettica: `transform perspective-1000 rotateY(-5deg) rotateX(2deg)` su desktop
- Mobile: immagine piatta, ridotta al 80% della larghezza, `mx-auto`

#### Floating Badge
- Mantenere "Sync in tempo reale" badge
- **Rimuovere** `animate-pulse-slow` (distraente come da UX analysis)
- Aggiungere hover: leggero scale-up

#### Scroll Indicator (NUOVO)
- Posizione: centrato, bottom della sezione
- Contenuto: chevron SVG (`w-6 h-6`) animato con `animate-bounce`
- Classe: `absolute bottom-8 left-1/2 -translate-x-1/2 text-dark-400`
- `onClick`: scroll smooth alla prossima sezione (social-proof)

#### Animazioni
- Headline: `animate-fade-in` (invariato)
- Dashboard: `animate-slide-in-right` (invariato) - delay 200ms
- Trust indicators: stagger fade-in con delay 100ms ciascuno

---

### 2.3 SOCIAL PROOF BAR (NUOVA)

**File**: `frontend/src/components/landing/SocialProofBar.jsx`

#### Layout
```
┌─────────────────────────────────────────────────────┐
│  bg: dark-800/50 con border top/bottom              │
│                                                       │
│  "Scelto da team che gestiscono migliaia             │
│   di ore ogni mese"                                   │
│                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │  ⚡ 500+  │  │  📊 1M+   │  │  🛡 99.9% │          │
│  │  Team     │  │  Worklog  │  │  Uptime   │          │
│  │  attivi   │  │  tracciati│  │  garantito│          │
│  └──────────┘  └──────────┘  └──────────┘          │
│                                                       │
└─────────────────────────────────────────────────────┘
```

#### Struttura
- Container: `py-12 md:py-16 bg-dark-800/50 border-y border-dark-700/50`
- Headline: `text-lg md:text-xl text-dark-300 text-center mb-8 font-medium`
- Metriche: `flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16`

#### Ogni metrica
- Layout: `text-center`
- Valore: `text-3xl md:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent` (es. "500+")
- Label: `text-sm text-dark-400 mt-1` (es. "Team attivi")
- Icona: `w-8 h-8 text-dark-400 mx-auto mb-2`

#### Responsive
- **Desktop**: 3 metriche in riga, ampi gap
- **Mobile**: Stack verticale o riga stretta con `gap-6`

#### Animazione
- Ogni metrica: `animate-fade-in` con stagger delay (0, 150ms, 300ms)
- Opzionale: contatore animato (`CountUp`) che conta da 0 al valore

#### Visual Hierarchy
- Sezione visivamente "neutra" - non compete con hero ne con pain points
- Funzione: transizione di fiducia tra hero emozionale e pain points

---

### 2.4 PAIN POINTS SECTION (NUOVA)

**File**: `frontend/src/components/landing/PainPointsSection.jsx`

#### Layout
```
┌─────────────────────────────────────────────────────┐
│  bg: dark-900 (sfondo base, distingue da Social)    │
│                                                       │
│  "Ti riconosci in queste situazioni?"                │
│                                                       │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐      │
│  │  🕐 Icon    │ │  🔄 Icon    │ │  🧾 Icon    │      │
│  │             │ │             │ │             │      │
│  │  "Passo 4h │ │  "Devo     │ │  "Le fatture│      │
│  │  a settimana│ │  aprire 3  │ │  sono sempre│      │
│  │  a compilare│ │  istanze   │ │  in ritardo"│      │
│  │  report"    │ │  JIRA..."  │ │             │      │
│  │             │ │             │ │  Descrizione│      │
│  │  Descrizione│ │  Descrizione│ │             │      │
│  └────────────┘ └────────────┘ └────────────┘      │
│                                                       │
│  "Se hai annuito almeno una volta,                   │
│   sei nel posto giusto."                              │
│                                                       │
└─────────────────────────────────────────────────────┘
```

#### Struttura
- Padding: `py-16 md:py-20 lg:py-24 px-4`
- Container: `container mx-auto max-w-6xl`
- Header: `text-3xl md:text-4xl lg:text-5xl font-bold text-dark-100 text-center mb-12 md:mb-16`
- Grid: `grid md:grid-cols-3 gap-6 md:gap-8`
- Closing line: `text-center mt-12 text-lg md:text-xl text-dark-300 italic`

#### Ogni Pain Point Card
- Classe: `glass-card p-6 md:p-8 text-center group hover:border-accent-red/30 transition-all duration-300`
- Icona: `w-14 h-14 rounded-2xl bg-accent-red/10 text-accent-red flex items-center justify-center mx-auto mb-4`
- Titolo (citazione): `text-lg font-bold text-dark-100 mb-3` - testo tra virgolette
- Descrizione: `text-dark-300 text-sm leading-relaxed`
- Hover: `hover:bg-dark-700/50 hover:-translate-y-1`

#### Responsive
- **Desktop**: 3 colonne
- **Tablet** (md): 3 colonne strette
- **Mobile**: 1 colonna, stack verticale

#### Animazione
- Cards: `animate-fade-in` al viewport enter (IntersectionObserver)
- Stagger: 0ms, 150ms, 300ms
- Hover: leggero lift (`-translate-y-1`) con bordo rosso sottile

#### Psicologia del Design
- Le icone usano `accent-red` come tinta principale (dolore, urgenza)
- Contrasto con la prossima sezione "How It Works" che usa `accent-green` (soluzione, sollievo)
- Le citazioni in prima persona creano empatia ("Passo 4h..." non "Gli utenti passano 4h...")

---

### 2.5 HOW IT WORKS SECTION (NUOVA)

**File**: `frontend/src/components/landing/HowItWorksSection.jsx`

#### Layout
```
┌─────────────────────────────────────────────────────┐
│  bg: dark-800/30                                     │
│                                                       │
│  "Operativo in 3 semplici step"                      │
│  Sub-header text                                      │
│                                                       │
│  ┌──────┐    ──→    ┌──────┐    ──→    ┌──────┐    │
│  │  ①    │          │  ②    │          │  ③    │    │
│  │       │          │       │          │       │    │
│  │ Conn. │          │ Visu. │          │ Fatt. │    │
│  │       │          │       │          │       │    │
│  │ desc  │          │ desc  │          │ desc  │    │
│  │       │          │       │          │       │    │
│  │ 5 min │          │ Auto  │          │ 3 sec │    │
│  └──────┘          └──────┘          └──────┘    │
│                                                       │
│              [Inizia Gratis →]                        │
│                                                       │
└─────────────────────────────────────────────────────┘
```

#### Struttura
- `id="how-it-works"`
- Background: `bg-dark-800/30` (alternato rispetto al pain points)
- Padding: `py-16 md:py-20 lg:py-24 px-4`
- Container: `container mx-auto max-w-5xl`
- Header: `text-center mb-12 md:mb-16`
  - H2: `text-3xl md:text-4xl lg:text-5xl font-bold text-dark-100 mb-4`
  - Sub: `text-lg text-dark-300 max-w-2xl mx-auto`
- Steps container: `flex flex-col md:flex-row items-start md:items-center justify-center gap-8 md:gap-4`

#### Ogni Step
- Layout: `flex-1 text-center max-w-xs mx-auto`
- Numero: `w-12 h-12 rounded-full bg-gradient-primary text-white font-bold text-xl flex items-center justify-center mx-auto mb-4`
- Icona sotto il numero: `w-16 h-16 rounded-2xl bg-dark-700 text-primary-from flex items-center justify-center mx-auto mb-4`
  - Alternativa: combinare numero e icona in un unico elemento. Il numero e l'identita principale.
- Titolo: `text-xl font-bold text-dark-100 mb-2`
- Descrizione: `text-dark-300 text-sm leading-relaxed mb-3`
- Dettaglio: `inline-flex items-center gap-1 text-xs font-medium text-accent-green bg-accent-green/10 px-3 py-1 rounded-full`

#### Connettori (frecce tra step)
- Desktop: elemento SVG o tratteggio `border-t-2 border-dashed border-dark-600 w-12` tra i card
- Mobile: freccia verticale `↓` o linea tratteggiata verticale tra gli step

#### CTA
- Centrato sotto gli step: `mt-12 text-center`
- Button: `btn-primary text-lg px-8 py-4` con icona freccia

#### Responsive
- **Desktop**: 3 step in riga con connettori freccia
- **Mobile**: Stack verticale con linea connettore verticale a sinistra

#### Animazione
- Steps: `animate-fade-in` staggerato (0, 200ms, 400ms) al viewport enter
- Connettori: disegno progressivo da sinistra a destra (opzionale, CSS animation)

---

### 2.6 FEATURES SECTION (Aggiornamento major)

**File**: `frontend/src/components/landing/FeaturesSection.jsx` + `FeatureCard.jsx`
**Stato**: Esistente, da ristrutturare con gerarchia 3 killer + 3 standard

#### Layout
```
┌─────────────────────────────────────────────────────┐
│  bg: dark-900                                        │
│                                                       │
│  "Perche i team scelgono Worklog Dashboard"          │
│  Sub-header text                                      │
│                                                       │
│  ═══ KILLER FEATURES (prominenti) ═══                │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │ [Esclusivo]                                   │    │
│  │ "Una dashboard, tutte le tue istanze JIRA"   │    │
│  │ Description + benefit line                    │    │  ← Full width
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  ┌──────────────────────┐ ┌──────────────────────┐  │
│  │ [Killer Feature]      │ │ [Unico sul mercato]  │  │
│  │ Billing Automatico    │ │ Factorial HR          │  │  ← 2 col
│  │ Description + benefit │ │ Description + benefit │  │
│  └──────────────────────┘ └──────────────────────┘  │
│                                                       │
│  ─── FEATURE STANDARD (compatte) ───                 │
│                                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ Dashboard │ │ Analytics│ │ Security │            │  ← 3 col (piu piccole)
│  │ Real-time │ │ Epic     │ │ Multi-t. │            │
│  └──────────┘ └──────────┘ └──────────┘            │
│                                                       │
└─────────────────────────────────────────────────────┘
```

#### Struttura
- `id="features"`
- Background: `py-16 md:py-20 lg:py-24 px-4`  (nessun bg aggiuntivo, solo `dark-900`)
- Container: `container mx-auto max-w-7xl`

#### Section Header
- H2: `text-3xl md:text-4xl lg:text-5xl font-bold text-dark-100 text-center mb-4`
- Sub: `text-lg md:text-xl text-dark-300 text-center max-w-2xl mx-auto mb-12 md:mb-16`

#### Killer Features Layout
- Prima feature (Multi-JIRA): **full width**, `col-span-full`
  - Classe card: `glass-card p-6 md:p-8 border-l-4 border-accent-blue`
  - Layout interno: `md:flex items-center gap-8`
  - Sinistra: icona grande + badge "Esclusivo" + titolo + descrizione + benefit line
  - Destra: placeholder per screenshot del multi-instance view (opzionale)
- Seconda e terza feature: **2 colonne**
  - Grid: `grid md:grid-cols-2 gap-6 mt-6`
  - Billing: `glass-card p-6 md:p-8 border-l-4 border-accent-orange`
  - Factorial: `glass-card p-6 md:p-8 border-l-4 border-accent-green`

#### Killer Feature Card (interno)
- Badge: posizionato top del card, `mb-3`
  - "Esclusivo" → `bg-accent-blue/20 text-accent-blue border border-accent-blue/30`
  - "Killer Feature" → `bg-accent-orange/20 text-accent-orange border border-accent-orange/30`
  - "Unico sul mercato" → `bg-accent-green/20 text-accent-green border border-accent-green/30`
- Icona: `w-14 h-14 rounded-2xl bg-{color}/10 text-{color}` - piu grande degli standard
- Titolo: `text-xl md:text-2xl font-bold text-dark-100 mb-3`
- Descrizione: `text-dark-300 leading-relaxed mb-3`
- Benefit line: `text-sm font-medium text-{color} italic`

#### Standard Features
- Divider visivo: `mt-12` con testo overline opzionale "E inoltre..."
- Grid: `grid md:grid-cols-3 gap-6`
- Card: mantiene lo stile `glass-card-hover` del `FeatureCard.jsx` attuale ma con copy aggiornato
- Dimensioni piu compatte: `p-6` (vs `p-8` delle killer)

#### Responsive
- **Desktop**: Killer 1 (full) + Killer 2,3 (2-col) + Standard (3-col)
- **Tablet**: Killer 1 (full) + Killer 2,3 (2-col) + Standard (2-col)
- **Mobile**: Tutto in 1 colonna

---

### 2.7 BILLING SHOWCASE (NUOVA)

**File**: `frontend/src/components/landing/BillingShowcase.jsx`

#### Layout
```
┌─────────────────────────────────────────────────────┐
│  bg: dark-800/30                                     │
│                                                       │
│  "La fatturazione che i team JIRA                    │
│   aspettavano da anni"                                │
│                                                       │
│  ┌────────────────────┐  ┌──────────────────────┐   │
│  │                      │  │                        │   │
│  │  Screenshot del      │  │  Copy + feature list  │   │
│  │  billing module      │  │                        │   │
│  │  (product image)     │  │  ✓ Rate personalizzate │   │
│  │                      │  │  ✓ Preview in-app      │   │
│  │                      │  │  ✓ Export Excel         │   │
│  │                      │  │  ✓ Storico completo    │   │
│  │                      │  │  ✓ Classificazione     │   │
│  │                      │  │                        │   │
│  │                      │  │  📊 "6 ore al mese     │   │
│  │                      │  │  risparmiate"          │   │
│  └────────────────────┘  │                        │   │
│                            │  [Prova il Billing →]  │   │
│                            └──────────────────────┘   │
│                                                       │
└─────────────────────────────────────────────────────┘
```

#### Struttura
- Background: `bg-dark-800/30`
- Padding: `py-16 md:py-20 lg:py-24 px-4`
- Container: `container mx-auto max-w-7xl`
- Header: centrato, `text-3xl md:text-4xl lg:text-5xl font-bold text-dark-100 text-center mb-12 md:mb-16`
- Content: `grid lg:grid-cols-2 gap-12 items-center`

#### Colonna sinistra (Screenshot)
- Container: `glass-card p-4 shadow-2xl`
- Browser chrome identico all'hero (3 dots + URL bar)
- Contenuto: **screenshot reale** del modulo billing
- Fallback: mockup stilizzato con dati finti (tabella con righe, bottoni, totali)

#### Colonna destra (Copy)
- Main copy: `text-lg text-dark-300 leading-relaxed mb-6`
- Feature list: `space-y-3`
  - Ogni item: `flex items-start gap-3`
    - Check icon: `w-5 h-5 text-accent-green flex-shrink-0 mt-0.5`
    - Testo: `text-dark-200` con titolo in `font-semibold text-dark-100`
- Stat highlight: `glass-card p-4 mt-6 flex items-center gap-4`
  - Valore: `text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent`
  - Label: `text-dark-300 text-sm`
- CTA: `mt-8`, `btn-primary text-lg px-8 py-4`

#### Responsive
- **Desktop**: 2 colonne, screenshot a sinistra
- **Mobile**: Stack, screenshot sopra, copy sotto

#### Animazione
- Screenshot: `animate-fade-in` al viewport enter
- Feature list items: stagger fade-in

---

### 2.8 INTEGRATIONS SECTION (NUOVA)

**File**: `frontend/src/components/landing/IntegrationsSection.jsx`

#### Layout
```
┌─────────────────────────────────────────────────────┐
│  bg: dark-900                                        │
│                                                       │
│  "Si integra con gli strumenti che usi gia"          │
│  Sub-header                                           │
│                                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐│
│  │ JIRA logo │ │ Tempo    │ │ Factorial│ │ Google   ││
│  │           │ │ logo     │ │ logo     │ │ logo     ││
│  │ Desc      │ │ Desc     │ │ Desc     │ │ Desc     ││
│  │           │ │          │ │          │ │          ││
│  │ "Multi-   │ │ "Sync    │ │ "Unico  │ │ "Setup   ││
│  │  istanza" │ │  veloce" │ │  sul     │ │  istan-  ││
│  │           │ │          │ │  mercato"│ │  taneo"  ││
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘│
│                                                       │
│  "Non trovi la tua integrazione? Contattaci"         │
│                                                       │
└─────────────────────────────────────────────────────┘
```

#### Struttura
- Padding: `py-16 md:py-20 lg:py-24 px-4`
- Container: `container mx-auto max-w-6xl`
- Header: centrato
- Grid: `grid grid-cols-2 lg:grid-cols-4 gap-6`
- Bottom note: `text-center mt-8 text-dark-400 text-sm`

#### Ogni Integration Card
- Classe: `glass-card p-6 text-center group hover:border-dark-500/50 transition-all duration-300`
- Logo container: `w-16 h-16 rounded-2xl bg-dark-700 flex items-center justify-center mx-auto mb-4`
  - Per ora: icona SVG stilizzata (non loghi reali)
  - Futuro: immagini logo reali (SVG)
- Nome: `text-lg font-bold text-dark-100 mb-2`
- Descrizione: `text-dark-300 text-sm leading-relaxed mb-3`
- Dettaglio badge: `inline-flex text-xs font-medium px-3 py-1 rounded-full bg-accent-green/10 text-accent-green`

#### Responsive
- **Desktop**: 4 colonne
- **Tablet**: 2 colonne
- **Mobile**: 2 colonne (card piu compatte) o 1 colonna

---

### 2.9 USE CASES SECTION (NUOVA)

**File**: `frontend/src/components/landing/UseCasesSection.jsx`

#### Layout
```
┌─────────────────────────────────────────────────────┐
│  bg: dark-800/30                                     │
│                                                       │
│  "Come i team usano Worklog Dashboard ogni giorno"   │
│  Sub-header                                           │
│                                                       │
│  ┌─────────────────────────────────────────────────┐│
│  │ Tab/Nav: [PM Sara] [CTO Marco] [Finance] [HR]  ││
│  └─────────────────────────────────────────────────┘│
│                                                       │
│  ┌────────────────────┐ ┌────────────────────────┐  │
│  │  PRIMA              │ │  DOPO                   │  │
│  │  (sfondo rosso      │ │  (sfondo verde           │  │
│  │   sottile)          │ │   sottile)               │  │
│  │                      │ │                          │  │
│  │  "Ogni venerdi       │ │  "Ora apro la dashboard │  │
│  │  passavo 3-4 ore..." │ │  e il report e gia..."  │  │
│  │                      │ │                          │  │
│  └────────────────────┘ └────────────────────────┘  │
│                                                       │
│  ┌─────────────────────────────────────────────────┐│
│  │  ⚡ Risultato: Da 4 ore di report a 0.          ││
│  │     Ogni settimana.                               ││
│  └─────────────────────────────────────────────────┘│
│                                                       │
└─────────────────────────────────────────────────────┘
```

#### Struttura
- Background: `bg-dark-800/30`
- Padding: `py-16 md:py-20 lg:py-24 px-4`
- Container: `container mx-auto max-w-5xl`

#### Tab Navigation
- `flex overflow-x-auto gap-2 mb-8 md:mb-12 pb-2`
- Ogni tab: `px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all`
  - Attivo: `bg-gradient-primary text-white`
  - Inattivo: `bg-dark-700 text-dark-300 hover:text-dark-100`
- Tab labels: "PM Sara", "CTO Marco", "Finance Andrea", "HR Elena"

#### Use Case Content
- Grid: `grid md:grid-cols-2 gap-6`
- Card "Prima": `glass-card p-6 border-l-4 border-accent-red/50`
  - Label: `text-xs font-semibold uppercase tracking-wider text-accent-red mb-3` → "PRIMA"
  - Citazione: `text-dark-300 leading-relaxed italic`
- Card "Dopo": `glass-card p-6 border-l-4 border-accent-green/50`
  - Label: `text-xs font-semibold uppercase tracking-wider text-accent-green mb-3` → "DOPO"
  - Citazione: `text-dark-200 leading-relaxed italic`

#### Risultato
- Container: `glass-card p-4 mt-6 bg-accent-green/5 border-accent-green/20`
- Icona lampo: `text-accent-green`
- Testo: `font-bold text-dark-100`

#### Responsive
- **Desktop**: Tab orizzontali + 2 colonne prima/dopo
- **Mobile**: Tab scrollabili + stack verticale prima/dopo

#### Animazione
- Tab switch: `animate-fade-in` sul contenuto
- Prima/Dopo: slide-in da sinistra/destra rispettivamente

---

### 2.10 TESTIMONIALS SECTION (NUOVA)

**File**: `frontend/src/components/landing/TestimonialsSection.jsx`

#### Layout
```
┌─────────────────────────────────────────────────────┐
│  bg: dark-900                                        │
│                                                       │
│  "Cosa dicono i team che lo usano"                   │
│                                                       │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐│
│  │ ★★★★★        │ │ ★★★★★        │ │ ★★★★★        ││
│  │               │ │               │ │               ││
│  │ "Finalmente   │ │ "Ho eliminato│ │ "Il billing   ││
│  │  una visione  │ │  completam.  │ │  integrato    ││
│  │  unificata..."│ │  i report..."│ │  ha cambiato  ││
│  │               │ │               │ │  tutto..."    ││
│  │               │ │               │ │               ││
│  │ 👤 Marco R.  │ │ 👤 Sara M.   │ │ 👤 Andrea B. ││
│  │ CTO @ Company│ │ PM @ Company │ │ Finance Dir. ││
│  └──────────────┘ └──────────────┘ └──────────────┘│
│                                                       │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐            │
│  │ 16h/m│  │ -95% │  │ 5 min│  │ 4.9/5│            │  Stats bar
│  │rispar│  │errori│  │setup │  │rating│            │
│  └──────┘  └──────┘  └──────┘  └──────┘            │
│                                                       │
└─────────────────────────────────────────────────────┘
```

#### Struttura
- Padding: `py-16 md:py-20 lg:py-24 px-4`
- Container: `container mx-auto max-w-7xl`
- Header: centrato

#### Testimonial Card
- Grid: `grid md:grid-cols-3 gap-6 mb-12`
- Card: `glass-card p-6 flex flex-col`
- Stars: `flex gap-1 mb-4` - 5 stelle `text-accent-orange w-5 h-5`
- Quote: `text-dark-200 leading-relaxed italic flex-1 mb-6` - citazione tra virgolette
- Attribution: `flex items-center gap-3 mt-auto`
  - Avatar placeholder: `w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold text-sm`
    - Contenuto: iniziali (es. "MR", "SM", "AB")
  - Info: `text-sm`
    - Nome: `font-semibold text-dark-100`
    - Ruolo: `text-dark-400`

#### Stats Bar (sotto testimonials)
- Container: `grid grid-cols-2 md:grid-cols-4 gap-4`
- Ogni stat: `glass-card p-4 text-center`
  - Valore: `text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent`
  - Label: `text-xs text-dark-400 mt-1`

#### Responsive
- **Desktop**: 3 testimonial cards + 4 stats
- **Tablet**: 3 cards + 2x2 stats
- **Mobile**: Carousel/swipe per testimonials (1 visibile + dots) + 2x2 stats

#### Nota
- Le citazioni sono placeholder (`[Company]`). Struttura predisposta per dati reali.
- Avatar placeholder con iniziali fino a quando non ci sono foto reali.

---

### 2.11 PRICING SECTION (NUOVA)

**File**: `frontend/src/components/landing/PricingSection.jsx`

#### Layout
```
┌─────────────────────────────────────────────────────┐
│  bg: dark-800/30                                     │
│                                                       │
│  "Un prezzo. Tutto il team. Zero sorprese."          │
│  "Nessun costo per utente. Mai."                     │
│                                                       │
│  ┌──────────┐  ┌═══════════════┐  ┌──────────┐     │
│  │   FREE    │  ║  PRO          ║  │ ENTERPRISE│     │
│  │           │  ║  [Consigliato]║  │           │     │
│  │  Gratis   │  ║  €29/mese     ║  │  Custom   │     │
│  │  per sempr│  ║  flat         ║  │           │     │
│  │           │  ║               ║  │           │     │
│  │  • 1 JIRA │  ║  • Illimitato ║  │  • SSO    │     │
│  │  • 1 Team │  ║  • Billing    ║  │  • SLA    │     │
│  │  • 5 Users│  ║  • Factorial  ║  │  • On-prem│     │
│  │  • Dashb. │  ║  • Analytics  ║  │  • Support│     │
│  │  • Sync   │  ║  • Export     ║  │  • Custom │     │
│  │           │  ║               ║  │           │     │
│  │ [Inizia]  │  ║ [Prova Pro]  ║  │[Contatta] │     │
│  │  gratis   │  ║  14gg gratis  ║  │ entro 24h │     │
│  └──────────┘  └═══════════════┘  └──────────┘     │
│                                                       │
│  "Nessun costo per utente. Mai."                     │
│  Confronto: Tempo $8/user, Clockify $12/user         │
│                                                       │
│  Garanzia: "Cancella in qualsiasi momento..."        │
│                                                       │
└─────────────────────────────────────────────────────┘
```

#### Struttura
- `id="pricing"`
- Background: `bg-dark-800/30`
- Padding: `py-16 md:py-20 lg:py-24 px-4`
- Container: `container mx-auto max-w-5xl`
- Header: centrato
- Cards: `grid md:grid-cols-3 gap-6 md:gap-0 items-stretch`
  - Le card laterali hanno bordi arrotondati normali
  - La card Pro (centrale) e leggermente piu alta (scaling o padding extra)

#### Pricing Card - Free
- Classe: `glass-card p-6 md:p-8 md:rounded-r-none`
- Nome: `text-lg font-bold text-dark-100`
- Prezzo: `text-4xl font-bold text-dark-100 my-4` → "Gratis"
- Sotto-prezzo: `text-sm text-dark-400` → "per sempre"
- Descrizione: `text-dark-300 text-sm mb-6`
- Feature list: `space-y-3`
  - Ogni feature: `flex items-center gap-2 text-sm text-dark-300`
    - Check icon: `w-4 h-4 text-accent-green`
- CTA: `btn-secondary w-full py-3 mt-6`
- Sotto CTA: `text-xs text-dark-400 text-center mt-2`

#### Pricing Card - Pro (HIGHLIGHT)
- Classe: `glass-card p-6 md:p-8 border-2 border-primary-from ring-1 ring-primary-from/20 relative z-10 md:scale-105`
- Badge "Consigliato": `absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-primary text-white text-xs font-bold rounded-full`
- Nome: `text-lg font-bold text-dark-100`
- Prezzo: `flex items-baseline gap-1 my-4`
  - "€": `text-2xl font-bold text-dark-200`
  - "29": `text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent`
  - "/mese": `text-dark-400 text-sm`
- Sotto-prezzo: `text-sm text-dark-400` → "tariffa flat, non per utente"
- Feature list: come Free ma con `text-dark-200` (piu luminoso)
  - "Tutto del piano Free, piu:" in `font-semibold text-dark-100` con separatore
- CTA: `btn-primary w-full py-3 mt-6`
- Sotto CTA: `text-xs text-dark-400 text-center mt-2` → "14 giorni di prova gratuita"

#### Pricing Card - Enterprise
- Classe: `glass-card p-6 md:p-8 md:rounded-l-none`
- Nome: `text-lg font-bold text-dark-100`
- Prezzo: `text-4xl font-bold text-dark-100 my-4` → "Custom"
- Sotto-prezzo: `text-sm text-dark-400` → "contattaci per un preventivo"
- Feature list: come Free
  - "Tutto del piano Pro, piu:" con separatore
- CTA: `btn-secondary w-full py-3 mt-6`

#### Bottom Line
- Container: `text-center mt-12`
- Testo principale: `text-lg font-bold text-dark-100 mb-2`
- Confronto: `text-sm text-dark-400`
- Garanzia: `text-sm text-dark-300 mt-4 italic`

#### Responsive
- **Desktop**: 3 colonne con Pro centrato ed elevato
- **Tablet**: 3 colonne strette
- **Mobile**: Stack verticale, Pro in cima (riordino con `order-first`)

---

### 2.12 FAQ SECTION (NUOVA)

**File**: `frontend/src/components/landing/FAQSection.jsx`

#### Layout
```
┌─────────────────────────────────────────────────────┐
│  bg: dark-900                                        │
│                                                       │
│  "Domande frequenti"                                 │
│  "Tutto quello che devi sapere..."                   │
│                                                       │
│  ┌─────────────────────────────────────────────────┐│
│  │  ▶ E davvero gratis? Qual e il catch?           ││
│  ├─────────────────────────────────────────────────┤│
│  │  ▼ I miei dati JIRA sono al sicuro?             ││
│  │    Assolutamente. Utilizziamo un'architettura   ││
│  │    multi-tenant con isolamento completo...      ││
│  ├─────────────────────────────────────────────────┤│
│  │  ▶ Funziona con Tempo Timesheets?               ││
│  ├─────────────────────────────────────────────────┤│
│  │  ▶ Posso collegare piu istanze JIRA?            ││
│  ├─────────────────────────────────────────────────┤│
│  │  ▶ Quanto tempo serve per il setup?             ││
│  ├─────────────────────────────────────────────────┤│
│  │  ▶ Posso esportare i dati?                      ││
│  ├─────────────────────────────────────────────────┤│
│  │  ▶ Come funziona la fatturazione automatica?    ││
│  ├─────────────────────────────────────────────────┤│
│  │  ▶ Che succede se la mia azienda cresce?        ││
│  └─────────────────────────────────────────────────┘│
│                                                       │
└─────────────────────────────────────────────────────┘
```

#### Struttura
- `id="faq"`
- Padding: `py-16 md:py-20 lg:py-24 px-4`
- Container: `container mx-auto max-w-3xl`
- Header: centrato

#### Accordion
- Container: `divide-y divide-dark-700 glass-card overflow-hidden`
- Ogni item:
  - Trigger: `w-full flex items-center justify-between p-5 md:p-6 text-left hover:bg-dark-700/30 transition-colors`
    - Domanda: `text-base md:text-lg font-semibold text-dark-100 pr-4`
    - Icona: chevron SVG `w-5 h-5 text-dark-400 transition-transform duration-300`
      - Aperto: `rotate-180`
  - Content: `px-5 md:px-6 pb-5 md:pb-6 text-dark-300 leading-relaxed`
    - Transizione: `max-h` animation con `overflow-hidden transition-all duration-300`
- Stato: Gestito con React `useState` - un solo item aperto alla volta
- Default: primo item aperto

#### Responsive
- Layout identico su tutti i breakpoint (single column accordion si adatta naturalmente)
- Font leggermente piu piccolo su mobile

---

### 2.13 FINAL CTA SECTION (NUOVA)

**File**: `frontend/src/components/landing/FinalCTASection.jsx`

#### Layout
```
┌─────────────────────────────────────────────────────┐
│                                                       │
│  ██████████████████████████████████████████████████  │
│  ██                                              ██  │
│  ██  "Pronto a smettere di perdere tempo         ██  │
│  ██   con i report manuali?"                     ██  │
│  ██                                              ██  │
│  ██  "Unisciti ai team che hanno gia             ██  │
│  ██   automatizzato il tracking delle ore..."    ██  │
│  ██                                              ██  │
│  ██         [Crea il Tuo Account Gratis]         ██  │
│  ██                                              ██  │
│  ██  ✓ Setup 5 min  ✓ No carta  ✓ Cancella      ██  │
│  ██                                              ██  │
│  ██████████████████████████████████████████████████  │
│                                                       │
└─────────────────────────────────────────────────────┘
```

#### Struttura
- Background: **gradient prominente** che si distingue da tutto il resto
  - `bg-gradient-to-br from-primary-from/20 via-dark-800 to-primary-to/20`
  - Border: `border-y border-primary-from/20`
- Padding: `py-16 md:py-24 lg:py-32 px-4`
- Container: `container mx-auto max-w-3xl text-center`

#### Contenuto
- Headline: `text-3xl md:text-4xl lg:text-5xl font-bold text-dark-100 mb-4`
- Sub-headline: `text-lg md:text-xl text-dark-300 mb-8 max-w-2xl mx-auto`
- CTA: `btn-primary text-lg md:text-xl px-10 py-5 shadow-glow`
  - Dimensione extra-large per impatto visivo
  - Glow effect: `shadow-glow` piu pronunciato
- Trust indicators: `mt-8 flex flex-wrap gap-6 justify-center text-dark-400 text-sm`
  - Stessi check verdi dell'hero

#### Responsive
- Identico su tutti i breakpoint, text-center always
- Font scale down su mobile

#### Animazione
- Background: leggero effetto parallax o gradient shift on scroll (opzionale)
- CTA: leggero pulse al viewport enter (solo una volta, non continuo)

---

### 2.14 FOOTER (Aggiornamento)

**File**: `frontend/src/components/landing/LandingFooter.jsx`
**Stato**: Esistente, da aggiornare

#### Modifiche richieste
1. **Brand description**: Aggiornare a "La piattaforma che trasforma i worklog JIRA in insight azionabili e fatture automatiche."
2. **Colonne**: Cambiare da 2 colonne (Prodotto + Legale) a 3 colonne:
   - **Prodotto**: Funzionalita, Integrazioni, Prezzi, Changelog, Status Page
   - **Risorse**: Documentazione, Guide Setup, API Reference, Blog, Community
   - **Legale**: Privacy Policy, Termini di Servizio, Cookie Policy, GDPR Compliance
3. **Copyright**: "2026 Worklog Dashboard. Tutti i diritti riservati."
4. **Social links**: Mantenere placeholder ma aggiungere `aria-label` per accessibilita

#### Layout
- Grid invariato: `grid md:grid-cols-4 gap-8` → `grid md:grid-cols-5 gap-8`
  - Brand: `md:col-span-2`
  - Prodotto: 1 col
  - Risorse: 1 col
  - Legale: 1 col

---

## 3. Key Visual Assets Needed

### 3.1 Screenshots Prodotto (CRITICI)

| Asset | Dove usarlo | Vista da catturare | Priorita |
|-------|------------|-------------------|----------|
| **Dashboard Overview** | Hero section | Dashboard principale con stat cards + grafico trend giornaliero + breakdown team | P0 |
| **Billing Module** | Billing Showcase | Vista fatturazione con tabella ore, rate, preview fattura, bottone export | P0 |
| **Multi-Instance View** | Features (killer) | Selettore istanze JIRA con vista aggregata | P1 |
| **Team Analytics** | Use Cases | Vista team con ore per membro, distribuzione Epic | P2 |

**Formato**: PNG/WebP, ottimizzati per web (max 200KB ciascuno), risoluzione 2x per retina
**Dimensioni**: ~1200x800px @ 2x

### 3.2 Icone e Illustrazioni

| Asset | Uso | Specifica |
|-------|-----|-----------|
| **Feature icons (6)** | Features section | Heroicons outline, 24x24, gia disponibili |
| **Step icons (3)** | How It Works | Plug, Dashboard, Receipt - Heroicons outline |
| **Integration "logos" (4)** | Integrations | SVG stilizzati: JIRA (blue), Tempo (blue-dark), Factorial (green), Google (multicolor) |
| **Pain point icons (3)** | Pain Points | Clock, Browser windows, Calculator - Heroicons outline, accent-red tint |
| **Star icon** | Testimonials | Filled star, accent-orange |

**Nota**: Per le integration logos, usare SVG generiche inizialmente (icone Heroicons) e sostituire con loghi brand ufficiali quando si hanno i permessi.

### 3.3 Trust Badges

| Badge | Testo | Posizione |
|-------|-------|-----------|
| SSL/Encryption | Implicito (non serve badge) | - |
| Uptime | "99.9% Uptime" | Social Proof Bar |
| Multi-tenant | "Dati isolati per azienda" | FAQ |
| Google OAuth | Logo Google piccolo + "OAuth" | Integrations |

---

## 4. Mobile-First Considerations

### 4.1 Sticky CTA Mobile

**Trigger**: Appare quando l'utente scrolla oltre la sezione Hero (`scrollY > heroElement.offsetHeight + heroElement.offsetTop`).

**Implementazione**:
```
Container: fixed bottom-0 left-0 right-0 z-40
            bg-dark-800/95 backdrop-blur-xl
            border-t border-dark-700 p-3
            transform transition-transform duration-300
            (translate-y-full quando nascosto, translate-y-0 quando visibile)
            md:hidden

Contenuto: btn-primary w-full py-3 text-base font-semibold
           "Inizia Gratis"
```

**Scompare**: Quando l'utente raggiunge la Final CTA section (per non duplicare).

### 4.2 Hamburger Menu

- Mantenere struttura attuale (`animate-slide-up` panel)
- Aggiornare link: Funzionalita, Come Funziona, Prezzi, FAQ
- Aggiungere separatore visivo prima dei CTA buttons
- Touch targets: tutti i bottoni min `h-11` (44px)

### 4.3 Touch Targets

| Elemento | Size minima | Classe |
|----------|-------------|--------|
| Nav links | 44x44px | `min-h-[44px] flex items-center` |
| CTA buttons | 44px altezza | `py-3` minimo (12+16+12 = 40px, OK con font) |
| FAQ accordion items | 44px altezza trigger | `min-h-[44px] p-5` |
| Feature cards | full-width mobile | Gia OK |
| Pricing cards | full-width mobile | `w-full` |
| Social icons footer | 44x44px touch area | `p-2` su icone 20px = 36px, portare a `p-3` |

### 4.4 Scroll Depth Indicators

- Scroll indicator nell'hero: chevron animato `animate-bounce` (visibile solo su prima visita)
- Progress bar opzionale nella navbar: linea sottile `h-0.5 bg-gradient-primary` che cresce con lo scroll
  - Implementazione: `width: ${scrollPercentage}%`

### 4.5 Mobile Section Ordering

L'ordine delle sezioni resta identico desktop/mobile. Le differenze:
1. Hero: mockup dashboard spostato sotto i CTA
2. Features: Killer features in stack singolo
3. Pricing: Pro card con `order-first` per essere prima
4. Testimonials: carousel swipe con dots indicator

---

## 5. Conversion Optimization Elements

### 5.1 CTA Button Design

| Tipo | Classe | Colore | Uso |
|------|--------|--------|-----|
| **Primary (Gradient)** | `btn-primary` | `bg-gradient-primary` + `shadow-glow` | "Inizia Gratis", "Prova Pro", "Crea Account" |
| **Primary Large** | `btn-primary text-lg px-8 py-4` | Stesso + piu grande | Hero CTA, Final CTA |
| **Primary Extra** | `btn-primary text-xl px-10 py-5 shadow-glow` | Stesso + ancora piu grande | Final CTA (unico) |
| **Secondary** | `btn-secondary` | `bg-dark-700 border border-dark-600` | "Scopri di piu", "Login", "Contattaci" |
| **Ghost** | custom inline | Trasparente, solo testo | Nav links, "Scopri come funziona" |

**Principio**: Un solo CTA primario visibile alla volta per ridurre decision fatigue. Il primario e sempre "Inizia Gratis" o varianti.

### 5.2 Visual Flow (Eye Travel Path)

```
Desktop Eye Path (Z/F pattern):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. LOGO → NAV → CTA "Inizia Gratis"     ← Z-pattern top (scansione navbar)
     ↓
2. HEADLINE (left) → SCREENSHOT (right)  ← Z-pattern hero
     ↓
3. SOCIAL PROOF BAR                       ← Full-width stop, numeri grandi
     ↓
4. PAIN POINTS (left to right scan)      ← 3 cards, emotivo
     ↓
5. HOW IT WORKS (1 → 2 → 3)             ← Flow lineare, semplicita
     ↓
6. KILLER FEATURES (prominenti)          ← Top-down, card grandi
     ↓
7. BILLING SCREENSHOT + COPY             ← Z-pattern (image left, text right)
     ↓
8. INTEGRATIONS (grid scan)              ← Quick scan 4 loghi
     ↓
9. USE CASES (tab + before/after)        ← Engaging, interactive
     ↓
10. TESTIMONIALS (faces/quotes)          ← Social proof anchor
     ↓
11. PRICING (center Pro card)            ← Decision point, anchoring
     ↓
12. FAQ (accordion scan)                 ← Objection handling
     ↓
13. FINAL CTA → ★ CONVERSIONE ★         ← Gradient bg, massimo impatto
     ↓
14. FOOTER                               ← Exit with options
```

### 5.3 Trust Element Placement

| Posizione | Trust Element | Tipo |
|-----------|--------------|------|
| Hero (below CTA) | "Setup 5 min / No carta / Gratis" | Micro-copy |
| Post-hero | Social Proof Bar (500+, 1M+, 99.9%) | Numeri |
| Features | Badge "Esclusivo", "Unico sul mercato" | Authority |
| Billing Showcase | "6 ore/mese risparmiate" | Stat |
| Testimonials | 3 citazioni con nome/ruolo | Social Proof |
| Testimonials | Stats bar (16h/mese, -95%, 5min, 4.9/5) | Numeri |
| Pricing | "Nessun costo per utente. Mai." | Garanzia |
| Pricing | Confronto vs competitor | Anchoring |
| FAQ | Risposte dettagliate su sicurezza | Transparency |
| Final CTA | Stessi trust indicators dell'hero | Rassicurazione |

### 5.4 Social Proof Design

**Metriche** (current approach - no loghi clienti reali):
- Numeri grandi con gradient text per impatto
- Disposti in riga su desktop, colonna su mobile
- Ogni metrica: valore numerico prominente + label descrittivo piccolo

**Testimonials**:
- Avatar con iniziali (fallback per no-foto)
- Nome, ruolo, contesto (numero team/utenti)
- Star rating 5/5 in accent-orange
- Citazioni specifiche con risultati numerici

**Pricing anchoring**:
- Confronto esplicito con competitor per-user pricing
- Emphasize "flat pricing" come differenziatore

---

## 6. Animations & Interactions Summary

### 6.1 Scroll-Triggered Animations

| Sezione | Trigger | Animazione | Classe/Implementazione |
|---------|---------|------------|----------------------|
| Social Proof metriche | Viewport enter | Fade-in + counter | IntersectionObserver + CSS |
| Pain Point cards | Viewport enter | Stagger fade-in | IO + delay 0/150/300ms |
| How It Works steps | Viewport enter | Stagger fade-in | IO + delay 0/200/400ms |
| Killer Feature cards | Viewport enter | Slide-up fade-in | IO + `animate-slide-up` |
| Billing screenshot | Viewport enter | Fade-in | IO |
| Testimonial cards | Viewport enter | Stagger fade-in | IO |
| Pricing cards | Viewport enter | Stagger slide-up | IO |
| Final CTA | Viewport enter | Fade-in + CTA pulse once | IO |

**Implementazione**: Custom hook `useInViewAnimation` con IntersectionObserver (`threshold: 0.2`).

### 6.2 Interaction Animations

| Elemento | Trigger | Animazione |
|----------|---------|------------|
| Glass cards | Hover | `hover:-translate-y-1 hover:shadow-glow` (invariato) |
| CTA buttons | Hover/Active | `hover:scale-105 active:scale-95` (invariato) |
| FAQ accordion | Click | `max-h` transition + chevron `rotate-180` |
| Use Case tabs | Click | Content `animate-fade-in` |
| Nav scroll spy | Scroll | Background color transition su link attivo |
| Sticky CTA mobile | Scroll | `translate-y` transition |

### 6.3 Accessibility (prefers-reduced-motion)

Il CSS esistente gia gestisce questo:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Tutte le animazioni si disabilitano automaticamente.

---

## 7. New Files to Create

| File | Tipo | Sezione |
|------|------|---------|
| `SocialProofBar.jsx` | Componente | 2.3 |
| `PainPointsSection.jsx` | Componente | 2.4 |
| `HowItWorksSection.jsx` | Componente | 2.5 |
| `BillingShowcase.jsx` | Componente | 2.7 |
| `IntegrationsSection.jsx` | Componente | 2.8 |
| `UseCasesSection.jsx` | Componente | 2.9 |
| `TestimonialsSection.jsx` | Componente | 2.10 |
| `PricingSection.jsx` | Componente | 2.11 |
| `FAQSection.jsx` | Componente | 2.12 |
| `FinalCTASection.jsx` | Componente | 2.13 |

## 8. Files to Modify

| File | Modifiche |
|------|-----------|
| `Landing.jsx` | Importare e assemblare tutte le 14 sezioni nell'ordine corretto |
| `LandingNavbar.jsx` | Aggiornare nav links, aggiungere scroll spy, sticky CTA mobile |
| `HeroSection.jsx` | Nuova headline, screenshot reale, scroll indicator, rimuovere pulse |
| `FeaturesSection.jsx` | Ristrutturare con 3 killer + 3 standard, nuovo copy |
| `FeatureCard.jsx` | Mantenere per le 3 feature standard |
| `LandingFooter.jsx` | 3 colonne, copy aggiornato |
| `index.css` | Aggiungere nuovi token CSS semantici (sezione 1.1) |

---

## 9. Implementation Priority Order

1. **Hero Section** rework (headline + screenshot) - Massimo impatto sulla first impression
2. **Social Proof Bar** - Trust immediato post-hero
3. **Pricing Section** - Fix broken nav link, decision point critico
4. **FAQ Section** - Fix broken nav link, objection handling
5. **Final CTA Section** - Cattura utenti che scrollano fino in fondo
6. **Pain Points Section** - Connessione emotiva
7. **How It Works Section** - Riduce friction
8. **Features Section** rework - Gerarchia killer features
9. **Billing Showcase** - Deep dive killer feature
10. **Testimonials Section** - Social proof
11. **Integrations Section** - Rassicurazione tecnica
12. **Use Cases Section** - Storytelling
13. **Navbar** update - Scroll spy + sticky mobile CTA
14. **Footer** update - Colonne aggiornate

---

*Specifica creata dal Senior UI Designer per il team landing-optimization. Febbraio 2026.*
*Riferimenti: `MARKETING_STRATEGY.md`, `UX_ANALYSIS.md`, `LANDING_COPY.md`, codice frontend esistente.*
*Pronto per implementazione dal frontend developer (Task #5).*
