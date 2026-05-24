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
    auth_rate_limit_per_minute: int = 10  # Stricter for auth endpoints
    token_blacklist_ttl_minutes: int = 1440  # 24h for token blacklist

    model_config = ConfigDict(env_file=".env")

settings = Settings()
```

---

## 3. Auth pattern

JWT stored in `httpOnly` cookies on the frontend. Never in `localStorage`.

### API Versioning
All API routes are versioned under `/v1/`. Update client integrations when shipping.

| Endpoint | Method | Path | Description |
|----------|--------|------|-------------|
| Register | POST | `/v1/auth/register` | Create account |
| Login | POST | `/v1/auth/login` | Authenticate |
| Logout | POST | `/v1/auth/logout` | Revoke token |
| Get Me | GET | `/v1/auth/me` | Current user |

### Backend auth flow
1. `POST /v1/auth/register` → hash password (bcrypt, cost 12) → store user → return token
2. `POST /v1/auth/login` → verify password → return token
3. `POST /v1/auth/logout` → add token JTI to blacklist
4. Every protected route uses `Depends(get_current_user)`

### Token revocation
Tokens include a unique `jti` (JWT ID). On logout, the JTI is added to an in-memory blacklist. All token validation checks this blacklist.

```python
# auth/utils.py — canonical patterns

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

def create_access_token(user_id: str) -> tuple[str, str, datetime]:
    # Returns (token, jti, expiration)
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    jti = str(uuid.uuid4())
    payload = {"sub": user_id, "exp": expire, "jti": jti}
    return jwt.encode(payload, settings.secret_key, algorithm="HS256"), jti, expire

def decode_token(token: str) -> tuple[str, str]:
    # Returns (user_id, jti) — checks blacklist
    payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
    jti = payload.get("jti", "")
    if token_blacklist.is_blacklisted(jti):
        raise jwt.InvalidTokenError("Token has been revoked")
    return payload["sub"], jti
```

### Frontend auth flow
- On login: call Next.js API route `/api/auth/login` → that route sets `httpOnly` cookie → never expose JWT to JS
- `lib/auth.ts` exposes `isAuthenticated()` (checks cookie presence) and `logout()` (calls `/v1/auth/logout`)
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
- Always include `session_id` AND `user_id` in metadata for scoped recall
- `upsert` not `add` — idempotent saves
- All vector queries MUST filter by `user_id` to prevent cross-user data leaks

### `AgentMemory` (facade)
- All agent nodes use only `AgentMemory` — never call `SessionStore` or `VectorMemory` directly
- Pattern: save structured event to SQLite AND embed text to ChromaDB together
- Pass `user_id` to all save and recall operations

```python
# Every save method follows this pattern
def save_X(self, session_id: str, ..., user_id: str = None):
    event = MemoryEvent(session_id=session_id, event_type="X", content={...})
    self.store.log_event(event)
    self.vectors.save(session_id, event.event_id, text_to_embed, metadata={...}, user_id=user_id)

# Recall MUST filter by user_id
def recall(self, query: str, session_id: str = None, limit: int = 5, user_id: str = None):
    return self.vectors.recall(query, session_id, limit, user_id)
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

### API Routes Summary

All routes are prefixed with `/v1/`:

| Route | Method | Path | Description |
|-------|--------|------|-------------|
| Auth | POST | `/v1/auth/register` | Create account |
| Auth | POST | `/v1/auth/login` | Authenticate |
| Auth | POST | `/v1/auth/logout` | Revoke token |
| Auth | GET | `/v1/auth/me` | Current user |
| Chat | POST | `/v1/chat/invoke` | Non-streaming chat |
| Chat | POST | `/v1/chat/stream` | Streaming chat (SSE) |
| Sessions | GET | `/v1/sessions` | List sessions (paginated) |
| Sessions | POST | `/v1/sessions` | Create session |
| Sessions | GET | `/v1/sessions/{id}` | Get session |
| Sessions | PATCH | `/v1/sessions/{id}` | Update session |
| Sessions | DELETE | `/v1/sessions/{id}` | Delete session |
| Sessions | GET | `/v1/sessions/{id}/history` | Session events |
| Memory | GET | `/v1/memory/recall` | Semantic search |
| Memory | GET | `/v1/memory/history/{session_id}` | Session memory |
| Experiments | GET | `/v1/experiments` | User's active flags |
| Experiments | GET | `/v1/experiments/all` | List all experiments |

