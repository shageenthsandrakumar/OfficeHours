import type { StudentProfile } from "@/lib/types/database";

export function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "there";
  return local
    .split(/[._-]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function profileCompleteness(profile: StudentProfile): number {
  const checks = [
    !!profile.university,
    !!profile.major,
    !!profile.year,
    profile.topics.length > 0,
    profile.opportunity_types.length > 0,
    !!profile.gpa_range,
    profile.hours_per_week > 0,
    !!profile.research_openness,
    !!profile.bio,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function daysSince(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function postedLabel(dateStr: string): string {
  const days = daysSince(dateStr);
  if (days === 0) return "Posted today";
  if (days === 1) return "Posted 1 day ago";
  return `Posted ${days} days ago`;
}

export function closingWarning(dateStr: string): string | null {
  const days = daysSince(dateStr);
  if (days >= 50 && days < 60) {
    return `Closes in ${60 - days} days`;
  }
  return null;
}

export function formatRelativeActive(dateStr: string): string {
  const days = daysSince(dateStr);
  if (days === 0) return "Active today";
  if (days === 1) return "Active yesterday";
  return `Active ${days} days ago`;
}
