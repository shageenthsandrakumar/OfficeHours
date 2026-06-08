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
type Gate = "none" | "ask" | "no" | "yesForm";

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

  // NEEDS_INFO loop state
  const [gate, setGate] = useState<Gate>("none");
  const [evidence, setEvidence] = useState("");
  const [saving, setSaving] = useState(false);

  const bioRef = useRef<string>(student.bio ?? "");
  const scrollRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, decision, gate]);

  function buildBody(bio: string) {
    return {
      student: {
        major: student.major,
        year: student.year,
        topics: student.topics,
        gpa_range: student.gpa_range,
        hours_per_week: student.hours_per_week,
        bio,
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
  }

  const streamLive = useCallback(
    async (bio: string) => {
      // reset for a fresh (or re-) run
      setTurns([]);
      setDossier(null);
      setDecision(null);
      setJustification("");
      setError("");
      setGate("none");
      setPhase("running");

      const supabase = createClient();
      let res: Response;
      try {
        res = await fetch(`${AGENT_API}/negotiate/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildBody(bio)),
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
            collected.push({
              from_agent: ev.data.from_agent,
              payload: ev.data.payload,
              turn: ev.data.turn,
              intent: ev.data.intent,
            });
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
      // Only NEEDS_INFO offers the add-evidence loop. NO_MATCH is terminal.
      if (finalDecision === "NEEDS_INFO") setGate("ask");

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
    },
    [student, opportunity]
  );

  const run = useCallback(async () => {
    const supabase = createClient();
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
      if (cached.decision === "NEEDS_INFO") setGate("ask");
      return;
    }

    if (!AGENT_API) {
      setError("Reasoning engine URL is not configured.");
      setPhase("error");
      return;
    }
    await streamLive(bioRef.current);
  }, [student, opportunity, streamLive]);

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

  // "No, not my background" -> instant honest NO_MATCH (no agents re-run)
  async function handleNo() {
    const just =
      "The student indicated this required skill set is not part of their background, so this is not the right fit for now.";
    setDecision("NO_MATCH");
    setJustification(just);
    setGate("no");
    const supabase = createClient();
    await supabase.from("negotiations").upsert(
      {
        student_id: student.id,
        opportunity_id: opportunity.id,
        routing: dossier?.routing ?? "AMBIGUOUS",
        decision: "NO_MATCH",
        justification: just,
        dossier: dossier ?? {},
        transcript: turns,
      },
      { onConflict: "student_id,opportunity_id" }
    );
  }

  // "Yes" -> save the edited submission (replaces bio), persist, re-run the negotiation
  async function handleYesSubmit() {
    const edited = evidence.trim();
    if (!edited || saving) return;
    setSaving(true);
    bioRef.current = edited;
    const supabase = createClient();
    await supabase.from("student_profiles").update({ bio: edited }).eq("id", student.id);
    setSaving(false);
    await streamLive(edited);
  }

  const busy = phase === "running" || phase === "replaying";
  const gaps = dossier?.skill_gaps ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
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
          <button onClick={onClose} className="rounded-md px-2 py-1 text-ascend-muted hover:text-ascend-text" aria-label="Close">
            ✕
          </button>
        </div>

        {/* Body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5">
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
              {dossier.summary && <p className="mt-2 text-sm text-ascend-text">{dossier.summary}</p>}
              {dossier.routing !== "AMBIGUOUS" && (
                <p className="mt-2 text-xs text-ascend-muted">The rules resolved this without needing the agents.</p>
              )}
            </div>
          )}

          <div className="space-y-3">
            {turns.map((t, i) => {
              const meta = AGENT_META[t.from_agent] ?? AGENT_META.mediator;
              const isRight = meta.align === "right";
              const isCenter = meta.align === "center";
              return (
                <div key={i} className={`flex ${isCenter ? "justify-center" : isRight ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[88%] rounded-[12px] border bg-ascend-card p-3.5 ${isCenter ? "w-full" : ""}`}
                    style={{ borderColor: "var(--ascend-border)", borderWidth: "0.5px" }}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ background: meta.accent }} />
                      <span className="text-xs font-semibold" style={{ color: meta.accent }}>{meta.name}</span>
                      <span className="label-text">{meta.role}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-ascend-text">{t.payload}</p>
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

          {/* NEEDS_INFO gate */}
          {gate === "ask" && (
            <div className="ascend-card mt-4">
              <p className="text-sm font-medium text-ascend-text">
                The agents could not confirm
                {gaps.length > 0 ? <>: <span className="font-semibold">{gaps.join(", ")}</span></> : " a required skill"}.
                Do you have real experience with {gaps.length === 1 ? "it" : "these"}?
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setEvidence(bioRef.current);
                    setGate("yesForm");
                  }}
                  className="rounded-md bg-ascend-primary px-3 py-2 text-sm text-white hover:bg-ascend-primary-dark"
                >
                  Yes, I can eventually show it
                </button>
                <button
                  onClick={handleNo}
                  className="rounded-md border border-ascend-border px-3 py-2 text-sm text-ascend-text hover:bg-ascend-card-hover"
                  style={{ borderWidth: "0.5px" }}
                >
                  No, this is not part of my background
                </button>
              </div>
              <p className="mt-2 text-[11px] text-ascend-muted">
                Choosing “No” marks this opportunity as not the right fit for now.
              </p>
            </div>
          )}

          {/* Evidence form — edit the original submission in place */}
          {gate === "yesForm" && (
            <div className="ascend-card mt-4">
              <p className="text-sm font-medium text-ascend-text">Review and update your submission</p>
              <p className="mt-1 text-xs text-ascend-muted">
                This is what you submitted. Edit it to add the real experience the agents asked for
                {gaps.length > 0 ? <> — {gaps.join(", ")}</> : ""}. Add only what is true; the agents reason only over
                real evidence, so inventing something just produces a false answer.
              </p>
              <textarea
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                rows={7}
                className="ascend-input mt-3"
                placeholder="Describe your real experience — e.g. tools you used, projects you built, code you wrote."
              />
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleYesSubmit}
                  disabled={!evidence.trim() || saving}
                  className="rounded-md bg-ascend-primary px-3 py-2 text-sm text-white hover:bg-ascend-primary-dark disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save & re-run"}
                </button>
                <button
                  onClick={() => setGate("ask")}
                  className="rounded-md px-3 py-2 text-sm text-ascend-muted hover:text-ascend-text"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {phase === "error" && <div className="ascend-card mt-4 text-sm text-ascend-destructive">{error}</div>}
        </div>

        {/* Disclaimer footer */}
        <div className="border-t border-ascend-border/70 bg-ascend-card px-6 py-3">
          <p className="text-[11px] leading-relaxed text-ascend-muted">
            The agents reason only over the evidence in the profile and never invent qualifications. More detail in a
            profile leads to a stronger, fairer read. This is a recommendation to start a conversation, not a hiring
            decision.
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
