# Piano di Migrazione: Next.js + Supabase + Inngest + Vercel

## Da dove partiamo → Dove arriviamo

### Stack Attuale
- **Backend:** FastAPI (Python 3.11) — 11 router, 111 endpoint, 2.500+ righe in cache.py
- **Frontend:** React 18 + TypeScript + Tailwind + TanStack Query
- **Database:** SQLite (24 tabelle, 40+ indici, aiosqlite)
- **Auth:** Google OAuth custom + JWT fatto a mano
- **Desktop:** Tauri + PyInstaller (da eliminare)
- **Deploy:** Manuale / non definito

### Stack Nuovo
- **Full-stack:** Next.js 14+ (App Router) con TypeScript
- **Database:** Supabase (PostgreSQL) + Prisma ORM
- **Auth:** Supabase Auth (Google OAuth integrato)
- **Sicurezza:** Row Level Security (RLS) per multi-tenant
- **Background Jobs:** Inngest (sync JIRA/Tempo + cron scheduling)
- **Deploy:** Vercel (git push = deploy)

### Architettura a 3 Livelli

```
┌─────────────────────────────────────────────────────────────┐
│                     VERCEL (App Layer)                       │
│  Next.js — UI, API routes, lettura dati, CRUD leggeri       │
│  Veloce, stateless, nessun lavoro pesante                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                                 │
┌─────────▼──────────┐          ┌──────────▼───────────────┐
│   SUPABASE (Data)  │          │   INNGEST (Background)   │
│  PostgreSQL + Auth  │          │  Sync JIRA/Tempo         │
│  RLS multi-tenant   │◄────────│  Cron giornalieri        │
│  Dati persistenti   │         │  Retry automatici        │
└────────────────────┘          │  Nessun timeout           │
                                └──────────────────────────┘
```

**Principio:** L'app su Vercel è una shell di presentazione ultra-leggera.
Il sync pesante (chiamate JIRA/Tempo che durano minuti) gira su Inngest,
completamente separato. L'app non aspetta mai il sync — legge i dati
già pronti dal DB.

### Cosa eliminiamo
- Tutto il layer Tauri / PyInstaller / desktop sidecar
- cache.py (2.500 righe) → sostituito da Prisma
- auth/jwt.py, auth/dependencies.py, auth/google_oauth.py → Supabase Auth
- CORS middleware → non serve (stessa origin)
- aiosqlite → Prisma + PostgreSQL
- WeasyPrint → @react-pdf/renderer o Puppeteer
- Sync sincrono nelle API routes → esternalizzato su Inngest (background jobs)

---

## Inventario Completo dei Moduli

### Classificazione per complessità di migrazione

**FACILE — Conversione quasi 1:1:**
- Teams CRUD (12 endpoint) — CRUD standard
- Users CRUD (3 endpoint) — CRUD standard
- Settings/Company (2 endpoint) — CRUD standard
- JIRA Instances CRUD (5 endpoint) — CRUD standard + cifratura credenziali

**MEDIO — Logica da adattare:**
- Worklogs (15 endpoint) — Query complesse, filtri, aggregazioni, paginazione
- Sync engine (4 endpoint) — Esternalizzato su Inngest (background jobs + cron)
- Auth (3 endpoint) — Sostituzione completa con Supabase Auth
- Migration (2 endpoint) — Da ripensare (Prisma migrations)

**COMPLESSO — Business logic critica:**
- Billing (18 endpoint) — Rate cascade 6 livelli, creazione invoice, aggregazioni
- Invoice PDF (1 endpoint) — WeasyPrint non esiste in Node, serve alternativa
- Complementary groups — Logica custom per confronto istanze

**DA ELIMINARE:**
- Desktop build scripts (PyInstaller, Tauri)
- Migration check/execute (Prisma gestisce tutto)
- Archiving/maintenance scripts (PostgreSQL ha strumenti nativi)

---

## Le 7 Fasi della Migrazione

Ogni fase è autonoma e testabile. Non toccare il progetto attuale finché il nuovo non è completo.


### FASE 0: Setup Progetto (Giorno 1)

**Obiettivo:** Progetto Next.js funzionante con Supabase collegato.

**Azioni:**

1. Crea il progetto Next.js

```bash
npx create-next-app@latest jira-worklog-next --typescript --tailwind --eslint --app --src-dir
cd jira-worklog-next
```

2. Installa le dipendenze

```bash
npm install @supabase/supabase-js @supabase/ssr prisma @prisma/client
npm install @tanstack/react-query lucide-react
npm install inngest                # Background jobs per sync
npm install -D @types/node
```

3. Setup Supabase

- Vai su supabase.com → New Project
- Copia Project URL e anon key
- Crea `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...  # Solo lato server
DATABASE_URL=postgresql://postgres:password@db.xxxx.supabase.co:5432/postgres
INNGEST_EVENT_KEY=xxx               # Da inngest.com dopo signup
INNGEST_SIGNING_KEY=xxx             # Per verificare le chiamate
```

4. Inizializza Prisma

```bash
npx prisma init
```

