# OfficeHours

Students struggle to find research opportunities. Professors struggle to identify genuinely interested students. OfficeHours fixes this with multi-agent negotiation — killing the cold-email luck problem.

Three agents negotiate on your behalf. One fights for the student. One screens for the lab. One neutral mediator makes the call.

## How it works

A **Student Agent**, **Professor Agent**, and **Mediator Agent** negotiate over multiple turns to surface fit that a one-shot similarity score would miss — like a student who looks weak on paper but built relevant hardware in a side project.

```
           ┌─────────────┐
           │   Dossier   │  ← structured pre-screen (evaluate_fit)
           └──────┬──────┘
        ┌─────────┴──────────┐
   CLEAR_FIT /          AMBIGUOUS
   CLEAR_MISMATCH            │
   (skip agents)             ▼
                  Student Agent → Professor Agent → Mediator Agent
                   (advocate)        (screener)        (arbiter)
                                                  MATCH / NO_MATCH
```

The dossier pre-screens every candidate. Only ambiguous cases trigger the full 3-agent negotiation (up to 6 turns, hard cap). The mediator must justify its decision in writing with evidence from the transcript.

## Stack

- **Backend:** FastAPI + Python
- **Database:** PostgreSQL (two schemas: `student`, `lab`)
- **Agents:** Plain Python modules with direct LLM calls — no agent framework
- **LLM:** Anthropic Claude (swappable to GMI inference cloud via one `.env` change)
- **Observability:** Phinite multi-agent OS (agent identity + trace hooks)
- **Hosting:** Railway

## Project structure

```
app/
├── models.py               # Pydantic models: StudentProfile, LabProject, Dossier, AgentMessage
├── agents/
│   ├── fit.py              # evaluate_fit() — THE core matching logic (Jayashree's domain)
│   ├── student_agent.py    # Advocates for the student using dossier strengths slice
│   ├── professor_agent.py  # Screens for the lab using dossier risks slice
│   └── mediator_agent.py   # Neutral arbiter, forces MATCH/NO_MATCH with audit trail
├── negotiation.py          # Dossier pre-screen → short-circuit or full negotiation loop
├── llm_client.py           # Provider-swappable LLM calls (Anthropic default → GMI)
├── agent_runtime.py        # Phinite hooks: register_identity, trace_event, log_decision
├── main.py                 # FastAPI routes
├── db_models.py            # SQLAlchemy ORM
├── seed.py                 # Seeds DB with real MIT lab listings + demo students
└── scraper.py              # 20 real MIT lab project listings (with live scraper fallback)
```

## Team

| Name | GitHub | Role |
|---|---|---|
| Jayashree Johnson | @jayashreejohnson | Product logic, matching criteria, dossier design, deployment |
| Shageenth Sandrakumar | @shageenthsandrakumar | Backend plumbing, negotiation loop, sponsor integration |
| *open* | — | UI / frontend (Next.js) |
| *open* | — | TBD |

## Joining the team

We're building at **NY Tech Week — "AI Agents: From Prototype to Production"** (tonight, 2026-06-03).

The fastest way to contribute:
1. Clone the repo and run `python demo.py` to see the negotiation loop in action
2. Check open areas below — pick one, branch off `main`, PR back
3. Ping @jayashreejohnson or @shageenthsandrakumar on GitHub

**Open areas:**
- **Frontend (Next.js)** — show the 3 agents talking in real time, two account types (student / professor)
- **Intake flow** — agentic student onboarding: structured questions → Student Agent asks smart follow-ups → rich profile
- **Transcript upload** — student uploads course transcript; agents reference actual grades for relevant subjects
- **Phinite integration** — implement 3 stubs in `agent_runtime.py` once SDK is available at kickoff
- **Railway deployment** — wire up CI/CD to Railway

## Setup

```bash
# 1. Clone
git clone https://github.com/jayashreejohnson/OfficeHours.git
cd OfficeHours

# 2. Create virtualenv and install deps
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -e .

# 3. Configure
cp .env.example .env
# Fill in ANTHROPIC_API_KEY (and GMI / Phinite keys when available)

# 4. Start Postgres and seed the DB
python app/seed.py

# 5. Run the server
python run.py
# → http://localhost:8000
```

## Run the demo (no database needed)

```bash
python demo.py
```

Shows a full 3-agent negotiation in the terminal. Demo student: weak on paper (no publications, PhD Year 1) but built a 6-DOF robotic arm from scratch — the negotiation surfaces it and the mediator declares a MATCH for MIT's robotics lab.

## Key interface

The core matching logic lives in one function. This is where fit signals are evaluated before agents run:

```python
# app/agents/fit.py
def evaluate_fit(
    student_profile: StudentProfile,
    project: LabProject,
    conversation_history: list[dict],
) -> Dossier:
    ...
```

Returns a `Dossier` with:
- `routing` — `CLEAR_FIT` / `CLEAR_MISMATCH` / `AMBIGUOUS`
- `strengths` — evidence for the student agent to advocate with
- `risks` — hard requirements for the professor agent to probe
- `uncertainties` — what's genuinely unclear (triggers negotiation)
- `summary` — human-readable overview for logs and UI

## API

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/students` | List all students |
| POST | `/students` | Create a student profile |
| GET | `/projects` | List all lab projects |
| POST | `/negotiate?student_id=&project_id=` | Run a negotiation |
| GET | `/negotiations` | List past negotiation results |

## Sponsor integrations

- **GMI:** Set `GMI_API_KEY` + `GMI_ENDPOINT` in `.env` — `llm_client.py` switches automatically, zero agent code changes
- **Phinite:** Implement the three stubs in `agent_runtime.py` with the Phinite SDK — every agent is instantly traced and governed
