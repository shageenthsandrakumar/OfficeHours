# Ascend

*Product name: **Ascend**. Repository: `OfficeHours`.*

**Evidence-first opportunity coordination. Multi-agent negotiation only when fit is ambiguous.**

[![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-blue)]()
[![FastAPI](https://img.shields.io/badge/API-FastAPI-009688)]()

---

## Judge snapshot (under 60 seconds)

| Question | Answer |
|----------|--------|
| **What problem?** | Strong students and real lab opportunities miss each other. Project evidence stays buried, filters reject too early, and there is no structured hearing for ambiguous fit. |
| **What do you ship?** | A **deterministic dossier** for each student-project pair, then **three LLM agents only when routing is `AMBIGUOUS`** — streamed live to the student through a **"Why this match?"** panel in the deployed app. |
| **Why not a ChatGPT wrapper?** | `evaluate_fit()` is **rules-only and inspectable**. Agents resolve objections over evidence, not a black-box similarity score. |
| **Production-shaped?** | FastAPI · PostgreSQL · logged negotiations · swappable LLM (Anthropic / GMI) · **deployed end-to-end** (Vercel + Render + Supabase) with the agents streaming live over SSE. |

**Deployed app:** https://office-hours-shageenth-sandrakumar-s-projects.vercel.app — the Next.js + Supabase matching platform. Click **"Why this match?"** on any opportunity to watch the three agents negotiate the dossier **live**.

**Agent-reasoning demo:** `python3 demo.py` runs **Aisha Patel** (weak on paper, strong build signals) against **MIT soft robotics**. Dossier routes **`AMBIGUOUS`**, three agents negotiate, decision lands on **`MATCH`** (recommend a conversation, not automatic placement).

---

## The problem

Campus opportunities fail at **coordination**, not because people or projects do not exist.

- Capstones, builds, and side projects **disappear** after grades are posted.
- Students are filtered out by **keywords and credentials** before a PI sees real evidence.
- Labs need a **pair-level** answer: does *this* person fit *this* opportunity *now*?

Ascend answers that question in two layers: a **dossier** (transparent rules) and an **agent hearing** (only when the dossier says uncertainty remains).

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

```
Student + lab project
        |
        v
  evaluate_fit() returns Dossier
        |
   routing?
        |
  +-----+----------------+------------------+
  |                      |                  |
CLEAR_FIT           CLEAR_MISMATCH      AMBIGUOUS
  |                      |                  |
MATCH                 NO_MATCH        Student Agent
(0 agent turns)    (0 agent turns)         |
                                      Professor Agent
                                           |
                                      Mediator Agent
                                           |
                                       decision?
                                           |
                          +----------------+----------------+
                          |                                 |
                   MATCH / NO_MATCH                     NEEDS_INFO
                          |                                 |
                  done (logged via API)        back to Student Agent
                                               (up to 5 turns, then forced)
```

| Routing | When | Agents run? | Result |
|---------|------|-------------|--------|
| **`CLEAR_FIT`** | Required skills evidenced; no material open questions | **No** | Immediate `MATCH` |
| **`CLEAR_MISMATCH`** | Required skill missing; no ownership signals to compensate | **No** | Immediate `NO_MATCH` |
| **`AMBIGUOUS`** | Gaps plus strong project evidence, inferred skills, or soft background mismatch | **Yes** | `MATCH` / `NO_MATCH` / `NEEDS_INFO` (up to **5** turns, then a forced terminal decision) |

> **Demo tip:** the default `demo.py` pair routes **`AMBIGUOUS`** and runs all three agents. Seeded student **Marcus** may hit **`CLEAR_MISMATCH`** (agents skipped). Use Aisha for the full agent story.

### 3. Agents (only if `AMBIGUOUS`)

Each agent receives a **different dossier slice**. Advocate, gate, and arbiter are not the same prompt.

| Agent | Role | Dossier slice | Responsibility |
|-------|------|---------------|----------------|
| **Student** | Advocate | `strengths` | Surface buried evidence; respond to objections honestly. |
| **Professor** | Gate | `risks`, `uncertainties` | Enforce requirements; ask one focused question when unclear. |
| **Mediator** | Arbiter | `uncertainties`, `summary` | Issue `DECISION: MATCH \| NO_MATCH \| NEEDS_INFO` with a short, evidence-based justification. |

The student agent advocates **only on submitted evidence** — it never invents a skill it cannot point to, and concedes honestly when the evidence is thin.

### 4. Live in the deployed app: "Why this match?"

In production the negotiation is not a CLI artifact — it streams to the student. Every opportunity card has a **"Why this match?"** button that opens a panel and **streams the agents over Server-Sent Events** (`POST /negotiate/stream`): the dossier appears first, then each agent turn as it is generated, then the decision. Past negotiations are cached and replayed with a typing animation, so re-opening is instant.

The decision is honest about *why* it landed where it did:

| Outcome | Meaning | What the student sees |
|---------|---------|-----------------------|
| **`MATCH`** | Real, stated evidence meets the bar | "Recommended — start a conversation." |
| **`NEEDS_INFO`** | Relevant domain, but a specific required skill is simply **undocumented** | A yes/no gate — *"Is this part of your background?"* — where **No** ends it honestly and **Yes** re-opens the original submission to **add the evidence and re-run** the negotiation in place. |
| **`NO_MATCH`** | A **structural** mismatch more evidence cannot bridge: wrong domain/aptitude, zero adjacent overlap, a self-declared absence, a hard disqualifier, or goal misalignment | A clear, non-judgmental "not a fit." Never a GPA or "didn't try hard enough" filter. |

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

### Deployed topology

```
Browser
  |  Next.js (Vercel)  ──  Supabase (auth, profiles, opportunities, negotiation cache)
  |
  |  POST /negotiate/stream   (Server-Sent Events)
  v
FastAPI (Render)  ──  evaluate_fit() rules  +  GMI Cloud agents
```

`app/integration.py` maps Supabase rows (topics + free-text bio) onto the agent engine's
`StudentProfile` / `LabProject` — extracting skills and inferring ownership signals from
achievement language — so the dossier is meaningful on the data the product actually
collects, **with no changes to the agent engine itself**.

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

The deployed product is a student/professor matching platform: `.edu` auth, role-based onboarding, dashboards, AI-ranked opportunities backed by Supabase, and the live **"Why this match?"** agent panel.

```bash
cd frontend
npm install
cp .env.example .env.local   # NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
                             # NEXT_PUBLIC_AGENT_API_URL -> FastAPI backend (e.g. http://localhost:8000)
npm run dev                  # http://localhost:3000
```

- Run `frontend/supabase/schema.sql` for the core tables/policies/triggers, then `frontend/supabase/negotiations.sql` to add the negotiation cache table.
- Matching uses a deterministic rule-based score with an optional LLM refinement (GMI / OpenAI). It falls back to rules when no LLM key is set.
- The "Why this match?" panel calls `NEXT_PUBLIC_AGENT_API_URL` (`POST /negotiate/stream`). Run the FastAPI backend alongside the frontend, or point it at the deployed backend.
- Live deployment: https://office-hours-shageenth-sandrakumar-s-projects.vercel.app

---

## Deployment

The whole stack runs on free tiers, fully decoupled:

| Piece | Host | Notes |
|-------|------|-------|
| Frontend (Next.js) | **Vercel** | Root directory `frontend/`. Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_AGENT_API_URL`. |
| Agent backend (FastAPI) | **Render** | Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Env: `GMI_API_KEY`, `GMI_BASE_URL`, `DEFAULT_MODEL`. DB-free for `/negotiate/stream`. |
| Data + auth | **Supabase** | Add the deployed URL under Auth → URL Configuration so login redirects resolve. |

- Frontend: https://office-hours-shageenth-sandrakumar-s-projects.vercel.app
- Agent backend: https://officehours-wj6h.onrender.com (`/health` for a liveness check)

> Render's free tier sleeps after inactivity, so the first negotiation after an idle period cold-starts (~1 min), then runs warm.

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
| POST | `/negotiate/stream` | **Streams** the dossier, each agent turn, and the decision over Server-Sent Events (`event: dossier \| turn \| decision \| done`). Powers the live "Why this match?" panel. Body: `{ student, opportunity }` (Supabase shapes) |
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
  negotiation.py         # run_negotiation + stream_negotiation (SSE generator)
  integration.py         # maps Supabase rows -> agent models (skills, ownership)
  llm_client.py
  agent_runtime.py
  main.py                # REST + /negotiate/stream (SSE)
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
  src/components/
    dashboard/
      WhyThisMatchModal.tsx  # live agent stream (SSE) + NEEDS_INFO re-run loop
  src/lib/
    supabase/            # client / server / middleware
    matching/            # runMatching.ts
    openai/match.ts      # rule-based score + optional LLM refinement
    types/database.ts
  supabase/schema.sql        # tables, RLS policies, triggers
  supabase/negotiations.sql  # negotiation cache (replay) table + RLS
```

---

## Sponsor integrations

| Sponsor | Status | How |
|---------|--------|-----|
| **GMI** | Wired (live) | `llm_client.py` routes to GMI (Anthropic-compatible or OpenAI-compatible) via `GMI_API_KEY`, with no agent-code changes. In the deployed app, **GMI powers the live "Why this match?" negotiation** streamed to students from the Render backend. |
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
- **End-to-end integration:** wired the agent engine into the deployed product — the SSE streaming endpoint (`/negotiate/stream`), the Supabase→agent mapping layer (`integration.py`), the live **"Why this match?"** panel with the `NEEDS_INFO` add-evidence-and-re-run loop, and the Vercel + Render deployment. Built additively on Salwa's UI without changing it.

**Contributions welcome:** Phinite SDK wiring, deeper observability, and polish on `main`. Open an issue or PR.

---

## Roadmap

- ~~Return dossier on `/negotiate` JSON response~~ done. Returns the full `SharedNotePayload`.
- ~~Connect the deployed matcher (Next.js + Supabase) to the dossier and agent engine, so ambiguous pairs run the full negotiation in production~~ **done** — live via the "Why this match?" panel and `POST /negotiate/stream`.
- Proactive surfacing (discovery before search).
- Rich intake flow and optional PI constraints (opt-in, not GPA-first by default).

---

## License

See [LICENSE](LICENSE).