5. Struttura cartelle

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout con providers
│   ├── page.tsx            # Landing/redirect
│   ├── login/page.tsx      # Login page
│   ├── dashboard/          # Dashboard (protected)
│   │   ├── layout.tsx      # Dashboard shell con sidebar
│   │   ├── page.tsx        # Overview
│   │   ├── worklogs/       # Worklogs pages
│   │   ├── billing/        # Billing pages
│   │   ├── teams/          # Teams pages
│   │   └── settings/       # Settings pages
│   └── api/                # API Routes
│       ├── worklogs/
│       ├── billing/
│       ├── teams/
│       ├── sync/           # Trigger sync (manda evento a Inngest)
│       ├── settings/
│       └── inngest/        # Inngest webhook endpoint
│           └── route.ts    # Serve le Inngest functions
├── lib/                    # Utility & config
│   ├── supabase/
│   │   ├── client.ts       # Browser client
│   │   ├── server.ts       # Server client
│   │   └── middleware.ts    # Auth middleware
│   ├── inngest/
│   │   ├── client.ts       # Inngest client instance
│   │   └── functions/      # Background job definitions
│   │       ├── sync-instance.ts    # Sync singola istanza
│   │       ├── sync-all.ts         # Sync tutte le istanze
│   │       └── daily-sync.ts       # Cron giornaliero
│   ├── sync/
│   │   ├── jira-client.ts  # Client API JIRA
│   │   └── tempo-client.ts # Client API Tempo
│   ├── prisma.ts           # Prisma client singleton
│   └── utils.ts            # Helpers
├── components/             # React components (dal progetto attuale)
│   ├── ui/                 # Design system
│   ├── layout/             # Shell, sidebar, header
│   └── features/           # Feature-specific
├── hooks/                  # Custom hooks
└── types/                  # TypeScript types
```

**Prompt per Claude Code:**

```
Crea un progetto Next.js 14 con App Router, TypeScript, Tailwind CSS.
Configura Supabase client (browser + server) e Prisma.
Configura Inngest client e crea l'endpoint webhook in src/app/api/inngest/route.ts.
Crea la struttura cartelle come specificato.
Aggiungi un middleware Next.js che protegge tutte le route /dashboard/*.
Setup TanStack Query provider nel root layout.
```

**Checkpoint:** `npm run dev` funziona, Supabase è collegato, Prisma è inizializzato, Inngest Dev Server raggiungibile.

---

### FASE 1: Database Schema + Auth (Giorni 2-3)

**Obiettivo:** Tutte le 24 tabelle in PostgreSQL via Prisma, auth funzionante con Google.

**1A. Schema Prisma**

Converti le 24 tabelle SQLite in schema Prisma. Ecco le tabelle principali:

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Company {
  id          Int       @id @default(autoincrement())
  name        String
  logoUrl     String?   @map("logo_url")
  defaultRate Float     @default(0) @map("default_rate")
  currency    String    @default("EUR")
  taxRate     Float     @default(0) @map("tax_rate")
  invoicePrefix String  @default("INV") @map("invoice_prefix")
  createdAt   DateTime  @default(now()) @map("created_at")

  users           User[]
  teams           Team[]
  jiraInstances   JiraInstance[]
  worklogs        Worklog[]
  billingClients  BillingClient[]
  billingProjects BillingProject[]
  invoices        Invoice[]
  packageTemplates PackageTemplate[]
  holidays        Holiday[]
  complementaryGroups ComplementaryGroup[]

  @@map("companies")
}

model User {
  id        Int      @id @default(autoincrement())
  companyId Int      @map("company_id")
  email     String
  name      String?
  role      String   @default("USER") // ADMIN | MANAGER | USER
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  authId    String?  @unique @map("auth_id") // Supabase auth UUID

  company     Company      @relation(fields: [companyId], references: [id])
  teamMembers TeamMember[]

  @@unique([companyId, email])
  @@index([companyId])
  @@map("users")
}

model Team {
  id          Int      @id @default(autoincrement())
  companyId   Int      @map("company_id")
  name        String
  description String?
  createdAt   DateTime @default(now()) @map("created_at")

  company Company      @relation(fields: [companyId], references: [id])
  members TeamMember[]

  @@index([companyId, name])
  @@map("teams")
}

model TeamMember {
  id        Int    @id @default(autoincrement())
  teamId    Int    @map("team_id")
  userId    Int    @map("user_id")
  companyId Int    @map("company_id")
  role      String @default("MEMBER")

  team Team @relation(fields: [teamId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([teamId, userId])
  @@index([companyId])
  @@map("team_members")
}

model JiraInstance {
  id         Int      @id @default(autoincrement())
  companyId  Int      @map("company_id")
  name       String
  url        String
  jiraEmail  String   @map("jira_email")
  jiraToken  String?  @map("jira_token")   // Encrypted
  tempoToken String?  @map("tempo_token")  // Encrypted
  createdAt  DateTime @default(now()) @map("created_at")

  company  Company   @relation(fields: [companyId], references: [id])
  worklogs Worklog[]

  @@index([companyId])
  @@map("jira_instances")
}

model Worklog {
  id                Int      @id @default(autoincrement())
  companyId         Int      @map("company_id")
  jiraInstanceId    Int?     @map("jira_instance_id")
  worklogId         String   @map("worklog_id")
  issueKey          String   @map("issue_key")
  issueSummary      String?  @map("issue_summary")
  authorEmail       String   @map("author_email")
  authorName        String?  @map("author_name")
  started           DateTime
  timeSpentSeconds  Int      @map("time_spent_seconds")
  timeSpentDisplay  String?  @map("time_spent_display")
  comment           String?
  epicKey           String?  @map("epic_key")
  epicName          String?  @map("epic_name")
  projectKey        String   @map("project_key")
  projectName       String?  @map("project_name")
  billingClientId   Int?     @map("billing_client_id")
  billingProjectId  Int?     @map("billing_project_id")
  rate              Float?
  createdAt         DateTime @default(now()) @map("created_at")

  company      Company       @relation(fields: [companyId], references: [id])
  jiraInstance JiraInstance?  @relation(fields: [jiraInstanceId], references: [id])

  @@unique([companyId, jiraInstanceId, worklogId])
  @@index([companyId, started(sort: Desc)])
  @@index([companyId, authorEmail])
  @@index([companyId, projectKey])
  @@index([companyId, billingClientId])
  @@map("worklogs")
}

model BillingClient {
  id          Int      @id @default(autoincrement())
  companyId   Int      @map("company_id")
  name        String
  code        String
  defaultRate Float    @default(0) @map("default_rate")
  createdAt   DateTime @default(now()) @map("created_at")

  company  Company          @relation(fields: [companyId], references: [id])
  projects BillingProject[]
  invoices Invoice[]

  @@unique([companyId, code])
  @@index([companyId])
  @@map("billing_clients")
}

model BillingProject {
  id        Int      @id @default(autoincrement())
  companyId Int      @map("company_id")
  clientId  Int      @map("client_id")
  name      String
  code      String
  rate      Float    @default(0)
  createdAt DateTime @default(now()) @map("created_at")

  company Company       @relation(fields: [companyId], references: [id])
  client  BillingClient @relation(fields: [clientId], references: [id])

  @@unique([companyId, code])
  @@index([companyId])
  @@map("billing_projects")
}

model Invoice {
  id            Int      @id @default(autoincrement())
  companyId     Int      @map("company_id")
  clientId      Int      @map("client_id")
  invoiceNumber String   @map("invoice_number")
  invoiceDate   DateTime @map("invoice_date")
  periodStart   DateTime @map("period_start")
  periodEnd     DateTime @map("period_end")
  subtotal      Float    @default(0)
  taxRate       Float    @default(0) @map("tax_rate")
  total         Float    @default(0)
  status        String   @default("draft") // draft | sent | paid
  notes         String?
  createdAt     DateTime @default(now()) @map("created_at")

  company Company       @relation(fields: [companyId], references: [id])
  client  BillingClient @relation(fields: [clientId], references: [id])
  items   InvoiceItem[]

  @@unique([companyId, invoiceNumber])
  @@index([companyId, status])
  @@map("invoices")
}

model InvoiceItem {
  id          Int    @id @default(autoincrement())
  invoiceId   Int    @map("invoice_id")
  description String
  hours       Float
  rate        Float
  amount      Float

  invoice Invoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)

  @@map("invoice_items")
}

model PackageTemplate {
  id        Int      @id @default(autoincrement())
  companyId Int      @map("company_id")
  name      String
  rate      Float
  issueKey  String?  @map("issue_key")
  epicKey   String?  @map("epic_key")
  createdAt DateTime @default(now()) @map("created_at")

  company Company @relation(fields: [companyId], references: [id])

  @@index([companyId])
  @@map("package_templates")
}

model Holiday {
  id        Int      @id @default(autoincrement())
  companyId Int      @map("company_id")
  date      DateTime
  name      String

  company Company @relation(fields: [companyId], references: [id])

  @@index([companyId])
  @@map("holidays")
}

model ComplementaryGroup {
  id        Int      @id @default(autoincrement())
  companyId Int      @map("company_id")
  name      String
  config    Json     @default("{}")
  createdAt DateTime @default(now()) @map("created_at")

  company Company @relation(fields: [companyId], references: [id])

  @@index([companyId])
  @@map("complementary_groups")
}
```

Spingi lo schema su Supabase:

```bash
npx prisma db push
```

**1B. Supabase Auth con Google**

Nella dashboard Supabase: Authentication → Providers → Google → Abilita → inserisci Client ID e Secret dalla Google Console.

Crea il client Supabase:

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options))
        },
      },
    }
  )
}
```

```typescript
// src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Proteggi route /dashboard/*
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*']
}
```

**1C. Helper per ottenere il company_id**

Questo sostituisce il `Depends(get_current_user)` di FastAPI:

```typescript
// src/lib/auth.ts
import { createServerSupabase } from './supabase/server'
import { prisma } from './prisma'

export async function getCurrentUser() {
  const supabase = await createServerSupabase()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  
  if (!authUser) return null

  const user = await prisma.user.findUnique({
    where: { authId: authUser.id },
    include: { company: true }
  })

  return user
}

// Per le API routes — restituisce 401 se non autenticato
export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  return user
}

// Per le API routes admin-only
export async function requireAdmin() {
  const user = await requireAuth()
  if (user.role !== 'ADMIN') {
    throw new Response(JSON.stringify({ error: 'Admin required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  return user
}
```

**Prompt per Claude Code:**

```
Usando lo schema Prisma che ti fornisco e il progetto Next.js creato in Fase 0:
1. Configura Supabase Auth con Google OAuth (client browser + server + middleware)
2. Crea la funzione getCurrentUser() che recupera l'utente dal DB via auth_id
3. Crea la pagina /login con bottone "Sign in with Google" usando Supabase Auth
4. Crea il callback handler per l'auth
5. Dopo il primo login, crea automaticamente company + user nel DB
6. Proteggi /dashboard/* con il middleware
Testa che il login funziona end-to-end.
```

**Checkpoint:** Login con Google funziona. Utente creato nel DB. Route /dashboard protette.

---

### FASE 2: CRUD Base — Teams, Users, Settings (Giorni 4-5)

**Obiettivo:** Convertire i moduli più semplici per stabilire i pattern.

Qui stabilisci il pattern che userai per tutti gli altri moduli. Ogni API route segue questa struttura:

```typescript
// src/app/api/teams/route.ts
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/teams — Lista teams
export async function GET() {
  const user = await requireAuth()

  const teams = await prisma.team.findMany({
    where: { companyId: user.companyId },
    include: {
      members: { include: { user: true } },
      _count: { select: { members: true } }
    },
    orderBy: { name: 'asc' }
  })

  return NextResponse.json({ teams })
}

// POST /api/teams — Crea team
export async function POST(request: NextRequest) {
  const user = await requireAuth()
  const body = await request.json()

  const team = await prisma.team.create({
    data: {
      companyId: user.companyId, // Sempre dal JWT, mai dal body
      name: body.name,
      description: body.description,
    }
  })

  return NextResponse.json(team, { status: 201 })
}
```

```typescript
// src/app/api/teams/[teamId]/route.ts
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

type Params = { params: { teamId: string } }

// GET /api/teams/:id
export async function GET(request: NextRequest, { params }: Params) {
  const user = await requireAuth()

  const team = await prisma.team.findFirst({
    where: {
      id: parseInt(params.teamId),
      companyId: user.companyId // Multi-tenant isolation
    },
    include: { members: { include: { user: true } } }
  })

  if (!team) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(team)
}

// PUT /api/teams/:id
export async function PUT(request: NextRequest, { params }: Params) {
  const user = await requireAuth()
  const body = await request.json()

  const team = await prisma.team.updateMany({
    where: {
      id: parseInt(params.teamId),
      companyId: user.companyId
    },
    data: {
      name: body.name,
      description: body.description
    }
  })

  if (team.count === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}

// DELETE /api/teams/:id
export async function DELETE(request: NextRequest, { params }: Params) {
  const user = await requireAuth()

  const result = await prisma.team.deleteMany({
    where: {
      id: parseInt(params.teamId),
      companyId: user.companyId
    }
  })

  if (result.count === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return new NextResponse(null, { status: 204 })
}
```

Il frontend resta quasi identico — stai già usando TanStack Query:

```typescript
// src/hooks/useTeams.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function useTeams() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const res = await fetch('/api/teams')
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    }
  })
}

export function useCreateTeam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!res.ok) throw new Error('Failed to create')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] })
  })
}
```

**Moduli da convertire in questa fase:**
- Teams (CRUD + members) — 12 endpoint
- Users (list, get, update role) — 3 endpoint
- Settings/Company (get, update) — 2 endpoint
- JIRA Instances (CRUD + test connection) — 5 endpoint

**Prompt per Claude Code:**

```
Converti i seguenti router FastAPI in Next.js API routes usando Prisma.
Segui il pattern stabilito (requireAuth, companyId dal JWT, 404 per cross-tenant).

File originali Python: [incolla il codice dei router teams.py, users.py, settings.py]

Per ogni router:
1. Crea le API routes in src/app/api/
2. Crea gli hooks TanStack Query in src/hooks/
3. Mantieni esattamente gli stessi response format

Per JIRA Instances: usa la libreria 'crypto' di Node per cifrare i token (sostituisce Fernet).
```

**Checkpoint:** CRUD Teams, Users, Settings funzionano. API testabili con curl o Postman.

---

### FASE 3: Worklogs + Sync Engine (Giorni 6-8)

**Obiettivo:** Il cuore dell'app — sync da JIRA/Tempo e visualizzazione worklogs.

**3A. API Worklogs**

Le query worklogs sono le più complesse — filtri multipli, paginazione, aggregazioni:

```typescript
// src/app/api/worklogs/route.ts
export async function GET(request: NextRequest) {
  const user = await requireAuth()
  const { searchParams } = new URL(request.url)

  const where: any = { companyId: user.companyId }

  // Filtri opzionali
  if (searchParams.get('start_date')) {
    where.started = { ...where.started, gte: new Date(searchParams.get('start_date')!) }
  }
  if (searchParams.get('end_date')) {
    where.started = { ...where.started, lte: new Date(searchParams.get('end_date')!) }
  }
  if (searchParams.get('author_email')) {
    where.authorEmail = searchParams.get('author_email')
  }
  if (searchParams.get('jira_instance_id')) {
    where.jiraInstanceId = parseInt(searchParams.get('jira_instance_id')!)
  }
  if (searchParams.get('issue_key')) {
    where.issueKey = searchParams.get('issue_key')
  }

  const limit = parseInt(searchParams.get('limit') || '100')
  const offset = parseInt(searchParams.get('offset') || '0')

  const [worklogs, total] = await Promise.all([
    prisma.worklog.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { started: 'desc' }
    }),
    prisma.worklog.count({ where })
  ])

  return NextResponse.json({ worklogs, total, limit, offset })
}
```

```typescript
// src/app/api/worklogs/summary/route.ts
export async function GET(request: NextRequest) {
  const user = await requireAuth()
  const { searchParams } = new URL(request.url)

  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')

  // Aggregazione con Prisma
  const summary = await prisma.worklog.aggregate({
    where: {
      companyId: user.companyId,
      started: {
        gte: startDate ? new Date(startDate) : undefined,
        lte: endDate ? new Date(endDate) : undefined,
      }
    },
    _sum: { timeSpentSeconds: true },
    _count: { id: true }
  })

  // Group by author
  const byAuthor = await prisma.worklog.groupBy({
    by: ['authorEmail', 'authorName'],
    where: {
      companyId: user.companyId,
      started: {
        gte: startDate ? new Date(startDate) : undefined,
        lte: endDate ? new Date(endDate) : undefined,
      }
    },
    _sum: { timeSpentSeconds: true },
    _count: { id: true }
  })

  return NextResponse.json({
    total_worklogs: summary._count.id,
    total_seconds: summary._sum.timeSpentSeconds || 0,
    total_hours: (summary._sum.timeSpentSeconds || 0) / 3600,
    by_author: byAuthor
  })
}
```

**3B. Sync Engine con Inngest**

Il sync è esternalizzato su Inngest. L'app Vercel non esegue mai il sync — manda solo un evento e Inngest fa tutto in background, senza limiti di timeout.

**Setup Inngest client:**

```typescript
// src/lib/inngest/client.ts
import { Inngest } from 'inngest'

export const inngest = new Inngest({
  id: 'jira-worklog-dashboard',
  name: 'JIRA Worklog Dashboard'
})
```

**Endpoint webhook (Vercel riceve le callback da Inngest):**

```typescript
// src/app/api/inngest/route.ts
import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { syncInstance } from '@/lib/inngest/functions/sync-instance'
import { syncAll } from '@/lib/inngest/functions/sync-all'
import { dailySync } from '@/lib/inngest/functions/daily-sync'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [syncInstance, syncAll, dailySync]
})
```

**API Clients (restano uguali — la logica di chiamata JIRA/Tempo non cambia):**

```typescript
// src/lib/sync/jira-client.ts
export class JiraClient {
  private baseUrl: string
  private email: string
  private token: string

  constructor(instance: { url: string; jiraEmail: string; jiraToken: string }) {
    this.baseUrl = instance.url
    this.email = instance.jiraEmail
    this.token = instance.jiraToken
  }

  async fetchIssue(issueKey: string) {
    const auth = Buffer.from(`${this.email}:${this.token}`).toString('base64')
    const res = await fetch(`${this.baseUrl}/rest/api/3/issue/${issueKey}`, {
      headers: { Authorization: `Basic ${auth}` }
    })
    if (!res.ok) throw new Error(`JIRA API error: ${res.status}`)
    return res.json()
  }
}

// src/lib/sync/tempo-client.ts
export class TempoClient {
  private token: string

  constructor(token: string) {
    this.token = token
  }

  async fetchWorklogs(from: string, to: string) {
    const res = await fetch(
      `https://api.tempo.io/4/worklogs?from=${from}&to=${to}`,
      { headers: { Authorization: `Bearer ${this.token}` } }
    )
    if (!res.ok) throw new Error(`Tempo API error: ${res.status}`)
    return res.json()
  }
}
```

**Inngest Function — Sync singola istanza:**

Ogni `step.run()` è un checkpoint. Se il fetch Tempo impiega 2 minuti, nessun problema.
Se fallisce a metà, Inngest riparte dall'ultimo step completato, non da zero.

```typescript
// src/lib/inngest/functions/sync-instance.ts
import { inngest } from '../client'
import { prisma } from '@/lib/prisma'
import { TempoClient } from '@/lib/sync/tempo-client'
import { JiraClient } from '@/lib/sync/jira-client'
import { decrypt } from '@/lib/utils'

export const syncInstance = inngest.createFunction(
  {
    id: 'sync-jira-instance',
    name: 'Sync JIRA Instance',
    retries: 3,                    // Retry automatici su errore
    concurrency: [{ limit: 1 }],  // Mai 2 sync in parallelo per istanza
  },
  { event: 'sync/instance.requested' },

  async ({ event, step }) => {
    const { instanceId, companyId, startDate, endDate } = event.data

    // Step 1: Carica istanza dal DB e verifica ownership
    const instance = await step.run('load-instance', async () => {
      const inst = await prisma.jiraInstance.findFirst({
        where: { id: instanceId, companyId: companyId }
      })
      if (!inst) throw new Error(`Instance ${instanceId} not found`)
      return inst
    })

    // Step 2: Aggiorna stato sync → "running"
    await step.run('mark-running', async () => {
      await prisma.jiraInstance.update({
        where: { id: instanceId },
        data: { syncStatus: 'running', syncStartedAt: new Date() }
      })
    })

    // Step 3: Fetch worklogs da Tempo (può durare 30+ secondi)
    const tempoWorklogs = await step.run('fetch-tempo-worklogs', async () => {
      const tempo = new TempoClient(decrypt(instance.tempoToken!))
      return await tempo.fetchWorklogs(startDate, endDate)
    })

    // Step 4: Enrich con dati JIRA (può durare altri 30+ secondi)
    // Processa in batch di 50 per evitare rate limits
    const issueKeys = [...new Set(tempoWorklogs.results.map((wl: any) => wl.issue.key))]
    const issueDetails: Record<string, any> = {}

    for (let i = 0; i < issueKeys.length; i += 50) {
      const batch = issueKeys.slice(i, i + 50)
      const batchDetails = await step.run(`fetch-jira-batch-${i}`, async () => {
        const jira = new JiraClient({
          url: instance.url,
          jiraEmail: instance.jiraEmail,
          jiraToken: decrypt(instance.jiraToken!)
        })
        const details: Record<string, any> = {}
        for (const key of batch) {
          try {
            details[key] = await jira.fetchIssue(key)
          } catch (e) {
            console.error(`Failed to fetch ${key}:`, e)
            details[key] = null // Skip errori singoli, non bloccare tutto
          }
        }
        return details
      })
      Object.assign(issueDetails, batchDetails)
    }

    // Step 5: Upsert worklogs nel DB (batch per performance)
    const synced = await step.run('upsert-worklogs', async () => {
      let count = 0
      for (const wl of tempoWorklogs.results) {
        const issue = issueDetails[wl.issue.key]
        await prisma.worklog.upsert({
          where: {
            companyId_jiraInstanceId_worklogId: {
              companyId: companyId,
              jiraInstanceId: instanceId,
              worklogId: String(wl.tempoWorklogId)
            }
          },
          update: {
            timeSpentSeconds: wl.timeSpentSeconds,
            comment: wl.description || null,
            issueSummary: issue?.fields?.summary || null,
            epicKey: issue?.fields?.epic?.key || null,
            epicName: issue?.fields?.epic?.name || null,
          },
          create: {
            companyId: companyId,
            jiraInstanceId: instanceId,
            worklogId: String(wl.tempoWorklogId),
            issueKey: wl.issue.key,
            issueSummary: issue?.fields?.summary || null,
            authorEmail: wl.author.accountId,
            authorName: wl.author.displayName || null,
            started: new Date(wl.startDate),
            timeSpentSeconds: wl.timeSpentSeconds,
            timeSpentDisplay: wl.timeSpent || null,
            comment: wl.description || null,
            epicKey: issue?.fields?.epic?.key || null,
            epicName: issue?.fields?.epic?.name || null,
            projectKey: wl.issue.key.split('-')[0],
            projectName: issue?.fields?.project?.name || null,
          }
        })
        count++
      }
      return count
    })

    // Step 6: Aggiorna stato sync → "completed"
    await step.run('mark-completed', async () => {
      await prisma.jiraInstance.update({
        where: { id: instanceId },
        data: {
          syncStatus: 'completed',
          syncCompletedAt: new Date(),
          lastSyncWorklogs: synced
        }
      })
    })

    return { instanceId, synced, status: 'completed' }
  }
)
```

**Inngest Function — Sync tutte le istanze:**

```typescript
// src/lib/inngest/functions/sync-all.ts
import { inngest } from '../client'
import { prisma } from '@/lib/prisma'

export const syncAll = inngest.createFunction(
  { id: 'sync-all-instances', name: 'Sync All Instances' },
  { event: 'sync/all.requested' },

  async ({ event, step }) => {
    const { companyId, startDate, endDate } = event.data

    // Carica tutte le istanze della company
    const instances = await step.run('load-instances', async () => {
      return await prisma.jiraInstance.findMany({
        where: { companyId: companyId }
      })
    })

    // Triggera un sync per ciascuna istanza (in parallelo su Inngest)
    for (const instance of instances) {
      await step.sendEvent(`trigger-sync-${instance.id}`, {
        name: 'sync/instance.requested',
        data: {
          instanceId: instance.id,
          companyId: companyId,
          startDate,
          endDate
        }
      })
    }

    return { triggered: instances.length }
  }
)
```

**Inngest Function — Cron giornaliero (1-2 volte al giorno):**

```typescript
// src/lib/inngest/functions/daily-sync.ts
import { inngest } from '../client'
import { prisma } from '@/lib/prisma'

export const dailySync = inngest.createFunction(
  { id: 'daily-sync-cron', name: 'Daily Sync Cron' },
  { cron: '0 7,19 * * *' },  // Alle 7:00 e 19:00 ogni giorno

  async ({ step }) => {
    // Carica TUTTE le company con istanze attive
    const companies = await step.run('load-companies', async () => {
      const instances = await prisma.jiraInstance.findMany({
        select: { companyId: true },
        distinct: ['companyId']
      })
      return instances.map(i => i.companyId)
    })

    // Per ogni company, triggera sync di tutte le istanze
    // Range: ultimi 7 giorni (cattura eventuali worklogs in ritardo)
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0]

    for (const companyId of companies) {
      await step.sendEvent(`trigger-company-${companyId}`, {
        name: 'sync/all.requested',
        data: { companyId, startDate, endDate }
      })
    }

    return { companies: companies.length, period: `${startDate} → ${endDate}` }
  }
)
```

**API Route — Trigger sync dall'UI (leggero, ritorna subito):**

L'utente clicca "Sync" nella dashboard, l'API manda l'evento a Inngest in millisecondi
e risponde immediatamente. Il sync effettivo gira in background.

```typescript
// src/app/api/sync/route.ts
import { inngest } from '@/lib/inngest/client'
import { requireAdmin } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/sync — Sync tutte le istanze
export async function POST(request: NextRequest) {
  const user = await requireAdmin()
  const body = await request.json()

  // Manda evento a Inngest — ritorna in <100ms
  await inngest.send({
    name: 'sync/all.requested',
    data: {
      companyId: user.companyId,
      startDate: body.start_date,
      endDate: body.end_date
    }
  })

  return NextResponse.json({
    status: 'started',
    message: 'Sync avviato in background'
  })
}
```

```typescript
// src/app/api/sync/[instanceId]/route.ts
import { inngest } from '@/lib/inngest/client'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/sync/:instanceId — Sync singola istanza
export async function POST(
  request: NextRequest,
  { params }: { params: { instanceId: string } }
) {
  const user = await requireAdmin()
  const body = await request.json()

  // Verifica che l'istanza appartenga alla company
  const instance = await prisma.jiraInstance.findFirst({
    where: { id: parseInt(params.instanceId), companyId: user.companyId }
  })

  if (!instance) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Manda evento a Inngest — ritorna in <100ms
  await inngest.send({
    name: 'sync/instance.requested',
    data: {
      instanceId: instance.id,
      companyId: user.companyId,
      startDate: body.start_date,
      endDate: body.end_date
    }
  })

  return NextResponse.json({
    status: 'started',
    instance: instance.name,
    message: 'Sync avviato in background'
  })
}
```

**API Route — Stato del sync (il frontend fa polling):**

```typescript
// src/app/api/sync/status/route.ts
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const user = await requireAuth()

  const instances = await prisma.jiraInstance.findMany({
    where: { companyId: user.companyId },
    select: {
      id: true,
      name: true,
      syncStatus: true,
      syncStartedAt: true,
      syncCompletedAt: true,
      lastSyncWorklogs: true,
    }
  })

  return NextResponse.json({ syncs: instances })
}
```

**Schema Prisma — Aggiungi campi sync status a JiraInstance:**

```prisma
model JiraInstance {
  // ... campi esistenti ...
  syncStatus        String?   @map("sync_status")       // idle | running | completed | failed
  syncStartedAt     DateTime? @map("sync_started_at")
  syncCompletedAt   DateTime? @map("sync_completed_at")
  lastSyncWorklogs  Int?      @map("last_sync_worklogs")
}
```

**Sviluppo locale con Inngest Dev Server:**

```bash
# Terminal 1: Next.js
npm run dev

# Terminal 2: Inngest Dev Server (UI locale su http://localhost:8288)
npx inngest-cli@latest dev
```

L'Inngest Dev Server mostra una dashboard locale dove puoi:
- Vedere tutti i job in esecuzione
- Testare manualmente le function
- Vedere i log di ogni step
- Fare replay di job falliti

**Prompt per Claude Code:**

```
Converti il sync engine da Python (httpx async) a TypeScript con Inngest per background jobs.
File originali: [incolla il codice sync da Python]

Requisiti:
1. JiraClient e TempoClient come classi TypeScript in src/lib/sync/
2. Inngest client in src/lib/inngest/client.ts
3. Inngest webhook route in src/app/api/inngest/route.ts
4. 3 Inngest functions:
   - sync-instance: sync singola istanza JIRA con steps (fetch Tempo → fetch JIRA → upsert DB)
   - sync-all: triggera sync per tutte le istanze di una company
   - daily-sync: cron alle 7:00 e 19:00, sync ultimi 7 giorni per tutte le company
5. API route POST /api/sync che manda evento a Inngest (ritorna in <100ms)
6. API route POST /api/sync/[instanceId] per sync singola istanza
7. API route GET /api/sync/status che legge syncStatus da JiraInstance
8. Aggiungi campi syncStatus, syncStartedAt, syncCompletedAt a JiraInstance nel schema Prisma
9. Decifra i token JIRA/Tempo salvati nel DB
10. Error handling: retry 3x su errore, skip singoli issue che falliscono

L'app Vercel NON deve mai eseguire il sync direttamente.
Deve solo mandare un evento a Inngest e ritornare subito.
```

**Checkpoint:** Sync triggerabile dall'UI. Job visibile nella Inngest Dev dashboard. Worklogs nel DB dopo il sync. Cron configurato.

---

### FASE 4: Billing + Invoice (Giorni 9-12)

**Obiettivo:** Il modulo più complesso — rate cascade, invoice generation, PDF.

**4A. Rate Cascade (6 livelli)**

Questa è pura business logic — si converte direttamente da Python a TypeScript:

```typescript
// src/lib/billing/rate-cascade.ts

interface RateLookupContext {
  companyId: number
  worklog: {
    issueKey: string
    epicKey: string | null
    projectKey: string
    billingClientId: number | null
    billingProjectId: number | null
  }
}

export async function calculateRate(ctx: RateLookupContext): Promise<number> {
  // Livello 1: Package Template (issue-specific)
  const packageByIssue = await prisma.packageTemplate.findFirst({
    where: { companyId: ctx.companyId, issueKey: ctx.worklog.issueKey }
  })
  if (packageByIssue) return packageByIssue.rate

  // Livello 2: Package Template (epic-specific)
  if (ctx.worklog.epicKey) {
    const packageByEpic = await prisma.packageTemplate.findFirst({
      where: { companyId: ctx.companyId, epicKey: ctx.worklog.epicKey }
    })
    if (packageByEpic) return packageByEpic.rate
  }

  // Livello 3: Billing Project rate
  if (ctx.worklog.billingProjectId) {
    const project = await prisma.billingProject.findFirst({
      where: { id: ctx.worklog.billingProjectId, companyId: ctx.companyId }
    })
    if (project && project.rate > 0) return project.rate
  }

  // Livello 4: Billing Client rate
  if (ctx.worklog.billingClientId) {
    const client = await prisma.billingClient.findFirst({
      where: { id: ctx.worklog.billingClientId, companyId: ctx.companyId }
    })
    if (client && client.defaultRate > 0) return client.defaultRate
  }

  // Livello 5: Company default rate
  const company = await prisma.company.findUnique({
    where: { id: ctx.companyId }
  })
  if (company && company.defaultRate > 0) return company.defaultRate

  // Livello 6: Fallback
  return 0
}
```

**4B. Invoice Generation**

```typescript
// src/app/api/billing/invoices/route.ts
export async function POST(request: NextRequest) {
  const user = await requireAuth()
  const body = await request.json()

  // Fetch worklogs per il periodo e client
  const worklogs = await prisma.worklog.findMany({
    where: {
      companyId: user.companyId,
      billingClientId: body.client_id,
      started: {
        gte: new Date(body.period_start),
        lte: new Date(body.period_end)
      }
    }
  })

  // Calcola rate per ogni worklog
  const items: { description: string; hours: number; rate: number; amount: number }[] = []

  // Raggruppa per progetto
  const grouped = groupBy(worklogs, 'billingProjectId')

  for (const [projectId, projectWorklogs] of Object.entries(grouped)) {
    let totalSeconds = 0
    let rate = 0

    for (const wl of projectWorklogs) {
      totalSeconds += wl.timeSpentSeconds
      rate = await calculateRate({ companyId: user.companyId, worklog: wl })
    }

    const hours = totalSeconds / 3600
    items.push({
      description: `Project ${projectId}`,
      hours: Math.round(hours * 100) / 100,
      rate,
      amount: Math.round(hours * rate * 100) / 100
    })
  }

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0)
  const company = await prisma.company.findUnique({ where: { id: user.companyId } })
  const taxAmount = subtotal * (company?.taxRate || 0)
  const total = subtotal + taxAmount

  // Genera numero invoice
  const invoiceCount = await prisma.invoice.count({ where: { companyId: user.companyId } })
  const invoiceNumber = `${company?.invoicePrefix || 'INV'}-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(3, '0')}`

  // Crea invoice + items in transazione
  const invoice = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.create({
      data: {
        companyId: user.companyId,
        clientId: body.client_id,
        invoiceNumber,
        invoiceDate: new Date(),
        periodStart: new Date(body.period_start),
        periodEnd: new Date(body.period_end),
        subtotal,
        taxRate: company?.taxRate || 0,
        total,
        notes: body.notes,
        items: {
          create: items
        }
      },
      include: { items: true, client: true }
    })
    return inv
  })

  return NextResponse.json(invoice, { status: 201 })
}
```

**4C. PDF Generation**

WeasyPrint non esiste in Node. Le alternative:

Opzione 1 — @react-pdf/renderer (genera PDF lato server con componenti React):

```typescript
// src/lib/billing/pdf-generator.tsx
import { renderToBuffer } from '@react-pdf/renderer'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

export async function generateInvoicePDF(invoice: InvoiceWithItems) {
  const styles = StyleSheet.create({
    page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
    header: { fontSize: 18, marginBottom: 20, fontWeight: 'bold' },
    // ... altri stili
  })

  const InvoiceDoc = () => (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>Invoice {invoice.invoiceNumber}</Text>
        {/* ... contenuto invoice */}
      </Page>
    </Document>
  )

  return await renderToBuffer(<InvoiceDoc />)
}
```

**Prompt per Claude Code:**

```
Converti il modulo billing da Python a TypeScript/Next.js.
File originali: [incolla billing.py e la parte di cache.py relativa al billing]

