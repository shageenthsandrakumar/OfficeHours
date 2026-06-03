import Link from "next/link";

export default function EntryPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--color-honey-soft)_0%,_transparent_60%)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-lg text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-coral">
          Evidence-first coordination
        </p>
        <h1 className="mt-4 font-serif text-4xl font-semibold leading-tight text-ink sm:text-5xl">
          OfficeHours
        </h1>
        <p className="mx-auto mt-5 max-w-md text-lg text-ink-muted">
          Important signals hide below the résumé. We surface them, assess fit,
          and open a shared investigation—not a ranking.
        </p>
        <Link
          href="/start"
          className="mt-10 inline-block w-full max-w-sm rounded-2xl bg-coral py-4 text-base font-semibold text-white shadow-md transition hover:brightness-105 sm:w-auto sm:px-12"
        >
          Begin demo →
        </Link>
        <p className="mt-6 text-sm text-ink-muted">
          ~60 seconds: pick your role, answer 3 questions, watch analysis run.
        </p>
        <Link
          href="/note/11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222"
          className="mt-8 inline-block text-sm font-medium text-sage hover:underline"
        >
          Skip to finished investigation (judges)
        </Link>
      </div>
    </main>
  );
}
