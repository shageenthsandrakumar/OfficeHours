export type DemoRole = "student" | "opportunity";

/** Minimal judge-friendly intake (3 answers per role). */
export interface LightweightIntake {
  role: DemoRole;
  /** Q1: name or project title */
  primary: string;
  /** Q2: hidden story or what evidence matters */
  signal: string;
  /** Q3: pursuit focus or main concern */
  focus: string;
}

export interface StudentIntake {
  name: string;
  email: string;
  year: string;
  field: string;
  skills: string;
  interests: string;
  intakeStory: string;
  hiddenSignals: string;
}

export interface OpportunityIntake {
  projectTitle: string;
  piName: string;
  labName: string;
  university: string;
  description: string;
  requiredSkills: string;
  preferredBackground: string;
}

export interface IntakeSession {
  role: DemoRole;
  /** Present when using lightweight onboarding */
  lightweight?: LightweightIntake;
  student: StudentIntake;
  opportunity: OpportunityIntake;
  analyzedAt: string;
  /** Demo route — investigation uses enriched mock dossier */
  demoStudentId: string;
  demoProjectId: string;
}

export const EMPTY_STUDENT_INTAKE: StudentIntake = {
  name: "",
  email: "",
  year: "PhD Year 1",
  field: "Computer Science",
  skills: "",
  interests: "",
  intakeStory: "",
  hiddenSignals: "",
};

export const EMPTY_OPPORTUNITY_INTAKE: OpportunityIntake = {
  projectTitle: "",
  piName: "",
  labName: "",
  university: "MIT",
  description: "",
  requiredSkills: "",
  preferredBackground: "",
};
