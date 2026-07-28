
-- ============================================================
-- 1. Move SECURITY DEFINER helpers to private schema
-- ============================================================
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION private.is_parent_of(_parent_id uuid, _child_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.child_profiles WHERE parent_user_id = _parent_id AND id = _child_id)
      OR EXISTS (SELECT 1 FROM public.child_shared_access WHERE shared_with_user_id = _parent_id AND child_id = _child_id AND status = 'accepted')
$$;

CREATE OR REPLACE FUNCTION private.is_challenge_participant(_challenge_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.challenge_participants WHERE challenge_id = _challenge_id AND user_id = _user_id)
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_parent_of(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_challenge_participant(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_parent_of(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_challenge_participant(uuid, uuid) TO authenticated, service_role;

-- ============================================================
-- 2. Recreate policies referencing public helpers to use private.*
-- ============================================================

-- storage.objects: peak-images admin policies
DROP POLICY IF EXISTS "Admins can delete peak images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update peak images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload peak images" ON storage.objects;
CREATE POLICY "Admins can delete peak images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'peak-images' AND private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can update peak images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'peak-images' AND private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can upload peak images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'peak-images' AND private.has_role(auth.uid(), 'admin'::public.app_role));

-- peak_checkins
DROP POLICY IF EXISTS "Users admins or parents can delete checkins" ON public.peak_checkins;
DROP POLICY IF EXISTS "Users admins or parents can update checkins" ON public.peak_checkins;
DROP POLICY IF EXISTS "Users or admins or parents can insert checkins" ON public.peak_checkins;
CREATE POLICY "Users admins or parents can delete checkins" ON public.peak_checkins FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::public.app_role) OR private.is_parent_of(auth.uid(), user_id));
CREATE POLICY "Users admins or parents can update checkins" ON public.peak_checkins FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::public.app_role) OR private.is_parent_of(auth.uid(), user_id))
  WITH CHECK (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::public.app_role) OR private.is_parent_of(auth.uid(), user_id));
CREATE POLICY "Users or admins or parents can insert checkins" ON public.peak_checkins FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::public.app_role) OR private.is_parent_of(auth.uid(), user_id));

-- peak_suggestions: fix location exposure + use private.has_role
DROP POLICY IF EXISTS "Admins can delete suggestions" ON public.peak_suggestions;
DROP POLICY IF EXISTS "Admins can update suggestions" ON public.peak_suggestions;
DROP POLICY IF EXISTS "Authenticated users can view pending suggestions" ON public.peak_suggestions;
CREATE POLICY "Admins can delete suggestions" ON public.peak_suggestions FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can update suggestions" ON public.peak_suggestions FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Users can view own or admins can view all suggestions" ON public.peak_suggestions FOR SELECT TO authenticated
  USING (auth.uid() = submitted_by OR private.has_role(auth.uid(), 'admin'::public.app_role));

-- peaks_db
DROP POLICY IF EXISTS "Admins can delete peaks" ON public.peaks_db;
DROP POLICY IF EXISTS "Admins can insert peaks" ON public.peaks_db;
DROP POLICY IF EXISTS "Admins can update peaks" ON public.peaks_db;
DROP POLICY IF EXISTS "Anyone can view published peaks" ON public.peaks_db;
CREATE POLICY "Admins can delete peaks" ON public.peaks_db FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can insert peaks" ON public.peaks_db FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can update peaks" ON public.peaks_db FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Anyone can view published peaks" ON public.peaks_db FOR SELECT
  USING (is_published = true OR private.has_role(auth.uid(), 'admin'::public.app_role));

-- user_roles admins manage
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- challenge_participants view
DROP POLICY IF EXISTS "View participants" ON public.challenge_participants;
CREATE POLICY "View participants" ON public.challenge_participants FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR private.is_challenge_participant(challenge_id, auth.uid()));