Requisiti:
1. Rate cascade a 6 livelli (Package > Issue > Epic > Project > Client > Default)
2. API routes per: clients CRUD, projects CRUD, invoices CRUD
3. Invoice generation con calcolo automatico da worklogs
4. Transazione Prisma per creare invoice + items atomicamente
5. PDF generation con @react-pdf/renderer (sostituisce WeasyPrint)
6. Endpoint GET /api/billing/invoices/[id]/pdf che ritorna il PDF

CRITICO: La logica del rate cascade deve essere identica all'originale Python.
Testa ogni livello del cascade con dati di esempio.
```

**Checkpoint:** Invoice generabili. PDF scaricabile. Rate cascade produce gli stessi risultati dell'originale.

---

### FASE 5: Frontend Migration (Giorni 13-16)

**Obiettivo:** Portare tutti i componenti React nel progetto Next.js.

Questa è la fase più meccanica. I tuoi componenti React sono già in TypeScript + Tailwind + TanStack Query — il 90% si copia direttamente.

**Cosa cambia:**

1. Routing: da React Router a Next.js App Router (file-based)

```
// PRIMA (React Router)
<Route path="/dashboard" element={<Dashboard />} />
<Route path="/worklogs" element={<Worklogs />} />
<Route path="/billing" element={<Billing />} />

