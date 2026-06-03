"use client";

import { useState } from "react";
import Link from "next/link";
import type { IntakeSession } from "@/lib/onboarding/types";

interface Props {
  session: IntakeSession;
  demoLabel: string;
}

export function InvestigationProvenance({ session, demoLabel }: Props) {
  const [open, setOpen] = useState(true);
  const { student, opportunity } = session;

  return (
    <div className="mb-6 rounded-2xl border border-honey/50 bg-gradient-to-r from-honey-soft/60 to-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left sm:px-5"
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-honey">
            How this investigation was created
          </p>
          <p className="mt-0.5 text-sm font-semibold text-ink">
            From your intake → signal analysis → {demoLabel}
          </p>
        </div>
        <span className="shrink-0 text-ink-muted" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
      </button>

      {open ? (
        <div className="border-t border-honey/30 px-4 pb-4 pt-3 sm:px-5">
          <ol className="space-y-3 text-sm text-ink-muted">
            <li>
              <span className="font-semibold text-ink">1. Role — </span>
              {session.role === "student"
                ? "You entered as a student (coach mode)."
                : "You entered as an opportunity holder (reviewer mode)."}
            </li>
            <li>
              <span className="font-semibold text-ink">2. You shared — </span>
              {session.lightweight ? (
                <>
                  &ldquo;{session.lightweight.primary}&rdquo; · &ldquo;
                  {session.lightweight.signal.slice(0, 80)}
                  …&rdquo;
                </>
              ) : (
                <>
                  {student.name} ({student.year}) — &ldquo;
                  {student.intakeStory.slice(0, 100)}…&rdquo;
                </>
              )}
            </li>
            <li>
              <span className="font-semibold text-ink">3. Opportunity — </span>
              {opportunity.projectTitle} at {opportunity.labName} (
              {opportunity.requiredSkills})
            </li>
            <li>
              <span className="font-semibold text-ink">4. Analysis — </span>
              Surface credentials scanned, intake parsed, hidden signals surfaced,
              dossier built (rules-only), investigation routed.
            </li>
            <li>
              <span className="font-semibold text-ink">5. Demo note — </span>
              Full dossier and reviewer trail use enriched mock data ({demoLabel})
              so you can explore a complete investigation.
            </li>
          </ol>
          <Link
            href="/start"
            className="mt-4 inline-block text-sm font-medium text-coral hover:underline"
          >
            Run a new demo →
          </Link>
        </div>
      ) : null}
    </div>
  );
}
