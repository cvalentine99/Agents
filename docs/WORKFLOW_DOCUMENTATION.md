# Agents by Valentine RF - Workflow Documentation

**Prepared for:** Workflow Analyst Review  
**Version:** 1.0  
**Date:** January 1, 2026

---

## Executive Summary

This document provides a comprehensive analysis of all workflows within the Agents by Valentine RF platform. The system orchestrates AI-powered software development through the RALPH Loop+ methodology, enabling autonomous coding sessions with human oversight via circuit breakers and completion promises.

---

## 1. User Journey Workflows

### 1.1 New User Onboarding Flow

| Step | Action | System Response | Data Created |
|------|--------|-----------------|--------------|
| 1 | User visits landing page | Display hero, features, how-it-works sections | None |
| 2 | User clicks "Launch Dashboard" | Redirect to OAuth login | None |
| 3 | User authenticates via Manus OAuth | Create/update user record, set session cookie | `users` record |
| 4 | First-time user enters dashboard | Auto-trigger guided onboarding tour | `localStorage: tourCompleted` |
| 5 | User completes 11-step tour | Mark tour as complete | `localStorage: tourCompleted=true` |
| 6 | User navigates to Settings | Prompt for API key configuration | None |
| 7 | User saves API keys | Encrypt and store keys | `api_keys` records |

### 1.2 Session Creation Flow

| Step | Actor | Action | Validation | Output |
|------|-------|--------|------------|--------|
| 1 | User | Select AI model on Model Wheel | Model must be one of: codex, claude, gemini, manus | `selectedModel` state |
| 2 | User | Choose Agent Profile | Profile must be: patch_goblin, architect_owl, test_gremlin, refactor_surgeon | `selectedProfile` state |
| 3 | User | Fill Power Promptor fields | Goal is required; Context, Done When, Do Not are optional | Prompt object |
| 4 | User | Add completion criteria | At least one criterion recommended | Criteria array |
| 5 | User | Configure session settings | Max iterations (5-200), safety mode, RALPH mode toggle | Config object |
| 6 | User | Click "Start Loop" | API key must exist for selected model | `sessions` record created |
| 7 | System | Generate session ID | Format: `session-{nanoid(12)}` | Unique session identifier |
| 8 | System | Initialize session state | Status=running, iteration=0, circuitBreaker=CLOSED | Database update |

### 1.3 RALPH Loop Execution Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RALPH LOOP EXECUTION FLOW                            │
└─────────────────────────────────────────────────────────────────────────────┘

START
  │
  ▼
┌─────────────────────┐
│ 1. INITIALIZE       │
│ • Create session    │
│ • Set iteration=0   │
│ • Circuit=CLOSED    │
└─────────────────────┘
  │
  ▼
┌─────────────────────┐     ┌─────────────────────┐
│ 2. SPAWN CLI        │────▶│ CLI Process Running │
│ • claude --dangerously-   │ • Stream stdout     │
│   skip-permissions  │     │ • Stream stderr     │
└─────────────────────┘     └─────────────────────┘
  │
  ▼
┌─────────────────────┐
│ 3. ITERATE          │◀──────────────────────────┐
│ • AI generates code │                           │
│ • Run tests         │                           │
│ • Record metrics    │                           │
└─────────────────────┘                           │
  │                                               │
  ▼                                               │
┌─────────────────────┐                           │
│ 4. CHECK PROGRESS   │                           │
│ • Diff lines > 0?   │                           │
│ • Tests improved?   │                           │
└─────────────────────┘                           │
  │                                               │
  ├── YES ──▶ Reset noProgressCount ─────────────┤
  │                                               │
  ▼ NO                                            │
┌─────────────────────┐                           │
│ 5. INCREMENT        │                           │
│ noProgressCount++   │                           │
└─────────────────────┘                           │
  │                                               │
  ▼                                               │
┌─────────────────────┐                           │
│ 6. THRESHOLD CHECK  │                           │
│ count >= threshold? │                           │
└─────────────────────┘                           │
  │                                               │
  ├── NO ────────────────────────────────────────┘
  │
  ▼ YES
