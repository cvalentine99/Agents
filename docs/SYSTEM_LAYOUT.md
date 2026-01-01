# Agents by Valentine RF - System Layout & Component Architecture

**Prepared for:** Workflow Analyst Review  
**Version:** 1.0  
**Date:** January 1, 2026

---

## 1. High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         React 19 SPA                                 │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │    │
│  │  │  Pages   │ │Components│ │ Contexts │ │  Hooks   │ │   Lib    │  │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │    │
│  │                              │                                       │    │
│  │                    ┌─────────▼─────────┐                            │    │
│  │                    │   tRPC Client     │                            │    │
│  │                    └─────────┬─────────┘                            │    │
│  └──────────────────────────────┼──────────────────────────────────────┘    │
└─────────────────────────────────┼───────────────────────────────────────────┘
                                  │ HTTP/WebSocket
┌─────────────────────────────────┼───────────────────────────────────────────┐
│                              SERVER LAYER                                    │
│  ┌──────────────────────────────┼──────────────────────────────────────┐    │
│  │                    ┌─────────▼─────────┐                            │    │
│  │                    │  Express Server   │                            │    │
│  │                    │  + tRPC Adapter   │                            │    │
│  │                    └─────────┬─────────┘                            │    │
│  │         ┌────────────────────┼────────────────────┐                 │    │
│  │         ▼                    ▼                    ▼                 │    │
│  │  ┌────────────┐      ┌────────────┐      ┌────────────┐            │    │
│  │  │  Routers   │      │   _core    │      │  Services  │            │    │
│  │  │ (15 total) │      │ (auth,llm) │      │(crypto,pdf)│            │    │
│  │  └─────┬──────┘      └────────────┘      └────────────┘            │    │
│  │        │                                                            │    │
│  │        ▼                                                            │    │
│  │  ┌────────────┐                                                     │    │
│  │  │   db.ts    │ ◀──────── Drizzle ORM                              │    │
│  │  └─────┬──────┘                                                     │    │
│  └────────┼────────────────────────────────────────────────────────────┘    │
└───────────┼─────────────────────────────────────────────────────────────────┘
            │
┌───────────┼─────────────────────────────────────────────────────────────────┐
│           ▼                    DATA LAYER                                    │
│  ┌────────────────┐    ┌────────────────┐    ┌────────────────┐             │
│  │   MySQL/TiDB   │    │   S3 Storage   │    │  External APIs │             │
│  │   (18 tables)  │    │   (files/pdf)  │    │  (LLM, OAuth)  │             │
│  └────────────────┘    └────────────────┘    └────────────────┘             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Directory Structure

