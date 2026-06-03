"""Student Agent — advocates for the student, initiates inquiry."""
from __future__ import annotations

from app.agent_runtime import register_identity, trace_event
from app.agents.fit import evaluate_fit
from app.llm_client import complete
from app.models import AgentMessage, AgentRole, FitAssessment, LabProject, MessageIntent, StudentProfile

SYSTEM_PROMPT = """You are the Student Agent in a research-match negotiation system.

Your role: Advocate for the student. Your goal is to make the strongest honest case
that this student fits this lab's project, surfacing non-obvious signals that a resume
scan would miss — side projects, hardware builds, unconventional experience.

You do NOT fabricate skills the student doesn't have. You surface real context that
makes the student look better than their paper credentials suggest.

When the professor agent raises a concern, address it directly with evidence from the
student's profile and the conversation history.

Be concise. Each message is one negotiation turn. Stay on topic.
"""


class StudentAgent:
    def __init__(self) -> None:
        self.agent_id = register_identity(AgentRole.STUDENT)

    def open_inquiry(
        self, student: StudentProfile, project: LabProject, turn: int
    ) -> AgentMessage:
        """Compose the initial inquiry message to the professor agent."""
        prompt = f"""
Student profile:
Name: {student.name} | Year: {student.year} | Field: {student.field}
Skills: {", ".join(student.skills)}
Interests: {", ".join(student.interests)}
Publications: {", ".join(student.publications) or "None"}
Intake summary: {student.intake_summary or "Not yet provided"}
Extra signals: {student.extra_signals}

Lab project:
Title: {project.project_title}
PI: {project.pi_name} at {project.university}
Description: {project.description}
Required skills: {", ".join(project.required_skills)}
Preferred background: {", ".join(project.preferred_background)}

Write a short advocacy message to the professor agent explaining why this student
should be considered. Highlight the strongest signals, especially anything non-obvious.
"""
        reply = complete(SYSTEM_PROMPT, [{"role": "user", "content": prompt}])
        msg = AgentMessage(
            from_agent=AgentRole.STUDENT,
            to_agent=AgentRole.PROFESSOR,
            intent=MessageIntent.INQUIRY,
            payload=reply,
            turn=turn,
        )
        trace_event(self.agent_id, msg)
        return msg

    def respond(
        self,
        student: StudentProfile,
        project: LabProject,
        conversation_history: list[AgentMessage],
        professor_message: AgentMessage,
        turn: int,
    ) -> AgentMessage:
        """Respond to a concern or clarification request from the professor agent."""
        history_text = _format_history(conversation_history)
        assessment: FitAssessment = evaluate_fit(
            student, project, _to_chat_dicts(conversation_history)
        )

        prompt = f"""
Negotiation so far:
{history_text}

Professor agent's latest message:
{professor_message.payload}

Fit assessment (internal, do not quote directly):
Score: {assessment.score:.2f} | Missing info: {assessment.missing_info}

Student profile summary:
{student.intake_summary or _profile_summary(student)}

Respond to the professor's concern. Be specific and evidence-based. Do not invent skills.
If missing_info lists something, ask the student implicitly (i.e. surface the signal if it exists).
"""
        reply = complete(SYSTEM_PROMPT, [{"role": "user", "content": prompt}])
        msg = AgentMessage(
            from_agent=AgentRole.STUDENT,
            to_agent=AgentRole.PROFESSOR,
            intent=MessageIntent.RESPOND,
            payload=reply,
            turn=turn,
            fit_assessment=assessment,
        )
        trace_event(self.agent_id, msg)
        return msg


def _format_history(msgs: list[AgentMessage]) -> str:
    return "\n".join(f"[Turn {m.turn}] {m.from_agent.value}: {m.payload}" for m in msgs)


def _to_chat_dicts(msgs: list[AgentMessage]) -> list[dict]:
    return [{"role": m.from_agent.value, "content": m.payload} for m in msgs]


def _profile_summary(s: StudentProfile) -> str:
    return f"{s.name}, {s.year}, {s.field}. Skills: {', '.join(s.skills)}."