-- ============================================================
-- 3. Drop now-unused public helper functions
-- ============================================================
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.is_parent_of(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_challenge_participant(uuid, uuid);

-- handle_new_user: trigger function; remove public EXECUTE
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- ============================================================
-- 4. child_profiles: remove broad authenticated SELECT
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view all children" ON public.child_profiles;
CREATE POLICY "Shared users can view children" ON public.child_profiles FOR SELECT TO authenticated
  USING (
    auth.uid() = parent_user_id
    OR EXISTS (
      SELECT 1 FROM public.child_shared_access csa
      WHERE csa.child_id = child_profiles.id
        AND csa.shared_with_user_id = auth.uid()
        AND csa.status = 'accepted'
    )
  );
-- Keep existing "Parents can view own children" as well (permissive additive, same effect)

-- ============================================================
-- 5. peak-images bucket: restrict broad upload
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can upload peak images" ON storage.objects;
CREATE POLICY "Users can upload own peak checkin images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'peak-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Restrict broad SELECT listing on peak-images (bucket is public for direct URL access via Storage CDN,
-- but RLS controls list/select via the API). Limit list to admins + owners.
DROP POLICY IF EXISTS "Anyone can view peak images" ON storage.objects;
CREATE POLICY "Owners and admins can list peak images" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'peak-images'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR private.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

-- avatars bucket: restrict listing (files remain accessible via public URL since bucket is public)
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Owners can list own avatars" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- 6. primary_goal_periods: respect privacy_goals
-- ============================================================
DROP POLICY IF EXISTS "Friends can view each others goals" ON public.primary_goal_periods;
CREATE POLICY "Friends can view goals respecting privacy" ON public.primary_goal_periods FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR (
      EXISTS (
        SELECT 1 FROM public.friendships f
        WHERE f.status = 'accepted'
          AND (
            (f.user_id = auth.uid() AND f.friend_id = primary_goal_periods.user_id)
            OR (f.friend_id = auth.uid() AND f.user_id = primary_goal_periods.user_id)
          )
      )
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = primary_goal_periods.user_id
          AND (
            p.privacy_goals = 'all'
            OR (
              COALESCE(p.privacy_goals, 'me') = 'friends'
              AND (
                p.privacy_goals_friends IS NULL
                OR jsonb_typeof(p.privacy_goals_friends) <> 'array'
                OR jsonb_array_length(p.privacy_goals_friends) = 0
                OR p.privacy_goals_friends @> to_jsonb(auth.uid()::text)
              )
            )
          )
      )
    )
  );

-- ============================================================
-- 7. workout_sessions: respect privacy_workouts
-- ============================================================
DROP POLICY IF EXISTS "Friends can view each others sessions" ON public.workout_sessions;
CREATE POLICY "Friends can view sessions respecting privacy" ON public.workout_sessions FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR (
      EXISTS (
        SELECT 1 FROM public.friendships f
        WHERE f.status = 'accepted'
          AND (
            (f.user_id = auth.uid() AND f.friend_id = workout_sessions.user_id)
            OR (f.friend_id = auth.uid() AND f.user_id = workout_sessions.user_id)
          )
      )
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = workout_sessions.user_id
          AND (
            p.privacy_workouts = 'all'
            OR (
              COALESCE(p.privacy_workouts, 'me') = 'friends'
              AND (
                p.privacy_workouts_friends IS NULL
                OR jsonb_typeof(p.privacy_workouts_friends) <> 'array'
                OR jsonb_array_length(p.privacy_workouts_friends) = 0
                OR p.privacy_workouts_friends @> to_jsonb(auth.uid()::text)
              )
            )
          )
      )
    )
  );

-- ============================================================
-- 8. community_notifications: tighten always-true INSERT
-- ============================================================
DROP POLICY IF EXISTS "Authenticated insert notifications" ON public.community_notifications;
CREATE POLICY "Authenticated insert notifications" ON public.community_notifications FOR INSERT TO authenticated
  WITH CHECK (
    from_user_id = auth.uid()
    OR (from_user_id IS NULL AND user_id = auth.uid())
  );
