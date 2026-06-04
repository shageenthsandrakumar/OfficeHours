import type { SupabaseClient } from "@supabase/supabase-js";
import { computeAndCacheMatches } from "@/lib/openai/match";
import type { Opportunity, ProfessorProfile, StudentProfile } from "@/lib/types/database";

export async function runMatchingForStudent(
  supabase: SupabaseClient,
  student: StudentProfile
) {
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const { data: opportunities } = await supabase
    .from("opportunities")
    .select("*, professor:professor_profiles(*)")
    .eq("status", "open")
    .gte("created_at", sixtyDaysAgo.toISOString());

  const pairs = (opportunities ?? [])
    .filter((row) => row.professor)
    .map((row) => ({
      opportunity: row as unknown as Opportunity,
      professor: (row as { professor: ProfessorProfile }).professor,
    }));

  await computeAndCacheMatches(student, pairs, async (rows) => {
    if (rows.length === 0) return;
    await supabase.from("opportunity_matches").upsert(
      rows.map((r) => ({
        student_id: student.id,
        opportunity_id: r.opportunity_id,
        ai_match_score: r.ai_match_score,
        ai_match_reason: r.ai_match_reason,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "student_id,opportunity_id" }
    );
  });
}
