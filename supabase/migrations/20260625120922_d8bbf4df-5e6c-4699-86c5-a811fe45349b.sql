
-- =============================================================
-- 1) profiles: restrict columns visible to other users via column-level GRANTs
-- =============================================================

-- Drop the broad "view all" policy and replace with own/other split
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Other authenticated users may read profile rows, but only the public columns
-- (column-level GRANTs below enforce which fields are returned).
CREATE POLICY "Users can view public fields of other profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() <> id);

-- Reset table-level SELECT and grant only public columns.
-- Other privileges (INSERT/UPDATE/DELETE) are governed by RLS as before.
REVOKE SELECT ON public.profiles FROM authenticated;
REVOKE SELECT ON public.profiles FROM anon;

GRANT SELECT (id, username, avatar_url, session_type_colors, created_at, updated_at)
  ON public.profiles TO authenticated;

-- Re-grant INSERT/UPDATE/DELETE/full SELECT to service_role for edge functions / admin code.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;

-- Security-definer RPC so the signed-in user can read their OWN full profile
-- (including private privacy_* columns) without exposing them via column GRANTs.
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- =============================================================
-- 2) challenge_participants: prevent field tampering on UPDATE
-- =============================================================

DROP POLICY IF EXISTS "Update participation" ON public.challenge_participants;

CREATE POLICY "Update participation"
  ON public.challenge_participants
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND status IN ('pending', 'accepted', 'declined')
  );

-- Trigger guards immutable identity fields (challenge_id, user_id) against tampering.
CREATE OR REPLACE FUNCTION public.guard_challenge_participant_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id <> OLD.user_id THEN
    RAISE EXCEPTION 'challenge_participants.user_id is immutable';
  END IF;
  IF NEW.challenge_id <> OLD.challenge_id THEN
    RAISE EXCEPTION 'challenge_participants.challenge_id is immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS challenge_participants_guard_update ON public.challenge_participants;
CREATE TRIGGER challenge_participants_guard_update
  BEFORE UPDATE ON public.challenge_participants
  FOR EACH ROW EXECUTE FUNCTION public.guard_challenge_participant_update();

-- =============================================================
-- 3) peak_suggestions: drop raw submitter GPS, keep only derived distance
-- =============================================================

ALTER TABLE public.peak_suggestions
  ADD COLUMN IF NOT EXISTS submission_distance_m double precision;

-- Backfill distance from existing columns before dropping them.
UPDATE public.peak_suggestions
SET submission_distance_m =
  CASE
    WHEN user_latitude IS NULL OR user_longitude IS NULL THEN NULL
    ELSE 2 * 6371000 * asin(sqrt(
      power(sin(radians((user_latitude - latitude) / 2)), 2)
      + cos(radians(latitude)) * cos(radians(user_latitude))
        * power(sin(radians((user_longitude - longitude) / 2)), 2)
    ))
  END
WHERE submission_distance_m IS NULL;

ALTER TABLE public.peak_suggestions DROP COLUMN IF EXISTS user_latitude;
ALTER TABLE public.peak_suggestions DROP COLUMN IF EXISTS user_longitude;
