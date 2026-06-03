"""Seed the database with real lab listings and demo student profiles."""
from __future__ import annotations

import asyncio

from sqlalchemy import text

from app.database import SessionLocal, engine
from app.db_models import Base, LabProjectRow, StudentRow
from app.scraper import scrape_mit_urop


async def create_schemas():
    async with engine.begin() as conn:
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS student"))
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS lab"))
        await conn.run_sync(Base.metadata.create_all)
    print("[seed] Schemas and tables created.")


async def seed_labs():
    projects = scrape_mit_urop(limit=20)
    async with SessionLocal() as db:
        # Check if already seeded
        result = await db.execute(text("SELECT COUNT(*) FROM lab.lab_projects"))
        count = result.scalar()
        if count and count > 0:
            print(f"[seed] Labs already seeded ({count} rows). Skipping.")
            return

        for p in projects:
            db.add(LabProjectRow(
                id=p.id,
                pi_name=p.pi_name,
                lab_name=p.lab_name,
                university=p.university,
                department=p.department,
                project_title=p.project_title,
                description=p.description,
                required_skills=p.required_skills,
                preferred_background=p.preferred_background,
                openings=p.openings,
                source_url=p.source_url,
                extra_requirements=p.extra_requirements,
            ))
        await db.commit()
        print(f"[seed] Seeded {len(projects)} lab projects.")


async def seed_demo_students():
    """Seed 2 demo students — one strong-on-paper, one weak-on-paper but has hidden signal."""
    async with SessionLocal() as db:
        result = await db.execute(text("SELECT COUNT(*) FROM student.students"))
        count = result.scalar()
        if count and count > 0:
            print(f"[seed] Students already seeded ({count} rows). Skipping.")
            return

        students = [
            StudentRow(
                name="Aisha Patel",
                email="aisha@demo.edu",
                year="PhD Year 1",
                field="Computer Science",
                interests=["robotics", "machine learning", "hardware"],
                skills=["Python", "PyTorch", "ROS", "C++", "hardware"],
                publications=[],
                intake_summary=(
                    "Aisha looks weak on paper — no publications, just started PhD — but during "
                    "intake she revealed she built a custom 6-DOF robotic arm from scratch in her "
                    "garage, including custom PCBs and a PID controller written in C++. "
                    "She also contributed to an open-source ROS2 package with 400 GitHub stars."
                ),
                extra_signals={"github_stars": 400, "side_project": "6-DOF robotic arm with custom PCBs"},
            ),
            StudentRow(
                name="Marcus Chen",
                email="marcus@demo.edu",
                year="Undergrad Senior",
                field="Electrical Engineering",
                interests=["NLP", "signal processing"],
                skills=["Python", "MATLAB", "signal processing"],
                publications=["IEEE student paper on antenna design"],
                intake_summary=(
                    "Marcus is strong on paper in EE but pivoting to ML/NLP. "
                    "He has one IEEE publication in antenna design and solid Python skills. "
                    "His ML experience is limited to coursework."
                ),
                extra_signals={},
            ),
        ]
        for s in students:
            db.add(s)
        await db.commit()
        print(f"[seed] Seeded {len(students)} demo students.")


async def main():
    await create_schemas()
    await seed_labs()
    await seed_demo_students()
    print("[seed] Done.")


if __name__ == "__main__":
    asyncio.run(main())
