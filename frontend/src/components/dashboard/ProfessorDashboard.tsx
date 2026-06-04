"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  IconBriefcase,
  IconFileDescription,
  IconLayoutDashboard,
  IconUser,
} from "@tabler/icons-react";
import {
  COMPENSATION_OPTIONS,
  OPPORTUNITY_TYPES,
  TOPICS,
} from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { closingWarning, formatRelativeActive, postedLabel } from "@/lib/profileUtils";
import type {
  ApplicantWithProfile,
  Opportunity,
  ProfessorProfile,
} from "@/lib/types/database";
import { AppMain, AppSidebar, MobileNav } from "@/components/layout/AppSidebar";
import { MatchBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ChipSelect } from "@/components/ui/ChipSelect";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

type Section = "dashboard" | "opportunities" | "applications" | "profile";

const NAV = [
  { id: "dashboard" as const, label: "Dashboard", icon: IconLayoutDashboard },
  { id: "opportunities" as const, label: "Opportunities", icon: IconBriefcase },
  { id: "applications" as const, label: "Applications", icon: IconFileDescription },
  { id: "profile" as const, label: "Profile", icon: IconUser },
];

function EditableField({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  return (
    <div className="ascend-card !p-4">
      <p className="label-text">{label}</p>
      {editing ? (
        <div className="mt-2 flex gap-2">
          <input value={draft} onChange={(e) => setDraft(e.target.value)} className="ascend-input flex-1" />
          <Button size="sm" onClick={() => { onSave(draft); setEditing(false); }}>Save</Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => { setDraft(value); setEditing(true); }}
          className="mt-2 text-left text-sm text-ascend-text hover:text-ascend-primary"
        >
          {value}
        </button>
      )}
    </div>
  );
}

