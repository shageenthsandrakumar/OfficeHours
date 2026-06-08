"""Mediator Agent — neutral, forces a terminal decision.

Receives the UNCERTAINTIES slice of the dossier — what's genuinely unclear —
plus the full negotiation transcript. Produces an auditable decision.
"""
from __future__ import annotations

from app.agent_runtime import log_decision, register_identity, trace_event
from app.llm_client import complete
from app.models import (
    AgentMessage,
    AgentRole,
    Dossier,
    LabProject,
    MessageIntent,
    NegotiationDecision,
    StudentProfile,
)

SYSTEM_PROMPT = """You are the Mediator Agent in a research-match negotiation system.

Your role: Neutral arbiter. You are loyal to neither the student nor the professor.
You observe the full negotiation and make a binding decision with an audit trail.

You MUST output your decision on the FIRST line in exactly one of these formats:
  DECISION: MATCH
  DECISION: NO_MATCH
  DECISION: NEEDS_INFO

Then provide a written justification of 2-5 sentences. Cite specific evidence from
the negotiation transcript — do not make generic statements. Name what resolved the
uncertainty (for MATCH/NO_MATCH) or what specific information is still needed (for NEEDS_INFO).

Decision rules — the line between NEEDS_INFO and NO_MATCH is critical, read carefully:

- MATCH: the transcript contains real, stated evidence that the student meets the bar.
  Actual skills or experience in the profile, not speculation and not "probably."

- NEEDS_INFO: the student's field and background are plausibly RELEVANT to the lab, but
  specific required skills or tools are simply NOT DOCUMENTED in the profile — they may have
  them and just did not write them down. Undocumented or unproven evidence is ALWAYS
  NEEDS_INFO, never NO_MATCH. Name exactly what the student would need to provide. This is
  the correct outcome for a thin-but-relevant profile EVEN IF several required skills are
  undocumented. (Example: a CS/robotics student applying to a soft-robotics lab whose
  profile does not mention Python or CAD — relevant domain, undocumented specifics.)

- NO_MATCH: a structural mismatch that more evidence could not bridge. Specifically any of:
    (a) Wrong domain / aptitude — the student's area of expertise is simply wrong for this
        lab (e.g., an Electrical Engineering major with no chemistry background applying to
        a chemistry-heavy wet lab).
    (b) Zero overlap — the profile does not contain a single mention of any skill adjacent
        or related to the lab's work. If even one adjacent or related skill is present, it
        is NOT a zero-overlap case; lean NEEDS_INFO instead.
    (c) Self-declared absence — the student or advocate explicitly states the student lacks
        a hard requirement.
    (d) Hard disqualifier — a clear eligibility bar the lab states (wrong level, or a
        required credential the student plainly lacks).
    (e) Goal misalignment — what the student wants is fundamentally opposed to what the lab
        does (e.g., the student wants pure theory; the lab is hands-on wet-lab fabrication
        only). A direction mismatch, not a skill gap.
  Do NOT choose NO_MATCH just because specific skills are undocumented in an otherwise
  relevant profile — that is NEEDS_INFO.

Before choosing NO_MATCH, apply this test: "Is this a wrong-domain / wrong-aptitude
mismatch, or just missing paperwork on specific skills in a relevant profile?" Missing
paperwork on specific skills = NEEDS_INFO. Wrong domain or demonstrated absence = NO_MATCH.

Never credit a claim the professor showed was unsupported, and never reward "probably has
it" reasoning. No fabricated matches. Your justification must be inspectable.
"""


class MediatorAgent:
    def __init__(self) -> None:
        self.agent_id = register_identity(AgentRole.MEDIATOR)

    def decide(
        self,
        student: StudentProfile,
        project: LabProject,
        conversation_history: list[AgentMessage],
        turn: int,
        force_terminal: bool = False,
        dossier: Dossier | None = None,
    ) -> tuple[AgentMessage, NegotiationDecision]:
        """Review the negotiation transcript and dossier uncertainties, emit a decision."""
        history_text = _format_history(conversation_history)

        uncertainties_block = ""
        if dossier and dossier.uncertainties:
            uncertainties_block = "\nDossier uncertainties that triggered this negotiation:\n" + \
                "\n".join(f"- {u}" for u in dossier.uncertainties)

        summary_block = f"\nDossier summary: {dossier.summary}" if dossier and dossier.summary else ""

        prompt = f"""
Full negotiation transcript:
{history_text}
{uncertainties_block}
{summary_block}

{'IMPORTANT: This is the final turn, give a terminal decision now. MATCH if the evidence confirms fit. NEEDS_INFO if the domain is relevant but specific required skills are merely undocumented (name them) — correct EVEN IF several are undocumented. NO_MATCH ONLY for a fundamental wrong-domain or wrong-aptitude mismatch, or a demonstrated/stated absence of a hard requirement.' if force_terminal else ''}

Issue your decision now. Cite specific evidence from the transcript in your justification.
"""
        reply = complete(SYSTEM_PROMPT, [{"role": "user", "content": prompt}], max_tokens=512)
        decision = _parse_decision(reply)

        msg = AgentMessage(
            from_agent=AgentRole.MEDIATOR,
            to_agent=AgentRole.SYSTEM,
            intent=MessageIntent.DECIDE,
            payload=reply,
            turn=turn,
        )
        trace_event(self.agent_id, msg)
        log_decision(self.agent_id, decision, reply)
        return msg, decision


def _parse_decision(text: str) -> NegotiationDecision:
    """Parse the mediator's decision. NEEDS_INFO is a valid terminal outcome
    (thin-evidence case), so it is never force-converted to NO_MATCH."""
    upper = text.upper()
    # Check NO_MATCH before MATCH, since "DECISION: NO_MATCH" contains "MATCH".
    if "DECISION: NO_MATCH" in upper:
        return NegotiationDecision.NO_MATCH
    if "DECISION: NEEDS_INFO" in upper:
        return NegotiationDecision.NEEDS_INFO
    if "DECISION: MATCH" in upper:
        return NegotiationDecision.MATCH
    # Loose fallbacks if the model drifted from the format.
    if "NO_MATCH" in upper:
        return NegotiationDecision.NO_MATCH
    if "NEEDS_INFO" in upper:
        return NegotiationDecision.NEEDS_INFO
    if "MATCH" in upper:
        return NegotiationDecision.MATCH
    return NegotiationDecision.NEEDS_INFO  # safest honest default: inconclusive


def _format_history(msgs: list[AgentMessage]) -> str:
    return "\n".join(f"[Turn {m.turn}] {m.from_agent.value}: {m.payload}" for m in msgs)
