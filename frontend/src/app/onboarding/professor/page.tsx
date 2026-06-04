"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  GPA_RANGES,
  HOURS_OPTIONS,
  OPPORTUNITY_TYPES,
  TOPICS,
  YEARS,
} from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { Button } from "@/components/ui/Button";
import { ChipSelect } from "@/components/ui/ChipSelect";
import { Input } from "@/components/ui/Input";
import { UniversitySearch } from "@/components/ui/UniversitySearch";

export default function ProfessorOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [university, setUniversity] = useState("");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [title, setTitle] = useState("");
  const [opportunityTypes, setOpportunityTypes] = useState<string[]>([]);
  const [preferredYears, setPreferredYears] = useState<string[]>([]);
  const [preferredGpa, setPreferredGpa] = useState("");
  const [preferredTopics, setPreferredTopics] = useState<string[]>([]);
  const [preferredHours, setPreferredHours] = useState("10");

  async function finish() {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }

    const { error: insertError } = await supabase.from("professor_profiles").upsert({
      user_id: user.id,
      university,
      name,
      department,
      title,
      opportunity_types: opportunityTypes,
      preferred_student_traits: {
        preferred_years: preferredYears,
        preferred_gpa_range: preferredGpa,
        preferred_topics: preferredTopics,
        preferred_hours: Number(preferredHours),
      },
      last_active_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard/professor?post=1");
  }

  const titles = [
    "Your university",
    "Your academic profile",
    "Opportunities you post",
    "Ideal student traits",
  ];

  return (
    <OnboardingShell step={step} totalSteps={4} title={titles[step - 1]}
      subtitle={step === 4 ? "Help our AI rank applicants that fit your lab." : undefined}>
      {step === 1 && (
        <div className="space-y-5">
          <UniversitySearch value={university} onChange={setUniversity} />
          <Button className="w-full" disabled={!university.trim()} onClick={() => setStep(2)}>Continue</Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="Department" value={department} onChange={(e) => setDepartment(e.target.value)} required />
          <Input label="Title" placeholder="e.g. Associate Professor" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
            <Button className="flex-1" disabled={!name || !department || !title} onClick={() => setStep(3)}>Continue</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <p className="text-sm font-medium text-ascend-text">Types of opportunities you post</p>
          <ChipSelect options={OPPORTUNITY_TYPES} selected={opportunityTypes} onChange={setOpportunityTypes} />
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep(2)}>Back</Button>
            <Button className="flex-1" disabled={opportunityTypes.length === 0} onClick={() => setStep(4)}>Continue</Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-5">
          <div>
            <p className="mb-3 text-sm font-medium text-ascend-text">Preferred year levels</p>
            <ChipSelect options={YEARS} selected={preferredYears} onChange={setPreferredYears} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-ascend-text">Minimum GPA range</label>
            <select value={preferredGpa} onChange={(e) => setPreferredGpa(e.target.value)}
              className="w-full rounded-lg border border-ascend-border bg-ascend-card px-4 py-2.5 text-sm">
              <option value="">No minimum</option>
              {GPA_RANGES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <p className="mb-3 text-sm font-medium text-ascend-text">Preferred topics</p>
            <ChipSelect options={TOPICS} selected={preferredTopics} onChange={setPreferredTopics} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-ascend-text">Preferred hours/week</label>
            <select value={preferredHours} onChange={(e) => setPreferredHours(e.target.value)}
              className="w-full rounded-lg border border-ascend-border bg-ascend-card px-4 py-2.5 text-sm">
              {HOURS_OPTIONS.map((h) => <option key={h} value={h}>{h}+ hours/week</option>)}
            </select>
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep(3)}>Back</Button>
            <Button className="flex-1" disabled={loading} onClick={finish}>
              {loading ? "Saving…" : "Post my first opportunity"}
            </Button>
          </div>
        </div>
      )}
    </OnboardingShell>
  );
}
