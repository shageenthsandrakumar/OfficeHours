"""evaluate_fit — Jayashree's interface.

She implements the body of evaluate_fit(). Everything else is wiring.
Placeholder returns a fixed FitAssessment so the loop runs end-to-end before she arrives.
"""
from __future__ import annotations

from app.models import FitAssessment, LabProject, StudentProfile


def evaluate_fit(
    student_profile: StudentProfile,
    project: LabProject,
    conversation_history: list[dict],
) -> FitAssessment:
    """Assess fit between a student and a project given the negotiation so far.

    Args:
        student_profile: Full student record including intake narrative.
        project: Lab project with requirements.
        conversation_history: List of {"role": "...", "content": "..."} dicts
            representing the negotiation turns so far.

    Returns:
        FitAssessment with score [0,1], reasoning string, and list of missing info.
    """
    # --- PLACEHOLDER — replace with Jayashree's implementation ---
    return FitAssessment(
        score=0.5,
        reasoning="Placeholder: fit logic not yet implemented.",
        missing_info=["Jayashree's evaluate_fit not yet wired in"],
    )
