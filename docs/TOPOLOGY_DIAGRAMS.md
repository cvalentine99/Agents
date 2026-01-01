# Agents by Valentine RF - Topology Diagrams

**Prepared for:** Workflow Analyst Review  
**Version:** 1.0  
**Date:** January 1, 2026

This document contains Mermaid diagrams for visual representation of system topology, workflows, and data flows.

---

## 1. System Architecture Diagram

```mermaid
flowchart TB
    subgraph Client["Client Layer"]
        Browser["Browser (React SPA)"]
        subgraph Pages["Pages"]
            Home["Home"]
            Dashboard["Dashboard"]
            Settings["Settings"]
            Research["Deep Research"]
            Analytics["Analytics"]
        end
        subgraph Components["Components"]
            ModelWheel["Model Wheel"]
            FlightComputer["Flight Computer"]
            PowerPromptor["Power Promptor"]
            AgentProfiles["Agent Profiles"]
        end
    end

    subgraph Server["Server Layer"]
        Express["Express Server"]
        tRPC["tRPC Router"]
        subgraph Routers["API Routers"]
            AuthRouter["auth"]
            SessionRouter["sessions"]
            ResearchRouter["research"]
            TemplateRouter["templates"]
            CLIRouter["cli"]
        end
        subgraph Services["Services"]
            Crypto["Crypto (AES-256)"]
            PDF["PDF Generator"]
            LLM["LLM Integration"]
        end
    end

    subgraph Data["Data Layer"]
        MySQL["MySQL/TiDB"]
        S3["S3 Storage"]
        External["External APIs"]
    end

    Browser --> tRPC
    tRPC --> Routers
    Routers --> Services
    Services --> MySQL
    Services --> S3
    Services --> External
```

---

## 2. User Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant O as OAuth Server

    U->>F: Click "Launch Dashboard"
    F->>B: Redirect to /api/oauth/login
    B->>O: Authorization Request
    O->>U: Display Login Page
    U->>O: Enter Credentials
    O->>B: Authorization Code
    B->>O: Exchange Code for Token
    O->>B: Access Token + User Info
    B->>B: Create/Update User Record
    B->>B: Generate JWT Session Cookie
    B->>F: Set Cookie + Redirect
    F->>U: Display Dashboard
```

---

## 3. RALPH Loop Execution Flow

```mermaid
flowchart TD
    Start([Start Session]) --> Init[Initialize Session]
    Init --> SpawnCLI[Spawn CLI Process]
    SpawnCLI --> Iterate[Execute Iteration]
    
    Iterate --> CheckProgress{Progress Made?}
    
    CheckProgress -->|Yes| ResetCounter[Reset No-Progress Counter]
    ResetCounter --> CheckComplete{All Criteria Met?}
    
    CheckProgress -->|No| IncrementCounter[Increment Counter]
    IncrementCounter --> CheckThreshold{Counter >= Threshold?}
    
    CheckThreshold -->|No| CheckComplete
    CheckThreshold -->|Yes| OpenCircuit[Open Circuit Breaker]
    
    OpenCircuit --> Notify[Send Notification]
    Notify --> HumanDecision{Human Decision}
    
    HumanDecision -->|Resume| HalfOpen[Set Half-Open]
    HalfOpen --> Iterate
    
    HumanDecision -->|Stop| MarkFailed[Mark Session Failed]
    MarkFailed --> End([End])
    
    CheckComplete -->|No| CheckMaxIter{Max Iterations?}
    CheckMaxIter -->|No| Iterate
    CheckMaxIter -->|Yes| MarkFailed
    
    CheckComplete -->|Yes| MarkComplete[Mark Session Complete]
    MarkComplete --> End
```

---

## 4. Deep Research Workflow

```mermaid
flowchart LR
    subgraph Input["User Input"]
        Topic["Research Topic"]
        Depth["Depth Selection"]
        Template["Template (Optional)"]
    end

    subgraph Planning["Planning Phase"]
        CreateSession["Create Session"]
        GeneratePlan["LLM: Generate Plan"]
        StorePlan["Store Planning Step"]
    end

    subgraph Research["Research Phase"]
        ExecuteSearch["Execute Searches"]
        AnalyzeSources["LLM: Analyze Sources"]
        ExtractFindings["Extract Findings"]
        StoreFindings["Store Findings"]
    end

    subgraph Synthesis["Synthesis Phase"]
        CompileResults["Compile Results"]
        GenerateSummary["LLM: Generate Summary"]
        CreateRecs["Create Recommendations"]
    end

    subgraph Output["Output"]
        DisplayResults["Display Results"]
        Export["Export (MD/PDF)"]
        Share["Share Link"]
        FollowUp["Follow-up Q&A"]
    end

    Topic --> CreateSession
    Depth --> CreateSession
    Template --> CreateSession
    
    CreateSession --> GeneratePlan
    GeneratePlan --> StorePlan
    StorePlan --> ExecuteSearch
    
    ExecuteSearch --> AnalyzeSources
    AnalyzeSources --> ExtractFindings
    ExtractFindings --> StoreFindings
    StoreFindings --> CompileResults
    
    CompileResults --> GenerateSummary
    GenerateSummary --> CreateRecs
    CreateRecs --> DisplayResults
    
    DisplayResults --> Export
    DisplayResults --> Share
    DisplayResults --> FollowUp
