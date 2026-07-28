-- ========== PROFILES ==========
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Data API visibility
REVOKE ALL ON public.profiles FROM public, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- ========== EXTRA GOALS ==========
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,
  period TEXT NOT NULL,
  activity_type TEXT NOT NULL DEFAULT 'all',
  target DOUBLE PRECISION NOT NULL,
  custom_start DATE,
  custom_end DATE,
  show_on_home BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Data API visibility
REVOKE ALL ON public.goals FROM public, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO service_role;

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own goals" ON public.goals;
CREATE POLICY "Users can view own goals"
  ON public.goals FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own goals" ON public.goals;
CREATE POLICY "Users can insert own goals"
  ON public.goals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own goals" ON public.goals;
CREATE POLICY "Users can update own goals"
  ON public.goals FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own goals" ON public.goals;
CREATE POLICY "Users can delete own goals"
  ON public.goals FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ========== PRIMARY GOAL PERIODS ==========
CREATE TABLE IF NOT EXISTS public.primary_goal_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  input_period TEXT NOT NULL,
  input_target DOUBLE PRECISION NOT NULL,
  valid_from DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Data API visibility
REVOKE ALL ON public.primary_goal_periods FROM public, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.primary_goal_periods TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.primary_goal_periods TO service_role;

ALTER TABLE public.primary_goal_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own primary goals" ON public.primary_goal_periods;
CREATE POLICY "Users can view own primary goals"
  ON public.primary_goal_periods FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own primary goals" ON public.primary_goal_periods;
CREATE POLICY "Users can insert own primary goals"
  ON public.primary_goal_periods FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own primary goals" ON public.primary_goal_periods;
CREATE POLICY "Users can update own primary goals"
  ON public.primary_goal_periods FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own primary goals" ON public.primary_goal_periods;
CREATE POLICY "Users can delete own primary goals"
  ON public.primary_goal_periods FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ========== WORKOUT SESSIONS (Ensuring grants/policies) ==========
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO service_role;

-- Ensure updated_at trigger exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_workout_sessions_updated_at ON public.workout_sessions;
CREATE TRIGGER update_workout_sessions_updated_at
  BEFORE UPDATE ON public.workout_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();