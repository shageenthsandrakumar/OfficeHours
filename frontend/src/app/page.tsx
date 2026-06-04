"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { APP_NAME } from "@/lib/constants";
import type { UserRole } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole | null>(null);

  function continueToSignup() {
    if (!role) return;
    sessionStorage.setItem("signup_role", role);
    router.push(`/auth/signup?role=${role}`);
  }

  return (
    <main className="min-h-screen bg-ascend-bg">
      <div className="mx-auto flex min-h-screen max-w-content flex-col px-8 py-8">
        <header className="flex items-center justify-between">
          <span className="font-heading text-[18px] text-ascend-text">{APP_NAME}</span>
          <Link href="/auth/login" className="text-sm text-ascend-muted hover:text-ascend-primary">
            Log in
          </Link>
        </header>

        <section className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <p className="label-text">Scholarly opportunity matching</p>
          <h1 className="page-title mt-4 max-w-lg">
            Ascend to your next academic opportunity
          </h1>
          <p className="mt-4 max-w-md text-sm text-ascend-muted">
            AI connects professors posting research and internships with students
            whose interests, skills, and availability truly align.
          </p>

          <div className="mt-12 w-full max-w-md text-left">
            <p className="mb-4 text-sm text-ascend-text">I am a…</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  { id: "student" as const, title: "Student", desc: "Discover AI-matched opportunities" },
                  { id: "professor" as const, title: "Professor", desc: "Post roles and review ranked applicants" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setRole(opt.id)}
                  className={cn(
                    "rounded-lg border p-5 text-left transition",
                    role === opt.id
                      ? "border-[1.5px] border-ascend-secondary bg-ascend-sidebar"
                      : "border-ascend-border/80 bg-ascend-card hover:bg-ascend-sidebar"
                  )}
                  style={{ borderWidth: role === opt.id ? "1.5px" : "0.5px" }}
                >
                  <span className="font-heading text-[15px] text-ascend-text">{opt.title}</span>
                  <p className="mt-2 label-text">{opt.desc}</p>
                </button>
              ))}
            </div>
            <Button className="mt-8 w-full" disabled={!role} onClick={continueToSignup}>
              Continue with .edu email
            </Button>
            <p className="mt-3 label-text text-center">University email verification required</p>
          </div>
        </section>
      </div>
    </main>
  );
}
