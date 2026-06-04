-- Ascend — Supabase schema
-- Run in Supabase SQL Editor after creating your project.

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('student', 'professor')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  university TEXT NOT NULL,
  major TEXT NOT NULL,
  year TEXT NOT NULL,
  topics TEXT[] NOT NULL DEFAULT '{}',
  opportunity_types TEXT[] NOT NULL DEFAULT '{}',
  gpa_range TEXT NOT NULL,
  hours_per_week INTEGER NOT NULL,
  research_openness TEXT NOT NULL CHECK (research_openness IN ('yes', 'maybe', 'no')),
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.professor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  university TEXT NOT NULL,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  title TEXT NOT NULL,
  opportunity_types TEXT[] NOT NULL DEFAULT '{}',
  preferred_student_traits JSONB NOT NULL DEFAULT '{}',
  response_rate NUMERIC(5,2) NOT NULL DEFAULT 100.00,
  total_applications_received INTEGER NOT NULL DEFAULT 0,
  total_applications_responded INTEGER NOT NULL DEFAULT 0,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id UUID NOT NULL REFERENCES public.professor_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  topics TEXT[] NOT NULL DEFAULT '{}',
  opportunity_type TEXT NOT NULL,
  hours_per_week INTEGER NOT NULL,
  gpa_min NUMERIC(3,2) NOT NULL DEFAULT 0.00,
  compensation TEXT NOT NULL DEFAULT 'unpaid' CHECK (compensation IN ('paid', 'unpaid', 'credit')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cached AI matches (refreshed on login, profile update, new opportunity)
CREATE TABLE IF NOT EXISTS public.opportunity_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  ai_match_score NUMERIC(5,2) NOT NULL,
  ai_match_reason TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, opportunity_id)
);

CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  ai_match_score NUMERIC(5,2),
  ai_match_reason TEXT,
  ai_intro_message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, opportunity_id)
);

CREATE OR REPLACE FUNCTION public.close_stale_opportunities()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.opportunities
  SET status = 'closed', updated_at = NOW()
  WHERE status = 'open'
    AND created_at < NOW() - INTERVAL '60 days';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_close_stale_opportunities ON public.opportunities;
CREATE TRIGGER trg_close_stale_opportunities
  AFTER INSERT OR UPDATE ON public.opportunities
  FOR EACH STATEMENT EXECUTE FUNCTION public.close_stale_opportunities();

CREATE OR REPLACE FUNCTION public.update_professor_response_rate()
RETURNS TRIGGER AS $$
DECLARE
  prof_id UUID;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status IN ('accepted', 'declined', 'viewed') THEN
    SELECT o.professor_id INTO prof_id
    FROM public.opportunities o WHERE o.id = NEW.opportunity_id;

    UPDATE public.professor_profiles
    SET
      total_applications_responded = total_applications_responded + 1,
      response_rate = CASE
        WHEN total_applications_received > 0
        THEN ROUND((total_applications_responded + 1)::numeric / total_applications_received * 100, 2)
        ELSE 100
      END,
      last_active_at = NOW(),
      updated_at = NOW()
    WHERE id = prof_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_response_rate ON public.applications;
CREATE TRIGGER trg_update_response_rate
  AFTER UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.update_professor_response_rate();

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users insert own" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Students manage own profile" ON public.student_profiles
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Students profiles readable" ON public.student_profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Professors manage own profile" ON public.professor_profiles
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Professor profiles readable" ON public.professor_profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Professors manage own opportunities" ON public.opportunities
  FOR ALL USING (
    professor_id IN (SELECT id FROM public.professor_profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "Students read open opportunities" ON public.opportunities
  FOR SELECT USING (
    status = 'open' OR professor_id IN (
      SELECT id FROM public.professor_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Students manage own matches" ON public.opportunity_matches
  FOR ALL USING (
    student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Students manage own applications" ON public.applications
  FOR ALL USING (
    student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "Professors read applications" ON public.applications
  FOR SELECT USING (
    opportunity_id IN (
      SELECT o.id FROM public.opportunities o
      JOIN public.professor_profiles p ON p.id = o.professor_id
      WHERE p.user_id = auth.uid()
    )
  );
CREATE POLICY "Professors update applications" ON public.applications
  FOR UPDATE USING (
    opportunity_id IN (
      SELECT o.id FROM public.opportunities o
      JOIN public.professor_profiles p ON p.id = o.professor_id
      WHERE p.user_id = auth.uid()
    )
  );
