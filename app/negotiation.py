"""Negotiation loop: Student -> Professor -> Mediator, multi-turn, hard turn cap."""
from __future__ import annotations

from app.agents.mediator_agent import MediatorAgent
from app.agents.professor_agent import ProfessorAgent
from app.agents.student_agent import StudentAgent
from app.config import settings
from app.models import AgentMessage, LabProject, NegotiationDecision, NegotiationResult, StudentProfile


def run_negotiation(student: StudentProfile, project: LabProject) -> NegotiationResult:
    """Run the full 3-agent negotiation and return the terminal result.

    Turn structure per cycle:
      Student  -> Professor  (inquiry / respond)
      Professor -> Student   (screen / clarify)
      Mediator observes; decides at cap or when ready.

    Hard cap: settings.max_turns (default 6). Mediator is forced to MATCH/NO_MATCH at cap.
    """
    student_agent = StudentAgent()
    professor_agent = ProfessorAgent()
    mediator_agent = MediatorAgent()

    history: list[AgentMessage] = []
    turn = 0

    # Turn 1: Student opens
    turn += 1
    student_msg = student_agent.open_inquiry(student, project, turn)
    history.append(student_msg)
    _print_turn(student_msg)

    while turn < settings.max_turns:
        # Professor screens
        turn += 1
        prof_msg = professor_agent.screen(student, project, history, history[-1], turn)
        history.append(prof_msg)
        _print_turn(prof_msg)

        # Check if mediator wants to decide mid-negotiation (every professor turn)
        at_cap = turn >= settings.max_turns
        mediator_msg, decision = mediator_agent.decide(
            student, project, history, turn + 1, force_terminal=at_cap
        )
        history.append(mediator_msg)
        _print_turn(mediator_msg)

        if decision != NegotiationDecision.NEEDS_INFO or at_cap:
            return NegotiationResult(
                decision=decision,
                justification=mediator_msg.payload,
                turns_used=turn,
                conversation=history,
                student_id=student.id,
                project_id=project.id,
            )

        # Student responds to professor
        turn += 1
        student_resp = student_agent.respond(student, project, history, prof_msg, turn)
        history.append(student_resp)
        _print_turn(student_resp)

    # Should not reach here, but safety net
    mediator_msg, decision = mediator_agent.decide(
        student, project, history, turn + 1, force_terminal=True
    )
    history.append(mediator_msg)
    return NegotiationResult(
        decision=decision,
        justification=mediator_msg.payload,
        turns_used=turn,
        conversation=history,
        student_id=student.id,
        project_id=project.id,
    )


def _print_turn(msg: AgentMessage) -> None:
    bar = "─" * 60
    print(f"\n{bar}")
    print(f"  Turn {msg.turn} | {msg.from_agent.value.upper()} -> {msg.to_agent.value.upper()} [{msg.intent.value}]")
    print(bar)
    print(msg.payload)
