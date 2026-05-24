# Research Agent — Initial Build Prompt for Cursor

## What you are building

A full-stack AI research agent with three capability modules (Ideas, Coding, Paper Writing), a persistent memory layer, and a clean web UI. The backend is a FastAPI server deployed on Render. The frontend is a Next.js 14 app deployed on Vercel.

Read `SKILL.md` in this repo before writing any code. It is the single source of truth for conventions, patterns, and decisions. Follow it exactly and never deviate without flagging it.

---

## Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11 · FastAPI · LangGraph · Pydantic v2 |
| Memory | SQLite (structured log) · ChromaDB (semantic recall) |
| LLM | OpenAI |
| Auth | JWT (python-jose) · bcrypt password hashing |
| Frontend | Next.js 14 App Router · TypeScript · Tailwind CSS · shadcn/ui |
| Backend hosting | Render (Docker) |
| Frontend hosting | Vercel |
| Env management | `.env` · `python-dotenv` · Vercel env vars |

---

## Project structure to scaffold

```
research-agent/
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI app, lifespan, CORS, rate limit
│   │   ├── config.py             # Settings via pydantic-settings
│   │   ├── auth/
│   │   │   ├── router.py         # POST /auth/register, POST /auth/login
│   │   │   ├── models.py         # User SQLite model
│   │   │   ├── schemas.py        # Pydantic request/response schemas
│   │   │   └── utils.py          # JWT encode/decode, password hash/verify
│   │   ├── agent/
│   │   │   ├── graph.py          # LangGraph StateGraph definition
│   │   │   ├── state.py          # AgentState TypedDict
│   │   │   ├── nodes.py          # All node functions
│   │   │   └── tools.py          # Tool definitions (search, code exec, etc.)
│   │   ├── memory/
│   │   │   ├── session_store.py  # SQLite sessions + events
│   │   │   ├── vector_memory.py  # ChromaDB wrapper
│   │   │   └── agent_memory.py   # Unified AgentMemory facade
│   │   ├── routers/
│   │   │   ├── chat.py           # POST /chat/stream (SSE), POST /chat/invoke
│   │   │   ├── sessions.py       # GET/POST /sessions
│   │   │   └── memory.py         # GET /memory/recall, GET /memory/history
│   │   └── middleware/
│   │       ├── rate_limit.py     # SlowAPI rate limiter
│   │       └── logging.py        # Request/response logging
│   ├── data/                     # gitignored — SQLite + Chroma live here
│   ├── tests/
│   │   ├── test_auth.py
│   │   ├── test_chat.py
│   │   └── test_memory.py
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env.example
│   └── render.yaml
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Landing / redirect to /chat
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   └── chat/
│   │       ├── page.tsx          # Main chat interface
│   │       └── [session_id]/
│   │           └── page.tsx      # Resume a past session
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatWindow.tsx    # SSE stream consumer
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── ToolCallCard.tsx  # Shows tool invocation + result
│   │   │   └── InputBar.tsx
│   │   ├── memory/
│   │   │   └── MemoryPanel.tsx   # Sidebar: session history + recall
│   │   └── ui/                   # shadcn/ui components
│   ├── lib/
│   │   ├── api.ts                # Typed fetch wrappers for backend
│   │   └── auth.ts               # JWT storage + refresh logic
│   ├── .env.local.example
│   ├── next.config.ts
│   └── vercel.json
│
├── SKILL.md                      # ← always read first
└── CURSOR_PROMPT.md              # ← this file
```

---

## Backend: what to build step by step

### 1. `app/config.py`
Use `pydantic-settings` `BaseSettings`. Load from `.env`:
- `SECRET_KEY` (JWT signing key, min 32 chars)
- `ALGORITHM = "HS256"`
- `ACCESS_TOKEN_EXPIRE_MINUTES = 60`
- `OPENAI_API_KEY`
- `DATABASE_URL = "sqlite:///data/research_agent.db"`
- `CHROMA_PERSIST_DIR = "data/chroma"`
- `ENVIRONMENT = "development"` (switches CORS strictness)
- `ALLOWED_ORIGINS` (comma-separated list)

### 2. `app/auth/`
Implement JWT auth with these exact behaviours:
- `POST /auth/register` → hash password with bcrypt, store user in SQLite, return `{access_token, token_type}`
- `POST /auth/login` → verify password, return same shape
- `GET /auth/me` → protected, return current user (no password hash)
- JWT payload: `{sub: user_id, exp: ...}`
- Dependency: `get_current_user(token: str = Depends(oauth2_scheme))` — inject into protected routes
- Never store or log raw passwords or JWT tokens

### 3. `app/memory/` — paste the three files from the architecture plan:
- `SessionStore` (SQLite) with `create_session`, `log_event`, `get_events`, `list_sessions`
- `VectorMemory` (ChromaDB) with `save`, `recall`
- `AgentMemory` facade with `save_paper`, `save_hypothesis`, `save_code`, `save_decision`, `recall`, `get_session_history`

### 4. `app/agent/state.py`
```python
from typing import TypedDict, Annotated
from langgraph.graph.message import add_messages

class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    session_id: str
    user_id: str
    active_topic: str
    module: str           # "ideas" | "coding" | "paper"
    tool_results: list[dict]
```

