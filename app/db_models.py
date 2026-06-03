"""SQLAlchemy ORM models — two schemas: student, lab."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# student schema
# ---------------------------------------------------------------------------

class StudentRow(Base):
    __tablename__ = "students"
    __table_args__ = {"schema": "student"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(256))
    email: Mapped[str] = mapped_column(String(256), unique=True)
    year: Mapped[str] = mapped_column(String(64))
    field: Mapped[str] = mapped_column(String(256))
    interests: Mapped[list] = mapped_column(JSON, default=list)
    skills: Mapped[list] = mapped_column(JSON, default=list)
    publications: Mapped[list] = mapped_column(JSON, default=list)
    extra_signals: Mapped[dict] = mapped_column(JSON, default=dict)
    intake_summary: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


# ---------------------------------------------------------------------------
# lab schema
# ---------------------------------------------------------------------------

class LabProjectRow(Base):
    __tablename__ = "lab_projects"
    __table_args__ = {"schema": "lab"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pi_name: Mapped[str] = mapped_column(String(256))
    lab_name: Mapped[str] = mapped_column(String(256))
    university: Mapped[str] = mapped_column(String(256))
    department: Mapped[str] = mapped_column(String(256))
    project_title: Mapped[str] = mapped_column(String(512))
    description: Mapped[str] = mapped_column(Text)
    required_skills: Mapped[list] = mapped_column(JSON, default=list)
    preferred_background: Mapped[list] = mapped_column(JSON, default=list)
    openings: Mapped[int] = mapped_column(Integer, default=1)
    source_url: Mapped[str] = mapped_column(String(1024), default="")
    extra_requirements: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


# ---------------------------------------------------------------------------
# Negotiation log (no schema prefix — shared)
# ---------------------------------------------------------------------------

class NegotiationLogRow(Base):
    __tablename__ = "negotiation_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    decision: Mapped[str] = mapped_column(String(16))
    justification: Mapped[str] = mapped_column(Text)
    turns_used: Mapped[int] = mapped_column(Integer)
    conversation: Mapped[list] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
