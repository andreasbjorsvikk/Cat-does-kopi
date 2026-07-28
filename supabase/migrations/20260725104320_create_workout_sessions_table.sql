-- Ensure workout_sessions table exists with basic columns
CREATE TABLE IF NOT EXISTS public.workout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT,
    date TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL,
    distance DOUBLE PRECISION,
    elevation_gain INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE public.workout_sessions ADD COLUMN strava_activity_id BIGINT UNIQUE;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;

    BEGIN
        ALTER TABLE public.workout_sessions ADD COLUMN average_heartrate INTEGER;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;

    BEGIN
        ALTER TABLE public.workout_sessions ADD COLUMN max_heartrate INTEGER;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;

    BEGIN
        ALTER TABLE public.workout_sessions ADD COLUMN summary_polyline TEXT;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;

    BEGIN
        ALTER TABLE public.workout_sessions ADD COLUMN user_modified BOOLEAN NOT NULL DEFAULT false;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;

    BEGIN
        ALTER TABLE public.workout_sessions ADD COLUMN exclude_from_count BOOLEAN NOT NULL DEFAULT false;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;
END $$;

-- Data API visibility: MUST grant to authenticated and service_role
-- We revoke first to ensure a clean slate for the standard roles
REVOKE ALL ON public.workout_sessions FROM public, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO service_role;

-- Enable RLS
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them cleanly
DROP POLICY IF EXISTS "Users can view own sessions" ON public.workout_sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.workout_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.workout_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON public.workout_sessions;
-- Also drop variants
DROP POLICY IF EXISTS "Allow authenticated users to insert their own sessions" ON public.workout_sessions;
DROP POLICY IF EXISTS "Allow authenticated users to select their own sessions" ON public.workout_sessions;
DROP POLICY IF EXISTS "Allow authenticated users to update their own sessions" ON public.workout_sessions;
DROP POLICY IF EXISTS "Allow authenticated users to delete their own sessions" ON public.workout_sessions;

-- Recreate policies with explicit TO authenticated
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

-- Ensure indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_id ON public.workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_date ON public.workout_sessions(date DESC);

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

DROP TRIGGER IF EXISTS update_workout_sessions_updated_at ON public.workout_sessions;
CREATE TRIGGER update_workout_sessions_updated_at
  BEFORE UPDATE ON public.workout_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();