```
/home/ubuntu/coding-wheel/
│
├── client/                          # Frontend React Application
│   ├── public/                      # Static assets
│   ├── src/
│   │   ├── components/              # Reusable UI components (30+)
│   │   │   ├── ui/                  # shadcn/ui base components
│   │   │   ├── AgentProfiles.tsx    # Agent profile selector
│   │   │   ├── CircuitBreaker.tsx   # Circuit breaker visualization
│   │   │   ├── CliTerminal.tsx      # CLI output terminal
│   │   │   ├── CompletionCriteria.tsx
│   │   │   ├── DashboardLayout.tsx  # Main layout wrapper
│   │   │   ├── FlightComputer.tsx   # RALPH Loop control center
│   │   │   ├── IntegratedTerminal.tsx
│   │   │   ├── ModelWheel.tsx       # AI model selector wheel
│   │   │   ├── NotificationSettings.tsx
│   │   │   ├── PowerPromptor.tsx    # 4-field prompt builder
│   │   │   ├── SessionManager.tsx   # Session controls
│   │   │   ├── TourOverlay.tsx      # Onboarding tour
│   │   │   └── ...
│   │   │
│   │   ├── contexts/                # React contexts
│   │   │   ├── AuthContext.tsx      # Authentication state
│   │   │   └── OnboardingContext.tsx # Tour state
│   │   │
│   │   ├── data/                    # Static data
│   │   │   └── researchTemplates.ts # 18 built-in templates
│   │   │
│   │   ├── hooks/                   # Custom React hooks
│   │   │   └── use-toast.ts
│   │   │
│   │   ├── lib/                     # Utilities
│   │   │   ├── trpc.ts              # tRPC client setup
│   │   │   └── utils.ts
│   │   │
│   │   ├── pages/                   # Page components (10)
│   │   │   ├── Home.tsx             # Landing page
│   │   │   ├── Dashboard.tsx        # Main dashboard
│   │   │   ├── Settings.tsx         # API key management
│   │   │   ├── SessionHistory.tsx   # Past sessions
│   │   │   ├── Analytics.tsx        # Charts & stats
│   │   │   ├── PromptTemplates.tsx  # Prompt library
│   │   │   ├── SessionTemplates.tsx # Session configs
│   │   │   ├── MultiSession.tsx     # Split-pane view
│   │   │   ├── DeepResearch.tsx     # AI research tool
│   │   │   └── PublicResearch.tsx   # Shared research view
│   │   │
│   │   ├── App.tsx                  # Routes & providers
│   │   ├── main.tsx                 # Entry point
│   │   └── index.css                # Global styles
│   │
│   └── index.html
│
├── server/                          # Backend Express/tRPC
│   ├── _core/                       # Framework internals
│   │   ├── context.ts               # tRPC context builder
│   │   ├── env.ts                   # Environment variables
│   │   ├── index.ts                 # Express server setup
│   │   ├── llm.ts                   # LLM API wrapper
│   │   └── notification.ts          # Push notifications
│   │
│   ├── routers.ts                   # All tRPC routers (15)
│   ├── db.ts                        # Database queries (80+)
│   ├── crypto.ts                    # AES-256-GCM encryption
│   ├── pdfGenerator.ts              # Puppeteer PDF export
│   ├── storage.ts                   # S3 file storage
│   │
│   └── *.test.ts                    # Test files (130+ tests)
│
├── drizzle/                         # Database schema
│   ├── schema.ts                    # 18 table definitions
│   └── migrations/                  # SQL migrations
│
├── shared/                          # Shared types
│
├── docs/                            # Documentation
│   ├── WORKFLOW_DOCUMENTATION.md
│   ├── SYSTEM_LAYOUT.md
│   └── TOPOLOGY_DIAGRAMS.md
│
├── APPLICATION_TOPOLOGY.md          # Full system documentation
├── SENIOR_CODE_REVIEW.md            # Code review findings
├── todo.md                          # Feature tracking
└── package.json
```

---

## 3. Frontend Component Hierarchy

### 3.1 Page Structure

```
App.tsx (Router)
│
├── ThemeProvider
│   └── QueryClientProvider
│       └── AuthProvider
│           └── OnboardingProvider
│               │
│               ├── Route: "/" → Home.tsx
│               │   ├── Navigation Header
│               │   ├── Hero Section
│               │   ├── How It Works Section
│               │   ├── Features Grid
│               │   └── CTA Section
│               │
│               ├── Route: "/dashboard" → Dashboard.tsx
│               │   ├── Sidebar Navigation
│               │   │   ├── Model Wheel
│               │   │   ├── Flight Computer
│               │   │   ├── Power Promptor
│               │   │   ├── Agent Profiles
│               │   │   ├── Session Manager
│               │   │   └── External Links
│               │   │
│               │   └── Content Area (dynamic)
│               │       ├── ModelWheel Component
│               │       ├── FlightComputer Component
│               │       ├── PowerPromptor Component
│               │       ├── AgentProfiles Component
│               │       └── SessionManager Component
│               │
│               ├── Route: "/settings" → Settings.tsx
│               │   ├── API Key Cards (4)
│               │   └── Notification Settings
│               │
│               ├── Route: "/history" → SessionHistory.tsx
│               │   ├── Filter Controls
│               │   ├── Session Cards
│               │   └── Import/Export Buttons
│               │
│               ├── Route: "/analytics" → Analytics.tsx
│               │   ├── Summary Stats
│               │   ├── Line Chart (iterations)
│               │   ├── Bar Chart (success rate)
│               │   ├── Pie Chart (status)
│               │   └── Histogram (time)
│               │
│               ├── Route: "/templates" → PromptTemplates.tsx
│               │   ├── Search/Filter
│               │   ├── Template Grid
│               │   └── Create Dialog
│               │
│               ├── Route: "/session-templates" → SessionTemplates.tsx
│               │   ├── Template List
│               │   └── Edit Dialog
│               │
│               ├── Route: "/multi-session" → MultiSession.tsx
│               │   ├── Layout Selector
│               │   └── Split Panes (2-6)
│               │
│               ├── Route: "/research" → DeepResearch.tsx
│               │   ├── New Research Form
│               │   ├── Template Browser Dialog
│               │   ├── Research History
│               │   └── Results Panel
│               │
│               └── Route: "/research/public/:token" → PublicResearch.tsx
│                   └── Read-only Research View
```

