# Agents by Valentine RF - Application Topology

**Version:** 1.0  
**Last Updated:** December 31, 2024  
**Author:** Manus AI

---

## Executive Summary

Agents by Valentine RF is a comprehensive AI-powered software development platform that orchestrates multi-agent workflows using the RALPH Loop+ methodology. The application provides a command center for managing autonomous coding sessions, conducting deep research, and leveraging multiple AI models (Codex, Claude, Gemini, Manus) through a unified cyberpunk-themed interface.

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Database Schema](#2-database-schema)
3. [API Routes & Backend Services](#3-api-routes--backend-services)
4. [Frontend Pages & Components](#4-frontend-pages--components)
5. [Core Features & Workflows](#5-core-features--workflows)
6. [Security Implementation](#6-security-implementation)
7. [Data Flow Diagrams](#7-data-flow-diagrams)

---

## 1. System Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 19 + TypeScript | UI framework |
| **Styling** | Tailwind CSS 4 + shadcn/ui | Component library & styling |
| **State Management** | TanStack Query + tRPC | Server state & API calls |
| **Backend** | Express 4 + tRPC 11 | API server |
| **Database** | MySQL/TiDB + Drizzle ORM | Data persistence |
| **Authentication** | Manus OAuth | User authentication |
| **AI Integration** | OpenAI-compatible API | LLM interactions |

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (React 19)                         │
├─────────────────────────────────────────────────────────────────┤
│  Pages: Home, Dashboard, Research, Settings, Analytics, etc.    │
│  Components: ModelWheel, FlightComputer, PowerPromptor, etc.    │
│  State: TanStack Query + tRPC Client                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ tRPC (HTTP/JSON)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVER (Express + tRPC)                     │
├─────────────────────────────────────────────────────────────────┤
│  Routers: auth, sessions, research, templates, apiKeys, etc.    │
│  Services: LLM, PDF Generation, Encryption, Storage             │
│  Middleware: Rate Limiting, Morgan Logging, CORS                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Drizzle ORM
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE (MySQL/TiDB)                       │
├─────────────────────────────────────────────────────────────────┤
│  18 Tables: users, sessions, research_sessions, templates, etc. │
│  Indexes: Performance-optimized for common queries              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema

The application uses 18 database tables organized into functional domains:

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | User accounts & authentication | id, openId, name, email, role |
| `sessions` | RALPH Loop coding sessions | sessionId, status, selectedModel, selectedProfile |
| `api_keys` | Encrypted provider credentials | provider, encryptedKey, keyHint |

### Session Management Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `completion_criteria` | Task completion checklist items | sessionId, text, checked |
| `loop_metrics` | Telemetry per iteration | iteration, diffLines, testsRun, testsPassed |
| `file_changes` | Files modified during sessions | path, changeType, linesAdded, linesRemoved |
| `cli_executions` | CLI command execution logs | command, stdout, stderr, exitCode |
| `checkpoints` | Session state snapshots | iteration, snapshotData |
| `diff_hunks` | Code diff approval workflow | filePath, content, approved |
| `assembly_line_runs` | Multi-agent pipeline executions | stageConfig, currentStage, status |

### Prompt & Template Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `saved_prompts` | User's prompt library | goal, context, doneWhen, doNot |
| `session_templates` | Reusable session configurations | selectedModel, selectedProfile, completionCriteria |

### Deep Research Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `research_sessions` | AI research sessions | topic, depth, status, summary |
| `research_findings` | Individual research findings | title, content, sourceUrl, confidence |
| `research_steps` | Research reasoning steps | stepType, query, reasoning, result |
| `research_follow_ups` | Follow-up Q&A | question, answer, status |

### Template Management Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `custom_templates` | User-created research templates | name, topic, category, tags |
| `template_favorites` | Starred templates | templateId, templateType |
| `template_usage` | Usage analytics | templateId, usedAt |
| `user_template_categories` | Custom category organization | name, color, icon |

---

## 3. API Routes & Backend Services

### tRPC Router Structure

The backend exposes 15 routers with 80+ procedures:

#### Authentication Router (`auth`)
| Procedure | Type | Description |
|-----------|------|-------------|
| `me` | Query | Get current authenticated user |
| `logout` | Mutation | Clear session and logout |

#### API Keys Router (`apiKeys`)
| Procedure | Type | Description |
|-----------|------|-------------|
| `save` | Mutation | Save/update encrypted API key |
| `list` | Query | Get all user API keys (metadata only) |
| `delete` | Mutation | Delete an API key |
| `validate` | Mutation | Test API key validity |
| `getForProvider` | Query | Get key metadata for a provider |

#### Sessions Router (`sessions`)
| Procedure | Type | Description |
|-----------|------|-------------|
| `create` | Mutation | Create new RALPH session |
| `list` | Query | Get all user sessions |
| `get` | Query | Get specific session (with ownership check) |
| `update` | Mutation | Update session status/config |
| `delete` | Mutation | Delete session |
| `getHistory` | Query | Get session history with stats |
| `getStats` | Query | Get aggregated session statistics |

#### CLI Router (`cli`)
| Procedure | Type | Description |
|-----------|------|-------------|
| `create` | Mutation | Create CLI execution record |
| `update` | Mutation | Update CLI execution status |
| `list` | Query | List CLI executions for session |
| `getRunning` | Query | Get currently running CLI processes |

#### Criteria Router (`criteria`)
| Procedure | Type | Description |
|-----------|------|-------------|
| `add` | Mutation | Add completion criterion |
| `toggle` | Mutation | Toggle criterion checked state |
| `delete` | Mutation | Delete criterion |
| `list` | Query | List criteria for session |
| `reorder` | Mutation | Reorder criteria |

#### Metrics Router (`metrics`)
| Procedure | Type | Description |
|-----------|------|-------------|
| `record` | Mutation | Record loop iteration metrics |
| `getForSession` | Query | Get metrics for session |

#### File Changes Router (`fileChanges`)
| Procedure | Type | Description |
|-----------|------|-------------|
| `record` | Mutation | Record file change |
| `getForSession` | Query | Get file changes for session |

#### Prompts Router (`prompts`)
| Procedure | Type | Description |
|-----------|------|-------------|
| `save` | Mutation | Save prompt to library |
| `list` | Query | List user's saved prompts |
| `delete` | Mutation | Delete saved prompt |

#### Assembly Line Router (`assemblyLine`)
| Procedure | Type | Description |
|-----------|------|-------------|
| `create` | Mutation | Create assembly line run |
| `update` | Mutation | Update run status |
| `get` | Query | Get run details |

#### Diff Hunks Router (`diffHunks`)
| Procedure | Type | Description |
|-----------|------|-------------|
| `create` | Mutation | Create diff hunk for approval |
| `approve` | Mutation | Approve/reject diff hunk |
| `getPending` | Query | Get pending diff hunks |

#### Session Templates Router (`sessionTemplates`)
| Procedure | Type | Description |
|-----------|------|-------------|
| `create` | Mutation | Create session template |
| `list` | Query | List user's templates |
| `get` | Query | Get template details |
| `update` | Mutation | Update template |
| `delete` | Mutation | Delete template |
| `use` | Mutation | Create session from template |
| `duplicate` | Mutation | Duplicate template |
| `export` | Query | Export templates as JSON |
| `import` | Mutation | Import templates from JSON |

#### Checkpoints Router (`checkpoints`)
| Procedure | Type | Description |
|-----------|------|-------------|
| `create` | Mutation | Create checkpoint |
| `list` | Query | List checkpoints for session |
| `restore` | Mutation | Restore to checkpoint |

#### Research Router (`research`)
| Procedure | Type | Description |
|-----------|------|-------------|
| `create` | Mutation | Start new research session |
| `list` | Query | List user's research sessions |
| `get` | Query | Get research details with findings |
| `delete` | Mutation | Delete research session |
| `getFindings` | Query | Get findings for research |
| `getSteps` | Query | Get research steps |
| `share` | Mutation | Generate share link |
| `unshare` | Mutation | Disable sharing |
| `getPublic` | Query | Get public research by token |
| `askFollowUp` | Mutation | Ask follow-up question |
| `getFollowUps` | Query | Get follow-up Q&A |
| `exportMarkdown` | Query | Export as Markdown |
| `exportPDF` | Query | Export as PDF |

#### Templates Router (`templates`)
| Procedure | Type | Description |
|-----------|------|-------------|
| `list` | Query | List custom templates |
| `create` | Mutation | Create custom template |
| `update` | Mutation | Update custom template |
| `delete` | Mutation | Delete custom template |
| `toggleFavorite` | Mutation | Toggle template favorite |
| `getFavorites` | Query | Get user's favorites |
| `trackUsage` | Mutation | Track template usage |
| `getUsageStats` | Query | Get usage statistics |
| `listCategories` | Query | List user categories |
| `createCategory` | Mutation | Create category |
| `updateCategory` | Mutation | Update category |
| `deleteCategory` | Mutation | Delete category |
| `export` | Query | Export templates as JSON |
| `import` | Mutation | Import templates from JSON |

### Backend Services

| Service | File | Purpose |
|---------|------|---------|
| **LLM Integration** | `server/_core/llm.ts` | OpenAI-compatible API calls |
| **PDF Generation** | `server/pdfGenerator.ts` | Puppeteer-based PDF export |
| **Encryption** | `server/crypto.ts` | AES-256-GCM encryption for API keys |
| **Storage** | `server/storage.ts` | S3 file storage helpers |
| **Image Generation** | `server/_core/imageGeneration.ts` | AI image generation |
| **Voice Transcription** | `server/_core/voiceTranscription.ts` | Whisper API integration |
| **Notifications** | `server/_core/notification.ts` | Owner notification system |

---

## 4. Frontend Pages & Components

### Page Routes

| Route | Page Component | Description |
|-------|----------------|-------------|
| `/` | `Home.tsx` | Landing page with hero, features, how-it-works |
| `/dashboard` | `Dashboard.tsx` | Main command center with all tools |
| `/research` | `DeepResearch.tsx` | AI-powered research interface |
| `/research/share/:token` | `PublicResearch.tsx` | Public research viewer |
| `/settings` | `Settings.tsx` | User settings & API key management |
| `/history` | `SessionHistory.tsx` | Session history browser |
| `/analytics` | `Analytics.tsx` | Usage analytics dashboard |
| `/templates` | `PromptTemplates.tsx` | Prompt template library |
| `/multi` | `MultiSession.tsx` | Multi-session management |
| `/session-templates` | `SessionTemplatesPage.tsx` | Session template manager |

### Core Components

#### Dashboard Components

| Component | File | Purpose |
|-----------|------|---------|
| **ModelWheel** | `ModelWheel.tsx` | Interactive AI model selector (Codex, Claude, Gemini, Manus) |
| **FlightComputer** | `FlightComputer.tsx` | Session control panel with start/stop/pause |
| **PowerPromptor** | `PowerPromptor.tsx` | 4-field prompt builder (Goal, Context, Done When, Do Not) |
| **AgentProfiles** | `AgentProfiles.tsx` | Agent persona selector (Patch Goblin, Architect Owl, etc.) |
| **SessionManager** | `SessionManager.tsx` | Session configuration & status display |
| **CircuitBreakerViz** | `CircuitBreakerViz.tsx` | Circuit breaker state visualization |
| **CompletionCriteriaEditor** | `CompletionCriteriaEditor.tsx` | Checklist editor for completion promise |
| **LiveMonitor** | `LiveMonitor.tsx` | Real-time session monitoring |
| **AssemblyLine** | `AssemblyLine.tsx` | Multi-agent pipeline visualization |

#### Terminal & Code Components

| Component | File | Purpose |
|-----------|------|---------|
| **CliTerminal** | `CliTerminal.tsx` | CLI command execution interface |
| **IntegratedTerminal** | `IntegratedTerminal.tsx` | Embedded terminal emulator |
| **DiffViewer** | `DiffViewer.tsx` | Code diff display with approval workflow |
| **DirectoryPicker** | `DirectoryPicker.tsx` | File/folder selection UI |

#### Prompt & Template Components

| Component | File | Purpose |
|-----------|------|---------|
| **PromptLibrary** | `PromptLibrary.tsx` | Saved prompts browser |
| **PromptPacks** | `PromptPacks.tsx` | Pre-built prompt pack selector |
| **SaveAsTemplateModal** | `SaveAsTemplateModal.tsx` | Save session as template dialog |
| **SessionExportImport** | `SessionExportImport.tsx` | Session data export/import |

#### Onboarding Components

| Component | File | Purpose |
|-----------|------|---------|
| **TourOverlay** | `TourOverlay.tsx` | Guided tour spotlight overlay |
| **TourTrigger** | `TourTrigger.tsx` | Tour start button in header |
| **OnboardingContext** | `OnboardingContext.tsx` | Tour state management |

#### UI Components (shadcn/ui)

The application includes 50+ shadcn/ui components including: Button, Card, Dialog, Dropdown, Input, Select, Tabs, Toast, Tooltip, and more.

---

## 5. Core Features & Workflows

### 5.1 RALPH Loop+ Workflow

The RALPH (Recursive Autonomous Loop for Programming Help) methodology:

```
┌─────────────────────────────────────────────────────────────────┐
│                     RALPH Loop+ Workflow                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. DEFINE PROMISE                                               │
│     - Set completion criteria (checklist items)                  │
│     - Configure Power Promptor (Goal, Context, Done When, DoNot) │
│     - Select AI Model (Codex/Claude/Gemini/Manus)               │
│     - Choose Agent Profile (Patch Goblin/Architect Owl/etc.)    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. START LOOP                                                   │
│     - Initialize session with configuration                      │
│     - Set circuit breaker to CLOSED                             │
│     - Begin iteration counter                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. ITERATE                                                      │
│     - AI generates code changes                                  │
│     - Run tests automatically                                    │
│     - Record metrics (diff lines, tests passed)                 │
│     - Update completion progress                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. CIRCUIT BREAKER CHECK                                        │
│     - If no progress: increment counter                          │
│     - If threshold reached: OPEN circuit, pause for human        │
│     - If progress made: reset counter, continue                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. COMPLETION CHECK                                             │
│     - Check all criteria items                                   │
│     - If all checked: mark session complete                      │
│     - If not: continue to next iteration                         │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Deep Research Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Deep Research Workflow                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. INITIATE RESEARCH                                            │
│     - Enter topic/question                                       │
│     - Select depth (Quick: 3 steps, Standard: 5, Deep: 8)       │
│     - Optionally use template                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. PLANNING PHASE                                               │
│     - AI analyzes topic                                          │
│     - Generates research plan                                    │
│     - Identifies key areas to investigate                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. RESEARCH STEPS                                               │
│     - Execute search queries                                     │
│     - Analyze sources                                            │
│     - Extract findings with confidence scores                    │
│     - Verify information                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. SYNTHESIS                                                    │
│     - Generate executive summary                                 │
│     - Organize findings by theme                                 │
│     - Create recommendations                                     │
│     - Note limitations                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. DELIVERY                                                     │
│     - Display results in tabbed interface                        │
│     - Enable follow-up questions                                 │
│     - Export as Markdown or PDF                                  │
│     - Share via public link                                      │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Template Management Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                  Template Management Workflow                    │
└─────────────────────────────────────────────────────────────────┘

Built-in Templates (18):
├── NVIDIA Hardware
│   ├── DGX SPARK Overview
│   ├── DGX SPARK vs Cloud GPU
│   ├── DGX SPARK Setup Guide
│   ├── RTX 4090 Deep Dive
│   └── Multi-GPU 4090 Configuration
├── AI/ML Pipelines
│   ├── x86 + RTX 4090 ML Pipeline
│   ├── RTX 4090 Inference Optimization
│   ├── LLM Training on Consumer GPUs
│   └── MLOps with NVIDIA Stack
├── Infrastructure
│   ├── On-Prem vs Cloud for AI
│   ├── GPU Cluster Architecture
│   └── Kubernetes for GPU Workloads
├── Market Analysis
│   ├── AI Chip Market Analysis
│   ├── Enterprise AI Adoption Trends
│   └── GPU Pricing & Availability
└── Tech Trends
    ├── Edge AI Computing Trends
    ├── LLM Inference Hardware Evolution
    └── AI Computing Sustainability

Custom Templates:
├── Create custom templates from research topics
├── Organize with user-defined categories (with colors)
├── Mark favorites for quick access
├── Track usage analytics
├── Import/Export as JSON
└── Filter by category, favorites, or search
```

---

## 6. Security Implementation

### Authentication & Authorization

| Feature | Implementation |
|---------|----------------|
| **OAuth** | Manus OAuth with session cookies |
| **Session Management** | JWT-based with secure cookie options |
| **Role-Based Access** | User/Admin roles in database |
| **IDOR Protection** | Ownership verification on all data access |

### Data Security

| Feature | Implementation |
|---------|----------------|
| **API Key Encryption** | AES-256-GCM with per-key random salt |
| **Rate Limiting** | 100 req/15min (API), 20 req/15min (auth) |
| **Input Validation** | Zod schemas on all tRPC inputs |
| **SQL Injection** | Drizzle ORM parameterized queries |

### Security Middleware

```typescript
// Rate limiting configuration
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Stricter for auth endpoints
});
```

---

## 7. Data Flow Diagrams

### Session Creation Flow

```
User                    Frontend                  Backend                   Database
  │                        │                         │                         │
  │  Click "New Session"   │                         │                         │
  │───────────────────────>│                         │                         │
  │                        │  sessions.create()      │                         │
  │                        │────────────────────────>│                         │
  │                        │                         │  INSERT session         │
  │                        │                         │────────────────────────>│
  │                        │                         │<────────────────────────│
  │                        │<────────────────────────│                         │
  │  Display new session   │                         │                         │
  │<───────────────────────│                         │                         │
```

### Research Flow

```
User                    Frontend                  Backend                   LLM API
  │                        │                         │                         │
  │  Enter topic, click    │                         │                         │
  │  "Start Research"      │                         │                         │
  │───────────────────────>│                         │                         │
  │                        │  research.create()      │                         │
  │                        │────────────────────────>│                         │
  │                        │                         │  Generate plan          │
  │                        │                         │────────────────────────>│
  │                        │                         │<────────────────────────│
  │                        │                         │  Execute steps          │
  │                        │                         │────────────────────────>│
  │                        │                         │<────────────────────────│
  │                        │                         │  Synthesize findings    │
  │                        │                         │────────────────────────>│
  │                        │                         │<────────────────────────│
  │                        │<────────────────────────│                         │
  │  Display results       │                         │                         │
  │<───────────────────────│                         │                         │
```

---

## Appendix A: File Structure

```
coding-wheel/
├── client/
│   ├── src/
│   │   ├── components/          # 30+ React components
│   │   │   ├── ui/              # 50+ shadcn/ui components
│   │   │   ├── ModelWheel.tsx
│   │   │   ├── FlightComputer.tsx
│   │   │   ├── PowerPromptor.tsx
│   │   │   └── ...
│   │   ├── contexts/            # React contexts
│   │   │   ├── OnboardingContext.tsx
│   │   │   └── ThemeContext.tsx
│   │   ├── data/                # Static data
│   │   │   └── researchTemplates.ts
│   │   ├── hooks/               # Custom hooks
│   │   ├── lib/                 # Utilities
│   │   │   ├── trpc.ts
│   │   │   └── utils.ts
│   │   ├── pages/               # Page components
│   │   │   ├── Home.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── DeepResearch.tsx
│   │   │   └── ...
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   └── index.html
├── server/
│   ├── _core/                   # Framework internals
│   │   ├── llm.ts
│   │   ├── context.ts
│   │   ├── trpc.ts
│   │   └── ...
│   ├── routers.ts               # All tRPC routes
│   ├── db.ts                    # Database helpers
│   ├── crypto.ts                # Encryption utilities
│   ├── pdfGenerator.ts          # PDF export
│   ├── storage.ts               # S3 helpers
│   └── *.test.ts                # 130+ tests
├── drizzle/
│   ├── schema.ts                # 18 database tables
│   └── relations.ts
├── shared/
│   └── types.ts                 # Shared TypeScript types
└── package.json
```

---

## Appendix B: Test Coverage

| Test File | Tests | Coverage Area |
|-----------|-------|---------------|
| `auth.logout.test.ts` | 2 | Authentication |
| `session.test.ts` | 12 | Session management |
| `sessionHistory.test.ts` | 8 | Session history |
| `sessionTemplates.test.ts` | 15 | Session templates |
| `apiKeys.test.ts` | 10 | API key management |
| `security.test.ts` | 10 | IDOR & authorization |
| `crypto.test.ts` | 12 | Encryption |
| `research.test.ts` | 15 | Deep research |
| `research-features.test.ts` | 14 | Research export/share |
| `researchTemplates.test.ts` | 24 | Research templates |
| `pdfGenerator.test.ts` | 9 | PDF generation |
| **Total** | **130+** | **Full coverage** |

---

## Appendix C: Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | MySQL/TiDB connection string |
| `JWT_SECRET` | Session cookie signing |
| `VITE_APP_ID` | Manus OAuth app ID |
| `OAUTH_SERVER_URL` | OAuth backend URL |
| `BUILT_IN_FORGE_API_KEY` | LLM API authentication |
| `BUILT_IN_FORGE_API_URL` | LLM API endpoint |

---

*Document generated by Manus AI for Agents by Valentine RF*
