import Link from "next/link";
import { DemoFlowShell } from "@/components/onboarding/DemoFlowShell";
import { RolePicker } from "@/components/onboarding/RolePicker";

export default function StartEntryPage() {
  return (
    <DemoFlowShell step={2}>
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-coral">
          OfficeHours
        </p>
        <h1 className="mt-3 font-serif text-3xl font-semibold text-ink">
          Who are you in this story?
        </h1>
      </div>
      <div className="mt-8">
        <RolePicker />
      </div>
      <p className="mt-8 text-center text-xs text-ink-muted">
        <Link href="/note/11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222" className="hover:text-coral">
          Judge shortcut: skip to sample investigation →
        </Link>
      </p>
    </DemoFlowShell>
  );
}
