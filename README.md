# Research Agent

A full-stack AI research assistant with three capability modules (Ideas, Coding, Paper Writing), persistent memory layer, and a clean web UI.

## Stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3.11 · FastAPI · LangGraph · Pydantic v2 |
| Memory | SQLite (structured log) · ChromaDB (semantic recall) |
| LLM | OpenAI GPT-4 |
| Auth | JWT (python-jose) · bcrypt password hashing |
| Frontend | Next.js 14 App Router · TypeScript · Tailwind CSS |
| Backend hosting | Render (Docker) |
| Frontend hosting | Vercel |

## Project Structure

```
research-agent/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app, lifespan, CORS, rate limit
│   │   ├── config.py         # Settings via pydantic-settings
│   │   ├── auth/             # JWT authentication
│   │   ├── agent/            # LangGraph agent
│   │   ├── memory/           # SQLite + ChromaDB memory
│   │   ├── routers/          # API routes
│   │   └── middleware/        # Rate limiting, logging
│   ├── tests/                # Pytest tests
│   ├── Dockerfile
│   ├── requirements.txt
│   └── render.yaml
├── frontend/
│   ├── app/                  # Next.js App Router
│   ├── components/           # React components
│   ├── lib/                  # API clients, utilities
│   └── ...
└── skills/
    └── SKILL.md             # Project conventions
```

## Getting Started

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your API keys
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

## Features

- **Three Agent Modules**: Ideas (research ideation), Coding (code generation), Paper (academic writing)
- **Persistent Memory**: SQLite for structured events, ChromaDB for semantic recall
- **Streaming Chat**: Real-time SSE streaming for chat responses
- **JWT Authentication**: Secure httpOnly cookie-based auth
- **Rate Limiting**: 60 requests/minute via SlowAPI

## License

MIT