### 5. `app/agent/graph.py`
Wire a LangGraph `StateGraph` with these nodes:
- `router_node` — reads the user message, sets `state["module"]`
- `ideas_node` — handles literature search, hypothesis generation
- `coding_node` — handles code generation, debugging, explanation
- `paper_node` — handles drafting, citation, polish
- `memory_save_node` — always runs last, calls `AgentMemory` to persist
Each node must call `AgentMemory` to load relevant context at the start.

### 6. `app/routers/chat.py`
- `POST /chat/invoke` — runs the graph synchronously, returns full response
- `POST /chat/stream` — streams graph output via SSE (`text/event-stream`)
  - Each event: `data: {"type": "token"|"tool_call"|"tool_result"|"done", "content": ...}`
- Both routes require `Depends(get_current_user)`

### 7. `app/routers/sessions.py`
- `GET /sessions` — list user's sessions (auth required)
- `POST /sessions` — create a new session `{topic}`
- `GET /sessions/{session_id}` — get session details + event log

### 8. `app/main.py`
- CORS: in production allow only `ALLOWED_ORIGINS`; in dev allow `*`
- Rate limiting: 60 requests/minute per IP via SlowAPI
- Global exception handler: returns `{error: ..., request_id: uuid}` — never expose stack traces in production
- Lifespan: init SQLite tables and ChromaDB on startup

### 9. `Dockerfile`
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN mkdir -p data
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 10. `render.yaml`
```yaml
services:
  - type: web
    name: research-agent-api
    env: docker
    plan: free
    envVars:
      - key: SECRET_KEY
        generateValue: true
      - key: OPENAI_API_KEY
        sync: false
      - key: ENVIRONMENT
        value: production
      - key: ALLOWED_ORIGINS
        sync: false
    disk:
      name: agent-data
      mountPath: /app/data
      sizeGB: 1
```

---

## Frontend: what to build

### Auth flow
- `/login` and `/register` pages with form validation
- On success store JWT in `httpOnly` cookie via a Next.js API route (never `localStorage`)
- `lib/auth.ts`: `getToken()`, `logout()`, `isAuthenticated()`
- Middleware `middleware.ts`: redirect unauthenticated users from `/chat` to `/login`

### Chat interface (`/chat`)
- Left sidebar: session list (calls `GET /sessions`), "New session" button
- Main area: `ChatWindow` consuming SSE from `POST /chat/stream`
  - Token events → stream text into the latest assistant bubble
  - `tool_call` events → render a `ToolCallCard` (collapsible, shows tool name + input)
  - `tool_result` events → update the same card with output
- `InputBar`: textarea (Shift+Enter = newline, Enter = send), module selector pill (Ideas / Coding / Paper)
- `MemoryPanel` (right sidebar, collapsible): shows `GET /memory/recall?q=...` results as the user types

### `lib/api.ts`
Typed wrappers for every backend route. All calls attach the JWT from the cookie. On 401, redirect to `/login`.

### `vercel.json`
```json
{
  "env": {
    "NEXT_PUBLIC_API_URL": "https://research-agent-rs4f.onrender.com"
  }
}
```

---

## Security checklist — implement every item

- [ ] JWT tokens expire (60 min); implement token refresh endpoint
- [ ] Passwords hashed with bcrypt (cost factor 12)
- [ ] Rate limiting on all routes (60 req/min, stricter on `/auth/*`)
- [ ] CORS restricted to `ALLOWED_ORIGINS` in production
- [ ] No stack traces in API error responses (`ENVIRONMENT=production`)
- [ ] All env secrets via `.env` / Render env vars — never hardcoded
- [ ] SQLite queries use parameterized statements (no string formatting)
- [ ] File uploads (if added) validated for type and size
- [ ] `httpOnly` cookies for JWT on frontend — never `localStorage`
- [ ] Input validation via Pydantic schemas on every endpoint

---

## `.env.example` (backend)
```
SECRET_KEY=change_me_to_a_random_32_char_string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
OPENAI_API_KEY=your_key_here
DATABASE_URL=sqlite:///data/research_agent.db
CHROMA_PERSIST_DIR=data/chroma
ENVIRONMENT=development
ALLOWED_ORIGINS=http://localhost:3000
```

## `.env.local.example` (frontend)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## What NOT to do
- Do not put business logic in route handlers — keep routers thin, logic in `agent/` and `memory/`
- Do not use `Any` in Pydantic schemas — be explicit
- Do not commit `.env`, `data/`, or `__pycache__` — add to `.gitignore`
- Do not use synchronous `requests` in async FastAPI routes — use `httpx.AsyncClient`
- Do not hardcode model names — put them in `config.py`
- Do not create new patterns that contradict `SKILL.md`

---

## Start here

Build in this order:
1. Scaffold the full directory structure with empty files
2. `config.py` + `.env.example`
3. `auth/` (register + login + me)
4. `memory/` (all three files)
5. `agent/state.py` + `agent/graph.py` (stub nodes, wire the graph)
6. `routers/chat.py` (invoke first, then stream)
7. `routers/sessions.py` + `routers/memory.py`
8. `main.py` (CORS, rate limit, lifespan)
9. `Dockerfile` + `render.yaml`
10. Frontend auth pages → chat page → SSE stream → memory panel

After each step, run existing tests before moving on.