┌─────────────────────┐
│ 7. CIRCUIT BREAKER  │
│ State → OPEN        │
│ Pause for human     │
│ Send notification   │
└─────────────────────┘
  │
  ▼
┌─────────────────────┐
│ 8. HUMAN DECISION   │
│ • Resume (→HALF_OPEN)
│ • Stop session      │
│ • Modify prompt     │
└─────────────────────┘
  │
  ├── RESUME ──▶ Continue loop (HALF_OPEN → CLOSED on success)
  │
  ▼ STOP
┌─────────────────────┐
│ 9. COMPLETION CHECK │
│ All criteria met?   │
└─────────────────────┘
  │
  ├── YES ──▶ Status=complete, send success notification
  │
  ▼ NO
┌─────────────────────┐
│ 10. SESSION END     │
│ Status=failed/paused│
│ Record final state  │
└─────────────────────┘
  │
  ▼
END
```

---

## 2. Feature Workflows

### 2.1 Deep Research Workflow

| Phase | Duration | Actions | AI Operations | Data Stored |
|-------|----------|---------|---------------|-------------|
| **Initiation** | ~1s | User enters topic, selects depth | None | `research_sessions` created |
| **Planning** | ~5s | System analyzes topic | LLM generates research plan | `research_steps` (type=planning) |
| **Research** | 30s-3min | Execute search queries | LLM analyzes sources, extracts findings | `research_steps`, `research_findings` |
| **Synthesis** | ~10s | Compile results | LLM generates summary, recommendations | Update `research_sessions.summary` |
| **Delivery** | Instant | Display results | None | Status=completed |

**Depth Settings:**

| Depth | Steps | Typical Duration | Use Case |
|-------|-------|------------------|----------|
| Quick | 3 | 30-60 seconds | Fast fact-checking |
| Standard | 5 | 1-2 minutes | General research |
| Deep | 8 | 2-4 minutes | Comprehensive analysis |

### 2.2 Template Management Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       TEMPLATE MANAGEMENT WORKFLOW                           │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────┐
                    │   TEMPLATE TYPES    │
                    └─────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
    ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
    │ BUILT-IN (18) │ │ CUSTOM USER   │ │ IMPORTED      │
    │ • NVIDIA HW   │ │ • User created│ │ • From JSON   │
    │ • AI/ML       │ │ • Categorized │ │ • Shared      │
    │ • Infra       │ │ • Favorited   │ │ • Validated   │
    │ • Market      │ │               │ │               │
    │ • Trends      │ │               │ │               │
    └───────────────┘ └───────────────┘ └───────────────┘
            │                 │                 │
            └─────────────────┼─────────────────┘
                              ▼
                    ┌─────────────────────┐
                    │   USER ACTIONS      │
                    └─────────────────────┘
                              │
    ┌──────────┬──────────┬───┴───┬──────────┬──────────┐
    ▼          ▼          ▼       ▼          ▼          ▼
┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐
│ Browse ││ Search ││Favorite││ Create ││ Export ││ Import │
│        ││ Filter ││ Toggle ││ Custom ││  JSON  ││  JSON  │
└────────┘└────────┘└────────┘└────────┘└────────┘└────────┘
    │          │          │       │          │          │
    └──────────┴──────────┴───┬───┴──────────┴──────────┘
                              ▼
                    ┌─────────────────────┐
                    │   APPLY TEMPLATE    │
                    │ • Pre-fill topic    │
                    │ • Set depth         │
                    │ • Track usage       │
                    └─────────────────────┘
```

### 2.3 API Key Management Workflow

| Step | User Action | System Process | Security Measure |
|------|-------------|----------------|------------------|
| 1 | Navigate to Settings | Load existing keys (metadata only) | Keys never sent to frontend |
| 2 | Enter API key | Client-side format validation | Pattern matching per provider |
| 3 | Click Save | Encrypt with AES-256-GCM | Random salt per key |
| 4 | System stores key | Save to `api_keys` table | Only encrypted blob + hint stored |
| 5 | User validates key | Decrypt and test format | Re-encrypt after validation |
| 6 | Key used in session | Decrypt at runtime | Memory cleared after use |

---

