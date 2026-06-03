import type {
  IntakeSession,
  LightweightIntake,
  OpportunityIntake,
  StudentIntake,
} from "./types";
import { resolveDemoInvestigation } from "./resolveDemo";

const DEMO_STUDENT_BASE: StudentIntake = {
  name: "Aisha Patel",
  email: "aisha@demo.edu",
  year: "PhD Year 1",
  field: "Computer Science",
  skills: "Python, PyTorch, ROS, C++, hardware",
  interests: "robotics, machine learning, hardware",
  intakeStory:
    "Built a 6-DOF robotic arm from scratch with custom PCBs; 400-star ROS2 contribution surfaced in intake.",
  hiddenSignals: "Garage build, open-source ROS — not on CV headline",
};

const DEMO_OPPORTUNITY_ROBOTICS: OpportunityIntake = {
  projectTitle: "Soft Robotics for Minimally Invasive Surgery",
  piName: "Daniela Rus",
  labName: "CSAIL Distributed Robotics Lab",
  university: "MIT",
  description:
    "Soft robotic systems for medical applications. CAD, fabrication, and Python control preferred.",
  requiredSkills: "Python, CAD, hardware, robotics",
  preferredBackground: "Mechanical Engineering, Biomedical Engineering",
};

const DEMO_OPPORTUNITY_NLP: OpportunityIntake = {
  projectTitle: "Clinical NLP for Patient Records",
  piName: "Regina Barzilay",
  labName: "Clinical NLP Group",
  university: "MIT",
  description:
    "NLP models for clinical notes. Strong Python and deep learning required.",
  requiredSkills: "Python, deep learning, NLP",
  preferredBackground: "Computer Science",
};

function pickOpportunity(focus: string): OpportunityIntake {
  const f = focus.toLowerCase();
  if (f.includes("nlp") || f.includes("clinical") || f.includes("language")) {
    return { ...DEMO_OPPORTUNITY_NLP };
  }
  return { ...DEMO_OPPORTUNITY_ROBOTICS };
}

function pickStudentBase(focus: string): StudentIntake {
  const f = focus.toLowerCase();
  if (f.includes("nlp") || f.includes("clinical")) {
    return {
      name: "Marcus Chen",
      email: "marcus@demo.edu",
      year: "Undergrad Senior",
      field: "Electrical Engineering",
      skills: "Python, MATLAB, signal processing",
      interests: "NLP, signal processing",
      intakeStory: "Pivoting to ML/NLP; coursework-heavy ML exposure.",
      hiddenSignals: "",
    };
  }
  return { ...DEMO_STUDENT_BASE };
}

/** Fix typo - StudentIntake uses intakeStory not intakeSummary */
function studentFromLightweight(lw: LightweightIntake): StudentIntake {
  const base = pickStudentBase(lw.focus);
  return {
    ...base,
    name: lw.primary.trim() || base.name,
    intakeStory: lw.signal.trim() || base.intakeStory,
    hiddenSignals: lw.focus.trim(),
  };
}

function opportunityFromLightweight(lw: LightweightIntake): OpportunityIntake {
  const base = pickOpportunity(lw.focus);
  return {
    ...base,
    projectTitle: lw.primary.trim() || base.projectTitle,
    description: lw.signal.trim()
      ? `${lw.signal.trim()} — ${base.description}`
      : base.description,
    requiredSkills: base.requiredSkills,
  };
}

export function buildSessionFromLightweight(
  lw: LightweightIntake
): IntakeSession {
  const student =
    lw.role === "student"
      ? studentFromLightweight(lw)
      : pickStudentBase(lw.focus);

  const opportunity =
    lw.role === "opportunity"
      ? opportunityFromLightweight(lw)
      : pickOpportunity(lw.focus);

  const draft: IntakeSession = {
    role: lw.role,
    lightweight: lw,
    student,
    opportunity,
    analyzedAt: "",
    demoStudentId: "",
    demoProjectId: "",
  };

  const route = resolveDemoInvestigation(draft);
  return {
    ...draft,
    analyzedAt: new Date().toISOString(),
    demoStudentId: route.studentId,
    demoProjectId: route.projectId,
  };
}

export function lensForRole(role: DemoRole): "for_me" | "for_project" {
  return role === "student" ? "for_me" : "for_project";
}
