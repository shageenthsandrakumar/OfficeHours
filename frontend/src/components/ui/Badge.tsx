import { cn } from "@/lib/utils";

const TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  research: { bg: "bg-ascend-type-research-bg", text: "text-ascend-type-research-text" },
  internship: { bg: "bg-ascend-type-internship-bg", text: "text-ascend-type-internship-text" },
  project: { bg: "bg-ascend-type-project-bg", text: "text-ascend-type-project-text" },
};

export function MatchBadge({ score }: { score: number }) {
  return (
    <span className="rounded-full bg-ascend-match-bg px-3 py-1 text-xs font-medium text-ascend-primary">
      {Math.round(score)}% match
    </span>
  );
}

export function TypeBadge({ type }: { type: string }) {
  const styles = TYPE_STYLES[type] ?? {
    bg: "bg-ascend-chip",
    text: "text-ascend-primary",
  };
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-xs font-normal capitalize",
        styles.bg,
        styles.text
      )}
    >
      {type}
    </span>
  );
}

export function TopicChip({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-ascend-chip px-3 py-1 text-xs text-ascend-primary">
      {label}
    </span>
  );
}

export function AvatarInitials({ initials }: { initials: string }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ascend-border font-heading text-sm text-ascend-primary">
      {initials}
    </div>
  );
}