## 3. Data Flow Workflows

### 3.1 Session Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SESSION DATA FLOW                                   │
└─────────────────────────────────────────────────────────────────────────────┘

USER INPUT                    PROCESSING                      STORAGE
─────────────────────────────────────────────────────────────────────────────
                                                              
Model Selection ──────────▶ Validate ──────────────────────▶ sessions.selectedModel
                                                              
Agent Profile ────────────▶ Validate ──────────────────────▶ sessions.selectedProfile
                                                              
Power Promptor ───────────▶ Expand to full prompt ─────────▶ sessions (prompt fields)
  • Goal                                                      
  • Context                                                   
  • Done When                                                 
  • Do Not                                                    
                                                              
Completion Criteria ──────▶ Create checklist items ────────▶ completion_criteria
                                                              
                                                              
RUNTIME DATA                  PROCESSING                      STORAGE
─────────────────────────────────────────────────────────────────────────────
                                                              
CLI Output ───────────────▶ Parse iteration data ──────────▶ loop_metrics
                          ▶ Extract file changes ──────────▶ file_changes
                          ▶ Parse diff hunks ──────────────▶ diff_hunks
                                                              
Circuit Breaker State ────▶ State machine logic ───────────▶ sessions.circuitBreakerState
                                                              
Progress Updates ─────────▶ Calculate completion % ────────▶ sessions.completionProgress
```

### 3.2 Research Data Flow

```
USER REQUEST                  AI PROCESSING                   STORAGE
─────────────────────────────────────────────────────────────────────────────

Topic + Depth ────────────▶ Create research session ───────▶ research_sessions
                                    │
                                    ▼
                          ┌─────────────────────┐
                          │ LLM: Generate Plan  │
                          └─────────────────────┘
                                    │
                                    ▼
                          ┌─────────────────────┐
Planning Step ◀───────────│ Store planning step │──────────▶ research_steps
                          └─────────────────────┘
                                    │
                                    ▼
                          ┌─────────────────────┐
                          │ LLM: Execute Search │
                          │ & Analyze Sources   │
                          └─────────────────────┘
                                    │
                          ┌─────────┴─────────┐
                          ▼                   ▼
Research Steps ◀──────────────────────────────────────────▶ research_steps
                                              │
Findings ◀────────────────────────────────────┴───────────▶ research_findings
                                    │
                                    ▼
                          ┌─────────────────────┐
                          │ LLM: Synthesize     │
                          │ Summary & Recs      │
                          └─────────────────────┘
                                    │
                                    ▼
Summary ◀─────────────────────────────────────────────────▶ research_sessions.summary
```

---

## 4. State Machine Workflows

### 4.1 Session Status State Machine

```
                              ┌─────────┐
                              │  IDLE   │
                              └────┬────┘
                                   │ User clicks "Start Loop"
                                   ▼
                              ┌─────────┐
              ┌───────────────│ RUNNING │───────────────┐
              │               └────┬────┘               │
              │                    │                    │
    User clicks "Pause"            │         All criteria met
              │                    │                    │
              ▼                    │                    ▼
         ┌─────────┐               │              ┌──────────┐
         │ PAUSED  │               │              │ COMPLETE │
         └────┬────┘               │              └──────────┘
              │                    │
    User clicks "Resume"           │ Error or max iterations
              │                    │
              └────────────────────┤
                                   │
                                   ▼
                              ┌─────────┐
                              │ FAILED  │
                              └─────────┘
```

### 4.2 Circuit Breaker State Machine

```
                              ┌─────────┐
                    ┌────────▶│ CLOSED  │◀────────┐
                    │         └────┬────┘         │
                    │              │              │
            Success after          │ noProgressCount
            HALF_OPEN test         │ >= threshold
                    │              │              │
                    │              ▼              │
               ┌────┴────┐    ┌─────────┐        │
               │HALF_OPEN│◀───│  OPEN   │        │
               └────┬────┘    └─────────┘        │
                    │              ▲              │
                    │              │              │
            Failure in        User clicks        │
            HALF_OPEN         "Resume"           │
                    │              │              │
                    └──────────────┘              │
                                                 │
                    Progress made ───────────────┘
