"""Pydantic models for the research-match domain."""
from __future__ import annotations

from enum import Enum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Domain models
# ---------------------------------------------------------------------------

class StudentProfile(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    name: str
    email: str
    year: str                          # e.g. "PhD Year 2", "Undergrad Junior"
    field: str                         # e.g. "Computer Science"
    interests: list[str] = []
    skills: list[str] = []
    publications: list[str] = []
    # Flexible signal fields — Jayashree extends without migration pain
    extra_signals: dict[str, Any] = {}
    # Rich intake narrative built by Student Agent
    intake_summary: str = ""


class LabProject(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    pi_name: str
    lab_name: str
    university: str
    department: str
    project_title: str
    description: str
    required_skills: list[str] = []
    preferred_background: list[str] = []
    openings: int = 1
    source_url: str = ""
    # Flexible requirement fields — Jayashree extends
    extra_requirements: dict[str, Any] = {}


# ---------------------------------------------------------------------------
# Dossier — structured fit assessment, interface between Jayashree's logic
# and the negotiation loop
# ---------------------------------------------------------------------------

class DossierRouting(str, Enum):
    CLEAR_FIT = "CLEAR_FIT"           # skip agents, auto-match
    CLEAR_MISMATCH = "CLEAR_MISMATCH" # skip agents, auto-reject
    AMBIGUOUS = "AMBIGUOUS"           # run full negotiation


class DossierDimension(BaseModel):
    """One evaluated dimension of fit (e.g. skills, trajectory, ownership)."""
    name: str
    evidence: list[str] = []          # pointers into student.extra_signals / skills
    assessment: str                   # 1-2 sentence evaluation
    confidence: float = Field(ge=0.0, le=1.0)
    gap: str = ""                     # what's missing or unclear, if anything


class Dossier(BaseModel):
    """Structured fit dossier produced before agents are invoked.

    Field semantics follow OfficeHours Logic v0 §3 (Jayashree's contract).
    """
    routing: DossierRouting
    dimensions: list[DossierDimension] = []
    strengths: list[str] = []         # student-advocate slice — what to advocate for
    risks: list[str] = []             # professor/gate slice — skill_gaps + preferred-bg gap
    uncertainties: list[str] = []     # mediator slice — open questions (max 2), §3.5
    skills_met: str = ""              # e.g. "3/4" — coverage of required skills
    skill_gaps: list[str] = []        # required skills not explicitly met, §3.2
    routing_reason: str = ""          # one-line why-this-routing, §3.6
    overall_confidence: float = Field(ge=0.0, le=1.0, default=0.5)
    summary: str = ""                 # human-readable one-paragraph overview

    # --- naming aliases so code following the v0 doc / older code still works ---
    @property
    def score(self) -> float:
        return self.overall_confidence

    @property
    def open_questions(self) -> list[str]:
        return self.uncertainties

    @property
    def missing_info(self) -> list[str]:
        return self.uncertainties


# Keep FitAssessment as an alias so Jayashree's stub signature is unchanged
FitAssessment = Dossier


# ---------------------------------------------------------------------------
# Agent message envelope
# ---------------------------------------------------------------------------

class AgentRole(str, Enum):
    STUDENT = "student"
    PROFESSOR = "professor"
    MEDIATOR = "mediator"
    SYSTEM = "system"


class MessageIntent(str, Enum):
    INQUIRY = "inquiry"
    SCREEN = "screen"
    CLARIFY = "clarify"
    RESPOND = "respond"
    DECIDE = "decide"


class AgentMessage(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    from_agent: AgentRole
    to_agent: AgentRole
    intent: MessageIntent
    payload: str                       # free-text turn content
    turn: int
    fit_assessment: FitAssessment | None = None
    metadata: dict[str, Any] = {}


# ---------------------------------------------------------------------------
# Negotiation result
# ---------------------------------------------------------------------------

class NegotiationDecision(str, Enum):
    MATCH = "MATCH"
    NO_MATCH = "NO_MATCH"
    NEEDS_INFO = "NEEDS_INFO"


class NegotiationResult(BaseModel):
    decision: NegotiationDecision
    justification: str
    turns_used: int
    conversation: list[AgentMessage]
    student_id: UUID
    project_id: UUID
