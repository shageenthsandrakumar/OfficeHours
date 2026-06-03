"""evaluate_fit — deterministic rules-only dossier (v0).

Design (Jayashree's spec):
  - No LLM calls. Pure rules. Inspectable by judges.
  - Three signal sources per student:
      1. skills list (structured)
      2. intake_summary (keyword scan)
      3. extra_signals dict (ownership/trajectory heuristics)
  - Routing:
      CLEAR_MISMATCH  — missing required skill with zero evidence across all three sources
      AMBIGUOUS       — all required skills covered but gaps remain (e.g. CAD unclear for Aisha)
                        OR strong extra_signals override paper gaps
      CLEAR_FIT       — all required skills covered + no material gaps (optional path, rarely hit)
  - Demo always runs full negotiation; routing is shown on dossier regardless.
  - Transcripts / min-grade checks: not in v0. If added later, optional PI constraint
    with AMBIGUOUS + hearing when other evidence is strong — not default reject.
"""
from __future__ import annotations

import re

from app.models import Dossier, DossierDimension, DossierRouting, LabProject, StudentProfile

# ---------------------------------------------------------------------------
# Skill keyword aliases — maps a required skill token to broader synonyms
# so "ROS" matches "ROS2", "hardware" matches "PCB", "FPGA", etc.
# ---------------------------------------------------------------------------
SKILL_ALIASES: dict[str, list[str]] = {
    "python": ["python", "py ", ".py", "django", "flask", "fastapi"],
    "pytorch": ["pytorch", "torch"],
    "tensorflow": ["tensorflow", "tf ", "keras"],
    "machine learning": ["machine learning", "ml ", "sklearn", "scikit"],
    "deep learning": ["deep learning", "neural network", "cnn", "rnn", "transformer"],
    "nlp": ["nlp", "natural language", "text classification", "bert", "gpt"],
    "computer vision": ["computer vision", "cv ", "image recognition", "object detection"],
    "robotics": ["robotics", "robot", "ros", "ros2", "actuator", "kinematics"],
    "ros": ["ros", "ros2", "roslaunch", "roscpp", "rospy"],
    "hardware": ["hardware", "pcb", "fpga", "circuit", "soldering", "embedded", "microcontroller", "arduino", "raspberry pi"],
    "fpga": ["fpga", "vhdl", "verilog", "xilinx", "altera"],
    "cad": ["cad", "solidworks", "fusion 360", "autocad", "onshape", "3d printing", "3d model"],
    "c++": ["c++", "cpp", "cmake"],
    "r": [" r ", "rstudio", "tidyverse", "ggplot"],
    "matlab": ["matlab", "simulink"],
    "signal processing": ["signal processing", "fft", "filter design", "dsp"],
    "statistics": ["statistics", "statistical", "hypothesis", "regression", "bayesian"],
    "biology": ["biology", "biological", "genomics", "sequencing", "wet lab", "pcr", "cell culture"],
    "linux": ["linux", "ubuntu", "bash", "shell script", "unix"],
    "data analysis": ["data analysis", "pandas", "numpy", "data pipeline", "etl"],
}

# Extra-signal keys that indicate strong ownership / trajectory
OWNERSHIP_SIGNAL_KEYS = {
    "github_stars", "side_project", "open_source", "patent", "startup",
    "competition", "award", "publication", "capstone", "independent_project",
}