// DOPO (Next.js App Router)
src/app/dashboard/page.tsx          → Dashboard
src/app/dashboard/worklogs/page.tsx → Worklogs
src/app/dashboard/billing/page.tsx  → Billing
```

2. API calls: rimuovi il baseURL (stessa origin)

```typescript
// PRIMA
const res = await axios.get('http://localhost:8000/api/teams')

// DOPO
const res = await fetch('/api/teams')
```

3. Auth: da JWT in localStorage a Supabase session (cookie-based, automatico)

```typescript
// PRIMA
headers: { Authorization: `Bearer ${localStorage.getItem('jwt')}` }

// DOPO
// Non serve! Supabase invia automaticamente i cookie.
// Il middleware Next.js li legge e valida.
```

4. Layout shell: diventa un layout.tsx di Next.js

```typescript
// src/app/dashboard/layout.tsx
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

**Prompt per Claude Code:**

```
Migra i componenti React dal progetto attuale al progetto Next.js.

File da migrare:
- [incolla la lista dei file in frontend/src/components/]
- [incolla la lista dei file in frontend/src/pages/]

Regole:
1. Converti React Router routes in Next.js App Router file structure
2. Rimuovi tutte le referenze a axios/apiClient — usa fetch nativo
3. Rimuovi tutto il codice JWT/auth manuale — Supabase gestisce automaticamente
4. I componenti TanStack Query restano quasi identici, cambia solo il queryFn
5. Il design system (Tailwind classes) si copia 1:1
6. Converti le pagine in Server Components dove possibile (quelli senza useState/useEffect)
7. Mantieni come Client Components solo quelli con interattività
```

