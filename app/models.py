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
# Fit assessment — interface between Jayashree's logic and the loop
# ---------------------------------------------------------------------------

class FitAssessment(BaseModel):
    score: float = Field(ge=0.0, le=1.0)
    reasoning: str
    missing_info: list[str] = []


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
