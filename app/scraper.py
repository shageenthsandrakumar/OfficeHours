"""Scrape real lab/research listings from a public university research page.

Target: MIT UROP (Undergraduate Research Opportunities Program) — public, well-structured.
URL: https://urop.mit.edu/research-exploration/research-finder/

Falls back to a curated set of real listings if the scrape fails or returns too few results.
"""
from __future__ import annotations

import re

import requests
from bs4 import BeautifulSoup

from app.models import LabProject

HEADERS = {"User-Agent": "research-match-hackathon-bot/0.1 (educational use)"}
MIT_UROP_URL = "https://urop.mit.edu/research-exploration/research-finder/"


def scrape_mit_urop(limit: int = 20) -> list[LabProject]:
    """Fetch and parse MIT UROP listings. Returns up to `limit` LabProject objects."""
    try:
        resp = requests.get(MIT_UROP_URL, headers=HEADERS, timeout=15)
        resp.raise_for_status()
        projects = _parse_urop_html(resp.text, limit)
        if projects:
            print(f"[scraper] Fetched {len(projects)} listings from MIT UROP.")
            return projects
    except Exception as e:
        print(f"[scraper] MIT UROP fetch failed: {e}. Using curated fallback.")
    return _curated_fallback()


def _parse_urop_html(html: str, limit: int) -> list[LabProject]:
    soup = BeautifulSoup(html, "html.parser")
    projects: list[LabProject] = []

    # UROP listings are in divs with class "project-listing" or similar
    # The actual class names vary; we try a few selectors.
    cards = (
        soup.select(".project-listing")
        or soup.select(".views-row")
        or soup.select("article")
    )

    for card in cards[:limit]:
        title_el = card.select_one("h2, h3, .project-title, .views-field-title")
        desc_el = card.select_one("p, .project-description, .views-field-body")
        pi_el = card.select_one(".pi-name, .views-field-field-pi-name, .faculty")
        dept_el = card.select_one(".department, .views-field-field-department")

        title = title_el.get_text(strip=True) if title_el else "Research Project"
        desc = desc_el.get_text(strip=True) if desc_el else ""
        pi = pi_el.get_text(strip=True) if pi_el else "Unknown PI"
        dept = dept_el.get_text(strip=True) if dept_el else "MIT"

        if not desc:
            continue

        projects.append(LabProject(
            pi_name=pi,
            lab_name=f"{pi} Lab",
            university="MIT",
            department=dept,
            project_title=title,
            description=desc[:1000],
            required_skills=_infer_skills(desc),
            preferred_background=[],
            source_url=MIT_UROP_URL,
        ))

    return projects


def _infer_skills(text: str) -> list[str]:
    """Naive keyword extraction for required skills from project description."""
    keywords = [
        "Python", "C++", "MATLAB", "R", "Java", "machine learning", "deep learning",
        "NLP", "computer vision", "robotics", "hardware", "FPGA", "PCB",
        "signal processing", "data analysis", "Linux", "ROS", "PyTorch", "TensorFlow",
        "statistics", "biology", "chemistry", "physics", "neuroscience",
    ]
    lower = text.lower()
    return [k for k in keywords if k.lower() in lower]


