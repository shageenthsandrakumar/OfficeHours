"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ANALYSIS_STEPS } from "@/lib/onboarding/analysisSteps";
import { buildSessionFromLightweight } from "@/lib/onboarding/lightweight";
import { lensForRole } from "@/lib/onboarding/lightweight";
import {
  loadLightweightDraft,
  saveIntakeSession,
} from "@/lib/onboarding/session";

const STEP_MS = 850;

export function DemoAnalysisLoader() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const lw = loadLightweightDraft();
    if (!lw?.primary || !lw.signal) {
      router.replace("/start/intake");
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
        const session = buildSessionFromLightweight(lw);
        saveIntakeSession(session);
        const lens = lensForRole(session.role);
        router.replace(
          `/note/${session.demoStudentId}/${session.demoProjectId}?created=1&lens=${lens}`
        );
      }, ANALYSIS_STEPS.length * STEP_MS + 350)
    );

    return () => timers.forEach(clearTimeout);
  }, [router]);

  const current = ANALYSIS_STEPS[stepIndex];

  return (
    <div className="flex min-h-[50vh] flex-col items-center py-8 text-center">
      <div className="relative mb-6 h-20 w-20">
        <div className="absolute inset-0 rounded-full border-4 border-cream-dark" />
        <div
          className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-coral border-r-sage"
          style={{ animationDuration: "1.1s" }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-xl">
          📡
        </span>
      </div>
      <p className="text-xs font-bold uppercase tracking-widest text-coral">
        Signal analysis
      </p>
      <h2 className="mt-2 font-serif text-xl font-semibold text-ink">
        {current?.label ?? "Preparing…"}
      </h2>
      <p className="mt-2 max-w-xs text-sm text-ink-muted">{current?.detail}</p>
      <div className="mt-6 h-2 w-56 overflow-hidden rounded-full bg-cream-dark">
        <div
          className="h-full rounded-full bg-gradient-to-r from-coral via-honey to-sage transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-ink-muted">{progress}%</p>
    </div>
  );
}
