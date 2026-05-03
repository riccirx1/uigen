# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**UIGen** — AI-powered React component generator with live preview. Users describe UI components in natural language; Claude generates JSX/TSX code that renders in a live preview panel.

## Commands

```bash
npm run setup        # First-time setup: install deps + prisma generate + migrate
npm run dev          # Start dev server (Next.js + Turbopack)
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest (all tests)
npm run db:reset     # Force-reset SQLite database
```

To run a single test file: `npx vitest run src/path/to/file.test.ts`

## Environment

Requires `ANTHROPIC_API_KEY` in `.env`. Without it, the app uses a `MockLanguageModel` that returns static component templates instead of calling Claude.

## Architecture

### Request Flow

1. User types a prompt → `src/components/chat/ChatInterface.tsx` → POST `/api/chat`
2. `src/app/api/chat/route.ts` calls Claude via Vercel AI SDK `streamText` with two tools:
   - `str_replace_editor` (`src/lib/tools/str-replace.ts`) — view/replace/insert in virtual files
   - `file_manager` (`src/lib/tools/file-manager.ts`) — create/delete files
3. Streamed tool calls mutate the **Virtual File System** (`src/lib/file-system.ts`) in memory
4. Preview compiles JSX at runtime via Babel standalone (`src/lib/transform/jsx-transformer.ts`)
5. For authenticated users, chat history + file system are persisted to Prisma/SQLite after each exchange

### Virtual File System

All generated code lives in memory — `VirtualFileSystem` (`src/lib/file-system.ts`) is the single source of truth for the editor, file tree, and preview. It serializes to/from JSON for database persistence. Paths are normalized to forward-slash format.

### AI Provider

`src/lib/provider.ts` wraps Claude Haiku 4.5 behind the Vercel AI SDK `LanguageModelV1` interface. The chat endpoint uses Anthropic prompt caching (`cacheControl: { type: "ephemeral" }`) on the system prompt to reduce costs on repeated requests.

### Auth

JWT-based, stored in httpOnly cookies (7-day expiry). `src/lib/auth.ts` handles token creation/verification; `src/actions/index.ts` exposes server actions for sign-up/sign-in/sign-out. Anonymous users can use the app without auth; projects are persisted only for authenticated users.

### Data Model (Prisma/SQLite)

- `User`: email, hashed password (bcrypt)
- `Project`: name, optional userId, `messages` (JSON array of chat history), `data` (JSON-serialized virtual FS)

### Key Directories

- `src/app/` — Next.js App Router pages and API routes
- `src/actions/` — Server actions (auth, project CRUD)
- `src/components/` — UI split into `auth/`, `chat/`, `editor/`, `preview/`, `ui/` (shadcn)
- `src/lib/` — Core logic: file system, AI provider, tools, JSX transform, contexts
- `prisma/` — Schema, migrations, `dev.db`

## Stack Notes

- **Next.js App Router** with `"use client"` / `"use server"` boundaries — keep server actions in `src/actions/`, client state in components/contexts
- **Tailwind CSS v4** — utility classes; shadcn/ui components use New York style (`components.json`)
- **TypeScript strict mode** — all imports use `@/` path alias
- **Testing**: Vitest + React Testing Library + jsdom; config in `vitest.config.mts`
