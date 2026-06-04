import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeAndCacheMatches } from "@/lib/openai/match";
import type { Opportunity, ProfessorProfile, StudentProfile } from "@/lib/types/database";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { title, description, topics, opportunity_type, hours_per_week, gpa_min, compensation } = body;

  const { data: professor } = await supabase
    .from("professor_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!professor) return NextResponse.json({ error: "Professor profile not found" }, { status: 404 });

  const { data: opportunity, error } = await supabase
    .from("opportunities")
    .insert({
      professor_id: professor.id,
      title,
      description,
      topics,
      opportunity_type,
      hours_per_week,
      gpa_min,
      compensation: compensation ?? "unpaid",
      status: "open",
      last_active_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase
    .from("professor_profiles")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", professor.id);

  // Background match for all students
  const { data: students } = await supabase.from("student_profiles").select("*");
  if (students && opportunity) {
    for (const student of students) {
      const match = await computeAndCacheMatches(
        student as StudentProfile,
        [{ opportunity: opportunity as Opportunity, professor: professor as ProfessorProfile }],
        async (rows) => {
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
        }
      );
      void match;
    }
  }

  return NextResponse.json({ opportunity });
}

export async function PATCH(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { applicationId, status } = (await request.json()) as {
    applicationId: string;
    status: "viewed" | "accepted" | "declined";
  };

  const { data: professor } = await supabase
    .from("professor_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!professor) return NextResponse.json({ error: "Professor profile not found" }, { status: 404 });

  const { data: application, error } = await supabase
    .from("applications")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", applicationId)
    .select("*, opportunity:opportunities!inner(professor_id)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const opp = application as { opportunity: { professor_id: string } };
  if (opp.opportunity.professor_id !== professor.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await supabase
    .from("professor_profiles")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", professor.id);

  return NextResponse.json({ application });
}