**Checkpoint:** Tutte le pagine navigabili. Design identico all'originale. Dati reali dal DB.

---

### FASE 6: Row Level Security + Polish (Giorni 17-18)

**Obiettivo:** Sicurezza multi-tenant a livello database + rifinitura.

**6A. Row Level Security in Supabase**

Questo è il layer di sicurezza extra che sostituisce i 176 `WHERE company_id = ?`:

```sql
-- Esegui nella dashboard Supabase → SQL Editor

-- Abilita RLS su tutte le tabelle
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE worklogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE jira_instances ENABLE ROW LEVEL SECURITY;
-- ... per tutte le tabelle con company_id

-- Policy: users vedono solo dati della propria company
CREATE POLICY "Company isolation" ON teams
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Ripeti per ogni tabella
-- (in pratica crei una funzione helper)

CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS INTEGER AS $$
  SELECT company_id FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Poi le policy diventano semplici:
CREATE POLICY "Company isolation" ON worklogs
  FOR ALL USING (company_id = get_user_company_id());

CREATE POLICY "Company isolation" ON billing_clients
  FOR ALL USING (company_id = get_user_company_id());

-- ... per ogni tabella
```

**Nota importante:** RLS si applica solo quando usi il client Supabase direttamente. Con Prisma (che usa la service role key), il RLS viene bypassato. Questo va bene — Prisma è usato solo nelle API routes dove fai già il check manuale del companyId. L'RLS è un layer di sicurezza aggiuntivo, non l'unico.

