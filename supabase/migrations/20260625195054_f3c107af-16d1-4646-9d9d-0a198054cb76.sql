
-- 1) profiles_full_exposure: restrict cross-user columns via column-level grants.
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, username, avatar_url, created_at) ON public.profiles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 2) strava_connections_token_exposure: hide access_token / refresh_token from clients.
REVOKE SELECT ON public.strava_connections FROM authenticated;
GRANT SELECT (id, user_id, strava_athlete_id, expires_at, created_at, updated_at)
  ON public.strava_connections TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.strava_connections TO authenticated;
GRANT ALL ON public.strava_connections TO service_role;

-- 3) community_notifications_insert_bypass: require a relationship between sender and recipient.
DROP POLICY IF EXISTS "Authenticated insert notifications" ON public.community_notifications;
CREATE POLICY "Authenticated insert notifications"
ON public.community_notifications
FOR INSERT
TO authenticated
WITH CHECK (
  -- System / self notifications
  (from_user_id IS NULL AND user_id = auth.uid())
  OR (
    from_user_id = auth.uid()
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.friendships f
        WHERE (f.user_id = auth.uid() AND f.friend_id = community_notifications.user_id)
           OR (f.friend_id = auth.uid() AND f.user_id = community_notifications.user_id)
      )
      OR EXISTS (
        SELECT 1
        FROM public.challenge_participants cp1
        JOIN public.challenge_participants cp2 ON cp1.challenge_id = cp2.challenge_id
        WHERE cp1.user_id = auth.uid()
          AND cp2.user_id = community_notifications.user_id
      )
    )
  )
);

-- 4) peak_checkins_public_read: honour the owner's privacy settings.
-- Helper: detect child profile IDs while bypassing RLS (called from RLS policy).
CREATE OR REPLACE FUNCTION private.is_child_profile(_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.child_profiles WHERE id = _id);
$$;

CREATE OR REPLACE FUNCTION private.child_parent(_child_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT parent_user_id FROM public.child_profiles WHERE id = _child_id;
$$;

REVOKE ALL ON FUNCTION private.is_child_profile(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.child_parent(uuid) FROM PUBLIC;

DROP POLICY IF EXISTS "Anyone authenticated can view checkins" ON public.peak_checkins;
CREATE POLICY "View checkins respecting privacy"
ON public.peak_checkins
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR private.is_parent_of(auth.uid(), user_id)
  OR (
    -- Adult check-in: gated by owner's privacy_peak_checkins
    NOT private.is_child_profile(user_id)
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = peak_checkins.user_id
        AND (
          p.privacy_peak_checkins = 'all'
          OR (
            p.privacy_peak_checkins IN ('friends','selected')
            AND EXISTS (
              SELECT 1 FROM public.friendships f
              WHERE f.status = 'accepted'
                AND ((f.user_id = auth.uid() AND f.friend_id = peak_checkins.user_id)
                  OR (f.friend_id = auth.uid() AND f.user_id = peak_checkins.user_id))
            )
            AND (
              p.privacy_peak_checkins <> 'selected'
              OR COALESCE(p.privacy_peak_checkins_friends, '[]'::jsonb) @> to_jsonb(auth.uid()::text)
            )
          )
        )
    )
  )
  OR (
    -- Child check-in: gated by parent's privacy_child_checkins
    private.is_child_profile(user_id)
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = private.child_parent(peak_checkins.user_id)
        AND (
          p.privacy_child_checkins = 'all'
          OR (
            p.privacy_child_checkins = 'friends'
            AND EXISTS (
              SELECT 1 FROM public.friendships f
              WHERE f.status = 'accepted'
                AND ((f.user_id = auth.uid() AND f.friend_id = p.id)
                  OR (f.friend_id = auth.uid() AND f.user_id = p.id))
            )
          )
        )
    )
  )
);

-- 5) SUPA_authenticated_security_definer_function_executable:
-- Lock down SECURITY DEFINER trigger / internal functions that should never be invoked from the API.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, authenticated, anon;
-- get_my_profile() must remain callable by authenticated users (returns only auth.uid()'s row);
-- grant explicitly and revoke from anon/PUBLIC.
REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
