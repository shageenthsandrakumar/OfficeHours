"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { APP_NAME } from "@/lib/constants";
import type { UserRole } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { isEduEmail, isValidRole } from "@/lib/validation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");
  const role: UserRole = isValidRole(roleParam) ? roleParam : "student";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!isEduEmail(email)) {
      setError("Please use a valid .edu university email.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: userError } = await supabase.from("users").insert({
        id: data.user.id,
        email,
        role,
      });

      if (userError) {
        setError(userError.message);
        setLoading(false);
        return;
      }

      if (data.session) {
        router.push(role === "student" ? "/onboarding/student" : "/onboarding/professor");
      } else {
        router.push("/auth/login?message=confirm");
      }
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
          <h1 className="page-title">Create your account</h1>
          <p className="mt-2 label-text">
            Signing up as a{" "}
            <span className="text-ascend-primary">{role}</span> with your .edu email.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input
              label="University email"
              type="email"
              placeholder="you@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              error={error && error.includes("edu") ? error : undefined}
            />
            <Input
              label="Password"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            {error && !error.includes("edu") && (
              <p className="text-xs text-ascend-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account…" : "Sign up"}
            </Button>
          </form>

          <p className="mt-6 text-center label-text">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-ascend-primary hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <SignupForm />
    </Suspense>
  );
}
