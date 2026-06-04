"use client";

import { cn } from "@/lib/utils";

interface Props {
  options: ReadonlyArray<{ id: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  name: string;
}

export function RadioGroup({ options, value, onChange, name }: Props) {
  return (
    <div className="space-y-2">
      {options.map((option) => {
        const active = value === option.id;
        return (
          <label
            key={option.id}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition",
              active
                ? "border-[1.5px] border-ascend-secondary bg-ascend-sidebar"
                : "border-ascend-border/80 bg-ascend-card hover:bg-ascend-sidebar"
            )}
            style={{ borderWidth: active ? "1.5px" : "0.5px" }}
          >
            <input
              type="radio"
              name={name}
              value={option.id}
              checked={active}
              onChange={() => onChange(option.id)}
              className="h-4 w-4 accent-ascend-primary"
            />
            <span className="text-sm text-ascend-text">{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}