export function ProfessorDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [section, setSection] = useState<Section>(
    searchParams.get("post") === "1" ? "opportunities" : "dashboard"
  );
  const [profile, setProfile] = useState<ProfessorProfile | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [applicants, setApplicants] = useState<ApplicantWithProfile[]>([]);
  const [selectedOpp, setSelectedOpp] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(searchParams.get("post") === "1");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [opportunityType, setOpportunityType] = useState("research");
  const [hoursPerWeek, setHoursPerWeek] = useState("10");
  const [gpaMin, setGpaMin] = useState("3.0");
  const [compensation, setCompensation] = useState("unpaid");

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }

    const { data: prof } = await supabase
      .from("professor_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!prof) {
      router.push("/onboarding/professor");
      return;
    }

    setProfile(prof);

    const { data: opps } = await supabase
      .from("opportunities")
      .select("*")
      .eq("professor_id", prof.id)
      .order("created_at", { ascending: false });

    setOpportunities(opps ?? []);

    const oppIds = (opps ?? []).map((o) => o.id);
    if (oppIds.length > 0) {
      const { data: apps } = await supabase
        .from("applications")
        .select("*, student:student_profiles(*)")
        .in("opportunity_id", oppIds)
        .order("ai_match_score", { ascending: false });

      setApplicants((apps ?? []) as ApplicantWithProfile[]);
    }
  }, [router]);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    setPosting(true);
    const res = await fetch("/api/opportunities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        topics,
        opportunity_type: opportunityType,
        hours_per_week: Number(hoursPerWeek),
        gpa_min: Number(gpaMin),
        compensation,
      }),
    });
    if (res.ok) {
      setShowForm(false);
      setTitle("");
      setDescription("");
      setTopics([]);
      await loadData();
    }
    setPosting(false);
  }

  async function updateApplication(id: string, status: "viewed" | "accepted" | "declined") {
    await fetch("/api/opportunities", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId: id, status }),
    });
    await loadData();
  }

  async function updateProfile(fields: Partial<ProfessorProfile>) {
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "professor", ...fields }),
    });
    await loadData();
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  const filteredApplicants = selectedOpp
    ? applicants.filter((a) => a.opportunity_id === selectedOpp)
    : applicants;

  const applicantCount = (oppId: string) =>
    applicants.filter((a) => a.opportunity_id === oppId).length;

  const initials = profile?.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "P";

  if (loading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ascend-bg text-ascend-muted">
        Loading…
      </div>
    );
  }

  return (
    <>
      <div className="hidden lg:block">
        <AppSidebar
          active={section}
          items={NAV}
          onSelect={(id) => setSection(id as Section)}
          userName={profile.name.split(" ")[0]}
          userInitials={initials}
          onSignOut={handleLogout}
        />
      </div>

      <AppMain>
        <MobileNav active={section} items={NAV} onSelect={(id) => setSection(id as Section)} />

        {section === "dashboard" && (
          <div className="space-y-6">
            <header>
              <h1 className="page-title">{profile.name}</h1>
              <p className="mt-1 text-[13px] text-ascend-muted">
                {profile.department} · {profile.university}
              </p>
            </header>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="ascend-card">
                <p className="label-text">Open postings</p>
                <p className="mt-2 font-heading text-[22px] font-medium text-ascend-text">
                  {opportunities.filter((o) => o.status === "open").length}
                </p>
              </div>
              <div className="ascend-card">
                <p className="label-text">Total applicants</p>
                <p className="mt-2 font-heading text-[22px] font-medium text-ascend-text">{applicants.length}</p>
              </div>
              <div className="ascend-card">
                <p className="label-text">Response rate</p>
                <p className="mt-2 font-heading text-[22px] font-medium text-ascend-text">{profile.response_rate}%</p>
              </div>
            </div>
          </div>
        )}

        {section === "opportunities" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h1 className="page-title">Opportunities</h1>
              <Button onClick={() => setShowForm(!showForm)}>
                {showForm ? "Cancel" : "Post new opportunity"}
              </Button>
            </div>

            {showForm && (
              <form onSubmit={handlePost} className="ascend-card space-y-4">
                <h2 className="section-title">New opportunity</h2>
                <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                <div>
                  <label className="mb-2 block font-heading text-[15px] text-ascend-text">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={4}
                    className="ascend-input"
                  />
                </div>
                <div>
                  <p className="label-text mb-2">Topics</p>
                  <ChipSelect options={TOPICS} selected={topics} onChange={setTopics} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label-text mb-2 block">Type</label>
                    <select value={opportunityType} onChange={(e) => setOpportunityType(e.target.value)} className="ascend-input">
                      {OPPORTUNITY_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <Input label="Hours per week" type="number" value={hoursPerWeek} onChange={(e) => setHoursPerWeek(e.target.value)} required />
                  <Input label="Minimum GPA" type="number" step="0.1" value={gpaMin} onChange={(e) => setGpaMin(e.target.value)} required />
                  <div>
                    <label className="label-text mb-2 block">Compensation</label>
                    <select value={compensation} onChange={(e) => setCompensation(e.target.value)} className="ascend-input">
                      {COMPENSATION_OPTIONS.map((c) => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <Button type="submit" disabled={posting || topics.length === 0}>
                  {posting ? "Publishing…" : "Publish opportunity"}
                </Button>
              </form>
            )}

            <div className="space-y-3">
              {opportunities.length === 0 ? (
                <div className="ascend-card label-text">No opportunities yet. Post your first role above.</div>
              ) : (
                opportunities.map((opp) => {
                  const warning = closingWarning(opp.created_at);
                  return (
                    <button
                      key={opp.id}
                      type="button"
                      onClick={() => setSelectedOpp(selectedOpp === opp.id ? null : opp.id)}
                      className={cn(
                        "opportunity-card w-full text-left",
                        selectedOpp === opp.id && "bg-ascend-card-hover"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-ascend-text">{opp.title}</p>
                        <span className={cn(
                          "label-text capitalize",
                          opp.status === "open" ? "text-ascend-success" : "text-ascend-muted"
                        )}>
                          {opp.status}
                        </span>
                      </div>
                      <p className="label-text mt-2">
                        {postedLabel(opp.created_at)} · {applicantCount(opp.id)} applicants
                      </p>
                      {warning && (
                        <p className="mt-2 text-xs text-ascend-destructive">{warning}</p>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {section === "applications" && (
          <div className="space-y-6">
            <h1 className="page-title">
              Applications {selectedOpp ? "(filtered)" : ""}
            </h1>
            <div className="space-y-4">
              {filteredApplicants.length === 0 ? (
                <div className="ascend-card label-text">No applicants yet.</div>
              ) : (
                filteredApplicants.map((app) => (
                  <article key={app.id} className="ascend-card">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm text-ascend-text">
                          {app.student.major} · {app.student.year}
                        </p>
                        <p className="label-text mt-1">
                          {app.student.university} · {app.student.hours_per_week} hrs/week
                        </p>
                      </div>
                      <MatchBadge score={Number(app.ai_match_score)} />
                    </div>

                    {app.ai_match_reason && (
                      <p className="mt-3 truncate text-sm text-ascend-muted">{app.ai_match_reason}</p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {app.status === "pending" && (
                        <Button size="sm" variant="secondary" onClick={() => updateApplication(app.id, "viewed")}>
                          Mark viewed
                        </Button>
                      )}
                      {app.status !== "accepted" && (
                        <Button size="sm" onClick={() => updateApplication(app.id, "accepted")}>
                          Accept
                        </Button>
                      )}
                      {app.status !== "declined" && (
                        <Button size="sm" variant="ghost" onClick={() => updateApplication(app.id, "declined")}>
                          Decline
                        </Button>
                      )}
                      <span className="ml-auto self-center label-text capitalize">{app.status}</span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        )}

        {section === "profile" && (
          <div className="space-y-6">
            <h1 className="page-title">Profile</h1>
            <div className="ascend-card space-y-6">
              <div className="flex flex-wrap gap-3">
                <span className="rounded-full bg-ascend-match-bg px-4 py-1.5 text-xs font-medium text-ascend-primary">
                  {profile.response_rate}% response rate
                </span>
                <span className="label-text self-center">{formatRelativeActive(profile.last_active_at)}</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <EditableField label="University" value={profile.university} onSave={(v) => updateProfile({ university: v })} />
                <EditableField label="Name" value={profile.name} onSave={(v) => updateProfile({ name: v })} />
                <EditableField label="Department" value={profile.department} onSave={(v) => updateProfile({ department: v })} />
                <EditableField label="Title" value={profile.title} onSave={(v) => updateProfile({ title: v })} />
              </div>

              <div>
                <p className="label-text mb-2">Opportunity types</p>
                <ChipSelect
                  options={OPPORTUNITY_TYPES}
                  selected={profile.opportunity_types}
                  onChange={(opportunity_types) => updateProfile({ opportunity_types })}
                />
              </div>
            </div>
          </div>
        )}
      </AppMain>
    </>
  );
}
