---
name: research-agent
description: >
  Use this skill before writing any code for the research agent project.
  It defines the stack, conventions, patterns, and decisions for the FastAPI backend,
  Next.js frontend, LangGraph agent, and memory layer. Read this entirely before
  starting any task, no matter how small. Never deviate from these patterns without
  explicitly flagging the deviation in a code comment.
---

# Research Agent — Skill File

This is the single source of truth for how this project is built.
Read it entirely before every task. Every pattern here was a deliberate decision.

---

## 1. Project overview

A full-stack AI research assistant with three agent modules (Ideas, Coding, Paper Writing),
persistent memory (SQLite + ChromaDB), JWT auth, and a streaming chat interface.

**Backend**: FastAPI on Render (Docker)
**Frontend**: Next.js 14 App Router on Vercel
**Agent**: LangGraph StateGraph
**LLM**: Google Gemini via langchain-google-genai
**Memory**: SQLite (structured log) + ChromaDB (semantic recall)

---

## 2. Backend conventions (FastAPI)

### File layout rule
Routers are thin. They validate input, call a service or agent function, and return output.
No business logic lives in `routers/`. Business logic lives in `agent/`, `memory/`, or `services/`.

```
# CORRECT
@router.post("/chat/invoke")
async def invoke(body: ChatRequest, user=Depends(get_current_user)):
    result = await run_agent(body.message, body.session_id, user.id)
    return ChatResponse(content=result)

# WRONG — logic in the router
@router.post("/chat/invoke")
async def invoke(body: ChatRequest, user=Depends(get_current_user)):
    state = AgentState(messages=[...], session_id=...)
    graph = build_graph()
    result = await graph.ainvoke(state)
    memory.save(...)
    return result
```

### Pydantic schemas
- Always use Pydantic v2 (`model_config = ConfigDict(...)`)
- Every request and response has an explicit schema in `schemas.py`
- Never use `dict` or `Any` as a field type — be explicit
- Request schemas live in `schemas.py` next to their router

```python
# CORRECT
class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    session_id: str
    module: Literal["ideas", "coding", "paper"] = "ideas"

# WRONG
class ChatRequest(BaseModel):
    data: dict   # ← never do this
```

### Async all the way
- All route handlers are `async def`
- Use `httpx.AsyncClient` for outbound HTTP — never `requests`
- Use `aiosqlite` if adding async SQLite access later
- ChromaDB calls are sync — wrap in `asyncio.to_thread()` if called from async context

### Error handling
- Never expose stack traces in production responses
- All unhandled exceptions go through the global handler in `main.py`
- Return shape: `{"error": "human-readable message", "request_id": "uuid"}`
- Use custom exception classes (`AgentError`, `MemoryError`) not generic `Exception`

```python
# main.py global handler pattern
@app.exception_handler(Exception)
async def global_handler(request: Request, exc: Exception):
    request_id = str(uuid.uuid4())
    if settings.ENVIRONMENT == "production":
        return JSONResponse(status_code=500, content={"error": "Internal error", "request_id": request_id})
    return JSONResponse(status_code=500, content={"error": str(exc), "request_id": request_id})
```

### Config
All settings via `pydantic-settings` `BaseSettings` in `config.py`.
Never hardcode API keys, model names, ports, or timeouts anywhere else.

```python
class Settings(BaseSettings):
    secret_key: str
    gemini_api_key: str
    gemini_model: str = "gemini-1.5-flash"
    gemini_embedding_model: str = "models/text-embedding-004"
    database_url: str = "sqlite:///data/research_agent.db"
    chroma_persist_dir: str = "data/chroma"
    environment: str = "development"
    allowed_origins: list[str] = ["http://localhost:3000"]
    access_token_expire_minutes: int = 60
    rate_limit_per_minute: int = 60

    model_config = ConfigDict(env_file=".env")

settings = Settings()
```

---

## 3. Auth pattern

JWT stored in `httpOnly` cookies on the frontend. Never in `localStorage`.

