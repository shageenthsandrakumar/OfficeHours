"""Mediator Agent — neutral, forces a terminal decision."""
from __future__ import annotations

from app.agent_runtime import log_decision, register_identity, trace_event
from app.agents.fit import evaluate_fit
from app.llm_client import complete
from app.models import (
    AgentMessage,
    AgentRole,
    LabProject,
    MessageIntent,
    NegotiationDecision,
    StudentProfile,
)

SYSTEM_PROMPT = """You are the Mediator Agent in a research-match negotiation system.

Your role: Neutral arbiter. You are loyal to neither the student nor the professor.
You observe the full negotiation and make a binding decision.

You MUST output your decision on the FIRST line in exactly one of these formats:
  DECISION: MATCH
  DECISION: NO_MATCH
  DECISION: NEEDS_INFO

Then provide a written justification of 2-5 sentences explaining what tipped your decision.

Rules:
- MATCH: The negotiation produced sufficient evidence that this student fits this project.
- NO_MATCH: The negotiation revealed a clear and unresolvable mismatch.
- NEEDS_INFO: There is a specific gap that, if clarified, could change the outcome.
  Only use NEEDS_INFO if a decision genuinely cannot be made yet — do not use it to delay.
  NEEDS_INFO is not available once the turn cap is reached.

You cannot declare MATCH without reviewing the negotiation. No fabricated matches.
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
    ) -> AgentMessage:
        """Review the negotiation and emit a decision."""
        history_text = _format_history(conversation_history)
        assessment = evaluate_fit(
            student, project, _to_chat_dicts(conversation_history)
        )

        prompt = f"""
Full negotiation transcript:
{history_text}

Fit assessment summary:
Score: {assessment.score:.2f}
Reasoning: {assessment.reasoning}
Missing info: {assessment.missing_info}

{'IMPORTANT: The turn cap has been reached. You MUST issue MATCH or NO_MATCH. NEEDS_INFO is not allowed.' if force_terminal else ''}

Issue your decision now.
"""
        reply = complete(SYSTEM_PROMPT, [{"role": "user", "content": prompt}], max_tokens=512)
        decision = _parse_decision(reply, force_terminal)

        msg = AgentMessage(
            from_agent=AgentRole.MEDIATOR,
            to_agent=AgentRole.SYSTEM,
            intent=MessageIntent.DECIDE,
            payload=reply,
            turn=turn,
            fit_assessment=assessment,
        )
        trace_event(self.agent_id, msg)
        log_decision(self.agent_id, decision, reply)
        return msg, decision


def _parse_decision(text: str, force_terminal: bool) -> NegotiationDecision:
    upper = text.upper()
    if "DECISION: MATCH" in upper and "NO_MATCH" not in upper:
        return NegotiationDecision.MATCH
    if "DECISION: NO_MATCH" in upper:
        return NegotiationDecision.NO_MATCH
    if "DECISION: NEEDS_INFO" in upper and not force_terminal:
        return NegotiationDecision.NEEDS_INFO
    # fallback when model doesn't follow format exactly
    if "NO_MATCH" in upper:
        return NegotiationDecision.NO_MATCH
    if force_terminal:
        return NegotiationDecision.NO_MATCH  # conservative fallback at cap
    return NegotiationDecision.NEEDS_INFO


def _format_history(msgs: list[AgentMessage]) -> str:
    return "\n".join(f"[Turn {m.turn}] {m.from_agent.value}: {m.payload}" for m in msgs)


def _to_chat_dicts(msgs: list[AgentMessage]) -> list[dict]:
    return [{"role": m.from_agent.value, "content": m.payload} for m in msgs]
