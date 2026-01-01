# API Contracts - Agents by Valentine RF

This document defines the complete API contract between frontend and backend, including all tRPC procedures, their input schemas, output types, and usage examples.

## Overview

The API uses tRPC with Zod validation. All procedures are type-safe end-to-end.

| Router | Procedures | Auth Required | Description |
|--------|------------|---------------|-------------|
| auth | 2 | Mixed | Authentication & session management |
| apiKeys | 5 | Yes | API key storage & validation |
| sessions | 6 | Yes | RALPH Loop session management |
| cli | 4 | Yes | CLI process management |
| criteria | 4 | Yes | Completion criteria tracking |
| metrics | 2 | Yes | Session metrics collection |
| fileChanges | 2 | Yes | File modification tracking |
| prompts | 3 | Yes | Prompt template storage |
| assemblyLine | 3 | Yes | Multi-agent pipeline |
| diffHunks | 3 | Yes | Diff approval workflow |
| sessionTemplates | 7 | Yes | Session template management |
| checkpoints | 3 | Yes | Session checkpoint management |
| research | 12 | Mixed | Deep Research feature |
| templates | 14 | Mixed | Research template management |
| promptMd | 10 | Mixed | PROMPT.md file management |
| autoSign | 9 | Yes | Auto-sign suggestion system |
| fileBrowser | 4 | Yes | Directory browsing |
| rag | 14 | Yes | RAG Knowledge Base |
| agentProfiles | 10 | Mixed | Agent profile management |

**Total: 19 routers, 117 procedures**

---

## 1. Auth Router

### auth.me
Returns the current authenticated user or null.

```typescript
// Input: none
// Output
type Output = {
  id: number;
  openId: string;
  name: string;
  avatar: string | null;
  role: "admin" | "user";
  createdAt: Date;
} | null;

// Frontend Usage
const { data: user } = trpc.auth.me.useQuery();
```

### auth.logout
Clears the session cookie and logs out the user.

```typescript
// Input: none
// Output: { success: true }

// Frontend Usage
const logout = trpc.auth.logout.useMutation();
await logout.mutateAsync();
```

---

## 2. API Keys Router

### apiKeys.save
Saves an encrypted API key for a provider.

```typescript
// Input
type Input = {
  provider: "codex" | "claude" | "gemini" | "manus";
  apiKey: string;
};

// Output
type Output = {
  id: number;
  provider: string;
  createdAt: Date;
};

// Frontend Usage
const saveKey = trpc.apiKeys.save.useMutation();
await saveKey.mutateAsync({ provider: "claude", apiKey: "sk-..." });
```

### apiKeys.list
Lists all saved API keys (masked).

```typescript
// Input: none
// Output
type Output = Array<{
  id: number;
  provider: string;
  maskedKey: string;
  createdAt: Date;
}>;

// Frontend Usage
const { data: keys } = trpc.apiKeys.list.useQuery();
```

### apiKeys.delete
Deletes an API key by ID.

```typescript
// Input
type Input = { id: number };

// Output: { success: true }

// Frontend Usage
const deleteKey = trpc.apiKeys.delete.useMutation();
await deleteKey.mutateAsync({ id: 1 });
```

### apiKeys.validate
Validates an API key by making a test request.

```typescript
// Input
type Input = {
  provider: "codex" | "claude" | "gemini" | "manus";
  apiKey: string;
};

// Output
type Output = {
  valid: boolean;
  error?: string;
};

// Frontend Usage
const validate = trpc.apiKeys.validate.useMutation();
const result = await validate.mutateAsync({ provider: "claude", apiKey: "sk-..." });
```

### apiKeys.getForProvider
Gets the decrypted API key for a specific provider.

```typescript
// Input
type Input = { provider: "codex" | "claude" | "gemini" | "manus" };

// Output
type Output = {
  apiKey: string | null;
};

// Frontend Usage
const { data } = trpc.apiKeys.getForProvider.useQuery({ provider: "claude" });
```

---

## 3. Sessions Router

### sessions.create
Creates a new RALPH Loop session.