### Backend auth flow
1. `POST /auth/register` → hash password (bcrypt, cost 12) → store user → return token
2. `POST /auth/login` → verify password → return token
3. Every protected route uses `Depends(get_current_user)`

```python
# auth/utils.py — canonical patterns

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

def create_access_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode({"sub": user_id, "exp": expire}, settings.secret_key, algorithm="HS256")

def decode_token(token: str) -> str:
    payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
    return payload["sub"]  # user_id
```

### Frontend auth flow
- On login: call Next.js API route `/api/auth/login` → that route sets `httpOnly` cookie → never expose JWT to JS
- `lib/auth.ts` exposes `isAuthenticated()` (checks cookie presence) and `logout()` (clears cookie via API route)
- `middleware.ts` protects `/chat/*` routes

---

## 4. Memory layer

Three files, always used through the unified facade.

### `SessionStore` (SQLite)
- Structured event log: `sessions` table + `events` table
- Event types: `"paper_read"`, `"hypothesis"`, `"code_saved"`, `"decision"`, `"chat_turn"`
- Always use parameterized queries — never f-strings in SQL

```python
# CORRECT
self.conn.execute("SELECT * FROM events WHERE session_id = ?", (session_id,))

# WRONG — SQL injection risk
self.conn.execute(f"SELECT * FROM events WHERE session_id = '{session_id}'")
```

### `VectorMemory` (ChromaDB)
- Collection name: `"research_memory"`
- Embedding model: `settings.gemini_embedding_model`
- Always include `session_id` in metadata for scoped recall
- `upsert` not `add` — idempotent saves

### `AgentMemory` (facade)
- All agent nodes use only `AgentMemory` — never call `SessionStore` or `VectorMemory` directly
- Pattern: save structured event to SQLite AND embed text to ChromaDB together

```python
# Every save method follows this pattern
def save_X(self, session_id: str, ...):
    event = MemoryEvent(session_id=session_id, event_type="X", content={...})
    self.store.log_event(event)
    self.vectors.save(session_id, event.event_id, text_to_embed, metadata={...})
```

---

## 5. LangGraph agent

### State
```python
class AgentState(TypedDict):
    messages: Annotated[list, add_messages]  # conversation history
    session_id: str
    user_id: str
    active_topic: str
    module: str           # "ideas" | "coding" | "paper"
    tool_results: list[dict]
    memory_context: list[dict]   # injected by recall at node start
```

### Node pattern
Every node follows this structure:
1. Load memory context from `AgentMemory.recall()`
2. Build prompt with context injected
3. Call LLM / tool
4. Return state update (never mutate state directly)

```python
async def ideas_node(state: AgentState) -> dict:
    context = memory.recall(state["active_topic"], session_id=state["session_id"])
    # build prompt with context...
    response = await llm.ainvoke(prompt)
    return {"messages": [AIMessage(content=response)], "memory_context": context}
```

### Graph wiring
- Router node runs first, sets `state["module"]`
- Conditional edges route to `ideas_node`, `coding_node`, or `paper_node`
- `memory_save_node` is always the last node (sequential, not conditional)

---

## 6. Streaming (SSE)

Backend emits newline-delimited SSE events. Each event is a JSON object:

```
data: {"type": "token", "content": "Hello"}
data: {"type": "tool_call", "tool": "search_literature", "input": {...}}
data: {"type": "tool_result", "tool": "search_literature", "output": {...}}
data: {"type": "done", "content": ""}
```

Frontend `ChatWindow` reads the stream with `EventSource` or `fetch` + `ReadableStream`.
Never buffer the full response before sending — stream token by token.

```python
# routers/chat.py — SSE pattern
async def event_generator(state: AgentState):
    async for event in graph.astream_events(state, version="v1"):
        if event["event"] == "on_chat_model_stream":
            token = event["data"]["chunk"].content
            yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
    yield f"data: {json.dumps({'type': 'done', 'content': ''})}\n\n"

@router.post("/chat/stream")
async def stream(body: ChatRequest, user=Depends(get_current_user)):
    state = build_state(body, user)
    return StreamingResponse(event_generator(state), media_type="text/event-stream")
```

