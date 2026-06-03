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
    # Stems chosen per v0 doc §4: python↔pytorch, robotics↔ros/robotic/arm,
    # hardware↔pcb/fabricat/actuator, cad↔3d print/solidworks/fusion.
    "python": ["python", "pytorch", "py ", ".py", "django", "flask", "fastapi"],
    "pytorch": ["pytorch", "torch"],
    "tensorflow": ["tensorflow", "tf ", "keras"],
    "machine learning": ["machine learning", "ml ", "sklearn", "scikit"],
    "deep learning": ["deep learning", "neural network", "cnn", "rnn", "transformer"],
    "nlp": ["nlp", "natural language", "text classification", "bert", "gpt"],
    "computer vision": ["computer vision", "cv ", "image recognition", "object detection"],
    "robotics": ["robotics", "robotic", "robot arm", "ros", "ros2", "actuator", "kinematics"],
    "ros": ["ros", "ros2", "roslaunch", "roscpp", "rospy"],
    "hardware": ["hardware", "pcb", "fabricat", "circuit", "soldering", "embedded",
                 "microcontroller", "arduino", "raspberry pi", "fpga"],
    "fpga": ["fpga", "vhdl", "verilog", "xilinx", "altera"],
    # NOTE: CAD stays a GAP for Aisha — her arm story has no cad/3d-print/fusion token.
    "cad": ["cad", "solidworks", "fusion", "autocad", "onshape", "3d print", "3d model"],
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

    # --- conversation_history can resolve open questions mid-negotiation (§4) ---
    convo_text = " ".join(str(t.get("content", "")).lower() for t in (conversation_history or []))

    # A skill gap is "resolved" if the negotiation has surfaced its evidence.
    resolved_gaps = {
        s for s in missing
        if any(alias in convo_text for alias in SKILL_ALIASES.get(s.lower(), [s.lower()]))
    }
    effective_missing = [s for s in missing if s not in resolved_gaps]

    # --- Strengths (student-advocate slice) ---
    strengths: list[str] = []
    for s in covered:
        source = covered_via[s]
        if source == "skills_list":
            strengths.append(f"Has '{s}' as a listed skill")
        elif source == "intake_summary":
            strengths.append(f"Demonstrated '{s}' in intake narrative")
        elif source == "extra_signals":
            strengths.append(f"Evidence of '{s}' in project signals")
    for k, v in ownership_signals.items():
        strengths.append(f"{k}: {v}")
    if student_profile.intake_summary:
        strengths.append("Detailed intake narrative — non-obvious signals present")

    # --- Risks (professor/gate slice): skill_gaps + preferred-background gap ---
    risks: list[str] = []
    for s in effective_missing:
        risks.append(f"Required skill '{s}' not explicit in skills, intake, or signals")
    if not preferred_matches and preferred:
        risks.append(f"Preferred background not matched: {', '.join(preferred)}")

    # --- Open questions / uncertainties (mediator slice), capped at 2 per §3.5 ---
    uncertainties: list[str] = []
    # Priority 1: learnable skill gaps — phrase as a question, not a hard reject
    for s in effective_missing:
        uncertainties.append(
            f"{s}: does the student have hands-on {s}? Implied by build experience but not explicit."
        )
    # Priority 2: soft preferred-background gap
    if not preferred_matches and preferred:
        uncertainties.append(
            f"Background is {student_profile.field}, not {' / '.join(preferred)} — "
            "weigh project evidence in negotiation, not auto-reject."
        )
    # Priority 3: skills met only via soft inference
    for s in covered:
        if covered_via[s] != "skills_list":
            uncertainties.append(f"'{s}' inferred from {covered_via[s]} — confirm depth in negotiation.")
    uncertainties = uncertainties[:2]  # max 2 (§3.5)

    # --- Routing (§4) ---
    # CLEAR_MISMATCH only when a required skill has zero evidence AND no ownership to compensate.
    if effective_missing and not has_strong_ownership:
        routing = DossierRouting.CLEAR_MISMATCH
        routing_reason = (
            f"Required skill(s) {effective_missing} have no evidence and no compensating "
            "ownership signals."
        )
    elif not effective_missing and not uncertainties:
        routing = DossierRouting.CLEAR_FIT
        routing_reason = "All required skills met with explicit evidence; no material gaps."
    else:
        routing = DossierRouting.AMBIGUOUS
        if effective_missing and has_strong_ownership:
            routing_reason = (
                f"Core skills met except {effective_missing}; strong ownership overrides weak "
                "paper profile; preferred-background gap is soft only."
            )
        else:
            routing_reason = "Partial or inferred skill coverage; agent hearing needed to resolve."

    # --- Overall confidence ---
    overall_confidence = round(
        (skill_confidence * 0.6) + (ownership_confidence * 0.25) + (pref_confidence * 0.15), 2
    )

    # --- Summary ---
    summary = _build_summary(
        student_profile, project, covered, effective_missing, ownership_signals, routing
    )

    return Dossier(
        routing=routing,
        dimensions=dimensions,
        strengths=strengths,
        risks=risks,
        uncertainties=uncertainties,
        skills_met=f"{len(covered)}/{len(required)}" if required else "n/a",
        skill_gaps=effective_missing,
        routing_reason=routing_reason,
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
