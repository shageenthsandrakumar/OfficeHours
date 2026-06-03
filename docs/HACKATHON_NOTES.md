# OfficeHours — hackathon handoff & project context

> **Purpose:** Single source of truth before switching workspaces or onboarding a new session.  
> **Canonical repo path:** `/Users/jayashreejohnson/Downloads/OfficeHours`  
> **Not** `OfficeHours-main` (Cursor may still show that slug; disk project is `OfficeHours`).

---

## 1. What this project is

**OfficeHours** — evidence-first **person ↔ opportunity coordination** for campus research/lab matching. Built for **NY Tech Week — AI Agents: From Prototype to Production** (2026-06-03).

**Thesis (locked):**

- Not GPA ranking, embeddings, or resume-first matching.
- Not separate student/professor portals — **one shared coordination surface**.
- **Deterministic dossier first** (`evaluate_fit` in `app/agents/fit.py`) — rules-only, inspectable, no LLM.
- **Three LLM agents only when routing is `AMBIGUOUS`** — Student (advocate), Professor (gate), Mediator (arbiter).
- `CLEAR_FIT` / `CLEAR_MISMATCH` short-circuit with **0 agent turns**.

**Demo narrative:** Aisha Patel × MIT Soft Robotics → dossier **`AMBIGUOUS`** (CAD gap, strong ownership) → agents → **`MATCH`**. Marcus Chen × Clinical NLP → **`CLEAR_MISMATCH`** (agents skipped).

**Repo:** https://github.com/jayashreejohnson/OfficeHours

**Team:**

| Person | Focus |
|--------|--------|
| **Jayashree Johnson** | Product, dossier spec, routing language, frontend/UI, demo, deployment |
| **Shageenth Sandrakumar** | FastAPI, DB, agent orchestration, sponsor integrations |

---

## 2. Architecture (backend)

```
FastAPI + PostgreSQL (student.*, lab.*) + negotiation_logs
        │
        ▼
run_negotiation()  →  evaluate_fit()  →  Dossier
        │                    │
        │         CLEAR_FIT / CLEAR_MISMATCH → immediate MATCH / NO_MATCH
        │                    │
        └──────── AMBIGUOUS → student → professor → mediator (≤6 turns)
```

| Layer | Location |
|-------|----------|
| Models | `app/models.py` — `StudentProfile`, `LabProject`, `Dossier`, `NegotiationResult` |
| Fit rules | `app/agents/fit.py` — `evaluate_fit()` |
| Orchestration | `app/negotiation.py` — `run_negotiation()` |
| Agents | `app/agents/student_agent.py`, `professor_agent.py`, `mediator_agent.py` |
| LLM | `app/llm_client.py` (Anthropic; GMI optional) |
| API | `app/main.py` |
| Seed | `app/seed.py` — MIT UROP scrape + demo students |
| No-DB demo | `demo.py` — in-memory Aisha × soft robotics |
| Phinite | `app/agent_runtime.py` — stubs |

### Dossier routing → user-facing language (never show enums in UI)

| `DossierRouting` | UI moment |
|------------------|-----------|
| `CLEAR_FIT` | Ready to Connect |
| `CLEAR_MISMATCH` | Not the Right Moment |
| `AMBIGUOUS` | Worth a Closer Look |

| `NegotiationDecision` | UI recommendation (when agents ran) |
|-----------------------|-------------------------------------|
| `MATCH` | A Conversation Makes Sense |
| `NO_MATCH` | Not the Right Fit Right Now |
| `NEEDS_INFO` | More Clarity Would Help |

Other mappings: dossier body → **What We Noticed**; agent transcript → **A Short Conversation** (only if ambiguous + conversation exists).

### API (current)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/health` | OK check |
| GET/POST | `/students`, `/students/{id}` | Profiles |
| GET | `/projects`, `/projects/{id}` | Lab projects |
| POST | `/negotiate?student_id=&project_id=` | Returns **`NegotiationResult` only** — dossier computed internally, **not in JSON** |
| GET | `/negotiations` | Log summaries |

**CORS:** `allow_origins=["*"]` — frontend can call API once wired.

### Backend assumptions for frontend

1. **`SharedNotePayload`** shape (target API contract):

   ```json
   { "student", "project", "dossier", "result" }
   ```

2. **Institutional links** live at `project.extra_requirements.links`:

   ```json
   {
     "lab_website": "https://...",
     "faculty_profile": "https://...",
     "project_page": "https://...",
     "office_hours": "https://...",
     "application_form": "https://...",
     "department_page": "https://..."
   }
   ```

   Fallback: `project.source_url` for `lab_website` / `project_page` when link missing.

3. **Coordination actions** (`request_introduction`, `invite_to_chat`) — product stubs in v1; no email sent yet.

4. **Negotiation** requires `ANTHROPIC_API_KEY` for full agent loop; dossier works without keys (`python3 demo.py` prints dossier block).