```python
# routers/chat.py — SSE pattern
async def event_generator(state: AgentState, request: ChatRequest, user_id: str):
    async for event in graph.astream_events(state, version="v1"):
        if event["event"] == "on_chat_model_stream":
            token = event["data"]["chunk"].content
            yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
    yield f"data: {json.dumps({'type': 'done', 'content': ''})}\n\n"

@router.post("/v1/chat/stream")
async def stream(body: ChatRequest, user=Depends(get_current_user)):
    state = build_state(body, user)
    return StreamingResponse(
        event_generator(state, body, user["id"]), 
        media_type="text/event-stream"
    )
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
  sessions: { 
    list: (limit = 20, offset = 0) => 
      apiFetch<SessionListResponse>(`/v1/sessions?limit=${limit}&offset=${offset}`) 
  },
  chat: { 
    invoke: (body: ChatRequest) => 
      apiFetch<ChatResponse>("/v1/chat/invoke", { method: "POST", body: JSON.stringify(body) }) 
  },
  memory: { 
    recall: (q: string, sessionId?: string) => 
      apiFetch<RecallResponse>(`/v1/memory/recall?q=${encodeURIComponent(q)}${sessionId ? `&session_id=${sessionId}` : ''}`) 
  },
  experiments: {
    getFlags: () => apiFetch<UserExperimentsResponse>("/v1/experiments"),
  },
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
| Rate limit 60 req/min (10/min on auth) | `middleware/rate_limit.py` |
| All SQL uses parameterized queries | `memory/session_store.py` |
| No stack traces in prod API responses | `main.py` global handler |
| Secrets only via env vars — never hardcoded | everywhere |
| Input validation on every endpoint | Pydantic schemas |
| Session ownership validation on all endpoints | `routers/sessions.py`, `routers/memory.py` |
| Token revocation via blacklist on logout | `auth/blacklist.py`, `auth/router.py` |
| All vector memory filtered by user_id | `memory/vector_memory.py` |
| File uploads (if added): type + size check | add when needed |

### IDOR Prevention
Every endpoint that accesses user data must validate ownership:
```python
# CORRECT — validate session belongs to user
session = memory.get_session(session_id)
if session["user_id"] != user["id"]:
    raise HTTPException(status_code=403, detail="Not authorized")

# WRONG — no ownership check
session = memory.get_session(session_id)
```

### Rate Limiting
- Auth endpoints (`/v1/auth/*`): 10 requests/minute per IP
- General API endpoints: 60 requests/minute per IP
- Rate limit configuration via `auth_rate_limit_per_minute` and `rate_limit_per_minute` in config

### Token Blacklist
On logout, the token's JTI is added to an in-memory blacklist. All token validation checks this blacklist before allowing access.

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
├── test_auth.py       # register, login, logout, protected route
├── test_sessions.py   # CRUD, pagination, ownership
├── test_memory.py     # save events, recall, session list
└── test_experiments.py # A/B testing flags and experiments
```

- Use `pytest` + `httpx.AsyncClient` for API tests
- Mock external calls (Gemini, ChromaDB) with `pytest-mock`
- Tests run against an in-memory SQLite DB (`:memory:` path)
- Every new endpoint gets a test before the PR is merged

---

## 11. A/B Testing

The backend includes an experiments module for feature flag management.

### Feature Flags
```python
# app/experiments/config.py
class FeatureFlags:
    NEW_CHAT_STREAMING = "new_chat_streaming"
    ENHANCED_MEMORY_RECALL = "enhanced_memory_recall"
    VECTOR_SEARCH_V2 = "vector_search_v2"
```

### Experiments
```python
# app/experiments/config.py
EXPERIMENTS = {
    "chat_ux_v2": {
        "flags": [FeatureFlags.NEW_CHAT_STREAMING],
        "traffic_percentage": 20,  # 20% of users
    },
}
```

### Usage
```python
from app.experiments.store import experiment_store

# Check if a flag is enabled for a user
if experiment_store.is_enabled(user_id, "new_chat_streaming"):
    # show new UI
```

### Endpoints
| Route | Method | Description |
|-------|--------|-------------|
| `/v1/experiments` | GET | Get user's active flags |
| `/v1/experiments/all` | GET | List all experiments |
| `/v1/experiments/check/{flag}` | GET | Check single flag |
| `/v1/experiments/flags/override` | POST | Override flag (admin) |

```
feat: add paper_node with draft_section tool
fix: handle ChromaDB timeout in VectorMemory.recall
chore: add GEMINI_API_KEY to render.yaml envVars
```

- Branch: `feat/`, `fix/`, `chore/`
- Never commit: `.env`, `data/`, `__pycache__`, `.next/`, `node_modules/`
- PR description must reference which SKILL.md section the change touches

---

## 12. Git conventions

```
feat: add paper_node with draft_section tool
fix: handle ChromaDB timeout in VectorMemory.recall
chore: add GEMINI_API_KEY to render.yaml envVars
```

- Branch: `feat/`, `fix/`, `chore/`
- Never commit: `.env`, `data/`, `__pycache__`, `.next/`, `node_modules/`
- PR description must reference which SKILL.md section the change touches

---

## 13. What to do when you are unsure

1. Re-read the relevant section of this file
2. Look at how the same pattern is already implemented elsewhere in the codebase
3. If still unsure, leave a `# TODO(skill): explain deviation` comment and flag it in the PR

Never invent a new pattern silently. Consistency is more valuable than cleverness.