### 3.2 Component Dependencies

| Component | Dependencies | State Management | API Calls |
|-----------|--------------|------------------|-----------|
| ModelWheel | framer-motion | useState | None |
| FlightComputer | IntegratedTerminal, CircuitBreaker | useState, useEffect | sessions.*, cli.* |
| PowerPromptor | Textarea, Button | useState | prompts.* |
| AgentProfiles | Card, Badge | useState | None |
| SessionManager | Switch, Button | useState | sessions.* |
| DeepResearch | Dialog, Tabs, Card | useState, useQuery | research.* |
| Analytics | Chart.js | useQuery | analytics.* |

---

## 4. Backend Router Architecture

### 4.1 Router Overview

| Router | Procedures | Auth Required | Description |
|--------|------------|---------------|-------------|
| `auth` | 2 | Mixed | Login/logout, user info |
| `sessions` | 7 | Yes | CRUD for coding sessions |
| `prompts` | 4 | Yes | Prompt management |
| `criteria` | 4 | Yes | Completion criteria |
| `apiKeys` | 4 | Yes | Encrypted key storage |
| `cli` | 5 | Yes | CLI process management |
| `analytics` | 2 | Yes | Dashboard statistics |
| `promptTemplates` | 5 | Yes | Prompt library |
| `sessionTemplates` | 5 | Yes | Session configs |
| `notifications` | 2 | Yes | Notification settings |
| `research` | 12 | Mixed | Deep research feature |
| `templates` | 10 | Yes | Custom template management |
| `system` | 1 | Yes | Owner notifications |

### 4.2 Router Procedure Details

```
auth
├── me (query) ─────────────── Get current user
└── logout (mutation) ──────── Clear session

sessions
├── list (query) ───────────── List user's sessions
├── get (query) ────────────── Get session by ID
├── create (mutation) ──────── Create new session
├── update (mutation) ──────── Update session
├── delete (mutation) ──────── Delete session
├── updateStatus (mutation) ── Change session status
└── updateCircuitBreaker (mutation) ── Update circuit state

prompts
├── list (query) ───────────── List prompts
├── get (query) ────────────── Get prompt by ID
├── create (mutation) ──────── Create prompt
└── update (mutation) ──────── Update prompt

criteria
├── list (query) ───────────── List criteria for session
├── add (mutation) ─────────── Add criterion
├── toggle (mutation) ──────── Toggle completion
└── delete (mutation) ──────── Delete criterion

apiKeys
├── list (query) ───────────── List keys (metadata only)
├── save (mutation) ────────── Save encrypted key
├── delete (mutation) ──────── Delete key
└── validate (mutation) ────── Validate key format

cli
├── start (mutation) ────────── Start CLI process
├── stop (mutation) ─────────── Stop CLI process
├── list (query) ────────────── List running processes
├── running (query) ─────────── Get running process for session
└── updateExecution (mutation) ─ Update execution status

research
├── list (query) ───────────── List research sessions
├── get (query) ────────────── Get research by ID
├── create (mutation) ──────── Start new research
├── delete (mutation) ──────── Delete research
├── getSteps (query) ────────── Get research steps
├── getFindings (query) ─────── Get research findings
├── share (mutation) ────────── Generate share link
├── getPublic (query) ──────── Get shared research (no auth)
├── askFollowUp (mutation) ──── Ask follow-up question
├── getFollowUps (query) ────── Get follow-up Q&A
├── exportMarkdown (mutation) ─ Export as Markdown
└── exportPdf (mutation) ────── Export as PDF

templates
├── listCustom (query) ──────── List user's custom templates
├── create (mutation) ───────── Create custom template
├── update (mutation) ───────── Update custom template
├── delete (mutation) ───────── Delete custom template
├── toggleFavorite (mutation) ─ Favorite/unfavorite
├── listFavorites (query) ───── List favorited templates
├── trackUsage (mutation) ───── Record template usage
├── getUsageStats (query) ───── Get usage statistics
├── listCategories (query) ──── List user categories
├── createCategory (mutation) ─ Create category
├── updateCategory (mutation) ─ Update category
├── deleteCategory (mutation) ─ Delete category
├── exportTemplates (mutation) ─ Export as JSON
└── importTemplates (mutation) ─ Import from JSON
```

