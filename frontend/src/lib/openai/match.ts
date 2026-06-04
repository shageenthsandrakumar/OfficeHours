import OpenAI from "openai";
import type { Opportunity, ProfessorProfile, StudentProfile } from "@/lib/types/database";
import { gpaRangeToMin } from "@/lib/validation";

export interface MatchInput {
  student: StudentProfile;
  opportunity: Opportunity;
  professor: ProfessorProfile;
}

export interface MatchResult {
  score: number;
  reason: string;
  introMessage: string;
}

function ruleBasedScore(input: MatchInput): number {
  const { student, opportunity, professor } = input;
  let score = 50;

  const topicOverlap = student.topics.filter((t) =>
    opportunity.topics.includes(t)
  ).length;
  score += Math.min(topicOverlap * 8, 24);

  if (student.opportunity_types.includes(opportunity.opportunity_type)) {
    score += 15;
  }

  const studentGpaMin = gpaRangeToMin(student.gpa_range);
  if (studentGpaMin >= opportunity.gpa_min) score += 10;
  else score -= 10;

  const hourDiff = Math.abs(student.hours_per_week - opportunity.hours_per_week);
  if (hourDiff <= 5) score += 10;
  else if (hourDiff <= 10) score += 5;
  else score -= 5;

  if (student.research_openness === "yes") score += 5;
  else if (student.research_openness === "no") score -= 10;

  if (
    student.university &&
    professor.university &&
    student.university.toLowerCase() === professor.university.toLowerCase()
  ) {
    score += 8;
  }

  return Math.max(0, Math.min(100, score));
}

function ruleBasedReason(input: MatchInput): string {
  const overlap = input.student.topics.filter((t) =>
    input.opportunity.topics.includes(t)
  );
  if (overlap.length > 0) {
    return `Matched because your interest in ${overlap.slice(0, 2).join(" and ")} aligns with this lab's focus.`;
  }
  if (input.student.opportunity_types.includes(input.opportunity.opportunity_type)) {
    return `Matched because you're seeking ${input.opportunity.opportunity_type} opportunities like this one.`;
  }
  return "Matched based on your availability, GPA range, and research openness.";
}

function ruleBasedIntro(input: MatchInput, score: number): string {
  const { student, opportunity, professor } = input;
  return `Dear ${professor.name.split(" ")[0]}, I'm a ${student.year} studying ${student.major} at ${student.university}. I'm very interested in "${opportunity.title}" and believe my background would be a strong fit (${score}% match). I'd welcome the chance to discuss how I can contribute ${student.hours_per_week} hours per week to your team.`;
}

const DEFAULT_GMI_MODEL = "meta-llama/Llama-3.3-70B-Instruct";

function getLLMClient(): OpenAI | null {
  if (process.env.GMI_API_KEY && process.env.GMI_ENDPOINT) {
    return new OpenAI({
      apiKey: process.env.GMI_API_KEY,
      baseURL: process.env.GMI_ENDPOINT,
    });
  }
  if (process.env.OPENAI_API_KEY) {
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return null;
}

function getLLMModel(): string {
  if (process.env.GMI_API_KEY && process.env.GMI_ENDPOINT) {
    return process.env.GMI_MODEL ?? DEFAULT_GMI_MODEL;
  }
  return process.env.OPENAI_MODEL ?? "gpt-4o-mini";
}

export async function computeMatch(input: MatchInput): Promise<MatchResult> {
  const fallbackScore = ruleBasedScore(input);
  const fallbackReason = ruleBasedReason(input);

  const openai = getLLMClient();
  if (!openai) {
    return {
      score: fallbackScore,
      reason: fallbackReason,
      introMessage: ruleBasedIntro(input, fallbackScore),
    };
  }

  const prompt = `Score this student-opportunity fit from 0-100. Provide:
1. score (number)
2. reason (one sentence, start with "Matched because...")
3. introMessage (2-3 sentences for the student to send when applying)

Student: ${input.student.major}, ${input.student.year}, ${input.student.university}
Topics: ${input.student.topics.join(", ")}
Types wanted: ${input.student.opportunity_types.join(", ")}
GPA: ${input.student.gpa_range}, Hours: ${input.student.hours_per_week}/week
Research openness: ${input.student.research_openness}

Opportunity: ${input.opportunity.title} (${input.opportunity.opportunity_type})
Topics: ${input.opportunity.topics.join(", ")}
Hours: ${input.opportunity.hours_per_week}, Min GPA: ${input.opportunity.gpa_min}
Compensation: ${input.opportunity.compensation}
Description: ${input.opportunity.description}

Professor: ${input.professor.name}, ${input.professor.department}, ${input.professor.university}

Same university boost if applicable. JSON only: {"score": number, "reason": string, "introMessage": string}`;

  try {
    const response = await openai.chat.completions.create({
      model: getLLMModel(),
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response");

    const parsed = JSON.parse(content) as {
      score?: number;
      reason?: string;
      introMessage?: string;
    };

    return {
      score: Math.max(0, Math.min(100, Math.round(parsed.score ?? fallbackScore))),
      reason: parsed.reason ?? fallbackReason,
      introMessage: parsed.introMessage ?? ruleBasedIntro(input, fallbackScore),
    };
  } catch {
    return {
      score: fallbackScore,
      reason: fallbackReason,
      introMessage: ruleBasedIntro(input, fallbackScore),
    };
  }
}

export async function computeAndCacheMatches(
  student: StudentProfile,
  opportunities: Array<{ opportunity: Opportunity; professor: ProfessorProfile }>,
  upsert: (rows: Array<{ opportunity_id: string; ai_match_score: number; ai_match_reason: string }>) => Promise<void>
): Promise<Array<MatchResult & { opportunityId: string }>> {
  const results = await Promise.all(
    opportunities.map(async ({ opportunity, professor }) => {
      const match = await computeMatch({ student, opportunity, professor });
      return { ...match, opportunityId: opportunity.id };
    })
  );

  await upsert(
    results.map((r) => ({
      opportunity_id: r.opportunityId,
      ai_match_score: r.score,
      ai_match_reason: r.reason,
    }))
  );

  return results.sort((a, b) => b.score - a.score);
}