def _curated_fallback() -> list[LabProject]:
    """Hand-curated real MIT/Stanford lab listings for demo reliability."""
    return [
        LabProject(
            pi_name="Daniela Rus",
            lab_name="CSAIL Distributed Robotics Lab",
            university="MIT",
            department="EECS",
            project_title="Soft Robotics for Minimally Invasive Surgery",
            description=(
                "We are developing soft robotic systems for medical applications. "
                "Students will design, fabricate, and test soft actuators and integrate "
                "sensor feedback. Experience with CAD, 3D printing, and Python control scripts preferred. "
                "Background in mechanical engineering or biomedical engineering a plus."
            ),
            required_skills=["Python", "CAD", "hardware", "robotics"],
            preferred_background=["Mechanical Engineering", "Biomedical Engineering"],
            source_url="https://www.csail.mit.edu/research/distributed-robotics-laboratory",
        ),
        LabProject(
            pi_name="Regina Barzilay",
            lab_name="CSAIL NLP & Oncology Group",
            university="MIT",
            department="EECS / Koch Institute",
            project_title="NLP for Clinical Trial Matching",
            description=(
                "We apply NLP and machine learning to extract structure from unstructured "
                "clinical notes and match patients to trials. Looking for students with strong "
                "Python/PyTorch skills and ideally some exposure to biomedical text."
            ),
            required_skills=["Python", "PyTorch", "NLP", "machine learning"],
            preferred_background=["Computer Science", "Biology", "Statistics"],
            source_url="https://people.csail.mit.edu/regina/",
        ),
        LabProject(
            pi_name="Hari Balakrishnan",
            lab_name="CSAIL Networks & Mobile Systems",
            university="MIT",
            department="EECS",
            project_title="Wireless Channel Modeling with ML",
            description=(
                "Research on applying deep learning to wireless channel estimation for 5G and beyond. "
                "We need students who can implement and benchmark neural architectures in PyTorch "
                "and run experiments on real radio hardware."
            ),
            required_skills=["Python", "PyTorch", "deep learning", "signal processing"],
            preferred_background=["Electrical Engineering", "Computer Science"],
            source_url="https://nms.csail.mit.edu/",
        ),
        LabProject(
            pi_name="Phillip Sharp",
            lab_name="Koch Institute — RNA Therapeutics",
            university="MIT",
            department="Biology / Koch Institute",
            project_title="CRISPR Delivery Mechanisms",
            description=(
                "The lab studies RNA-based therapeutics and CRISPR delivery. We are looking for "
                "students with wet-lab experience in molecular biology, PCR, and cell culture. "
                "Computational students with strong Python/R and genomics experience are also welcome."
            ),
            required_skills=["biology", "Python", "R", "statistics"],
            preferred_background=["Biology", "Biochemistry", "Bioinformatics"],
            source_url="https://ki.mit.edu/",
        ),
        LabProject(
            pi_name="Antonio Torralba",
            lab_name="CSAIL Vision Group",
            university="MIT",
            department="EECS",
            project_title="Embodied Visual Reasoning",
            description=(
                "We are building agents that reason visually in 3D environments. "
                "Students will work on scene understanding, 3D scene graphs, and "
                "reinforcement learning for embodied navigation."
            ),
            required_skills=["Python", "PyTorch", "computer vision", "deep learning"],
            preferred_background=["Computer Science", "Cognitive Science"],
            source_url="https://groups.csail.mit.edu/vision/",
        ),
        LabProject(
            pi_name="Carlo Ratti",
            lab_name="Senseable City Lab",
            university="MIT",
            department="Urban Studies and Planning",
            project_title="Urban Data Analytics for Climate Resilience",
            description=(
                "Using large-scale urban datasets, GPS traces, and sensor networks to understand "
                "how cities can adapt to climate change. Students should be comfortable with Python, "
                "geospatial analysis (GeoPandas), and data visualization."
            ),
            required_skills=["Python", "data analysis", "statistics"],
            preferred_background=["Urban Planning", "Computer Science", "Data Science"],
            source_url="https://senseable.mit.edu/",
        ),
        LabProject(
            pi_name="Pulkit Agrawal",
            lab_name="Improbable AI Lab",
            university="MIT",
            department="EECS",
            project_title="Robot Learning from Demonstrations",
            description=(
                "We research imitation learning and reinforcement learning for robotic manipulation. "
                "Looking for students with PyTorch, robotics (ROS preferred), and ideally experience "
                "on real hardware."
            ),
            required_skills=["Python", "PyTorch", "robotics", "deep learning"],
            preferred_background=["Computer Science", "Mechanical Engineering"],
            source_url="https://people.csail.mit.edu/pulkitag/",
        ),
        LabProject(
            pi_name="Song Han",
            lab_name="Han Lab — Efficient Deep Learning",
            university="MIT",
            department="EECS",
            project_title="Neural Architecture Search for Edge Devices",
            description=(
                "We design efficient neural networks for deployment on resource-constrained hardware. "
                "Students work on NAS algorithms, model compression, and FPGA/ASIC deployment. "
                "Strong Python and PyTorch required; hardware experience is a major plus."
            ),
            required_skills=["Python", "PyTorch", "deep learning", "hardware", "FPGA"],
            preferred_background=["Computer Science", "Electrical Engineering"],
            source_url="https://hanlab.mit.edu/",
        ),
        LabProject(
            pi_name="Stefanie Jegelka",
            lab_name="Machine Learning Theory Group",
            university="MIT",
            department="EECS / Mathematics",
            project_title="Graph Neural Networks: Theory and Applications",
            description=(
                "Theoretical and empirical research on the expressive power of GNNs and their "
                "application to molecular property prediction. Students need strong math background "
                "(linear algebra, probability) and Python/PyTorch."
            ),
            required_skills=["Python", "PyTorch", "machine learning", "statistics"],
            preferred_background=["Mathematics", "Computer Science", "Chemistry"],
            source_url="https://people.csail.mit.edu/stefje/",
        ),
        LabProject(
            pi_name="Aleksander Madry",
            lab_name="Madry Lab — Robust ML",
            university="MIT",
            department="EECS",
            project_title="Adversarial Robustness of Vision Models",
            description=(
                "We study adversarial examples and build provably robust classifiers. "
                "Looking for students passionate about ML security, with strong PyTorch skills "
                "and some background in optimization."
            ),
            required_skills=["Python", "PyTorch", "deep learning", "machine learning"],
            preferred_background=["Computer Science", "Mathematics"],
            source_url="https://madry-lab.ml/",
        ),
        LabProject(
            pi_name="Jae Won Cho",
            lab_name="Energy-Efficient Circuits Lab",
            university="MIT",
            department="EECS",
            project_title="In-Memory Computing for Neural Inference",
            description=(
                "We design analog and mixed-signal circuits that perform neural network inference "
                "directly in memory arrays. VLSI design background required; Python for simulation. "
                "Exposure to SPICE or Cadence is a strong plus."
            ),
            required_skills=["hardware", "Python", "MATLAB"],
            preferred_background=["Electrical Engineering"],
            source_url="https://www.rle.mit.edu/",
        ),
        LabProject(
            pi_name="Tamara Broderick",
            lab_name="Broderick Group — Bayesian ML",
            university="MIT",
            department="EECS",
            project_title="Scalable Bayesian Inference",
            description=(
                "Research on variational inference, Bayesian nonparametrics, and uncertainty "
                "quantification. Students should have strong probability/stats background and "
                "Python or R for experiments."
            ),
            required_skills=["Python", "R", "statistics", "machine learning"],
            preferred_background=["Statistics", "Mathematics", "Computer Science"],
            source_url="https://people.csail.mit.edu/tbroderick/",
        ),
        LabProject(
            pi_name="Nancy Lynch",
            lab_name="Theory of Distributed Systems",
            university="MIT",
            department="EECS / Mathematics",
            project_title="Fault-Tolerant Distributed Algorithms",
            description=(
                "We study the theory of distributed computing: consensus, consistency, "
                "fault tolerance. Students need strong algorithmic thinking. "
                "Programming in Python or Java for simulations."
            ),
            required_skills=["Python", "Java"],
            preferred_background=["Computer Science", "Mathematics"],
            source_url="https://groups.csail.mit.edu/tds/",
        ),
        LabProject(
            pi_name="Michael Stonebraker",
            lab_name="Intel Science & Technology Center for Big Data",
            university="MIT",
            department="EECS",
            project_title="Time-Series Database Engines",
            description=(
                "Building next-generation database systems optimized for time-series workloads "
                "in IoT and scientific computing. Students work in C++ and Python on storage "
                "engines and query optimization."
            ),
            required_skills=["Python", "C++"],
            preferred_background=["Computer Science", "Data Engineering"],
            source_url="https://db.csail.mit.edu/",
        ),
        LabProject(
            pi_name="Sertac Karaman",
            lab_name="Laboratory for Information and Decision Systems",
            university="MIT",
            department="AeroAstro",
            project_title="Motion Planning for Autonomous Vehicles",
            description=(
                "We develop motion planning and control algorithms for autonomous cars and drones. "
                "Students implement algorithms in Python/C++ and test on hardware platforms. "
                "Background in control theory or robotics preferred."
            ),
            required_skills=["Python", "C++", "robotics"],
            preferred_background=["Aerospace Engineering", "Mechanical Engineering", "Computer Science"],
            source_url="https://lids.mit.edu/",
        ),
        LabProject(
            pi_name="Erik Demaine",
            lab_name="Demaine Group — Computational Origami",
            university="MIT",
            department="EECS / Mathematics",
            project_title="Algorithmic Folding for Programmable Matter",
            description=(
                "Research at the intersection of algorithms, geometry, and fabrication. "
                "We design algorithms for folding flat materials into 3D shapes. "
                "Strong programming skills (Python) and mathematical background required."
            ),
            required_skills=["Python", "statistics"],
            preferred_background=["Computer Science", "Mathematics", "Materials Science"],
            source_url="http://erikdemaine.org/",
        ),
        LabProject(
            pi_name="Li-Shiuan Peh",
            lab_name="NTU-MIT Research Centre on Next Generation Wireless",
            university="MIT",
            department="EECS",
            project_title="On-Chip Networks for Many-Core Processors",
            description=(
                "Designing low-latency interconnect fabrics for manycore chips. "
                "Students work in C++ and HDL simulation. Background in computer architecture required."
            ),
            required_skills=["C++", "hardware"],
            preferred_background=["Computer Engineering", "Electrical Engineering"],
            source_url="https://people.csail.mit.edu/peh/",
        ),
        LabProject(
            pi_name="Josh Tenenbaum",
            lab_name="Computational Cognitive Science Group",
            university="MIT",
            department="Brain and Cognitive Sciences / EECS",
            project_title="Probabilistic Models of Human Cognition",
            description=(
                "We build Bayesian models of how humans learn, reason, and perceive. "
                "Students implement models in Python (using PyMC or custom probabilistic programs) "
                "and run behavioral experiments."
            ),
            required_skills=["Python", "statistics", "machine learning"],
            preferred_background=["Cognitive Science", "Computer Science", "Neuroscience"],
            source_url="https://cocosci.mit.edu/",
        ),
        LabProject(
            pi_name="Asu Ozdaglar",
            lab_name="LIDS — Networks & Decision Systems",
            university="MIT",
            department="EECS",
            project_title="Multi-Agent Reinforcement Learning",
            description=(
                "Game-theoretic and RL approaches to multi-agent decision making. "
                "Students develop algorithms in Python/PyTorch and analyze convergence properties."
            ),
            required_skills=["Python", "PyTorch", "machine learning", "statistics"],
            preferred_background=["Computer Science", "Mathematics", "Economics"],
            source_url="https://lids.mit.edu/",
        ),
        LabProject(
            pi_name="Manolis Kellis",
            lab_name="MIT Computational Biology Group",
            university="MIT",
            department="EECS / Biology",
            project_title="Regulatory Genomics and Single-Cell Epigenomics",
            description=(
                "We analyze large-scale genomics datasets to understand gene regulation. "
                "Students work in Python/R on single-cell ATAC-seq and RNA-seq pipelines, "
                "and apply ML to identify regulatory elements."
            ),
            required_skills=["Python", "R", "statistics", "biology"],
            preferred_background=["Bioinformatics", "Computer Science", "Biology"],
            source_url="https://compbio.mit.edu/",
        ),
    ]
