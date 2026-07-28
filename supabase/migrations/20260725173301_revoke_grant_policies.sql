-- Ensure Data API visibility and role permissions
REVOKE ALL ON public.workout_sessions FROM public, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO service_role;

REVOKE ALL ON public.profiles FROM public, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;

REVOKE ALL ON public.goals FROM public, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO service_role;

REVOKE ALL ON public.primary_goal_periods FROM public, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.primary_goal_periods TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.primary_goal_periods TO service_role;

-- workout_sessions Policies
DROP POLICY IF EXISTS "Users can view own sessions" ON public.workout_sessions;
CREATE POLICY "Users can view own sessions" ON public.workout_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.workout_sessions;
CREATE POLICY "Users can insert own sessions" ON public.workout_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own sessions" ON public.workout_sessions;
CREATE POLICY "Users can update own sessions" ON public.workout_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own sessions" ON public.workout_sessions;
CREATE POLICY "Users can delete own sessions" ON public.workout_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- goals Policies
DROP POLICY IF EXISTS "Users can view own goals" ON public.goals;
CREATE POLICY "Users can view own goals" ON public.goals FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own goals" ON public.goals;
CREATE POLICY "Users can insert own goals" ON public.goals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own goals" ON public.goals;
CREATE POLICY "Users can update own goals" ON public.goals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own goals" ON public.goals;
CREATE POLICY "Users can delete own goals" ON public.goals FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- primary_goal_periods Policies
DROP POLICY IF EXISTS "Users can view own primary goals" ON public.primary_goal_periods;
CREATE POLICY "Users can view own primary goals" ON public.primary_goal_periods FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own primary goals" ON public.primary_goal_periods;
CREATE POLICY "Users can insert own primary goals" ON public.primary_goal_periods FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own primary goals" ON public.primary_goal_periods;
CREATE POLICY "Users can update own primary goals" ON public.primary_goal_periods FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own primary goals" ON public.primary_goal_periods;
CREATE POLICY "Users can delete own primary goals" ON public.primary_goal_periods FOR DELETE TO authenticated USING (auth.uid() = user_id);