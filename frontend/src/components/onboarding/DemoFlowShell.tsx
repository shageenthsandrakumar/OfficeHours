import Link from "next/link";
import type { ReactNode } from "react";

interface Props {
  step: 1 | 2 | 3 | 4;
  children: ReactNode;
}

const LABELS = ["Enter", "Role", "Intake", "Analyze"];

export function DemoFlowShell({ step, children }: Props) {
  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-cream-dark bg-card/80 px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <Link href="/" className="text-sm font-semibold text-ink hover:text-coral">
            OfficeHours
          </Link>
          <div className="flex gap-1">
            {LABELS.map((label, i) => (
              <span
                key={label}
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                  i + 1 === step
                    ? "bg-coral text-white"
                    : i + 1 < step
                      ? "bg-sage/20 text-sage"
                      : "bg-cream-dark text-ink-muted"
                }`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-10">{children}</main>
    </div>
  );
}
