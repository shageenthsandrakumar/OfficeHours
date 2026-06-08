"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MatchedOpportunity, StudentProfile } from "@/lib/types/database";

const AGENT_API = process.env.NEXT_PUBLIC_AGENT_API_URL ?? "";

type Turn = { from_agent: string; payload: string; turn: number; intent?: string };
type DossierLite = {
  routing: string;
  summary?: string;
  skills_met?: string;
  skill_gaps?: string[];
  uncertainties?: string[];
};
type Phase = "running" | "replaying" | "done" | "error";

const ROUTING_LABEL: Record<string, string> = {
  CLEAR_FIT: "Clear fit",
  CLEAR_MISMATCH: "Clear mismatch",
  AMBIGUOUS: "Worth a closer look",
};
const DECISION_LABEL: Record<string, string> = {
  MATCH: "A conversation makes sense",
  NO_MATCH: "Not the right fit right now",
  NEEDS_INFO: "More detail would help",
};
const AGENT_META: Record<string, { name: string; role: string; align: string; accent: string }> = {
  student: { name: "Student Advocate", role: "argues for the student", align: "left", accent: "#4a6741" },
  professor: { name: "Lab Screener", role: "guards the requirements", align: "right", accent: "#8b3a2a" },
  mediator: { name: "Mediator", role: "makes the call", align: "center", accent: "#5c4a2a" },
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function parseSSE(frame: string): { event: string; data: any } | null {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return null;
  try {
    return { event, data: JSON.parse(dataLines.join("\n")) };
  } catch {
    return null;
  }
}

export function WhyThisMatchModal({
  student,
  opportunity,
  onClose,
}: {
  student: StudentProfile;
  opportunity: MatchedOpportunity;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("running");
  const [dossier, setDossier] = useState<DossierLite | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [decision, setDecision] = useState<string | null>(null);
  const [justification, setJustification] = useState("");
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, decision]);

  const run = useCallback(async () => {
    const supabase = createClient();

    // 1. Cache hit -> replay the stored transcript with a live-typing feel.
    const { data: cached } = await supabase
      .from("negotiations")
      .select("*")
      .eq("student_id", student.id)
      .eq("opportunity_id", opportunity.id)
      .maybeSingle();

    if (cached) {
      setPhase("replaying");
      setDossier(cached.dossier as DossierLite);
      const all: Turn[] = (cached.transcript as Turn[]) ?? [];
      for (let i = 0; i < all.length; i++) {
        setTurns(all.slice(0, i + 1));
        await sleep(850);
      }
      setDecision(cached.decision as string);
      setJustification((cached.justification as string) ?? "");
      setPhase("done");
      return;
    }

    // 2. Cache miss -> stream a live negotiation from the agent backend.
    if (!AGENT_API) {
      setError("Reasoning engine URL is not configured.");
      setPhase("error");
      return;
    }

    const body = {
      student: {
        major: student.major,
        year: student.year,
        topics: student.topics,
        gpa_range: student.gpa_range,
        hours_per_week: student.hours_per_week,
        bio: student.bio,
        university: student.university,
      },
      opportunity: {
        title: opportunity.title,
        description: opportunity.description,
        topics: opportunity.topics,
        opportunity_type: opportunity.opportunity_type,
        gpa_min: opportunity.gpa_min,
        hours_per_week: opportunity.hours_per_week,
        pi_name: opportunity.professor?.name,
        department: opportunity.professor?.department,
        university: opportunity.professor?.university,
      },
    };

    let res: Response;
    try {
      res = await fetch(`${AGENT_API}/negotiate/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      setError("Could not reach the reasoning engine.");
      setPhase("error");
      return;
    }
    if (!res.ok || !res.body) {
      setError("The reasoning engine returned an error.");
      setPhase("error");
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const collected: Turn[] = [];
    let doss: DossierLite | null = null;
    let finalDecision: string | null = null;
    let finalJust = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";
      for (const frame of frames) {
        const ev = parseSSE(frame);
        if (!ev) continue;
        if (ev.event === "dossier") {
          doss = ev.data;
          setDossier(ev.data);
        } else if (ev.event === "turn") {
          const t: Turn = {
            from_agent: ev.data.from_agent,
            payload: ev.data.payload,
            turn: ev.data.turn,
            intent: ev.data.intent,
          };
          collected.push(t);
          setTurns([...collected]);
        } else if (ev.event === "decision") {
          finalDecision = ev.data.decision;
          finalJust = ev.data.justification;
          setDecision(finalDecision);
          setJustification(finalJust);
        } else if (ev.event === "error") {
          setError(ev.data?.message ?? "The negotiation failed.");
          setPhase("error");
          return;
        }
      }
    }
    setPhase("done");

    // Populate the cache so the next viewer replays instantly.
    if (doss && finalDecision) {
      await supabase.from("negotiations").upsert(
        {
          student_id: student.id,
          opportunity_id: opportunity.id,
          routing: doss.routing,
          decision: finalDecision,
          justification: finalJust,
          dossier: doss,
          transcript: collected,
        },
        { onConflict: "student_id,opportunity_id" }
      );
    }
  }, [student, opportunity]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    run();
  }, [run]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const busy = phase === "running" || phase === "replaying";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-[680px] flex-col overflow-hidden rounded-[14px] border border-ascend-border bg-ascend-bg shadow-xl"
        style={{ borderWidth: "0.5px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-ascend-border/70 bg-ascend-card px-6 py-4">
          <div>
            <h2 className="page-title">Why this match?</h2>
            <p className="label-text mt-1">
              {opportunity.title} · {opportunity.professor?.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-ascend-muted hover:text-ascend-text"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5">
          {/* Dossier strip */}
          {dossier && (
            <div className="ascend-card mb-5">
              <div className="flex items-center justify-between">
                <span className="label-text">Evidence read</span>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                  style={{ background: "var(--ascend-match-bg)", color: "var(--ascend-primary)" }}
                >
                  {ROUTING_LABEL[dossier.routing] ?? dossier.routing}
                </span>
              </div>
              {dossier.summary && (
                <p className="mt-2 text-sm text-ascend-text">{dossier.summary}</p>
              )}
              {dossier.routing !== "AMBIGUOUS" && (
                <p className="mt-2 text-xs text-ascend-muted">
                  The rules resolved this without needing the agents.
                </p>
              )}
            </div>
          )}

          {/* Agent turns */}
          <div className="space-y-3">
            {turns.map((t, i) => {
              const meta = AGENT_META[t.from_agent] ?? AGENT_META.mediator;
              const isRight = meta.align === "right";
              const isCenter = meta.align === "center";
              return (
                <div
                  key={i}
                  className={`flex ${isCenter ? "justify-center" : isRight ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[88%] rounded-[12px] border bg-ascend-card p-3.5 ${isCenter ? "w-full" : ""}`}
                    style={{ borderColor: "var(--ascend-border)", borderWidth: "0.5px" }}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ background: meta.accent }}
                      />
                      <span className="text-xs font-semibold" style={{ color: meta.accent }}>
                        {meta.name}
                      </span>
                      <span className="label-text">{meta.role}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-ascend-text">
                      {t.payload}
                    </p>
                  </div>
                </div>
              );
            })}

            {busy && (
              <div className="flex items-center gap-2 py-2 text-sm text-ascend-muted">
                <span className="inline-flex gap-1">
                  <Dot /> <Dot delay="150ms" /> <Dot delay="300ms" />
                </span>
                {phase === "replaying" ? "Replaying the deliberation…" : "The agents are deliberating…"}
              </div>
            )}
          </div>

          {/* Decision */}
          {decision && (
            <div className="ascend-card mt-5" style={{ background: "var(--ascend-match-bg)" }}>
              <span className="label-text">Recommendation</span>
              <p className="section-title mt-1">{DECISION_LABEL[decision] ?? decision}</p>
              {justification && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-ascend-text">
                  {justification.replace(/^DECISION:.*$/m, "").trim()}
                </p>
              )}
            </div>
          )}

          {phase === "error" && (
            <div className="ascend-card mt-4 text-sm text-ascend-destructive">{error}</div>
          )}
        </div>

        {/* Disclaimer footer */}
        <div className="border-t border-ascend-border/70 bg-ascend-card px-6 py-3">
          <p className="text-[11px] leading-relaxed text-ascend-muted">
            The agents reason only over the evidence in the profile and never invent
            qualifications. More detail in a profile leads to a stronger, fairer read.
            This is a recommendation to start a conversation, not a hiring decision.
          </p>
        </div>
      </div>
    </div>
  );
}

function Dot({ delay = "0ms" }: { delay?: string }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-bounce rounded-full"
      style={{ background: "var(--ascend-secondary)", animationDelay: delay }}
    />
  );
}