def evaluate_fit(
    student_profile: StudentProfile,
    project: LabProject,
    conversation_history: list[dict],
) -> Dossier:
    """Rules-only fit dossier. No LLM. Fully inspectable.

    Args:
        student_profile: Full student record.
        project: Lab project with requirements.
        conversation_history: Negotiation turns so far (used for re-evaluation mid-negotiation).

    Returns:
        Dossier with routing, dimensions, strengths, risks, uncertainties, and summary.
    """
    required = project.required_skills
    preferred = project.preferred_background

    # --- Build searchable text corpus from student ---
    skills_lower = [s.lower() for s in student_profile.skills]
    intake_lower = (student_profile.intake_summary or "").lower()
    signals_text = " ".join(str(v).lower() for v in student_profile.extra_signals.values())
    full_text = f"{' '.join(skills_lower)} {intake_lower} {signals_text}"

    # --- Evaluate each required skill ---
    covered: list[str] = []
    missing: list[str] = []
    covered_via: dict[str, str] = {}  # skill → how it was found

    for skill in required:
        source = _find_skill(skill, skills_lower, intake_lower, signals_text)
        if source:
            covered.append(skill)
            covered_via[skill] = source
        else:
            missing.append(skill)

    # --- Ownership / trajectory heuristics ---
    ownership_signals = {
        k: v for k, v in student_profile.extra_signals.items()
        if k in OWNERSHIP_SIGNAL_KEYS
    }
    has_strong_ownership = bool(ownership_signals)

    # --- Preferred background coverage ---
    preferred_matches = [
        p for p in preferred
        if p.lower() in full_text or any(w in full_text for w in p.lower().split())
    ]

    # --- Build dimensions ---
    dimensions: list[DossierDimension] = []

    # Dimension 1: required skill coverage
    skill_confidence = len(covered) / len(required) if required else 1.0
    skill_evidence = [f"{s} (found in {covered_via[s]})" for s in covered]
    dimensions.append(DossierDimension(
        name="required_skills",
        evidence=skill_evidence,
        assessment=(
            f"{len(covered)}/{len(required)} required skills covered."
            + (f" Missing: {', '.join(missing)}." if missing else " Full coverage.")
        ),
        confidence=skill_confidence,
        gap=f"Missing required: {', '.join(missing)}" if missing else "",
    ))

    # Dimension 2: ownership / trajectory
    ownership_confidence = 0.8 if has_strong_ownership else 0.3
    dimensions.append(DossierDimension(
        name="ownership_trajectory",
        evidence=[f"{k}: {v}" for k, v in ownership_signals.items()],
        assessment=(
            f"Strong ownership signals present: {list(ownership_signals.keys())}"
            if has_strong_ownership
            else "No notable ownership signals in extra_signals."
        ),
        confidence=ownership_confidence,
        gap="" if has_strong_ownership else "No side projects, awards, or open-source signals found.",
    ))

    # Dimension 3: preferred background
    pref_confidence = len(preferred_matches) / len(preferred) if preferred else 1.0
    dimensions.append(DossierDimension(
        name="preferred_background",
        evidence=preferred_matches,
        assessment=(
            f"Matches {len(preferred_matches)}/{len(preferred)} preferred backgrounds."
            if preferred else "No preferred background specified."
        ),
        confidence=pref_confidence,
        gap="" if not preferred or preferred_matches else f"None of: {', '.join(preferred)}",
    ))

    # --- Compute strengths, risks, uncertainties ---
    strengths: list[str] = []
    risks: list[str] = []
    uncertainties: list[str] = []

    # Strengths: covered skills + ownership signals
    for s in covered:
        source = covered_via[s]
        if source == "skills_list":
            strengths.append(f"Has '{s}' listed as a skill")
        elif source == "intake_summary":
            strengths.append(f"Demonstrated '{s}' in intake narrative")
        elif source == "extra_signals":
            strengths.append(f"Evidence of '{s}' in project signals")

    for k, v in ownership_signals.items():
        strengths.append(f"{k}: {v}")

    if student_profile.intake_summary:
        strengths.append("Has detailed intake narrative (non-obvious signals may be present)")

    # Risks: hard missing skills
    for s in missing:
        risks.append(f"Required skill '{s}' not found in skills, intake, or signals")

    if not preferred_matches and preferred:
        risks.append(f"Preferred background not matched: {', '.join(preferred)}")

    # Uncertainties: covered via soft evidence (not explicit skills list)
    for s in covered:
        if covered_via[s] != "skills_list":
            uncertainties.append(
                f"'{s}' inferred from {covered_via[s]} — not explicitly listed as a skill"
            )

    if has_strong_ownership and missing:
        uncertainties.append(
            "Strong ownership signals present but missing some required skills — "
            "ownership may compensate; negotiation needed"
        )

    # --- Routing ---
    if missing and not has_strong_ownership:
        # Missing required skill(s) with no ownership evidence to compensate
        routing = DossierRouting.CLEAR_MISMATCH
    elif not missing and not uncertainties:
        # All required skills explicitly listed, no soft inferences
        routing = DossierRouting.CLEAR_FIT
    else:
        # Either has missing skills but strong ownership, OR skills inferred from soft evidence
        routing = DossierRouting.AMBIGUOUS

    # --- Overall confidence ---
    overall_confidence = round(
        (skill_confidence * 0.6) + (ownership_confidence * 0.25) + (pref_confidence * 0.15), 2
    )

    # --- Summary ---
    summary = _build_summary(student_profile, project, covered, missing, ownership_signals, routing)

    return Dossier(
        routing=routing,
        dimensions=dimensions,
        strengths=strengths,
        risks=risks,
        uncertainties=uncertainties,
        overall_confidence=overall_confidence,
        summary=summary,
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _find_skill(skill: str, skills_lower: list[str], intake_lower: str, signals_text: str) -> str | None:
    """Return how the skill was found ('skills_list', 'intake_summary', 'extra_signals') or None."""
    skill_l = skill.lower()
    aliases = SKILL_ALIASES.get(skill_l, [skill_l])

    # 1. Explicit skills list
    for alias in aliases:
        if any(alias in s for s in skills_lower):
            return "skills_list"

    # 2. Intake summary (soft evidence)
    for alias in aliases:
        if alias in intake_lower:
            return "intake_summary"

    # 3. Extra signals (soft evidence)
    for alias in aliases:
        if alias in signals_text:
            return "extra_signals"

    return None


def _build_summary(
    student: StudentProfile,
    project: LabProject,
    covered: list[str],
    missing: list[str],
    ownership_signals: dict,
    routing: DossierRouting,
) -> str:
    parts = [
        f"{student.name} ({student.year}, {student.field}) vs '{project.project_title}' — {project.pi_name}, {project.university}.",
        f"Required skill coverage: {len(covered)}/{len(covered) + len(missing)}.",
    ]
    if missing:
        parts.append(f"Missing: {', '.join(missing)}.")
    if ownership_signals:
        parts.append(f"Ownership signals: {', '.join(f'{k}={v}' for k, v in ownership_signals.items())}.")
    parts.append({
        DossierRouting.CLEAR_FIT: "All required skills met with no material gaps — strong fit.",
        DossierRouting.CLEAR_MISMATCH: "Missing required skills with no compensating evidence — likely mismatch.",
        DossierRouting.AMBIGUOUS: "Partial or inferred skill coverage with ownership signals present — negotiation needed to resolve.",
    }[routing])
    return " ".join(parts)
