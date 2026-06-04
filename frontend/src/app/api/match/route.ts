import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runMatchingForStudent } from "@/lib/matching/runMatching";
import type { FeedFilters, MatchedOpportunity, Opportunity, ProfessorProfile, StudentProfile } from "@/lib/types/database";

function applyFilters(feed: MatchedOpportunity[], filters: FeedFilters): MatchedOpportunity[] {
  return feed.filter((item) => {
    if (filters.opportunityType && item.opportunity_type !== filters.opportunityType) return false;
    if (filters.topic && !item.topics.includes(filters.topic)) return false;
    if (filters.hours && item.hours_per_week !== filters.hours) return false;
    if (filters.compensation && item.compensation !== filters.compensation) return false;
    return true;
  });
}

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const filters: FeedFilters = {
    opportunityType: searchParams.get("type") ?? undefined,
    topic: searchParams.get("topic") ?? undefined,
    hours: searchParams.get("hours") ? Number(searchParams.get("hours")) : undefined,
    compensation: searchParams.get("compensation") ?? undefined,
  };

  const { data: student } = await supabase
    .from("student_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!student) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  await runMatchingForStudent(supabase, student as StudentProfile);

  const { data: matches } = await supabase
    .from("opportunity_matches")
    .select("*, opportunity:opportunities(*, professor:professor_profiles(*))")
    .eq("student_id", student.id)
    .order("ai_match_score", { ascending: false });

  const { data: apps } = await supabase
    .from("applications")
    .select("*")
    .eq("student_id", student.id);

  const appMap = new Map((apps ?? []).map((a) => [a.opportunity_id, a]));

  let feed: MatchedOpportunity[] = (matches ?? [])
    .filter((m) => m.opportunity && (m.opportunity as { status: string }).status === "open")
    .map((m) => {
      const opp = m.opportunity as Opportunity & { professor: ProfessorProfile };
      const app = appMap.get(opp.id);
      return {
        ...opp,
        professor: opp.professor,
        ai_match_score: m.ai_match_score,
        ai_match_reason: m.ai_match_reason,
        application_id: app?.id,
        application_status: app?.status,
      };
    });

  feed = applyFilters(feed, filters);

  return NextResponse.json({ feed, email: user.email });
}

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: student } = await supabase
    .from("student_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!student) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  await runMatchingForStudent(supabase, student as StudentProfile);
  return NextResponse.json({ ok: true });
}