---

## 5. Database Schema Layout

### 5.1 Entity Relationship Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATABASE ENTITY RELATIONSHIPS                        │
└─────────────────────────────────────────────────────────────────────────────┘

                                    ┌─────────┐
                                    │  users  │
                                    └────┬────┘
                                         │
         ┌───────────────┬───────────────┼───────────────┬───────────────┐
         │               │               │               │               │
         ▼               ▼               ▼               ▼               ▼
    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
    │sessions │    │api_keys │    │research │    │ custom  │    │template │
    │         │    │         │    │sessions │    │templates│    │favorites│
    └────┬────┘    └─────────┘    └────┬────┘    └────┬────┘    └─────────┘
         │                             │              │
    ┌────┴────┐                   ┌────┴────┐        │
    │         │                   │         │        │
    ▼         ▼                   ▼         ▼        ▼
┌────────┐┌────────┐        ┌────────┐┌────────┐┌────────┐
│criteria││cli_exec│        │research││research││template│
│        ││utions  │        │ steps  ││findings││ usage  │
└────────┘└────────┘        └────────┘└────┬───┘└────────┘
                                           │
                                           ▼
                                    ┌────────────┐
                                    │ follow_up  │
                                    │ questions  │
                                    └────────────┘
```

### 5.2 Table Specifications

| Table | Columns | Primary Key | Foreign Keys | Indexes |
|-------|---------|-------------|--------------|---------|
| `users` | 6 | id (int) | - | openId (unique) |
| `sessions` | 15 | id (int) | userId → users | userId, status |
| `completion_criteria` | 6 | id (int) | sessionId → sessions | sessionId |
| `api_keys` | 6 | id (int) | userId → users | userId+provider (unique) |
| `cli_executions` | 8 | id (int) | sessionId → sessions | sessionId |
| `prompt_templates` | 8 | id (int) | userId → users | userId |
| `session_templates` | 10 | id (int) | userId → users | userId |
| `notification_settings` | 8 | id (int) | userId → users | userId (unique) |
| `research_sessions` | 10 | id (int) | userId → users | userId, status |
| `research_steps` | 7 | id (int) | researchSessionId | researchSessionId |
| `research_findings` | 8 | id (int) | researchSessionId | researchSessionId |
| `follow_up_questions` | 6 | id (int) | researchSessionId | researchSessionId |
| `custom_templates` | 9 | id (int) | userId, categoryId | userId |
| `template_favorites` | 4 | id (int) | userId | userId+templateId (unique) |
| `template_usage` | 5 | id (int) | userId | userId |
| `user_template_categories` | 5 | id (int) | userId | userId |

---

## 6. Security Architecture

### 6.1 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AUTHENTICATION FLOW                                 │
└─────────────────────────────────────────────────────────────────────────────┘

User                    Frontend                   Backend                OAuth
 │                         │                          │                     │
 │──── Click Login ───────▶│                          │                     │
 │                         │──── Redirect ───────────▶│                     │
 │                         │                          │──── Auth Request ──▶│
 │◀──────────────────────────────────────────────────────── Login Page ─────│
 │                         │                          │                     │
 │──── Enter Credentials ─▶│                          │                     │
 │                         │                          │◀─── Auth Code ──────│
 │                         │                          │                     │
 │                         │                          │──── Exchange Code ─▶│
 │                         │                          │◀─── Access Token ───│
 │                         │                          │                     │
 │                         │◀─── Set Cookie ──────────│                     │
 │◀──── Redirect to App ───│                          │                     │
 │                         │                          │                     │
 │──── API Request ───────▶│──── With Cookie ────────▶│                     │
 │                         │                          │──── Verify JWT ────▶│
 │                         │◀─── User Context ────────│                     │
 │◀──── Response ──────────│                          │                     │
```

