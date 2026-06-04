import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runMatchingForStudent } from "@/lib/matching/runMatching";
import type { StudentProfile } from "@/lib/types/database";

export async function PATCH(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { role, ...fields } = body as { role: "student" | "professor"; [key: string]: unknown };

  if (role === "student") {
    const { error } = await supabase
      .from("student_profiles")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: student } = await supabase
      .from("student_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();
    if (student) {
      await runMatchingForStudent(supabase, student as StudentProfile);
    }
  } else {
    const { error } = await supabase
      .from("professor_profiles")
      .update({
        ...fields,
        updated_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
