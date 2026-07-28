
-- Store display name from signup metadata in the profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  meta_name text;
BEGIN
  meta_name := NULLIF(TRIM(COALESCE(
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name'
  )), '');
  INSERT INTO public.profiles (id, username) VALUES (NEW.id, meta_name)
  ON CONFLICT (id) DO UPDATE
    SET username = COALESCE(public.profiles.username, EXCLUDED.username);
  RETURN NEW;
END;
$function$;

-- Allow friends to view a user's child profiles
CREATE OR REPLACE FUNCTION private.can_view_child_profile(_viewer_id uuid, _child_id uuid, _parent_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      OR EXISTS (
        SELECT 1
        FROM public.friendships f
        WHERE f.status = 'accepted'
          AND (
            (f.user_id = _viewer_id AND f.friend_id = _parent_user_id)
            OR (f.friend_id = _viewer_id AND f.user_id = _parent_user_id)
          )
      )
    );
$function$;
