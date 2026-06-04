"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconBriefcase,
  IconFileDescription,
  IconLayoutDashboard,
  IconUser,
} from "@tabler/icons-react";
import {
  COMPENSATION_OPTIONS,
  HOURS_OPTIONS,
  OPPORTUNITY_TYPES,
  TOPICS,
} from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import {
  displayNameFromEmail,
  greeting,
  profileCompleteness,
} from "@/lib/profileUtils";
import type { FeedFilters, MatchedOpportunity, StudentProfile } from "@/lib/types/database";
import { AppMain, AppSidebar, MobileNav } from "@/components/layout/AppSidebar";
import { AvatarInitials, MatchBadge, TopicChip, TypeBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ChipSelect } from "@/components/ui/ChipSelect";

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
  type = "text",
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
  type?: "text" | "textarea";
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  return (
    <div className="ascend-card !p-4">
      <p className="label-text">{label}</p>
      {editing ? (
        <div className="mt-2 space-y-2">
          {type === "textarea" ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="ascend-input"
              rows={3}
            />
          ) : (
            <input value={draft} onChange={(e) => setDraft(e.target.value)} className="ascend-input" />
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={() => { onSave(draft); setEditing(false); }}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => { setDraft(value); setEditing(true); }}
          className="mt-2 w-full text-left text-sm text-ascend-text hover:text-ascend-primary"
        >
          {value || "Click to add"}
        </button>
      )}
    </div>
  );
}

function OpportunityCard({
  item,
  applying,
  onApply,
}: {
  item: MatchedOpportunity;
  applying: string | null;
  onApply: (id: string) => void;
}) {
  return (
    <article className="opportunity-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="label-text">{item.professor.name} · {item.professor.department}</p>
          <h3 className="section-title mt-1">{item.title}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <TypeBadge type={item.opportunity_type} />
            <MatchBadge score={item.ai_match_score} />
          </div>
        </div>
      </div>

      <p className="mt-3 truncate text-sm text-ascend-muted">{item.ai_match_reason}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {item.topics.slice(0, 5).map((t) => (
          <TopicChip key={t} label={t} />
        ))}
      </div>

      <div className="mt-4">
        {item.application_id ? (
          <span className="text-sm capitalize text-ascend-muted">
            Applied · {item.application_status}
          </span>
        ) : (
          <Button onClick={() => onApply(item.id)} disabled={applying === item.id}>
            {applying === item.id ? "Applying…" : "One-click apply"}
          </Button>
        )}
      </div>
    </article>
  );
}