**6B. Polish e Testing**

```
Checklist finale:
- [ ] Tutti gli endpoint testati con curl
- [ ] Login/logout funziona
- [ ] Multi-tenant: creare 2 company e verificare isolamento
- [ ] Rate cascade: testare tutti i 6 livelli
- [ ] Invoice PDF generabile e scaricabile
- [ ] Sync JIRA/Tempo via Inngest: trigger dall'UI, job completa in background
- [ ] Cron daily-sync visibile nella Inngest Dev dashboard
- [ ] Sync status polling funziona (UI mostra running → completed)
- [ ] Responsive design su mobile
- [ ] Error handling su tutte le pagine (loading, error states)
- [ ] Environment variables documentate (Supabase + Inngest)
```

**Checkpoint:** App completa e funzionante come l'originale.

---

### FASE 7: Deploy su Vercel + Inngest (Giorno 19)

**Obiettivo:** App live in produzione con sync automatico.

**Passi:**

1. Push su GitHub

```bash
git init
git add .
git commit -m "feat: Next.js + Supabase + Inngest migration"
git remote add origin https://github.com/tuouser/jira-worklog-next.git
git push -u origin main
```

2. Collega Vercel
- Vai su vercel.com → Import Project → Seleziona repo GitHub
- Vercel rileva automaticamente Next.js

