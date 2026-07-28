-- Ensure the table exists (it should, but just in case)
-- We don't want to recreate it if it exists to avoid data loss.

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grant table-level permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO service_role;

-- Ensure RLS is enabled
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies to be absolutely sure
DROP POLICY IF EXISTS "Users can view own sessions" ON public.workout_sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.workout_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.workout_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON public.workout_sessions;

CREATE POLICY "Users can view own sessions"
  ON public.workout_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON public.workout_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.workout_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON public.workout_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Also grant usage on all sequences in public schema (just in case)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;