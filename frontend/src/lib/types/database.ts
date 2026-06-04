export type UserRole = "student" | "professor";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface StudentProfile {
  id: string;
  user_id: string;
  university: string;
  major: string;
  year: string;
  topics: string[];
  opportunity_types: string[];
  gpa_range: string;
  hours_per_week: number;
  research_openness: "yes" | "maybe" | "no";
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface PreferredStudentTraits {
  preferred_years?: string[];
  preferred_gpa_range?: string;
  preferred_topics?: string[];
  preferred_hours?: number;
}

export interface ProfessorProfile {
  id: string;
  user_id: string;
  university: string;
  name: string;
  department: string;
  title: string;
  opportunity_types: string[];
  preferred_student_traits: PreferredStudentTraits;
  response_rate: number;
  total_applications_received: number;
  total_applications_responded: number;
  last_active_at: string;
  created_at: string;
  updated_at: string;
}

export interface Opportunity {
  id: string;
  professor_id: string;
  title: string;
  description: string;
  topics: string[];
  opportunity_type: string;
  hours_per_week: number;
  gpa_min: number;
  compensation: "paid" | "unpaid" | "credit";
  status: "open" | "closed";
  last_active_at: string;
  created_at: string;
  updated_at: string;
}

export interface OpportunityMatch {
  id: string;
  student_id: string;
  opportunity_id: string;
  ai_match_score: number;
  ai_match_reason: string;
  updated_at: string;
}

export interface Application {
  id: string;
  student_id: string;
  opportunity_id: string;
  ai_match_score: number | null;
  ai_match_reason: string | null;
  ai_intro_message: string | null;
  status: "pending" | "viewed" | "accepted" | "declined";
  created_at: string;
  updated_at: string;
}

export interface MatchedOpportunity extends Opportunity {
  professor: ProfessorProfile;
  ai_match_score: number;
  ai_match_reason: string;
  ai_intro_message?: string;
  application_id?: string;
  application_status?: Application["status"];
  applicant_count?: number;
}

export interface ApplicantWithProfile extends Application {
  student: StudentProfile;
}

export interface FeedFilters {
  opportunityType?: string;
  topic?: string;
  hours?: number;
  compensation?: string;
}
