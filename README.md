# Agents by Valentine RF

Your AI-powered software development partner implementing the RALPH Loop+ framework for autonomous coding.

![Purple Cyberpunk Theme](https://img.shields.io/badge/Theme-Purple%20Cyberpunk-8B5CF6)
![Tests](https://img.shields.io/badge/Tests-516%20Passing-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Mutation Score](https://img.shields.io/badge/Mutation%20Score-90.77%25-brightgreen)
[![codecov](https://codecov.io/gh/cvalentine99/Agents/graph/badge.svg)](https://codecov.io/gh/cvalentine99/Agents)
![CI](https://github.com/cvalentine99/Agents/actions/workflows/ci.yml/badge.svg)

## Overview

Agents by Valentine RF is a full-stack web application that implements Anthropic's RALPH Loop+ framework for autonomous AI-powered coding. The system features a real terminal execution environment, LLM integration, RAG knowledge base, agent profiles, and deep research capabilities.

## Key Features

### 🔄 RALPH Loop+ Engine
- Real PTY terminal execution via WebSocket
- Actual LLM API integration (Claude, GPT, Gemini)
- PROMPT.md editor system matching Geoffrey Huntley's original Ralph Loop technique
- Auto-sign suggestions that detect repeated failure patterns

### 🧠 RAG Knowledge Base
- Floating chat widget (lower right corner)
- File upload support (PDF, Markdown, code files)
- Streaming responses with source citations
- Conversation search across all messages

### 🤖 Agent Profiles
- 16 pre-made templates across 7 categories
- Custom agent creation with configurable system prompts
- Template gallery with search/filter capabilities

### 🔬 Deep Research
- LLM-powered query generation
- Content extraction and synthesis
- Export to Markdown and PDF
- Research templates and follow-up questions

### 📊 Additional Features
- Working directory picker with file browser
- Session history and analytics
- Multi-session split-pane view
- Circuit breaker visualization
- Browser notifications

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Node.js, tRPC, Prisma ORM
- **Database**: PostgreSQL (18 tables)
- **Real-time**: WebSocket for terminal streaming and RAG chat
- **Terminal**: node-pty for real shell execution

## Architecture

- 19 tRPC routers with 117 procedures
- PTY-based terminal execution with WebSocket streaming
- RAG system with document chunking (500 char chunks, 50 char overlap)
- Circuit breaker pattern for failure handling

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm
- PostgreSQL database

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL and API keys

# Push database schema
pnpm db:push

# Start development server
pnpm dev
```

### Environment Variables

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Session signing secret
- API keys for LLM providers (stored encrypted in database)

## Documentation

- [API Contracts](docs/API_CONTRACTS.md) - Complete API documentation
- [Gap Audit](docs/GAP_AUDIT.md) - Feature status and severity ratings
- [Workflow Documentation](docs/WORKFLOW_DOCUMENTATION.md) - Process flows
- [System Layout](docs/SYSTEM_LAYOUT.md) - Architecture overview
- [Topology Diagrams](docs/TOPOLOGY_DIAGRAMS.md) - Mermaid diagrams

## Testing

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage
```

273 tests passing across 19 test files.

## License

MIT

## Author

Valentine RF
