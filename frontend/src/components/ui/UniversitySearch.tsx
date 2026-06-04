"use client";

import { useMemo, useState } from "react";
import { UNIVERSITIES } from "@/lib/universities";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}

export function UniversitySearch({
  value,
  onChange,
  label = "University",
  placeholder = "Search accredited universities…",
}: Props) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return UNIVERSITIES.slice(0, 8);
    return UNIVERSITIES.filter((u) => u.toLowerCase().includes(q)).slice(0, 8);
  }, [query]);

  function select(university: string) {
    setQuery(university);
    onChange(university);
    setOpen(false);
  }

  return (
    <div className="relative space-y-2">
      {label && (
        <label className="block font-heading text-[15px] text-ascend-text">{label}</label>
      )}
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="ascend-input"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-ascend-border/80 bg-ascend-card">
          {filtered.map((u) => (
            <li key={u}>
              <button
                type="button"
                onClick={() => select(u)}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm hover:bg-ascend-sidebar",
                  value === u && "bg-ascend-sidebar font-medium text-ascend-primary"
                )}
              >
                {u}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
