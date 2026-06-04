"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { APP_NAME } from "@/lib/constants";
import { isSupabaseConfigured, supabaseSetupMessage } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const message = searchParams.get("message");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!isSupabaseConfigured()) {
      setError(supabaseSetupMessage());
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) {
        setError(loginError.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        const { data: userRow, error: userRowError } = await supabase
          .from("users")
          .select("role")
          .eq("id", data.user.id)
          .single();

        if (userRowError) {
          setError(
            userRowError.message.includes("Failed to fetch") || userRowError.message.includes("Load failed")
              ? "Could not reach Supabase. Check your URL and anon key in .env.local, then restart the dev server."
              : `Database error: ${userRowError.message}. Did you run supabase/schema.sql in your Supabase project?`
          );
          setLoading(false);
          return;
        }

        if (userRow?.role === "student") {
          const { data: profile } = await supabase
            .from("student_profiles")
            .select("id")
            .eq("user_id", data.user.id)
            .maybeSingle();
          router.push(profile ? "/dashboard/student" : "/onboarding/student");
        } else if (userRow?.role === "professor") {
          const { data: profile } = await supabase
            .from("professor_profiles")
            .select("id")
            .eq("user_id", data.user.id)
            .maybeSingle();
          router.push(profile ? "/dashboard/professor" : "/onboarding/professor");
        } else {
          router.push("/");
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(
        message.includes("Load failed") || message.includes("Failed to fetch")
          ? "Could not reach Supabase. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart npm run dev."
          : message
      );
    }

    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ascend-bg px-4 py-12">
      <div className="w-full max-w-[460px]">
        <Link href="/" className="font-heading text-[18px] text-ascend-text">
          ← {APP_NAME}
        </Link>
        <div className="mt-8 rounded-xl border border-ascend-border/80 bg-ascend-card p-8" style={{ borderWidth: "0.5px" }}>
          <h1 className="page-title">Welcome back</h1>
          <p className="mt-2 label-text">Log in with your university email.</p>

          {message === "confirm" && (
            <p className="mt-4 rounded-md bg-ascend-sidebar px-4 py-3 text-sm text-ascend-primary">
              Check your email to confirm your account, then log in.
            </p>
          )}

          {!isSupabaseConfigured() && (
            <p className="mt-4 rounded-md border border-ascend-destructive/30 bg-ascend-card px-4 py-3 text-xs text-ascend-destructive">
              {supabaseSetupMessage()}
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-xs text-ascend-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Logging in…" : "Log in"}
          </Button>
        </form>

        <p className="mt-6 text-center label-text">
          New here?{" "}
          <Link href="/" className="text-ascend-primary hover:underline">
            Choose your role and sign up
          </Link>
        </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