```

---

## 5. Template Management Flow

```mermaid
flowchart TB
    subgraph Sources["Template Sources"]
        BuiltIn["Built-in Templates (18)"]
        Custom["Custom Templates"]
        Imported["Imported Templates"]
    end

    subgraph Actions["User Actions"]
        Browse["Browse/Search"]
        Filter["Filter by Category"]
        Favorite["Toggle Favorite"]
        Create["Create Custom"]
        Export["Export JSON"]
        Import["Import JSON"]
    end

    subgraph Apply["Apply Template"]
        Select["Select Template"]
        PreFill["Pre-fill Research Form"]
        TrackUsage["Track Usage Stats"]
        StartResearch["Start Research"]
    end

    BuiltIn --> Browse
    Custom --> Browse
    Imported --> Browse
    
    Browse --> Filter
    Filter --> Select
    
    Browse --> Favorite
    Browse --> Create
    Browse --> Export
    Import --> Custom
    
    Select --> PreFill
    PreFill --> TrackUsage
    TrackUsage --> StartResearch
```

---

## 6. Circuit Breaker State Machine

```mermaid
stateDiagram-v2
    [*] --> CLOSED: Session Start
    
    CLOSED --> CLOSED: Progress Made
    CLOSED --> OPEN: No Progress >= Threshold
    
    OPEN --> HALF_OPEN: User Clicks Resume
    OPEN --> [*]: User Stops Session
    
    HALF_OPEN --> CLOSED: Next Iteration Succeeds
    HALF_OPEN --> OPEN: Next Iteration Fails
```

---

## 7. Session State Machine

```mermaid
stateDiagram-v2
    [*] --> idle: Create Session
    
    idle --> running: Start Loop
    
    running --> paused: User Pauses
    running --> complete: All Criteria Met
    running --> failed: Error/Max Iterations
    
    paused --> running: User Resumes
    paused --> failed: User Cancels
    
    complete --> [*]
    failed --> [*]
```

---

## 8. Data Flow Diagram

```mermaid
flowchart TB
    subgraph UserInput["User Input"]
        UI_Model["Model Selection"]
        UI_Agent["Agent Profile"]
        UI_Prompt["Power Promptor"]
        UI_Criteria["Completion Criteria"]
    end

    subgraph Processing["Processing Layer"]
        Validate["Validation"]
        Transform["Transform/Expand"]
        Encrypt["Encrypt (if API key)"]
    end

    subgraph Storage["Database Storage"]
        DB_Sessions["sessions table"]
        DB_Criteria["completion_criteria table"]
        DB_Keys["api_keys table"]
        DB_Research["research_sessions table"]
    end

    subgraph Runtime["Runtime Data"]
        CLI_Output["CLI Output Stream"]
        Metrics["Loop Metrics"]
        Progress["Progress Updates"]
    end

    UI_Model --> Validate
    UI_Agent --> Validate
    UI_Prompt --> Transform
    UI_Criteria --> Validate
    
    Validate --> DB_Sessions
    Transform --> DB_Sessions
    Validate --> DB_Criteria
    Encrypt --> DB_Keys
    
    DB_Sessions --> CLI_Output
    CLI_Output --> Metrics
    Metrics --> Progress
    Progress --> DB_Sessions
```

---

## 9. API Request Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant M as Middleware
    participant R as Rate Limiter
    participant T as tRPC Router
    participant D as Database

    C->>M: HTTP Request
    M->>M: Parse Cookie
    M->>M: Verify JWT
    M->>R: Check Rate Limit
    
    alt Rate Limit Exceeded
        R->>C: 429 Too Many Requests
    else Rate Limit OK
        R->>T: Forward Request
        T->>T: Validate Input (Zod)
        T->>D: Execute Query
        D->>T: Return Data
        T->>C: JSON Response
    end
```

---

## 10. Component Hierarchy