export function StudentDashboard() {
  const router = useRouter();
  const [section, setSection] = useState<Section>("opportunities");
  const [feed, setFeed] = useState<MatchedOpportunity[]>([]);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [filters, setFilters] = useState<FeedFilters>({});

  const loadFeed = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.opportunityType) params.set("type", filters.opportunityType);
    if (filters.topic) params.set("topic", filters.topic);
    if (filters.hours) params.set("hours", String(filters.hours));
    if (filters.compensation) params.set("compensation", filters.compensation);

    const res = await fetch(`/api/match?${params}`);
    if (res.ok) {
      const data = await res.json();
      setFeed(data.feed ?? []);
      setEmail(data.email ?? "");
    }
  }, [filters]);

  const loadProfile = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }
    setEmail(user.email ?? "");

    const { data } = await supabase
      .from("student_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!data) {
      router.push("/onboarding/student");
      return;
    }
    setProfile(data);
  }, [router]);

  useEffect(() => {
    Promise.all([loadProfile(), loadFeed()]).finally(() => setLoading(false));
  }, [loadProfile, loadFeed]);

  async function handleApply(opportunityId: string) {
    setApplying(opportunityId);
    await fetch("/api/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ opportunityId }),
    });
    await loadFeed();
    setApplying(null);
  }

  async function updateProfile(fields: Partial<StudentProfile>) {
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "student", ...fields }),
    });
    await loadProfile();
    await loadFeed();
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  const completeness = useMemo(
    () => (profile ? profileCompleteness(profile) : 0),
    [profile]
  );

  const applied = useMemo(() => feed.filter((f) => f.application_id), [feed]);
  const name = displayNameFromEmail(email);
  const firstName = name.split(" ")[0];
  const initials = name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

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
          userName={firstName}
          userInitials={initials}
          onSignOut={handleLogout}
        />
      </div>

      <AppMain>
        <MobileNav active={section} items={NAV} onSelect={(id) => setSection(id as Section)} />

        {section === "dashboard" && (
          <div className="space-y-6">
            <header>
              <h1 className="page-title">{greeting()}, {firstName}</h1>
              <p className="mt-1 text-[13px] text-ascend-muted">{profile.university}</p>
            </header>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="ascend-card">
                <p className="label-text">Matched opportunities</p>
                <p className="mt-2 font-heading text-[22px] font-medium text-ascend-text">{feed.length}</p>
              </div>
              <div className="ascend-card">
                <p className="label-text">Applications submitted</p>
                <p className="mt-2 font-heading text-[22px] font-medium text-ascend-text">{applied.length}</p>
              </div>
            </div>
          </div>
        )}

        {section === "opportunities" && (
          <div className="space-y-6">
            <header>
              <h1 className="page-title">{greeting()}, {firstName}</h1>
              <p className="mt-1 text-[13px] text-ascend-muted">{profile.university}</p>
            </header>

            <h2 className="section-title">Opportunities found for you</h2>

            <div className="ascend-card flex flex-wrap gap-2 !py-4">
              <select
                value={filters.opportunityType ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, opportunityType: e.target.value || undefined }))}
                className="ascend-input w-auto min-w-[120px]"
              >
                <option value="">All types</option>
                {OPPORTUNITY_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
              <select
                value={filters.topic ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, topic: e.target.value || undefined }))}
                className="ascend-input w-auto min-w-[120px]"
              >
                <option value="">All topics</option>
                {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select
                value={filters.hours ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, hours: e.target.value ? Number(e.target.value) : undefined }))}
                className="ascend-input w-auto min-w-[120px]"
              >
                <option value="">Any hours</option>
                {HOURS_OPTIONS.map((h) => <option key={h} value={h}>{h} hrs/week</option>)}
              </select>
              <select
                value={filters.compensation ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, compensation: e.target.value || undefined }))}
                className="ascend-input w-auto min-w-[120px]"
              >
                <option value="">Any compensation</option>
                {COMPENSATION_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
              <Button size="sm" variant="secondary" onClick={loadFeed}>Apply filters</Button>
            </div>

            <div className="space-y-4">
              {feed.length === 0 ? (
                <div className="ascend-card py-10 text-center">
                  <p className="section-title">Our agent is finding opportunities for you — check back soon</p>
                  <p className="mt-2 label-text">Complete your profile to improve match quality.</p>
                </div>
              ) : (
                feed.map((item) => (
                  <OpportunityCard
                    key={item.id}
                    item={item}
                    applying={applying}
                    onApply={handleApply}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {section === "applications" && (
          <div className="space-y-6">
            <h1 className="page-title">Applications</h1>
            <div className="space-y-4">
              {applied.length === 0 ? (
                <div className="ascend-card py-10 text-center label-text">
                  No applications yet. Browse opportunities to apply.
                </div>
              ) : (
                applied.map((item) => (
                  <div key={item.id} className="ascend-card flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-ascend-text">{item.title}</p>
                      <p className="label-text mt-1 capitalize">{item.application_status}</p>
                    </div>
                    <MatchBadge score={item.ai_match_score} />
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {section === "profile" && (
          <div className="space-y-6">
            <h1 className="page-title">Profile</h1>
            <div className="ascend-card">
              <div className="flex items-center gap-4">
                <AvatarInitials initials={initials} />
                <div>
                  <p className="text-sm text-ascend-text">{name}</p>
                  <p className="label-text">{email}</p>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <span className="label-text">Profile completeness</span>
                  <span className="text-sm text-ascend-primary">{completeness}%</span>
                </div>
                <div className="mt-2 h-[3px] overflow-hidden rounded-sm bg-ascend-border">
                  <div
                    className="h-full rounded-sm bg-ascend-primary transition-all"
                    style={{ width: `${completeness}%` }}
                  />
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <EditableField label="University" value={profile.university} onSave={(v) => updateProfile({ university: v })} />
                <EditableField label="Major" value={profile.major} onSave={(v) => updateProfile({ major: v })} />
                <EditableField label="Year" value={profile.year} onSave={(v) => updateProfile({ year: v })} />
                <EditableField label="GPA range" value={profile.gpa_range} onSave={(v) => updateProfile({ gpa_range: v })} />
                <EditableField label="Hours per week" value={String(profile.hours_per_week)} onSave={(v) => updateProfile({ hours_per_week: Number(v) })} />
                <EditableField label="Research openness" value={profile.research_openness} onSave={(v) => updateProfile({ research_openness: v as StudentProfile["research_openness"] })} />
              </div>

              <div className="mt-6">
                <p className="label-text mb-2">Topics</p>
                <ChipSelect options={TOPICS} selected={profile.topics} onChange={(topics) => updateProfile({ topics })} />
              </div>

              <div className="mt-6">
                <p className="label-text mb-2">Opportunity types</p>
                <ChipSelect
                  options={OPPORTUNITY_TYPES.filter((t) => t.id !== "project")}
                  selected={profile.opportunity_types}
                  onChange={(opportunity_types) => updateProfile({ opportunity_types })}
                />
              </div>

              <div className="mt-6">
                <EditableField label="Bio" value={profile.bio ?? ""} type="textarea" onSave={(bio) => updateProfile({ bio: bio || null })} />
              </div>
            </div>
          </div>
        )}
      </AppMain>
    </>
  );
}
