"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ANALYSIS_STEPS } from "@/lib/onboarding/analysisSteps";
import {
  loadOpportunityDraft,
  loadStudentDraft,
  saveIntakeSession,
} from "@/lib/onboarding/session";
import { resolveDemoInvestigation } from "@/lib/onboarding/resolveDemo";
import type { IntakeSession } from "@/lib/onboarding/types";

const STEP_MS = 900;

export function SignalAnalysisLoader() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const student = loadStudentDraft();
    const opportunity = loadOpportunityDraft();
    if (!student || !opportunity) {
      router.replace("/onboarding/student");
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];

    ANALYSIS_STEPS.forEach((_, i) => {
      timers.push(
        setTimeout(() => {
          setStepIndex(i);
          setProgress(Math.round(((i + 1) / ANALYSIS_STEPS.length) * 100));
        }, i * STEP_MS)
      );
    });

    timers.push(
      setTimeout(() => {
        const route = resolveDemoInvestigation({
          student,
          opportunity,
          analyzedAt: new Date().toISOString(),
          demoStudentId: "",
          demoProjectId: "",
        });
        const session: IntakeSession = {
          role: "student",
          student,
          opportunity,
          analyzedAt: new Date().toISOString(),
          demoStudentId: route.studentId,
          demoProjectId: route.projectId,
        };
        saveIntakeSession(session);
        router.replace(
          `/note/${route.studentId}/${route.projectId}?created=1`
        );
      }, ANALYSIS_STEPS.length * STEP_MS + 400)
    );

    return () => timers.forEach(clearTimeout);
  }, [router]);

  const current = ANALYSIS_STEPS[stepIndex];

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="relative mb-8 h-24 w-24">
        <div
          className="absolute inset-0 rounded-full border-4 border-cream-dark"
          aria-hidden
        />
        <div
          className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-coral border-r-sage"
          style={{ animationDuration: "1.2s" }}
          aria-hidden
        />
        <span className="absolute inset-0 flex items-center justify-center text-2xl">
          📡
        </span>
      </div>

      <p className="text-xs font-bold uppercase tracking-widest text-coral">
        Signal analysis
      </p>
      <h2 className="mt-2 font-serif text-2xl font-semibold text-ink">
        {current?.label ?? "Preparing…"}
      </h2>
      <p className="mt-2 max-w-sm text-sm text-ink-muted animate-fade-in">
        {current?.detail}
      </p>

      <div className="mt-8 h-2 w-64 overflow-hidden rounded-full bg-cream-dark">
        <div
          className="h-full rounded-full bg-gradient-to-r from-coral via-honey to-sage transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-ink-muted">{progress}%</p>

      <ul className="mt-10 max-w-md space-y-2 text-left text-sm">
        {ANALYSIS_STEPS.map((step, i) => (
          <li
            key={step.id}
            className={`flex gap-2 transition-opacity duration-300 ${
              i <= stepIndex ? "opacity-100" : "opacity-30"
            }`}
          >
            <span aria-hidden>{i < stepIndex ? "✓" : i === stepIndex ? "→" : "·"}</span>
            <span className={i === stepIndex ? "font-semibold text-ink" : "text-ink-muted"}>
              {step.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
