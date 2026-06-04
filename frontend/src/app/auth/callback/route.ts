import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: userRow } = await supabase
        .from("users")
        .select("role")
        .eq("id", user?.id ?? "")
        .single();

      if (userRow?.role === "student") {
        return NextResponse.redirect(`${origin}/onboarding/student`);
      }
      if (userRow?.role === "professor") {
        return NextResponse.redirect(`${origin}/onboarding/professor`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth`);
}
