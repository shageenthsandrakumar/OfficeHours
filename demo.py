"""Run the 3-agent negotiation loop end-to-end on sample data.

Usage:
  python demo.py

No database required. Uses in-memory sample profiles.
Requires ANTHROPIC_API_KEY in .env.
"""
from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()

from app.models import LabProject, StudentProfile
from app.negotiation import run_negotiation


def main():
    # Demo student: weak on paper, but has a hidden hardware signal
    student = StudentProfile(
        name="Aisha Patel",
        email="aisha@demo.edu",
        year="PhD Year 1",
        field="Computer Science",
        interests=["robotics", "machine learning", "hardware"],
        skills=["Python", "PyTorch", "ROS", "C++", "hardware"],
        publications=[],
        intake_summary=(
            "Aisha looks weak on paper — no publications, just started PhD — but during intake she "
            "revealed she built a complete 6-DOF robotic arm from scratch in her garage, including "
            "custom PCBs and a PID controller written in C++. She also contributed to an open-source "
            "ROS2 package that has 400 GitHub stars."
        ),
        extra_signals={"github_stars": 400, "side_project": "6-DOF robotic arm with custom PCBs"},
    )

    # Target project: soft robotics lab at MIT — hardware experience is key
    project = LabProject(
        pi_name="Daniela Rus",
        lab_name="CSAIL Distributed Robotics Lab",
        university="MIT",
        department="EECS",
        project_title="Soft Robotics for Minimally Invasive Surgery",
        description=(
            "We are developing soft robotic systems for medical applications. Students will design, "
            "fabricate, and test soft actuators and integrate sensor feedback. Experience with CAD, "
            "3D printing, and Python control scripts preferred. Background in mechanical engineering "
            "or biomedical engineering a plus."
        ),
        required_skills=["Python", "CAD", "hardware", "robotics"],
        preferred_background=["Mechanical Engineering", "Biomedical Engineering"],
    )

    print("\n" + "=" * 60)
    print("  RESEARCH-MATCH — 3-AGENT NEGOTIATION DEMO")
    print("=" * 60)
    print(f"\nStudent: {student.name} ({student.year}, {student.field})")
    print(f"Project: {project.project_title} — {project.pi_name}, {project.university}")
    print()

    result = run_negotiation(student, project)

    print("\n" + "=" * 60)
    print(f"  FINAL DECISION: {result.decision.value}")
    print(f"  Turns used: {result.turns_used}")
    print("=" * 60)
    print(result.justification)


if __name__ == "__main__":
    main()