```mermaid
flowchart TB
    App["App.tsx"]
    
    App --> ThemeProvider
    ThemeProvider --> QueryClient["QueryClientProvider"]
    QueryClient --> AuthProvider
    AuthProvider --> OnboardingProvider
    
    OnboardingProvider --> Router["Router"]
    
    Router --> Home["Home Page"]
    Router --> Dashboard["Dashboard Page"]
    Router --> Settings["Settings Page"]
    Router --> Research["Research Page"]
    Router --> Analytics["Analytics Page"]
    
    Dashboard --> Sidebar["Sidebar Navigation"]
    Dashboard --> Content["Content Area"]
    
    Sidebar --> NavItems["Navigation Items"]
    Content --> ModelWheel["ModelWheel"]
    Content --> FlightComputer["FlightComputer"]
    Content --> PowerPromptor["PowerPromptor"]
    Content --> AgentProfiles["AgentProfiles"]
    Content --> SessionManager["SessionManager"]
    
    FlightComputer --> CircuitBreaker["CircuitBreaker"]
    FlightComputer --> Terminal["IntegratedTerminal"]
    FlightComputer --> CriteriaEditor["CompletionCriteriaEditor"]
```

---

## 11. Database Entity Relationships

```mermaid
erDiagram
    users ||--o{ sessions : owns
    users ||--o{ api_keys : has
    users ||--o{ research_sessions : creates
    users ||--o{ custom_templates : creates
    users ||--o{ template_favorites : has
    users ||--o{ template_usage : tracks
    users ||--o{ user_template_categories : creates
    users ||--o{ notification_settings : configures
    users ||--o{ prompt_templates : creates
    users ||--o{ session_templates : creates
    
    sessions ||--o{ completion_criteria : has
    sessions ||--o{ cli_executions : runs
    
    research_sessions ||--o{ research_steps : contains
    research_sessions ||--o{ research_findings : produces
    research_sessions ||--o{ follow_up_questions : has
    
    user_template_categories ||--o{ custom_templates : categorizes
    
    users {
        int id PK
        string openId UK
        string name
        string email
        string role
        datetime createdAt
    }
    
    sessions {
        int id PK
        int userId FK
        string selectedModel
        string selectedProfile
        string status
        int currentIteration
        string circuitBreakerState
    }
    
    research_sessions {
        int id PK
        int userId FK
        string topic
        string depth
        string status
        text summary
        string shareToken
    }
```

---

## 12. Notification Flow

```mermaid
flowchart LR
    subgraph Events["Trigger Events"]
        SessionComplete["Session Complete"]
        SessionFailed["Session Failed"]
        CircuitOpen["Circuit Breaker Open"]
        CircuitClosed["Circuit Breaker Closed"]
    end

    subgraph Check["Check Settings"]
        LoadSettings["Load User Settings"]
        CheckEnabled["Check if Enabled"]
    end

    subgraph Delivery["Delivery"]
        BrowserPush["Browser Push"]
        SoundAlert["Sound Alert"]
    end

    SessionComplete --> LoadSettings
    SessionFailed --> LoadSettings
    CircuitOpen --> LoadSettings
    CircuitClosed --> LoadSettings
    
    LoadSettings --> CheckEnabled
    
    CheckEnabled -->|Enabled| BrowserPush
    CheckEnabled -->|Enabled| SoundAlert
    CheckEnabled -->|Disabled| Skip["Skip Notification"]
```

---

## 13. Export Flow

```mermaid
flowchart TB
    subgraph Trigger["Export Trigger"]
        ClickExport["Click Export Button"]
        SelectFormat["Select Format"]
    end

    subgraph Markdown["Markdown Export"]
        MD_Compile["Compile Markdown"]
        MD_Download["Download .md File"]
    end

    subgraph PDF["PDF Export"]
        PDF_Generate["Generate HTML"]
        PDF_Puppeteer["Render with Puppeteer"]
        PDF_Upload["Upload to S3"]
        PDF_Download["Download PDF"]
    end

    ClickExport --> SelectFormat
    
    SelectFormat -->|Markdown| MD_Compile
    MD_Compile --> MD_Download
    
    SelectFormat -->|PDF| PDF_Generate
    PDF_Generate --> PDF_Puppeteer
    PDF_Puppeteer --> PDF_Upload
    PDF_Upload --> PDF_Download
```

---

## Usage Instructions

These Mermaid diagrams can be rendered in:

1. **GitHub/GitLab** - Native Mermaid support in markdown files
2. **VS Code** - With Mermaid preview extensions
3. **Mermaid Live Editor** - https://mermaid.live/
4. **Documentation tools** - Docusaurus, MkDocs, etc.

To generate PNG images from these diagrams, use the `manus-render-diagram` utility:

```bash
manus-render-diagram TOPOLOGY_DIAGRAMS.md output.png
```

---

*Document prepared for workflow analyst optimization review*
