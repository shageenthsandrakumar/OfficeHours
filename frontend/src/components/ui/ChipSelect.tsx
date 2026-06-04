"use client";

import { cn } from "@/lib/utils";

interface Props {
  options: ReadonlyArray<string | { id: string; label: string }>;
  selected: string[];
  onChange: (selected: string[]) => void;
  max?: number;
  variant?: "chip" | "row";
}

export function ChipSelect({
  options,
  selected,
  onChange,
  max,
  variant = "chip",
}: Props) {
  const normalized = options.map((o) =>
    typeof o === "string" ? { id: o, label: o } : o
  );

  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
      return;
    }
    if (max && selected.length >= max) return;
    onChange([...selected, id]);
  }

  if (variant === "row") {
    return (
      <div className="space-y-2">
        {normalized.map((option) => {
          const active = selected.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => toggle(option.id)}
              className={cn(
                "w-full rounded-lg border px-4 py-3 text-left text-sm transition",
                active
                  ? "border-[1.5px] border-ascend-secondary bg-ascend-sidebar text-ascend-text"
                  : "border-ascend-border/80 bg-ascend-card text-ascend-text hover:bg-ascend-sidebar"
              )}
              style={{ borderWidth: active ? "1.5px" : "0.5px" }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {normalized.map((option) => {
        const active = selected.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => toggle(option.id)}
            className={cn(
              "rounded-full px-3 py-1 text-xs transition",
              active
                ? "border-[1.5px] border-ascend-secondary bg-ascend-sidebar text-ascend-primary"
                : "bg-ascend-chip text-ascend-primary hover:bg-ascend-sidebar"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