```typescript
// Input
type Input = {
  name: string;
  selectedModel: "codex" | "claude" | "gemini" | "manus";
  selectedProfile: string;
  workingDirectory: string;
  maxIterations: number;
  noProgressThreshold: number;
  promptGoal: string;
  promptContext?: string;
  promptDoneWhen?: string;
  promptDoNot?: string;
};

// Output
type Output = {
  id: number;
  name: string;
  status: "idle" | "running" | "paused" | "complete" | "failed";
  createdAt: Date;
};

// Frontend Usage
const createSession = trpc.sessions.create.useMutation();
const session = await createSession.mutateAsync({
  name: "Fix login bug",
  selectedModel: "claude",
  selectedProfile: "patch-goblin",
  workingDirectory: "/home/ubuntu/myproject",
  maxIterations: 50,
  noProgressThreshold: 5,
  promptGoal: "Fix the login authentication bug"
});
```

### sessions.list
Lists all sessions for the current user.

```typescript
// Input: none
// Output
type Output = Array<{
  id: number;
  name: string;
  status: string;
  selectedModel: string;
  currentIteration: number;
  maxIterations: number;
  completionProgress: number;
  createdAt: Date;
  updatedAt: Date;
}>;

// Frontend Usage
const { data: sessions } = trpc.sessions.list.useQuery();
```

### sessions.get
Gets a single session by ID.

```typescript
// Input
type Input = { id: number };

// Output
type Output = {
  id: number;
  name: string;
  status: string;
  selectedModel: string;
  selectedProfile: string;
  workingDirectory: string;
  currentIteration: number;
  maxIterations: number;
  noProgressThreshold: number;
  noProgressCount: number;
  circuitBreakerState: string;
  completionProgress: number;
  promptGoal: string;
  promptContext: string | null;
  promptDoneWhen: string | null;
  promptDoNot: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// Frontend Usage
const { data: session } = trpc.sessions.get.useQuery({ id: 1 });
```

### sessions.update
Updates a session's fields.

```typescript
// Input
type Input = {
  id: number;
  status?: string;
  currentIteration?: number;
  noProgressCount?: number;
  circuitBreakerState?: string;
  completionProgress?: number;
};

// Output: { success: true }

// Frontend Usage
const updateSession = trpc.sessions.update.useMutation();
await updateSession.mutateAsync({ id: 1, status: "running", currentIteration: 5 });
```

### sessions.delete
Deletes a session by ID.

```typescript
// Input
type Input = { id: number };

// Output: { success: true }

// Frontend Usage
const deleteSession = trpc.sessions.delete.useMutation();
await deleteSession.mutateAsync({ id: 1 });
```

### sessions.startLoop
Starts the RALPH Loop for a session.

```typescript
// Input
type Input = { id: number };

// Output: { success: true, pid?: number }

// Frontend Usage
const startLoop = trpc.sessions.startLoop.useMutation();
await startLoop.mutateAsync({ id: 1 });
```

---

## 4. CLI Router

### cli.create
Creates a CLI process record.

```typescript
// Input
type Input = {
  sessionId: number;
  command: string;
  workingDirectory: string;
};

// Output
type Output = {
  id: number;
  sessionId: number;
  status: string;
  createdAt: Date;
};
```

### cli.update
Updates a CLI process status.

```typescript
// Input
type Input = {
  id: number;
  status?: string;
  exitCode?: number;
  output?: string;
};

// Output: { success: true }
```

### cli.list
Lists CLI processes for a session.

```typescript
// Input
type Input = { sessionId: number };

// Output
type Output = Array<{
  id: number;
  command: string;
  status: string;
  exitCode: number | null;
  createdAt: Date;
}>;
```

### cli.running
Gets the currently running CLI process for the user.

```typescript
// Input: none
// Output
type Output = {
  id: number;
  sessionId: number;
  command: string;
  status: string;
} | null;
```

---

## 5. Criteria Router

### criteria.add
Adds a completion criterion to a session.

```typescript
// Input
type Input = {
  sessionId: number;
  text: string;
};

// Output
type Output = {
  id: number;
  sessionId: number;
  text: string;
  completed: boolean;
  createdAt: Date;
};
```

### criteria.list
Lists all criteria for a session.

```typescript
// Input
type Input = { sessionId: number };

// Output
type Output = Array<{
  id: number;
  text: string;
  completed: boolean;
  createdAt: Date;
}>;
```

### criteria.toggle
Toggles a criterion's completed status.

```typescript
// Input
type Input = { id: number };

// Output: { success: true, completed: boolean }
```

### criteria.delete
Deletes a criterion.

```typescript
// Input
type Input = { id: number };

// Output: { success: true }
```

---

## 6. Research Router

