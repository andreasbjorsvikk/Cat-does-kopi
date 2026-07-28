-- Restore Data API access for authenticated users on all application tables.
-- RLS policies still decide which rows each user may access.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.apple_health_connections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.challenge_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.challenges TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.child_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.child_shared_access TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.community_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.daily_health_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.friendships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.goals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.health_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.hiking_record_shares TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.hiking_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notification_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.peak_checkins TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.peak_suggestions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.peaks_db TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.primary_goal_periods TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shared_hiking_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.workout_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.workout_streams TO authenticated;

-- Keep profiles protected: allow writes to own row through RLS, but only expose safe public columns directly.
GRANT INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated;
REVOKE SELECT ON TABLE public.profiles FROM authenticated;
GRANT SELECT (id, username, avatar_url, created_at) ON TABLE public.profiles TO authenticated;

-- Keep Strava tokens protected from client-side reads while preserving normal app writes/status access.
GRANT INSERT, UPDATE, DELETE ON TABLE public.strava_connections TO authenticated;
REVOKE SELECT ON TABLE public.strava_connections FROM authenticated;
GRANT SELECT (id, user_id, strava_athlete_id, created_at, updated_at, expires_at) ON TABLE public.strava_connections TO authenticated;

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.are_friends(_user_a uuid, _user_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.friendships f
    WHERE f.status = 'accepted'
      AND (
        (f.user_id = _user_a AND f.friend_id = _user_b)
        OR (f.friend_id = _user_a AND f.user_id = _user_b)
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.profile_privacy_allows(
  _viewer_id uuid,
  _owner_id uuid,
  _privacy_column text,
  _friends_column text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  privacy_value text;
  selected_friends jsonb;
BEGIN
  IF _viewer_id IS NULL OR _owner_id IS NULL THEN
    RETURN false;
  END IF;

  IF _viewer_id = _owner_id THEN
    RETURN true;
  END IF;

  SELECT
    CASE _privacy_column
      WHEN 'privacy_workouts' THEN p.privacy_workouts
      WHEN 'privacy_goals' THEN p.privacy_goals
      WHEN 'privacy_stats' THEN p.privacy_stats
      WHEN 'privacy_peak_checkins' THEN p.privacy_peak_checkins
      WHEN 'privacy_child_checkins' THEN p.privacy_child_checkins
      WHEN 'privacy_child_profile' THEN p.privacy_child_profile
      ELSE 'me'
    END,
    CASE _friends_column
      WHEN 'privacy_workouts_friends' THEN p.privacy_workouts_friends
      WHEN 'privacy_goals_friends' THEN p.privacy_goals_friends
      WHEN 'privacy_stats_friends' THEN p.privacy_stats_friends
      WHEN 'privacy_peak_checkins_friends' THEN p.privacy_peak_checkins_friends
      ELSE NULL::jsonb
    END
  INTO privacy_value, selected_friends
  FROM public.profiles p
  WHERE p.id = _owner_id;

  IF privacy_value = 'all' THEN
    RETURN true;
  END IF;

  IF COALESCE(privacy_value, 'me') IN ('friends', 'selected') THEN
    IF NOT private.are_friends(_viewer_id, _owner_id) THEN
      RETURN false;
    END IF;

    IF privacy_value = 'selected'
       AND selected_friends IS NOT NULL
       AND jsonb_typeof(selected_friends) = 'array'
       AND jsonb_array_length(selected_friends) > 0 THEN
      RETURN selected_friends @> to_jsonb(_viewer_id::text);
    END IF;

    RETURN true;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION private.can_view_workouts(_viewer_id uuid, _owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT private.profile_privacy_allows(_viewer_id, _owner_id, 'privacy_workouts', 'privacy_workouts_friends');
$$;

CREATE OR REPLACE FUNCTION private.can_view_goals(_viewer_id uuid, _owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT private.profile_privacy_allows(_viewer_id, _owner_id, 'privacy_goals', 'privacy_goals_friends');
$$;

CREATE OR REPLACE FUNCTION private.can_view_peak_checkins(_viewer_id uuid, _owner_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_id uuid;
BEGIN
  IF _viewer_id IS NULL OR _owner_id IS NULL THEN
    RETURN false;
  END IF;

  IF _viewer_id = _owner_id OR private.is_parent_of(_viewer_id, _owner_id) THEN
    RETURN true;
  END IF;

  IF private.is_child_profile(_owner_id) THEN
    parent_id := private.child_parent(_owner_id);
    RETURN private.profile_privacy_allows(_viewer_id, parent_id, 'privacy_child_checkins', NULL);
  END IF;

  RETURN private.profile_privacy_allows(_viewer_id, _owner_id, 'privacy_peak_checkins', 'privacy_peak_checkins_friends');
END;
$$;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM authenticated;
GRANT USAGE ON SCHEMA private TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO service_role;

DROP POLICY IF EXISTS "Friends can view sessions respecting privacy" ON public.workout_sessions;
DROP POLICY IF EXISTS "Users and allowed friends can view sessions" ON public.workout_sessions;
CREATE POLICY "Users and allowed friends can view sessions"
ON public.workout_sessions
FOR SELECT
TO authenticated
USING (private.can_view_workouts(auth.uid(), user_id));

DROP POLICY IF EXISTS "Friends can view goals respecting privacy" ON public.primary_goal_periods;
DROP POLICY IF EXISTS "Users and allowed friends can view primary goals" ON public.primary_goal_periods;
CREATE POLICY "Users and allowed friends can view primary goals"
ON public.primary_goal_periods
FOR SELECT
TO authenticated
USING (private.can_view_goals(auth.uid(), user_id));

DROP POLICY IF EXISTS "View checkins respecting privacy" ON public.peak_checkins;
DROP POLICY IF EXISTS "Users and allowed viewers can view peak checkins" ON public.peak_checkins;
CREATE POLICY "Users and allowed viewers can view peak checkins"
ON public.peak_checkins
FOR SELECT
TO authenticated
USING (private.can_view_peak_checkins(auth.uid(), user_id));