3. Setup Inngest Cloud
- Vai su inngest.com → Sign up (gratis fino a 25k step/mese)
- Crea un'app, copia Event Key e Signing Key
- Nella dashboard Inngest, collega la tua app Vercel:
  - Serve URL: `https://tuoapp.vercel.app/api/inngest`
  - Inngest scopre automaticamente le 3 functions (sync-instance, sync-all, daily-sync)

4. Aggiungi Environment Variables su Vercel
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
DATABASE_URL=postgresql://...
INNGEST_EVENT_KEY=xxx
INNGEST_SIGNING_KEY=xxx
```

5. Deploy
- Click "Deploy"
- In ~60 secondi hai l'URL: `https://jira-worklog-next.vercel.app`

6. Verifica Inngest in produzione
- Nella dashboard Inngest Cloud, verifica che le 3 functions siano registrate
- Il cron `daily-sync` parte automaticamente alle 7:00 e 19:00
- Testa un sync manuale dall'UI e verifica il job nella dashboard Inngest

7. Configura Google OAuth per produzione
- Nella Google Console, aggiungi il nuovo URL come redirect URI:
  `https://tuoapp.vercel.app/auth/callback`
- In Supabase, aggiorna il Site URL

8. (Opzionale) Custom domain
- Vercel → Settings → Domains → Aggiungi dominio
- Aggiorna DNS con CNAME
- Aggiorna la Serve URL in Inngest con il nuovo dominio

