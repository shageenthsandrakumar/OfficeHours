# OfficeHours

**Evidence-first opportunity coordination. Multi-agent negotiation only when fit is ambiguous.**

[![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-blue)]()
[![FastAPI](https://img.shields.io/badge/API-FastAPI-009688)]()

---

## Judge snapshot (under 60 seconds)

| Question | Answer |
|----------|--------|
| **What problem?** | Strong students and real lab opportunities miss each other. Project evidence stays buried, filters reject too early, and there is no structured hearing for ambiguous fit. |
| **What do you ship?** | A **deterministic dossier** for each student-project pair, then **three LLM agents only when routing is `AMBIGUOUS`**. |
| **Why not a ChatGPT wrapper?** | `evaluate_fit()` is **rules-only and inspectable**. Agents resolve objections over evidence, not a black-box similarity score. |
| **Production-shaped?** | FastAPI · PostgreSQL · logged negotiations · swappable LLM (Anthropic / GMI). |

**Deployed app:** https://office-hours-umber.vercel.app (student/professor matching platform, Next.js + Supabase).

**Agent-reasoning demo:** `python3 demo.py` runs **Aisha Patel** (weak on paper, strong build signals) against **MIT soft robotics**. Dossier routes **`AMBIGUOUS`**, three agents negotiate, decision lands on **`MATCH`** (recommend a conversation, not automatic placement).

---

## The problem

Campus opportunities fail at **coordination**, not because people or projects do not exist.

- Capstones, builds, and side projects **disappear** after grades are posted.
- Students are filtered out by **keywords and credentials** before a PI sees real evidence.
- Labs need a **pair-level** answer: does *this* person fit *this* opportunity *now*?

OfficeHours answers that question in two layers: a **dossier** (transparent rules) and an **agent hearing** (only when the dossier says uncertainty remains).

---

## How it works

### 1. Dossier first (`evaluate_fit`)

Before any agent runs, `evaluate_fit(student, project)` returns a **`Dossier`**.

| Property | Detail |
|----------|--------|
| **Deterministic** | No LLM inside `evaluate_fit`. Judges can audit the logic. |
| **Evidence sources** | `skills`, `intake_summary`, `extra_signals` vs project `required_skills` and `preferred_background`. |
| **Output** | Routing, skill coverage, strengths, risks, open questions (max 2), and a human-readable summary. |

### 2. Routing

```mermaid
flowchart TD
    A[Student + lab project] --> B["evaluate_fit() returns Dossier"]
    B --> C{routing}
    C -->|CLEAR_FIT| D["MATCH · 0 agent turns"]
    C -->|CLEAR_MISMATCH| E["NO_MATCH · 0 agent turns"]
    C -->|AMBIGUOUS| F[Student Agent]
    F --> G[Professor Agent]
    G --> H[Mediator Agent]
    H --> I{decision}
    I -->|MATCH or NO_MATCH| J[Done · logged via API]
    I -->|NEEDS_INFO| F
```

| Routing | When | Agents run? | Result |
|---------|------|-------------|--------|
| **`CLEAR_FIT`** | Required skills evidenced; no material open questions | **No** | Immediate `MATCH` |
| **`CLEAR_MISMATCH`** | Required skill missing; no ownership signals to compensate | **No** | Immediate `NO_MATCH` |
| **`AMBIGUOUS`** | Gaps plus strong project evidence, inferred skills, or soft background mismatch | **Yes** | `MATCH` / `NO_MATCH` / `NEEDS_INFO` (up to **6** turns, then a forced terminal decision) |

> **Demo tip:** the default `demo.py` pair routes **`AMBIGUOUS`** and runs all three agents. Seeded student **Marcus** may hit **`CLEAR_MISMATCH`** (agents skipped). Use Aisha for the full agent story.

### 3. Agents (only if `AMBIGUOUS`)

Each agent receives a **different dossier slice**. Advocate, gate, and arbiter are not the same prompt.

| Agent | Role | Dossier slice | Responsibility |
|-------|------|---------------|----------------|
| **Student** | Advocate | `strengths` | Surface buried evidence; respond to objections honestly. |
| **Professor** | Gate | `risks`, `uncertainties` | Enforce requirements; ask one focused question when unclear. |
| **Mediator** | Arbiter | `uncertainties`, `summary` | Issue `DECISION: MATCH \| NO_MATCH \| NEEDS_INFO` with a short, evidence-based justification. |

---

## Architecture

```
FastAPI  ·  PostgreSQL (student.*, lab.*)  ·  negotiation_logs
                         |
                  run_negotiation()
                         |
          +--------------+--------------+
          v                             v
   evaluate_fit()                 LLM agents (if AMBIGUOUS)
   rules-only Dossier             Anthropic / GMI via llm_client.py
```

| Layer | Stack |
|-------|--------|
| API | FastAPI + Uvicorn |
| Data | PostgreSQL, SQLAlchemy async |
| Matching | `app/agents/fit.py` returns `Dossier` |
| Agents | Plain Python + direct LLM calls (no agent framework) |
| Observability | Phinite hooks in `agent_runtime.py` (SDK-ready stubs) |

---

## `Dossier` schema

```python
# app/agents/fit.py
def evaluate_fit(
    student_profile: StudentProfile,
    project: LabProject,
    conversation_history: list[dict],
) -> Dossier:
    ...
```

| Field | Purpose |
|-------|---------|
| `routing` | `CLEAR_FIT` \| `CLEAR_MISMATCH` \| `AMBIGUOUS` |
| `routing_reason` | One-line explanation of the route |
| `skills_met` | e.g. `"3/4"` |
| `skill_gaps` | Required skills not explicitly evidenced |
| `strengths` | Student agent: what to advocate |
| `risks` | Professor agent: requirement gaps |
| `uncertainties` | Mediator: open questions (**max 2**, alias `open_questions`) |
| `dimensions` | Structured assessments (skills, ownership, preferred background) |
| `overall_confidence` | Summary score (`score` alias) |
| `summary` | Human-readable overview |

---

## Quick start

### Terminal demo (no database, best for judges)

```bash
git clone https://github.com/jayashreejohnson/OfficeHours.git
cd OfficeHours
python3 -m venv .venv && source .venv/bin/activate
pip install "python-dotenv>=1.0" "pydantic>=2.7" "pydantic-settings>=2.2" "anthropic>=0.28"
cp .env.example .env   # set ANTHROPIC_API_KEY=
python3 demo.py
```

Expect a printed **DOSSIER** block, then agent turns if routing is `AMBIGUOUS`.

### Full API + database

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -e .
# If editable install fails:
# pip install fastapi uvicorn pydantic pydantic-settings sqlalchemy asyncpg \
#   python-dotenv anthropic beautifulsoup4 requests

cp .env.example .env
python app/seed.py    # Postgres required. Seeds MIT labs + demo students
python run.py         # http://localhost:8000/docs
```

### Frontend, matching app (Next.js + Supabase)

The deployed product is a student/professor matching platform: `.edu` auth, role-based onboarding, dashboards, and AI-ranked opportunities backed by Supabase.

```bash
cd frontend
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev                  # http://localhost:3000
```

- Run `frontend/supabase/schema.sql` in your Supabase SQL editor to create the tables, policies, and triggers.
- Matching uses a deterministic rule-based score with an optional LLM refinement (GMI / OpenAI). It falls back to rules when no LLM key is set.
- Live deployment: https://office-hours-umber.vercel.app

---

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/students` | List students |
| GET | `/students/{student_id}` | Get one student |
| POST | `/students` | Create student profile |
| GET | `/projects` | List lab projects |
| GET | `/projects/{project_id}` | Get one project |
| POST | `/negotiate?student_id=&project_id=` | Dossier pre-screen + negotiation; saves log. Returns the full `SharedNotePayload` (`{ student, project, dossier, result }`) for the UI |
| GET | `/negotiations` | List past runs (summary) |

---

## Why not embeddings or resume ranking?

- **Pair-level** fit for **this** opportunity, not a global profile score.
- **Inspectable rules** run before any LLM token is spent.
- **Agents activate only on `AMBIGUOUS`**. Clear cases short-circuit instantly.
- Negotiations are **logged** for auditability (API path).

---

## Project structure

```
app/                     # Backend (FastAPI + agents)
  models.py              # StudentProfile, LabProject, Dossier, AgentMessage
  agents/
    fit.py               # evaluate_fit(): deterministic dossier + routing
    student_agent.py
    professor_agent.py
    mediator_agent.py
  negotiation.py         # Pre-screen, then short-circuit or agent loop
  llm_client.py
  agent_runtime.py
  main.py
  db_models.py
  seed.py
  scraper.py
demo.py · run.py

frontend/                # Matching app (Next.js 15 + TS + Tailwind + Supabase)
  src/app/
    auth/                # .edu login + signup
    onboarding/          # student/ + professor/ flows
    dashboard/           # student/ + professor/ dashboards
    api/                 # match, apply, opportunities, profile routes
  src/lib/
    supabase/            # client / server / middleware
    matching/            # runMatching.ts
    openai/match.ts      # rule-based score + optional LLM refinement
    types/database.ts
  supabase/schema.sql    # tables, RLS policies, triggers
```

---

## Sponsor integrations

| Sponsor | Status | How |
|---------|--------|-----|
| **GMI** | Wired | `llm_client.py` routes to GMI (Anthropic-compatible or OpenAI-compatible) via `GMI_API_KEY`, with no agent-code changes. The frontend matcher can use the same provider. |
| **Phinite** | Scaffolded | `agent_runtime.py` exposes `register_identity` / `trace_event` / `log_decision` hooks (no-op stubs) ready for the Phinite SDK. |

---

## Team

Built together for **NY Tech Week, AI Agents: From Prototype to Production** (NYC, 2026-06-03). Four people, one shared codebase: product, reasoning logic, backend, UI, and deployment.

### Jayashree Johnson · [@jayashreejohnson](https://github.com/jayashreejohnson)

- Product architecture and the dossier-first thesis
- Dossier design and the routing framework (`CLEAR_FIT` / `CLEAR_MISMATCH` / `AMBIGUOUS`)
- Early signal-discovery UI and Vercel deployment

### Salwa Shuman · [@SalwaTheEngineer](https://github.com/SalwaTheEngineer)

- Built the deployed application end to end. The Next.js + Supabase matching platform: `.edu` auth, student/professor dashboards, onboarding flows, and the `match` / `apply` / `opportunities` / `profile` API routes.

### Victoria Zhao · [@znvictoriazhao](https://github.com/znvictoriazhao)

- Evidence-scoring logic, designed alongside Jayashree. The rules that decide when a student-project pair is a clear fit, a clear mismatch, or ambiguous enough to need the agents.

### Shageenth Sandrakumar · [@shageenthsandrakumar](https://github.com/shageenthsandrakumar)

- Backend architecture: FastAPI, the three agent modules, and the negotiation loop
- `evaluate_fit` rules engine and the `Dossier` model
- PostgreSQL / SQLAlchemy async; remote-DB (Railway) SSL
- Sponsor integration: GMI provider routing in `llm_client.py`, Phinite observability hooks

**Contributions welcome:** Phinite SDK wiring, deeper observability, and polish on `main`. Open an issue or PR.

---

## Roadmap

- ~~Return dossier on `/negotiate` JSON response~~ done. Returns the full `SharedNotePayload`.
- Connect the deployed matcher (Next.js + Supabase) to the dossier and agent engine, so ambiguous pairs run the full negotiation in production.
- Proactive surfacing (discovery before search).
- Rich intake flow and optional PI constraints (opt-in, not GPA-first by default).

---

## License

See [LICENSE](LICENSE).
