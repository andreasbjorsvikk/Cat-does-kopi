
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT c.relname AS t FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND n.nspname='public'
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', r.t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', r.t);
  END LOOP;
END $$;

REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, username, avatar_url, created_at) ON public.profiles TO authenticated;

REVOKE SELECT ON public.strava_connections FROM authenticated;
GRANT SELECT (id, user_id, strava_athlete_id, expires_at, created_at, updated_at) ON public.strava_connections TO authenticated;

GRANT SELECT ON public.peaks_db TO anon;
