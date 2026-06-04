"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  GPA_RANGES,
  HOURS_OPTIONS,
  MAJORS,
  OPPORTUNITY_TYPES,
  RESEARCH_OPENNESS,
  TOPICS,
  YEARS,
} from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { Button } from "@/components/ui/Button";
import { ChipSelect } from "@/components/ui/ChipSelect";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { UniversitySearch } from "@/components/ui/UniversitySearch";

export default function StudentOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [university, setUniversity] = useState("");
  const [major, setMajor] = useState("");
  const [year, setYear] = useState("");
  const [opportunityTypes, setOpportunityTypes] = useState<string[]>([]);
  const [researchOpenness, setResearchOpenness] = useState("yes");
  const [topics, setTopics] = useState<string[]>([]);
  const [gpaRange, setGpaRange] = useState("");
  const [hoursPerWeek, setHoursPerWeek] = useState("10");
  const [bio, setBio] = useState("");

  async function finish() {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }

    const { error: insertError } = await supabase.from("student_profiles").upsert({
      user_id: user.id,
      university,
      major,
      year,
      opportunity_types: opportunityTypes,
      research_openness: researchOpenness,
      topics,
      gpa_range: gpaRange,
      hours_per_week: Number(hoursPerWeek),
      bio: bio || null,
      updated_at: new Date().toISOString(),
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    await fetch("/api/match", { method: "POST" });
    router.push("/dashboard/student");
  }

  const titles = [
    "Where do you study?",
    "Your academic background",
    "What are you looking for?",
    "Your interests",
    "Availability & GPA",
  ];

  return (
    <OnboardingShell step={step} totalSteps={5} title={titles[step - 1]}
      subtitle={step === 4 ? "Select topics — we'll match opportunities to your interests." : undefined}>
      {step === 1 && (
        <div className="space-y-5">
          <UniversitySearch value={university} onChange={setUniversity} />
          <Button className="w-full" disabled={!university.trim()} onClick={() => setStep(2)}>Continue</Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div>
            <label className="mb-2 block font-heading text-[15px] text-ascend-text">Major</label>
            <select value={major} onChange={(e) => setMajor(e.target.value)} className="ascend-input">
              <option value="">Select major</option>
              {MAJORS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-2 block font-heading text-[15px] text-ascend-text">Year in school</label>
            <select value={year} onChange={(e) => setYear(e.target.value)} className="ascend-input">
              <option value="">Select year</option>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
            <Button className="flex-1" disabled={!major || !year} onClick={() => setStep(3)}>Continue</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <div>
            <p className="mb-3 font-heading text-[15px] text-ascend-text">Opportunity types</p>
            <ChipSelect options={OPPORTUNITY_TYPES.filter((t) => t.id !== "project")} selected={opportunityTypes} onChange={setOpportunityTypes} />
          </div>
          <div>
            <p className="mb-3 font-heading text-[15px] text-ascend-text">Open to research?</p>
            <RadioGroup name="research" options={RESEARCH_OPENNESS} value={researchOpenness} onChange={setResearchOpenness} />
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep(2)}>Back</Button>
            <Button className="flex-1" disabled={opportunityTypes.length === 0} onClick={() => setStep(4)}>Continue</Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-5">
          <ChipSelect options={TOPICS} selected={topics} onChange={setTopics} />
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep(3)}>Back</Button>
            <Button className="flex-1" disabled={topics.length === 0} onClick={() => setStep(5)}>Continue</Button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-5">
          <div>
            <p className="mb-3 text-sm font-medium text-ascend-text">GPA range</p>
            <RadioGroup name="gpa" options={GPA_RANGES.map((g) => ({ id: g, label: g }))} value={gpaRange} onChange={setGpaRange} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-ascend-text">Hours available per week</label>
            <select value={hoursPerWeek} onChange={(e) => setHoursPerWeek(e.target.value)}
              className="w-full rounded-lg border border-ascend-border bg-ascend-card px-4 py-2.5 text-sm">
              {HOURS_OPTIONS.map((h) => <option key={h} value={h}>{h} hours/week</option>)}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-ascend-text">Short bio (optional)</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
              className="w-full rounded-lg border border-ascend-border bg-ascend-card px-4 py-2.5 text-sm"
              placeholder="A sentence about your research interests…" />
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep(4)}>Back</Button>
            <Button className="flex-1" disabled={!gpaRange || loading} onClick={finish}>
              {loading ? "Saving…" : "Go to my feed"}
            </Button>
          </div>
        </div>
      )}
    </OnboardingShell>
  );
}