### research.create
Creates a new research session.

```typescript
// Input
type Input = {
  topic: string;
  depth?: "quick" | "standard" | "deep";
};

// Output
type Output = {
  id: number;
  topic: string;
  status: string;
  createdAt: Date;
};
```

### research.execute
Executes the research process (LLM-powered).

```typescript
// Input
type Input = { id: number };

// Output
type Output = {
  success: true;
  findingsCount: number;
};
```

### research.get
Gets a research session with findings.

```typescript
// Input
type Input = { id: number };

// Output
type Output = {
  id: number;
  topic: string;
  status: string;
  summary: string | null;
  findings: Array<{
    id: number;
    title: string;
    content: string;
    source: string | null;
    confidence: number;
  }>;
  createdAt: Date;
};
```

### research.exportMarkdown
Exports research as Markdown.

```typescript
// Input
type Input = { id: number };

// Output
type Output = {
  markdown: string;
  filename: string;
};
```

### research.exportPDF
Exports research as PDF.

```typescript
// Input
type Input = { id: number };

// Output
type Output = {
  pdfBase64: string;
  filename: string;
};
```

---

## 7. RAG Router

### rag.ingestDocument
Ingests a document into the knowledge base.

```typescript
// Input
type Input = {
  title: string;
  content: string;
  source?: string;
  metadata?: Record<string, unknown>;
};

// Output
type Output = {
  id: number;
  title: string;
  chunkCount: number;
  status: string;
};
```

### rag.search
Performs semantic search.

```typescript
// Input
type Input = {
  query: string;
  limit?: number;
};

// Output
type Output = Array<{
  documentId: number;
  documentTitle: string;
  chunkContent: string;
  similarity: number;
}>;
```

### rag.chat
Sends a message to the RAG chatbot.

```typescript
// Input
type Input = {
  conversationId: number;
  message: string;
};

// Output
type Output = {
  response: string;
  sources: Array<{
    documentTitle: string;
    chunkContent: string;
  }>;
};
```

### rag.uploadFile
Uploads and ingests a file (PDF, MD, code).

```typescript
// Input
type Input = {
  filename: string;
  content: string; // base64 for binary, raw for text
  mimeType: string;
};

// Output
type Output = {
  id: number;
  title: string;
  chunkCount: number;
};
```

---

## 8. Agent Profiles Router

### agentProfiles.list
Lists built-in and custom agent profiles.

```typescript
// Input: none
// Output
type Output = {
  builtIn: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    systemPrompt: string;
  }>;
  custom: Array<{
    id: number;
    name: string;
    description: string;
    icon: string;
    color: string;
    systemPrompt: string;
    usageCount: number;
  }>;
};
```

### agentProfiles.create
Creates a custom agent profile.

```typescript
// Input
type Input = {
  name: string;
  description: string;
  icon: string;
  color: string;
  systemPrompt: string;
  outputStyle?: "concise" | "detailed" | "balanced";
  codeGeneration?: "full" | "diffs" | "none";
  testingApproach?: "tdd" | "test-after" | "no-tests";
};

// Output
type Output = {
  id: number;
  name: string;
  slug: string;
  createdAt: Date;
};
```

### agentProfiles.listTemplates
Lists pre-made profile templates.

```typescript
// Input
type Input = {
  category?: string;
  search?: string;
};

// Output
type Output = Array<{
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  tags: string[];
}>;
```

### agentProfiles.importTemplate
Imports a template as a custom profile.

```typescript
// Input
type Input = { templateId: string };

// Output
type Output = {
  id: number;
  name: string;
  slug: string;
};
```

---

## 9. PROMPT.md Router

### promptMd.get
Gets the PROMPT.md content for a project.

```typescript
// Input
type Input = { projectPath: string };

// Output
type Output = {
  content: string;
  version: number;
  updatedAt: Date;
} | null;
```

### promptMd.save
Saves PROMPT.md content.

```typescript
// Input
type Input = {
  projectPath: string;
  content: string;
};

// Output
type Output = {
  version: number;
  updatedAt: Date;
};
```

### promptMd.addSign
Adds a "sign" (guidance rule) to PROMPT.md.

```typescript
// Input
type Input = {
  projectPath: string;
  sign: string;
  category?: string;
};

// Output: { success: true }
```

### promptMd.getSuggestedSigns
Gets AI-suggested signs based on failure patterns.