---

## 7. Frontend conventions (Next.js 14)

### App Router rules
- All data fetching happens in Server Components unless interactivity is needed
- Client components are marked `"use client"` and kept small
- API calls to the backend go through `lib/api.ts` — never inline `fetch` in components

### `lib/api.ts` pattern
```typescript
const BASE = process.env.NEXT_PUBLIC_API_URL

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: "include",   // sends httpOnly cookie
    headers: { "Content-Type": "application/json", ...options?.headers },
  })
  if (res.status === 401) { redirect("/login"); }
  if (!res.ok) { throw new Error(await res.text()); }
  return res.json()
}

export const api = {
  sessions: { list: () => apiFetch<Session[]>("/sessions") },
  chat: { invoke: (body: ChatRequest) => apiFetch<ChatResponse>("/chat/invoke", { method: "POST", body: JSON.stringify(body) }) },
  memory: { recall: (q: string, sessionId: string) => apiFetch<MemoryHit[]>(`/memory/recall?q=${encodeURIComponent(q)}&session_id=${sessionId}`) },
}
```

### Component naming
- Files: `PascalCase.tsx`
- One component per file
- Props interface defined inline above the component: `interface Props { ... }`

### Tailwind
Use only Tailwind utility classes — no custom CSS files except `globals.css` for base resets.
Use `cn()` (from `shadcn/ui`) for conditional class merging.

---

## 8. Security — non-negotiable rules

Every item below is a hard requirement. Never skip any of them.

| Rule | Where enforced |
|---|---|
| Passwords hashed with bcrypt (rounds=12) | `auth/utils.py` |
| JWT in httpOnly cookie | `frontend/app/api/auth/` Next.js route |
| CORS allows only `ALLOWED_ORIGINS` in prod | `main.py` |
| Rate limit 60 req/min (stricter on /auth/*) | `middleware/rate_limit.py` |
| All SQL uses parameterized queries | `memory/session_store.py` |
| No stack traces in prod API responses | `main.py` global handler |
| Secrets only via env vars — never hardcoded | everywhere |
| Input validation on every endpoint | Pydantic schemas |
| File uploads (if added): type + size check | add when needed |

---

## 9. Deployment

### Render (backend)
- Deploy via Docker using the `Dockerfile` in `/backend`
- Attach a persistent disk at `/app/data` (SQLite + Chroma live here)
- Set `ENVIRONMENT=production` — this tightens CORS and disables stack traces
- `render.yaml` defines the service declaratively

### Vercel (frontend)
- `NEXT_PUBLIC_API_URL` = Render service URL (set in Vercel dashboard)
- `vercel.json` maps the env var reference
- No server-side secrets needed in frontend — all sensitive calls go through backend

### Environment parity
- `.env.example` (backend) and `.env.local.example` (frontend) must stay up to date
- Every new env var must be added to the example files and to `render.yaml`

---

## 10. Testing

```
backend/tests/
├── test_auth.py       # register, login, protected route
├── test_chat.py       # invoke + stream (mock LLM)
└── test_memory.py     # save events, recall, session list
```

- Use `pytest` + `httpx.AsyncClient` for API tests
- Mock external calls (Gemini, ChromaDB) with `pytest-mock`
- Tests run against an in-memory SQLite DB (`:memory:` path)
- Every new endpoint gets a test before the PR is merged

---

## 11. Git conventions

```
feat: add paper_node with draft_section tool
fix: handle ChromaDB timeout in VectorMemory.recall
chore: add GEMINI_API_KEY to render.yaml envVars
```

- Branch: `feat/`, `fix/`, `chore/`
- Never commit: `.env`, `data/`, `__pycache__`, `.next/`, `node_modules/`
- PR description must reference which SKILL.md section the change touches

---

## 12. What to do when you are unsure

1. Re-read the relevant section of this file
2. Look at how the same pattern is already implemented elsewhere in the codebase
3. If still unsure, leave a `# TODO(skill): explain deviation` comment and flag it in the PR

Never invent a new pattern silently. Consistency is more valuable than cleverness.
