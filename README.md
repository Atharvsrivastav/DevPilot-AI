# DevPilot AI 🚀

**DevPilot AI** is an enterprise-grade, AI-powered platform that performs automated multi-dimensional analysis on GitHub repositories for:
- **Code Quality**: Linting, cyclomatic complexity, code smells, duplication.
- **Security**: Vulnerability scanning, hardcoded secrets, unsafe dependency detection.
- **Architecture**: Design patterns, component coupling, dependency DAGs, modularity.
- **Performance**: Bottleneck analysis, database query efficiency, memory leaks.
- **Documentation**: API coverage, docstrings, README completeness, inline documentation.
- **Maintainability**: Technical debt evaluation, test coverage metrics, refactoring priority index.

---

## 🏗️ Tech Stack

### Frontend
- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [TailwindCSS v4](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)

### Backend & AI Framework
- **API Framework**: [FastAPI](https://fastapi.tiangolo.com/)
- **AI Agent Orchestration**: [PydanticAI](https://ai.pydantic.dev/)
- **Data Validation & Schemas**: [Pydantic v2](https://docs.pydantic.dev/)

### Database & Vector Storage
- **Primary Relational DB**: [PostgreSQL 16](https://www.postgresql.org/)
- **Vector Search Engine**: [pgvector](https://github.com/pgvector/pgvector)

---

## 🏛️ Clean Architecture Design

DevPilot AI strictly adheres to **Clean Architecture** principles to separate concerns, enforce domain isolation, and maintain testability across both backend and frontend layers:

```
DevPilot-AI/
├── backend/
│   ├── app/
│   │   ├── core/              # Global configs, logging, security, dependencies
│   │   ├── domain/            # Domain entities, value objects, domain interfaces
│   │   ├── use_cases/         # Application business rules, orchestrators
│   │   ├── agents/            # PydanticAI agents & prompt templates
│   │   ├── infrastructure/    # DB repositories, pgvector, GitHub API client
│   │   └── api/               # FastAPI controllers, routes, DTOs
│   ├── tests/                 # Unit, integration, and agent evals
│   ├── Dockerfile
│   ├── pyproject.toml
│   └── ruff.toml
├── frontend/
│   ├── src/
│   │   ├── app/               # Next.js App Router (pages & layouts)
│   │   ├── components/        # Reusable UI & shadcn components
│   │   ├── features/          # Feature-based domain modules
│   │   ├── lib/               # Utility functions & API clients
│   │   ├── types/             # TypeScript type definitions
│   │   └── hooks/             # Custom React hooks
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## ⚡ Quickstart

### Prerequisites
- [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)
- [Node.js 20+](https://nodejs.org/) (for local frontend development)
- [Python 3.12+](https://www.python.org/) & [uv](https://github.com/astral-sh/uv) (for local backend development)

### 1. Environment Setup
Copy the blueprint environment configuration file:
```bash
cp .env.example .env
```

### 2. Run via Docker Compose
To launch PostgreSQL (with pgvector), FastAPI Backend, and Next.js Frontend simultaneously:
```bash
docker-compose up --build -d
```

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **FastAPI API & OpenAPI Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **PostgreSQL Database**: `localhost:5432`

---

## 🛠️ Development & Quality Controls

### Backend Linting & Formatting
Using `ruff`:
```bash
cd backend
uv run ruff check .
uv run ruff format .
```

### Frontend Linting & Formatting
Using `ESLint` & `Prettier`:
```bash
cd frontend
npm run lint
npm run format
```

---

## 📄 License
MIT License. Distributed for enterprise usage and automated repository intelligence.
