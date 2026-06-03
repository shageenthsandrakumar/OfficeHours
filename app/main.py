"""FastAPI application."""
from __future__ import annotations

from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.db_models import LabProjectRow, NegotiationLogRow, StudentRow
from app.models import (
    FitAssessment,
    LabProject,
    NegotiationResult,
    StudentProfile,
)
from app.negotiation import run_negotiation

app = FastAPI(title="Research Match", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Students
# ---------------------------------------------------------------------------

@app.get("/students", response_model=list[StudentProfile])
async def list_students(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(StudentRow))).scalars().all()
    return [_row_to_student(r) for r in rows]


@app.get("/students/{student_id}", response_model=StudentProfile)
async def get_student(student_id: UUID, db: AsyncSession = Depends(get_db)):
    row = await db.get(StudentRow, student_id)
    if not row:
        raise HTTPException(status_code=404, detail="Student not found")
    return _row_to_student(row)


@app.post("/students", response_model=StudentProfile, status_code=201)
async def create_student(profile: StudentProfile, db: AsyncSession = Depends(get_db)):
    db.add(StudentRow(
        id=profile.id,
        name=profile.name,
        email=profile.email,
        year=profile.year,
        field=profile.field,
        interests=profile.interests,
        skills=profile.skills,
        publications=profile.publications,
        extra_signals=profile.extra_signals,
        intake_summary=profile.intake_summary,
    ))
    await db.commit()
    return profile


# ---------------------------------------------------------------------------
# Lab projects
# ---------------------------------------------------------------------------

@app.get("/projects", response_model=list[LabProject])
async def list_projects(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(LabProjectRow))).scalars().all()
    return [_row_to_project(r) for r in rows]


@app.get("/projects/{project_id}", response_model=LabProject)
async def get_project(project_id: UUID, db: AsyncSession = Depends(get_db)):
    row = await db.get(LabProjectRow, project_id)
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    return _row_to_project(row)


# ---------------------------------------------------------------------------
# Negotiation
# ---------------------------------------------------------------------------

@app.post("/negotiate", response_model=NegotiationResult)
async def negotiate(
    student_id: UUID,
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    student_row = await db.get(StudentRow, student_id)
    project_row = await db.get(LabProjectRow, project_id)
    if not student_row:
        raise HTTPException(status_code=404, detail="Student not found")
    if not project_row:
        raise HTTPException(status_code=404, detail="Project not found")

    student = _row_to_student(student_row)
    project = _row_to_project(project_row)

    result = run_negotiation(student, project)

    db.add(NegotiationLogRow(
        id=result.conversation[0].id if result.conversation else None,
        student_id=result.student_id,
        project_id=result.project_id,
        decision=result.decision.value,
        justification=result.justification,
        turns_used=result.turns_used,
        conversation=[m.model_dump(mode="json") for m in result.conversation],
    ))
    await db.commit()
    return result


@app.get("/negotiations", response_model=list[dict])
async def list_negotiations(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(NegotiationLogRow))).scalars().all()
    return [
        {
            "id": str(r.id),
            "student_id": str(r.student_id),
            "project_id": str(r.project_id),
            "decision": r.decision,
            "turns_used": r.turns_used,
            "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _row_to_student(r: StudentRow) -> StudentProfile:
    return StudentProfile(
        id=r.id,
        name=r.name,
        email=r.email,
        year=r.year,
        field=r.field,
        interests=r.interests or [],
        skills=r.skills or [],
        publications=r.publications or [],
        extra_signals=r.extra_signals or {},
        intake_summary=r.intake_summary or "",
    )


def _row_to_project(r: LabProjectRow) -> LabProject:
    return LabProject(
        id=r.id,
        pi_name=r.pi_name,
        lab_name=r.lab_name,
        university=r.university,
        department=r.department,
        project_title=r.project_title,
        description=r.description,
        required_skills=r.required_skills or [],
        preferred_background=r.preferred_background or [],
        openings=r.openings,
        source_url=r.source_url or "",
        extra_requirements=r.extra_requirements or {},
    )