### 6.2 API Key Encryption

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          API KEY ENCRYPTION                                  │
└─────────────────────────────────────────────────────────────────────────────┘

ENCRYPTION (Save):
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Plain API Key│────▶│ Generate     │────▶│ Derive Key   │
│              │     │ Random Salt  │     │ (PBKDF2)     │
└──────────────┘     │ Random IV    │     └──────┬───────┘
                     └──────────────┘            │
                                                 ▼
                     ┌──────────────┐     ┌──────────────┐
                     │ Store:       │◀────│ AES-256-GCM  │
                     │ salt:iv:     │     │ Encrypt      │
                     │ ciphertext:  │     └──────────────┘
                     │ authTag      │
                     └──────────────┘

DECRYPTION (Use):
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Encrypted    │────▶│ Parse        │────▶│ Derive Key   │
│ Blob         │     │ Components   │     │ (PBKDF2)     │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                 │
                     ┌──────────────┐     ┌──────────────┐
                     │ Plain API Key│◀────│ AES-256-GCM  │
                     │              │     │ Decrypt      │
                     └──────────────┘     └──────────────┘
```

---

## 7. Performance Architecture

### 7.1 Caching Strategy

| Layer | Cache Type | TTL | Purpose |
|-------|------------|-----|---------|
| React Query | In-memory | 5 min (stale), 30 min (gc) | API response caching |
| localStorage | Persistent | Indefinite | User preferences, tour state |
| Browser | HTTP cache | Varies | Static assets |

### 7.2 Rate Limiting

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          RATE LIMITING TIERS                                 │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────┐
                    │   Incoming Request  │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Check Endpoint     │
                    └──────────┬──────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
         ▼                     ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Auth Endpoints │  │  API Endpoints  │  │ Research Create │
│  /api/oauth/*   │  │  /api/trpc/*    │  │ research.create │
│                 │  │                 │  │                 │
│  20 req/15 min  │  │  100 req/15 min │  │  10 req/15 min  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## 8. Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DEPLOYMENT TOPOLOGY                                 │
└─────────────────────────────────────────────────────────────────────────────┘

                         ┌─────────────────┐
                         │   CDN / Edge    │
                         │   (Static)      │
                         └────────┬────────┘
                                  │
                         ┌────────▼────────┐
                         │   Load Balancer │
                         └────────┬────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
              ▼                   ▼                   ▼
     ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
     │   App Server    │ │   App Server    │ │   App Server    │
     │   (Node.js)     │ │   (Node.js)     │ │   (Node.js)     │
     │   Port 3000     │ │   Port 3000     │ │   Port 3000     │
     └────────┬────────┘ └────────┬────────┘ └────────┬────────┘
              │                   │                   │
              └───────────────────┼───────────────────┘
                                  │
                         ┌────────▼────────┐
                         │   Database      │
                         │   (MySQL/TiDB)  │
                         └────────┬────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
              ▼                   ▼                   ▼
     ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
     │   S3 Storage    │ │   LLM APIs      │ │   OAuth Server  │
     │   (Files/PDF)   │ │   (OpenAI)      │ │   (Manus)       │
     └─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

*Document prepared for workflow analyst optimization review*
