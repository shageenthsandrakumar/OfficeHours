"use client";

import { useRouter } from "next/navigation";
import type { DemoRole } from "@/lib/onboarding/types";
import { saveDemoRole } from "@/lib/onboarding/session";

export function RolePicker() {
  const router = useRouter();

  function choose(role: DemoRole) {
    saveDemoRole(role);
    router.push("/start/intake");
  }

  return (
    <div className="space-y-4">
      <p className="text-center text-ink-muted">
        Choose your side of the story. We&apos;ll ask three quick questions, run
        signal analysis, then open the investigation.
      </p>
      <button
        type="button"
        onClick={() => choose("student")}
        className="w-full rounded-2xl border-2 border-coral/40 bg-gradient-to-br from-coral-soft/50 to-card p-6 text-left shadow-sm transition hover:scale-[1.01] hover:shadow-md"
      >
        <span className="text-2xl" aria-hidden>
          ✨
        </span>
        <span className="mt-2 block text-lg font-bold text-ink">I am a student</span>
        <span className="mt-1 block text-sm text-ink-muted">
          Surface your hidden signals and see if an opportunity fits you.
        </span>
      </button>
      <button
        type="button"
        onClick={() => choose("opportunity")}
        className="w-full rounded-2xl border-2 border-sage/40 bg-gradient-to-br from-sage-soft/50 to-card p-6 text-left shadow-sm transition hover:scale-[1.01] hover:shadow-md"
      >
        <span className="text-2xl" aria-hidden>
          🔬
        </span>
        <span className="mt-2 block text-lg font-bold text-ink">I have an opportunity</span>
        <span className="mt-1 block text-sm text-ink-muted">
          Evaluate whether a candidate&apos;s buried evidence supports your project.
        </span>
      </button>
    </div>
  );
}
