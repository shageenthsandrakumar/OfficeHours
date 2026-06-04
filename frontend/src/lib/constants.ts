export const APP_NAME = "Ascend";

export const COLORS = {
  bg: "#F5F0E8",
  card: "#FDFAF4",
  primary: "#5C4A2A",
  secondary: "#8B7355",
  text: "#2C2416",
  textMuted: "#6B5C45",
  border: "#DDD5C0",
  success: "#4A6741",
} as const;

export const MAJORS = [
  "Biology",
  "Business",
  "Chemistry",
  "Computer Science",
  "Economics",
  "Engineering",
  "Mathematics",
  "Neuroscience",
  "Physics",
  "Psychology",
  "Other",
] as const;

export const YEARS = [
  "Freshman",
  "Sophomore",
  "Junior",
  "Senior",
  "Grad Student",
] as const;

export const OPPORTUNITY_TYPES = [
  { id: "research", label: "Research" },
  { id: "internship", label: "Internship" },
  { id: "collaboration", label: "Collaboration" },
  { id: "mentorship", label: "Mentorship" },
  { id: "project", label: "Project" },
] as const;

export const TOPICS = [
  "Health",
  "Beauty",
  "Data Science",
  "AI/ML",
  "Biotech",
  "Business",
  "Environment",
  "Tech",
  "Psychology",
  "Law",
  "Arts",
  "Physics",
  "Pharma",
  "Education",
  "Finance",
  "Social Impact",
] as const;

export const GPA_RANGES = [
  "3.8 – 4.0",
  "3.5 – 3.79",
  "3.0 – 3.49",
  "2.5 – 2.99",
  "Below 2.5",
] as const;

export const HOURS_OPTIONS = [5, 10, 15, 20, 25, 30, 40] as const;

export const RESEARCH_OPENNESS = [
  { id: "yes", label: "Yes, actively looking" },
  { id: "maybe", label: "Maybe, open to the right fit" },
  { id: "no", label: "Not right now" },
] as const;

export const COMPENSATION_OPTIONS = [
  { id: "paid", label: "Paid" },
  { id: "unpaid", label: "Unpaid" },
  { id: "credit", label: "Course credit" },
] as const;

export type UserRole = "student" | "professor";
export type CompensationType = "paid" | "unpaid" | "credit";
