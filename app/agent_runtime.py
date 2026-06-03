"""Thin agent_runtime interface with no-op stubs.

At kickoff: implement the three functions using Phinite's SDK.
Every agent already calls these so observability lights up instantly.
"""
from __future__ import annotations

from app.models import AgentMessage, AgentRole, NegotiationDecision


def register_identity(role: AgentRole, metadata: dict | None = None) -> str:
    """Register an agent identity with Phinite. Returns an agent_id string."""
    # TODO: phinite_client.register(role=role.value, project=settings.phinite_project, ...)
    return f"stub-{role.value}"


def trace_event(agent_id: str, message: AgentMessage) -> None:
    """Emit a message event to Phinite's observability layer."""
    # TODO: phinite_client.trace(agent_id=agent_id, event=message.model_dump())
    pass


def log_decision(agent_id: str, decision: NegotiationDecision, justification: str) -> None:
    """Log the mediator's terminal decision to Phinite."""
    # TODO: phinite_client.log(agent_id=agent_id, decision=decision.value, reason=justification)
    pass
