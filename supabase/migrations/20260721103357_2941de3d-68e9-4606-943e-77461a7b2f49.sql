
-- 1) Change defaults for new users
ALTER TABLE public.profiles ALTER COLUMN privacy_workouts SET DEFAULT 'friends';
ALTER TABLE public.profiles ALTER COLUMN privacy_goals SET DEFAULT 'friends';
ALTER TABLE public.profiles ALTER COLUMN privacy_stats SET DEFAULT 'friends';

-- 2) Backfill: only rows where all three still equal the old default 'me' (untouched by user)
UPDATE public.profiles
   SET privacy_workouts = 'friends',
       privacy_goals    = 'friends',
       privacy_stats    = 'friends'
 WHERE privacy_workouts = 'me'
   AND privacy_goals    = 'me'
   AND privacy_stats    = 'me';

-- 3) RPC: challenge progress bypasses privacy for fellow participants
CREATE OR REPLACE FUNCTION public.get_challenge_progress(_challenge_id uuid)
RETURNS TABLE(user_id uuid, value numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ch public.challenges%ROWTYPE;
  types text[];
BEGIN
  SELECT * INTO ch FROM public.challenges WHERE id = _challenge_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Only participants (or challenge creator) may read progress
  IF NOT EXISTS (
    SELECT 1 FROM public.challenge_participants cp
     WHERE cp.challenge_id = _challenge_id AND cp.user_id = auth.uid()
  ) AND ch.created_by <> auth.uid() THEN
    RETURN;
  END IF;

  IF ch.activity_type IS NULL OR ch.activity_type = 'all' THEN
    types := NULL;
  ELSE
    types := string_to_array(ch.activity_type, ',');
  END IF;

  RETURN QUERY
  WITH participants AS (
    SELECT cp.user_id FROM public.challenge_participants cp WHERE cp.challenge_id = _challenge_id
  ),
  sessions AS (
    SELECT ws.user_id, ws.duration_minutes, ws.distance, ws.elevation_gain, ws.exclude_from_count
      FROM public.workout_sessions ws
      JOIN participants p ON p.user_id = ws.user_id
     WHERE ws.date >= ch.period_start
       AND ws.date <= (ch.period_end::text || 'T23:59:59.999Z')::timestamptz
       AND (types IS NULL OR ws.type = ANY(types))
  ),
  agg AS (
    SELECT s.user_id,
      CASE ch.metric
        WHEN 'sessions'  THEN SUM(CASE WHEN COALESCE(s.exclude_from_count,false) THEN 0 ELSE 1 END)::numeric
        WHEN 'distance'  THEN COALESCE(SUM(s.distance),0)::numeric
        WHEN 'duration'  THEN COALESCE(SUM(s.duration_minutes),0)::numeric
        WHEN 'elevation' THEN COALESCE(SUM(s.elevation_gain),0)::numeric
        ELSE 0::numeric
      END AS value
      FROM sessions s
     GROUP BY s.user_id
  )
  SELECT p.user_id, COALESCE(a.value, 0)::numeric AS value
    FROM participants p
    LEFT JOIN agg a ON a.user_id = p.user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_challenge_progress(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_challenge_progress(uuid) TO authenticated;
