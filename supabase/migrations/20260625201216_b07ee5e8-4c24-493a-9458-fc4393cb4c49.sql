-- Restore app data visibility without reopening sensitive fields.

-- Let RLS policies evaluate private security-definer helper functions.
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_parent_of(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_child_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.child_parent(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.are_friends(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.profile_privacy_allows(uuid, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_view_workouts(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_view_goals(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_view_peak_checkins(uuid, uuid) TO authenticated;

GRANT USAGE ON SCHEMA private TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO service_role;

-- Own profile RPC used by the app.
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO service_role;

-- Security-definer helper for child profile visibility.
-- It avoids child_profiles <-> child_shared_access RLS recursion by checking sharing inside the function.
CREATE OR REPLACE FUNCTION private.can_view_child_profile(
  _viewer_id uuid,
  _child_id uuid,
  _parent_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _viewer_id IS NOT NULL
    AND (
      _viewer_id = _parent_user_id
      OR EXISTS (
        SELECT 1
        FROM public.child_shared_access csa
        WHERE csa.child_id = _child_id
          AND csa.shared_with_user_id = _viewer_id
          AND csa.status = 'accepted'
      )
    );
$$;

REVOKE ALL ON FUNCTION private.can_view_child_profile(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_view_child_profile(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_view_child_profile(uuid, uuid, uuid) TO service_role;

-- Restore Data API access for authenticated users on app tables.
-- Row policies still decide which rows each user can access.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.primary_goal_periods TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_streams TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.peak_checkins TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.child_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.child_shared_access TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_health_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apple_health_connections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenges TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hiking_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hiking_record_shares TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_hiking_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.peak_suggestions TO authenticated;
GRANT SELECT ON public.peaks_db TO authenticated;

GRANT ALL ON public.goals TO service_role;
GRANT ALL ON public.primary_goal_periods TO service_role;
GRANT ALL ON public.workout_sessions TO service_role;
GRANT ALL ON public.workout_streams TO service_role;
GRANT ALL ON public.peak_checkins TO service_role;
GRANT ALL ON public.child_profiles TO service_role;
GRANT ALL ON public.child_shared_access TO service_role;
GRANT ALL ON public.daily_health_metrics TO service_role;
GRANT ALL ON public.health_events TO service_role;
GRANT ALL ON public.apple_health_connections TO service_role;
GRANT ALL ON public.friendships TO service_role;
GRANT ALL ON public.challenges TO service_role;
GRANT ALL ON public.challenge_participants TO service_role;
GRANT ALL ON public.community_notifications TO service_role;
GRANT ALL ON public.notification_preferences TO service_role;
GRANT ALL ON public.hiking_records TO service_role;
GRANT ALL ON public.hiking_record_shares TO service_role;
GRANT ALL ON public.shared_hiking_entries TO service_role;
GRANT ALL ON public.peak_suggestions TO service_role;
GRANT ALL ON public.peaks_db TO service_role;

-- Keep profiles column-restricted.
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, username, avatar_url, created_at) ON public.profiles TO authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- Keep Strava tokens hidden from clients.
REVOKE SELECT ON public.strava_connections FROM anon, authenticated;
GRANT SELECT (id, user_id, strava_athlete_id, expires_at, created_at, updated_at) ON public.strava_connections TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.strava_connections TO authenticated;
GRANT ALL ON public.strava_connections TO service_role;

-- Replace recursive child profile policies.
DROP POLICY IF EXISTS "Shared users can view children" ON public.child_profiles;
DROP POLICY IF EXISTS "Parents can view own children" ON public.child_profiles;
DROP POLICY IF EXISTS "Parents and shared users can view children" ON public.child_profiles;
CREATE POLICY "Parents and shared users can view children"
ON public.child_profiles
FOR SELECT
TO authenticated
USING (private.can_view_child_profile(auth.uid(), id, parent_user_id));

-- Replace child sharing policies that depended on child_profiles RLS.
DROP POLICY IF EXISTS "Parents can view sharing for own children" ON public.child_shared_access;
DROP POLICY IF EXISTS "Shared users can view own access" ON public.child_shared_access;
DROP POLICY IF EXISTS "Users can view child access" ON public.child_shared_access;
DROP POLICY IF EXISTS "Parents can view shared access for own children" ON public.child_shared_access;
CREATE POLICY "Users can view child sharing access"
ON public.child_shared_access
FOR SELECT
TO authenticated
USING (
  invited_by = auth.uid()
  OR shared_with_user_id = auth.uid()
  OR private.is_parent_of(auth.uid(), child_id)
);

DROP POLICY IF EXISTS "Parents can insert shared access" ON public.child_shared_access;
CREATE POLICY "Parents can insert shared access"
ON public.child_shared_access
FOR INSERT
TO authenticated
WITH CHECK (private.is_parent_of(auth.uid(), child_id));

DROP POLICY IF EXISTS "Parents can delete shared access" ON public.child_shared_access;
CREATE POLICY "Parents can delete shared access"
ON public.child_shared_access
FOR DELETE
TO authenticated
USING (private.is_parent_of(auth.uid(), child_id));

-- Own rows must always be visible; privacy helpers handle other viewers.
DROP POLICY IF EXISTS "Users and allowed friends can view sessions" ON public.workout_sessions;
CREATE POLICY "Users and allowed friends can view sessions"
ON public.workout_sessions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR private.can_view_workouts(auth.uid(), user_id));

DROP POLICY IF EXISTS "Users and allowed friends can view primary goals" ON public.primary_goal_periods;
CREATE POLICY "Users and allowed friends can view primary goals"
ON public.primary_goal_periods
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR private.can_view_goals(auth.uid(), user_id));

DROP POLICY IF EXISTS "Users and allowed viewers can view peak checkins" ON public.peak_checkins;
CREATE POLICY "Users and allowed viewers can view peak checkins"
ON public.peak_checkins
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR private.can_view_peak_checkins(auth.uid(), user_id));