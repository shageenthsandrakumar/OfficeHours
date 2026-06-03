"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { DemoRole, LightweightIntake } from "@/lib/onboarding/types";
import {
  loadDemoRole,
  loadLightweightDraft,
  saveLightweightDraft,
} from "@/lib/onboarding/session";

const QUESTIONS: Record<
  DemoRole,
  { primary: string; signal: string; focus: string; focusPlaceholder: string }
> = {
  student: {
    primary: "What should we call you?",
    signal: "What's the strongest thing about you that wouldn't show on a résumé?",
    focus: "What kind of opportunity are you exploring?",
    focusPlaceholder: "e.g. robotics lab, soft robotics, MIT research",
  },
  opportunity: {
    primary: "What's the role or project title?",
    signal: "What skills or evidence matter most for this role?",
    focus: "What would make you still consider someone who looks weak on paper?",
    focusPlaceholder: "e.g. hidden build projects, ownership signals",
  },
};

const DEMO_STUDENT: LightweightIntake = {
  role: "student",
  primary: "Aisha Patel",
  signal: "Built a 6-DOF arm from scratch; 400-star ROS package from intake",
  focus: "Soft robotics lab at MIT",
};

const DEMO_OPPORTUNITY: LightweightIntake = {
  role: "opportunity",
  primary: "Soft Robotics for Minimally Invasive Surgery",
  signal: "Python, CAD, hardware — plus proof they can fabricate",
  focus: "Candidates who look weak on paper but have build evidence",
};

export function LightweightIntakeForm() {
  const router = useRouter();
  const [role, setRole] = useState<DemoRole | null>(null);
  const [form, setForm] = useState<LightweightIntake | null>(null);

  useEffect(() => {
    const r = loadDemoRole();
    if (!r) {
      router.replace("/start");
      return;
    }
    setRole(r);
    const draft = loadLightweightDraft();
    setForm(
      draft?.role === r
        ? draft
        : { role: r, primary: "", signal: "", focus: "" }
    );
  }, [router]);

  if (!role || !form) {
    return <p className="text-sm text-ink-muted">Loading…</p>;
  }

  const q = QUESTIONS[role];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    saveLightweightDraft(form);
    router.push("/start/analyzing");
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-ink">
          {role === "student" ? "Your signals" : "Your opportunity"}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">Three questions — then we analyze.</p>
      </div>

      <button
        type="button"
        className="text-sm font-medium text-coral hover:underline"
        onClick={() =>
          setForm(role === "student" ? DEMO_STUDENT : DEMO_OPPORTUNITY)
        }
      >
        Fill demo answers
      </button>

      <label className="block">
        <span className="text-sm font-semibold text-ink">{q.primary}</span>
        <input
          required
          className={inputCls}
          value={form.primary}
          onChange={(e) => setForm({ ...form, primary: e.target.value })}
        />
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-ink">{q.signal}</span>
        <textarea
          required
          rows={3}
          className={inputCls}
          value={form.signal}
          onChange={(e) => setForm({ ...form, signal: e.target.value })}
        />
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-ink">{q.focus}</span>
        <input
          required
          className={inputCls}
          placeholder={q.focusPlaceholder}
          value={form.focus}
          onChange={(e) => setForm({ ...form, focus: e.target.value })}
        />
      </label>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => router.push("/start")}
          className="rounded-xl border border-cream-dark px-4 py-2.5 text-sm font-medium"
        >
          ← Back
        </button>
        <button type="submit" className={`${btnCls} flex-1`}>
          Run signal analysis →
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "mt-1.5 w-full rounded-xl border border-cream-dark bg-card px-4 py-2.5 text-ink focus:border-coral focus:outline-none focus:ring-2 focus:ring-coral/20";
const btnCls =
  "rounded-xl bg-coral py-2.5 text-sm font-semibold text-white hover:brightness-105";
