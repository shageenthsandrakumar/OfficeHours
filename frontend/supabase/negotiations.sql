-- Cache for agent negotiations, so the "Why this match?" modal replays an
-- existing transcript instantly instead of re-running the (slow) live negotiation.
-- Additive: this does not modify any existing table.

create table if not exists public.negotiations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  opportunity_id uuid not null,
  routing text not null,                 -- CLEAR_FIT | CLEAR_MISMATCH | AMBIGUOUS
  decision text not null,                -- MATCH | NO_MATCH | NEEDS_INFO
  justification text not null default '',
  dossier jsonb not null default '{}'::jsonb,
  transcript jsonb not null default '[]'::jsonb,  -- ordered agent turns
  created_at timestamptz not null default now(),
  unique (student_id, opportunity_id)
);

create index if not exists negotiations_pair_idx
  on public.negotiations (student_id, opportunity_id);

alter table public.negotiations enable row level security;

-- Any authenticated user may read a cached negotiation (the transcript is the
-- "why this match" explanation) and write one (first viewer populates the cache).
drop policy if exists "negotiations readable" on public.negotiations;
create policy "negotiations readable" on public.negotiations
  for select using (auth.role() = 'authenticated');

drop policy if exists "negotiations writable" on public.negotiations;
create policy "negotiations writable" on public.negotiations
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "negotiations updatable" on public.negotiations;
create policy "negotiations updatable" on public.negotiations
  for update using (auth.role() = 'authenticated');
