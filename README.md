# OfficeHours

Students struggle to find research opportunities. Professors struggle to identify genuinely interested students. OfficeHours fixes this with multi-agent negotiation — killing the cold-email luck problem.

Three agents negotiate on your behalf. One fights for the student. One screens for the lab. One neutral mediator makes the call.

## How it works

A **Student Agent**, **Professor Agent**, and **Mediator Agent** negotiate over multiple turns to surface fit that a one-shot similarity score would miss — like a student who looks weak on paper but built relevant hardware in a side project.

```
Student Agent  →  Professor Agent  →  Mediator Agent
   (advocate)        (screener)          (arbiter)
                                         MATCH / NO_MATCH / NEEDS_INFO
```

The negotiation runs up to 6 turns with a hard cap. The mediator must justify its decision in writing.

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
├── models.py          # Pydantic models: StudentProfile, LabProject, AgentMessage, FitAssessment
├── agents/
│   ├── student_agent.py    # Advocates for the student
│   ├── professor_agent.py  # Screens for the lab
│   ├── mediator_agent.py   # Neutral arbiter, forces terminal decision
│   └── fit.py              # evaluate_fit() — matching logic lives here
├── negotiation.py     # The loop: Student → Professor → Mediator, 6-turn cap
├── llm_client.py      # Provider-swappable LLM calls (Anthropic default → GMI)
├── agent_runtime.py   # Phinite hooks: register_identity, trace_event, log_decision
├── main.py            # FastAPI routes
├── db_models.py       # SQLAlchemy ORM
├── seed.py            # Seeds DB with real MIT lab listings + demo students
└── scraper.py         # Scrapes / provides 20 real lab project listings
```

## Team

| Name | GitHub | Role |
|---|---|---|
| Jayashree Johnson | @jayashreejohnson | Product logic, matching criteria, agent roles, deployment |
| Shageenth Sandrakumar | @shageenthsandrakumar | Backend plumbing, negotiation loop, sponsor integration |

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

The matching logic lives in one function. To contribute fit-scoring logic, implement:

```python
# app/agents/fit.py
def evaluate_fit(
    student_profile: StudentProfile,
    project: LabProject,
    conversation_history: list[dict],
) -> FitAssessment:
    ...
```

`FitAssessment = { score: float, reasoning: str, missing_info: list[str] }`

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

- **GMI:** Set `GMI_API_KEY` + `GMI_ENDPOINT` in `.env` — `llm_client.py` switches automatically
- **Phinite:** Implement the three stubs in `agent_runtime.py` with the Phinite SDK — every agent is instantly traced
>>>>>>> 68b0071 (Add README)
