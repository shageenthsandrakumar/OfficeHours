import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeMatch } from "@/lib/openai/match";
import type { Opportunity, ProfessorProfile, StudentProfile } from "@/lib/types/database";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { opportunityId } = (await request.json()) as { opportunityId: string };
  if (!opportunityId) return NextResponse.json({ error: "opportunityId required" }, { status: 400 });

  const { data: student } = await supabase
    .from("student_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!student) return NextResponse.json({ error: "Student profile not found" }, { status: 404 });

  const { data: cached } = await supabase
    .from("opportunity_matches")
    .select("*")
    .eq("student_id", student.id)
    .eq("opportunity_id", opportunityId)
    .maybeSingle();

  const { data: opportunityRow } = await supabase
    .from("opportunities")
    .select("*, professor:professor_profiles(*)")
    .eq("id", opportunityId)
    .single();

  if (!opportunityRow) return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });

  const opportunity = opportunityRow as unknown as Opportunity;
  const professor = (opportunityRow as { professor: ProfessorProfile }).professor;

  let match = cached
    ? {
        score: Number(cached.ai_match_score),
        reason: cached.ai_match_reason as string,
        introMessage: "",
      }
    : await computeMatch({
        student: student as StudentProfile,
        opportunity,
        professor,
      });

  if (!match.introMessage) {
    const full = await computeMatch({
      student: student as StudentProfile,
      opportunity,
      professor,
    });
    match = full;
  }

  const { data: existing } = await supabase
    .from("applications")
    .select("id")
    .eq("student_id", student.id)
    .eq("opportunity_id", opportunityId)
    .maybeSingle();

  const { data: application, error: appError } = await supabase
    .from("applications")
    .upsert(
      {
        student_id: student.id,
        opportunity_id: opportunityId,
        ai_match_score: match.score,
        ai_match_reason: match.reason,
        ai_intro_message: match.introMessage,
        status: "pending",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "student_id,opportunity_id" }
    )
    .select()
    .single();

  if (appError) return NextResponse.json({ error: appError.message }, { status: 500 });

  if (!existing) {
    await supabase
      .from("professor_profiles")
      .update({
        total_applications_received: professor.total_applications_received + 1,
        last_active_at: new Date().toISOString(),
      })
      .eq("id", professor.id);
  }

  return NextResponse.json({ application, match });
}