```typescript
// Input
type Input = {
  errorType: string;
  errorMessage: string;
};

// Output
type Output = Array<{
  sign: string;
  confidence: number;
  reason: string;
}>;
```

---

## 10. Auto-Sign Router

### autoSign.recordFailure
Records a failure for pattern detection.

```typescript
// Input
type Input = {
  sessionId: number;
  projectPath: string;
  errorType: string;
  errorMessage: string;
  iteration: number;
};

// Output: { recorded: true }
```

### autoSign.getSuggestions
Gets auto-generated sign suggestions.

```typescript
// Input
type Input = {
  sessionId: number;
  projectPath: string;
};

// Output
type Output = Array<{
  id: string;
  sign: string;
  confidence: number;
  reason: string;
  errorPattern: string;
  occurrences: number;
}>;
```

### autoSign.dismissSuggestion
Dismisses a suggestion.

```typescript
// Input
type Input = { suggestionId: string };

// Output: { success: true }
```

---

## 11. File Browser Router

### fileBrowser.listDirectory
Lists contents of a directory.

```typescript
// Input
type Input = { path: string };

// Output
type Output = {
  path: string;
  entries: Array<{
    name: string;
    type: "file" | "directory";
    size: number;
    modifiedAt: Date;
  }>;
};
```

### fileBrowser.isProjectDirectory
Checks if a directory is a project root.

```typescript
// Input
type Input = { path: string };

// Output
type Output = {
  isProject: boolean;
  projectType: string | null; // "nodejs", "python", "rust", etc.
  indicators: string[]; // ["package.json", "tsconfig.json"]
};
```

---

## WebSocket Endpoints

### /api/ws/cli
Real-time CLI output streaming.

```typescript
// Client → Server
type ClientMessage = {
  type: "start" | "stop" | "input";
  sessionId?: number;
  input?: string;
};

// Server → Client
type ServerMessage = {
  type: "output" | "error" | "status" | "exit";
  data: string;
  exitCode?: number;
};
```

### /api/ws/pty
Real terminal (PTY) connection.

```typescript
// Client → Server: raw terminal input (string)
// Server → Client: raw terminal output (string)
```

### /api/ws/ralph
RALPH Loop execution streaming.

```typescript
// Client → Server
type ClientMessage = {
  type: "start" | "pause" | "resume" | "stop" | "reset";
  sessionId: number;
  config?: {
    workingDirectory: string;
    maxIterations: number;
    model: string;
  };
};

// Server → Client
type ServerMessage = {
  type: "log" | "state" | "iteration" | "complete" | "error";
  data: string;
  state?: {
    status: string;
    iteration: number;
    progress: number;
    circuitBreaker: string;
  };
};
```

### /api/rag/stream
RAG chat streaming (Server-Sent Events).

```typescript
// Request (POST)
type Request = {
  conversationId: number;
  message: string;
};

// SSE Events
type Event = 
  | { type: "sources"; data: Array<{ title: string; content: string }> }
  | { type: "chunk"; data: string }
  | { type: "done"; data: { messageId: number } }
  | { type: "error"; data: string };
```

---

## Error Handling

All procedures may throw TRPCError with these codes:

| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | User not authenticated |
| FORBIDDEN | 403 | User lacks permission |
| NOT_FOUND | 404 | Resource not found |
| BAD_REQUEST | 400 | Invalid input |
| INTERNAL_SERVER_ERROR | 500 | Server error |

```typescript
// Frontend error handling
const mutation = trpc.sessions.create.useMutation({
  onError: (error) => {
    if (error.data?.code === "UNAUTHORIZED") {
      // Redirect to login
    } else if (error.data?.code === "BAD_REQUEST") {
      // Show validation error
    }
  }
});
```

---

## Rate Limiting

All protected procedures are rate-limited:

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Read (query) | 100 | 1 minute |
| Write (mutation) | 30 | 1 minute |
| LLM calls | 10 | 1 minute |
| File uploads | 5 | 1 minute |

---

## Type Exports

All types are exported from the shared module:

```typescript
// Frontend import
import type { AppRouter } from "@/lib/trpc";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

type RouterInput = inferRouterInputs<AppRouter>;
type RouterOutput = inferRouterOutputs<AppRouter>;

// Usage
type CreateSessionInput = RouterInput["sessions"]["create"];
type SessionOutput = RouterOutput["sessions"]["get"];
```