```

---

## 5. Integration Workflows

### 5.1 External Service Integrations

| Service | Integration Point | Data Flow | Authentication |
|---------|-------------------|-----------|----------------|
| **Manus OAuth** | `/api/oauth/callback` | User identity → session cookie | OAuth 2.0 |
| **OpenAI API** | `server/_core/llm.ts` | Prompts → Completions | Bearer token |
| **Claude CLI** | WebSocket spawn | Commands → stdout/stderr | API key in env |
| **S3 Storage** | `server/storage.ts` | Files → S3 bucket | AWS credentials |
| **Puppeteer** | `server/pdfGenerator.ts` | HTML → PDF | None (local) |

### 5.2 Notification Workflow

```
EVENT TRIGGER                 PROCESSING                      DELIVERY
─────────────────────────────────────────────────────────────────────────────

Session Complete ─────────▶ Check notification settings ──▶ Browser Push
                                                          ▶ Sound Alert
                                                              
Session Failed ───────────▶ Check notification settings ──▶ Browser Push
                                                          ▶ Sound Alert
                                                              
Circuit Breaker OPEN ─────▶ Check notification settings ──▶ Browser Push
                                                          ▶ Sound Alert
                                                              
Circuit Breaker CLOSED ───▶ Check notification settings ──▶ Browser Push
```

---

## 6. Error Handling Workflows

### 6.1 Error Recovery Patterns

| Error Type | Detection | Recovery Action | User Notification |
|------------|-----------|-----------------|-------------------|
| API Key Invalid | Validation failure | Prompt re-entry | Toast error |
| CLI Process Crash | Exit code ≠ 0 | Mark session failed | Push notification |
| Network Timeout | Request timeout | Retry with backoff | Loading indicator |
| Database Error | Query exception | Log and return error | Toast error |
| Rate Limit Hit | 429 response | Queue and retry | Progress indicator |

### 6.2 Circuit Breaker Recovery Flow

```
STUCK DETECTION              HUMAN INTERVENTION              RECOVERY
─────────────────────────────────────────────────────────────────────────────

No progress detected ────▶ Increment counter
        │
        ▼
Counter >= threshold ────▶ Set circuit to OPEN
        │
        ▼
Send notification ───────▶ User reviews situation
        │
        │                  ┌─────────────────────┐
        │                  │ User Options:       │
        │                  │ 1. Modify prompt    │
        │                  │ 2. Change model     │
        │                  │ 3. Add context      │
        │                  │ 4. Stop session     │
        │                  └─────────────────────┘
        │                            │
        ▼                            ▼
User clicks "Resume" ────▶ Set circuit to HALF_OPEN
        │
        ▼
Next iteration succeeds ─▶ Set circuit to CLOSED
        │                  Reset noProgressCount
        ▼
Continue normal operation
```

---

## 7. Performance Considerations

### 7.1 Rate Limiting Configuration

| Endpoint Category | Limit | Window | Purpose |
|-------------------|-------|--------|---------|
| General API | 100 requests | 15 minutes | Prevent abuse |
| Auth endpoints | 20 requests | 15 minutes | Prevent brute force |
| Research create | 10 requests | 15 minutes | Limit AI costs |

### 7.2 Database Query Optimization

| Table | Indexed Columns | Query Pattern |
|-------|-----------------|---------------|
| `sessions` | userId, status | Filter by user, status |
| `completion_criteria` | sessionId | Load criteria for session |
| `research_sessions` | userId, status | Filter by user, status |
| `research_findings` | researchSessionId | Load findings for research |

---

## 8. Optimization Opportunities

The following areas have been identified for potential workflow optimization:

1. **Session Creation** - Currently requires multiple form fills; could benefit from template quick-start
2. **Research Polling** - Uses polling instead of WebSocket; could reduce latency with real-time streaming
3. **Dashboard State** - Complex state management; could benefit from useReducer refactoring
4. **Bundle Size** - 1.8MB initial load; could benefit from route-based code splitting
5. **CLI Streaming** - WebSocket per session; could consolidate to single multiplexed connection

---

*Document prepared for workflow analyst optimization review*