**Checkpoint:** App live. Sync funziona in background. Cron attivo.

---

## Migrazione Dati (Opzionale)

Se hai dati esistenti nel SQLite che vuoi portare su Supabase:

```bash
# 1. Esporta da SQLite
sqlite3 worklog_storage.db ".mode csv" ".headers on" ".output worklogs.csv" "SELECT * FROM worklogs;"

# 2. Importa in Supabase
# Dashboard Supabase → Table Editor → Import CSV
# Oppure usa pg_restore / psql per import bulk
```

Oppure scrivi uno script di migrazione:

```typescript
// scripts/migrate-data.ts
import Database from 'better-sqlite3'
import { PrismaClient } from '@prisma/client'

const sqlite = new Database('worklog_storage.db')
const prisma = new PrismaClient()

async function migrate() {
  // Migra companies
  const companies = sqlite.prepare('SELECT * FROM companies').all()
  for (const c of companies) {
    await prisma.company.create({ data: { /* map fields */ } })
  }

  // Migra worklogs (in batch per performance)
  const worklogs = sqlite.prepare('SELECT * FROM worklogs').all()
  await prisma.worklog.createMany({
    data: worklogs.map(wl => ({ /* map fields */ })),
    skipDuplicates: true
  })

  console.log(`Migrated ${worklogs.length} worklogs`)
}

migrate()
```

---

## Riepilogo Timeline

| Fase | Giorni | Cosa |
|------|--------|------|
| 0 | 1 | Setup progetto + struttura + Inngest client |
| 1 | 2 | Database schema + Auth Google |
| 2 | 2 | CRUD Teams, Users, Settings |
| 3 | 3 | Worklogs + Sync via Inngest (background jobs + cron) |
| 4 | 4 | Billing + Rate Cascade + PDF |
| 5 | 4 | Frontend migration |
| 6 | 2 | RLS + Testing + Polish |
| 7 | 1 | Deploy Vercel + Inngest Cloud |
| **Totale** | **~19 giorni** | **Con Claude Code** |

## Prompt Master per Claude Code

Per ogni fase, il prompt ideale da dare a Claude Code segue questo formato:

```
CONTESTO: Sto migrando un progetto da FastAPI+SQLite a Next.js+Supabase+Prisma+Inngest.
FASE ATTUALE: [numero e nome]
FILE ORIGINALI: [incolla il codice Python rilevante]
SCHEMA PRISMA: [incolla lo schema o riferisci al file]
PATTERN DA SEGUIRE: [incolla un esempio di API route già completata]

ARCHITETTURA:
- Vercel: UI + API routes leggere (lettura dati, CRUD)
- Supabase: PostgreSQL + Auth + RLS
- Inngest: Background jobs per sync JIRA/Tempo (nessun timeout)
- L'app Vercel NON esegue mai operazioni lunghe — manda eventi a Inngest

OBIETTIVO: [cosa deve fare]
VINCOLI:
- Ogni query DEVE filtrare per companyId (multi-tenant)
- Usa requireAuth() per l'autenticazione
- Return 404 per accesso cross-tenant (mai 403)
- Mantieni gli stessi response format dell'API originale
- Sync JIRA/Tempo va SEMPRE su Inngest, mai nelle API routes

DELIVERABLE: [lista file da creare]
```

## Rischi e Mitigazioni

| Rischio | Probabilità | Mitigazione |
|---------|-------------|-------------|
| Rate cascade produce risultati diversi | Media | Test con dati reali side-by-side prima di switchare |
| PDF generation diversa da WeasyPrint | Alta | Accettare piccole differenze di layout, o usare Puppeteer |
| Inngest free tier insufficiente | Molto Bassa | 25k step/mese, uso stimato ~540 step/mese (2% del limite) |
| Inngest down durante sync | Bassa | Retry automatici integrati; sync manuale dal DB come fallback |
| Perdita dati durante migrazione | Bassa | Script di migrazione + backup SQLite + non cancellare l'originale |
| Supabase free tier insufficiente | Bassa | 500MB bastano per iniziare, upgrade a $25/mese quando serve |

## Costi Stimati (Produzione)

| Servizio | Free Tier | Quando pagare |
|----------|-----------|---------------|
| **Vercel** | 100GB bandwidth, serverless functions | Oltre ~100k visite/mese |
| **Supabase** | 500MB DB, 50k auth users, 1GB storage | Oltre 500MB di worklogs (~500k record) |
| **Inngest** | 25.000 step/mese | Oltre ~8.000 sync/mese (improbabile) |
| **Totale iniziale** | **$0/mese** | Scala gradualmente con l'uso |