5. **Install quirk:** `pip install -e .` may fail on `pyproject.toml` build-backend; install deps explicitly per README.

---

## 3. Shared Note experience (locked product direction)

**Concept:** **Shared Note** — warm, optimistic, card-based coordination brief. Not PDF, ATS, or dashboard.

**Not two apps:** viewer lens toggle **`For me`** | **`For my project`** on the same note (changes Home framing + primary CTA in Suggested Next Step only).

### Scroll order (locked)

```
Home (Moment Cards)
  → Cover
  → About the Person
  → About the Opportunity
  → What We Noticed (hero)
  → A Short Conversation (only if Worth a Closer Look + transcript)
  → Recommendation
  → Suggested Next Step
```

### Visual direction

- Warm cream background, coral / sage / honey accents
- Human copy only — no routing enums, scores, or agent role names in UI

### Suggested Next Step (refined, locked section)

Spec: `docs/SUGGESTED_NEXT_STEP.md`

- **Emotion:** gentle doorway; one small reversible step
- **Hierarchy:** frame line → **one primary** → Explore (links) → Connect (coordination)
- **Primary rules:**
  - Positive fit + **For me** → Request Introduction
  - Positive fit + **For my project** → Invite to Chat
  - Negative fit → best Explore link only; Connect hidden
- **Extensibility:** `NextStepKind` registry + `buildNextStepActions()` — new action types without layout redesign
- **Missing links:** show row as “Not shared yet”; never broken `href`
- **Mobile:** full-width primary; single-column Explore
- **Desktop:** 2-column Explore grid; Connect side-by-side

---

## 4. Frontend direction & implementation status

**Location:** `/Users/jayashreejohnson/Downloads/OfficeHours/frontend`

**Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4

**Run:**

```bash
cd /Users/jayashreejohnson/Downloads/OfficeHours/frontend
npm install
npm run dev
```

- Home: http://localhost:3000  
- Aisha demo: `/note/11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222`  
- Marcus demo: `/note/33333333-3333-3333-3333-333333333333/44444444-4444-4444-4444-444444444444`

### Phase status

| Phase | Status |
|-------|--------|
| Types mirroring `app/models.py` | ✅ Done |
| Mock fixtures (Aisha/AMBIGUOUS, Marcus/CLEAR_MISMATCH) | ✅ Done |
| View-model mappers (`viewModel.ts`) | ✅ Done |
| Routes `/` + `/note/[studentId]/[projectId]` | ✅ Done |
| Shared Note sections (full scroll order) | ✅ Done |
| Suggested Next Step registry + UI | ✅ Done |
| API integration (`POST /negotiate` + dossier in response) | ⏳ Not started |
| Real coordination / email | ⏳ Out of scope v1 |

### Key frontend files

```
frontend/src/
  lib/types.ts
  lib/viewModel.ts
  lib/mock/notes.ts
  lib/nextSteps/registry.ts
  lib/nextSteps/buildActions.ts
  components/ViewerLensToggle.tsx
  components/shared-note/SharedNoteView.tsx
  components/shared-note/SuggestedNextStep.tsx
  app/page.tsx
  app/note/[studentId]/[projectId]/page.tsx
```

**Coordination stubs:** alert placeholder — no backend call yet.

---

## 5. Workspace & environment notes

| Item | Detail |
|------|--------|
| **Use this folder** | `/Users/jayashreejohnson/Downloads/OfficeHours` |
| **Avoid** | `OfficeHours-main` (empty/stale in this setup) |
| **Cursor project slug** | May still say `OfficeHours-main` under `.cursor/projects/` |
| **Agent terminal** | Often failed with `spawn /bin/zsh ENOENT` — run `npm` in user’s local terminal |
| **Open in Cursor** | File → Open Folder → `OfficeHours` |

---

## 6. Immediate next steps (recommended)

1. **Open workspace** at `/Users/jayashreejohnson/Downloads/OfficeHours` (not `-main`).
2. **Run frontend** locally (`npm install && npm run dev` in `frontend/`).
3. **Backend for UI:** extend `POST /negotiate` to return `{ student, project, dossier, result }`; add fetch layer in frontend (replace `getMockNote`).
4. **Seed/demo links:** ensure Soft Robotics project has `extra_requirements.links` in DB seed for production parity with mocks.
5. **Deploy:** Railway (mentioned in README team section) — wire frontend env to API URL.
6. **Judge demo:** `python3 demo.py` for dossier + agents; browser for Shared Note UX.

---

## 7. Related docs in repo

| File | Contents |
|------|----------|
| `README.md` | Judge snapshot, architecture, API, setup |
| `docs/SUGGESTED_NEXT_STEP.md` | Locked next-step section spec |
| `docs/FRONTEND_IMPLEMENTATION.md` | Frontend phase plan |
| `docs/HACKATHON_NOTES.md` | This file |

---

*Last updated: 2026-06-03 — reflects Shared Note approval, Suggested Next Step refinement, and frontend scaffold with mocks.*
