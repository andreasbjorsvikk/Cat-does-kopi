
DO $$
DECLARE
  apple_id uuid := 'a70a7523-b0d2-41af-970e-5e7351f0dd2f';
  email_id uuid := '78006075-e024-4d62-82ac-626455d281d5';
  empty_apple_id uuid := '9f82a118-7c05-4fc3-8b68-cccf0f1bbe83';
BEGIN
  -- 1. workout_sessions + workout_streams
  UPDATE public.workout_sessions SET user_id = email_id WHERE user_id = apple_id;
  UPDATE public.workout_streams SET user_id = email_id WHERE user_id = apple_id;

  -- 2. peak_checkins (også de der Apple-brukeren sjekket inn på vegne av barn)
  UPDATE public.peak_checkins SET user_id = email_id WHERE user_id = apple_id;
  UPDATE public.peak_checkins SET checked_in_by = email_id WHERE checked_in_by = apple_id;

  -- 3. hiking_records + shared_hiking_entries + shares
  UPDATE public.hiking_records SET user_id = email_id WHERE user_id = apple_id;
  UPDATE public.shared_hiking_entries SET user_id = email_id WHERE user_id = apple_id;
  UPDATE public.hiking_record_shares SET owner_id = email_id WHERE owner_id = apple_id;
  UPDATE public.hiking_record_shares SET shared_with_user_id = email_id WHERE shared_with_user_id = apple_id;

  -- 4. child_profiles + delt tilgang
  UPDATE public.child_profiles SET parent_user_id = email_id WHERE parent_user_id = apple_id;
  UPDATE public.child_shared_access SET invited_by = email_id WHERE invited_by = apple_id;
  UPDATE public.child_shared_access SET shared_with_user_id = email_id WHERE shared_with_user_id = apple_id;

  -- 5. friendships (håndter unike par for å unngå selv-vennskap)
  -- Slett ev. "vennskap" der Apple-bruker var venn med email-bruker (de er samme person nå)
  DELETE FROM public.friendships
    WHERE (user_id = apple_id AND friend_id = email_id)
       OR (user_id = email_id AND friend_id = apple_id);
  UPDATE public.friendships SET user_id = email_id WHERE user_id = apple_id;
  UPDATE public.friendships SET friend_id = email_id WHERE friend_id = apple_id;

  -- 6. goals (alle "andre mål")
  UPDATE public.goals SET user_id = email_id WHERE user_id = apple_id;

  -- 7. primary_goal_periods — slett email-brukerens egne for å unngå dupliserte valid_from-datoer
  DELETE FROM public.primary_goal_periods WHERE user_id = email_id;
  UPDATE public.primary_goal_periods SET user_id = email_id WHERE user_id = apple_id;

  -- 8. health_events
  UPDATE public.health_events SET user_id = email_id WHERE user_id = apple_id;

  -- 9. daily_health_metrics
  UPDATE public.daily_health_metrics SET user_id = email_id WHERE user_id = apple_id;

  -- 10. apple_health_connections (kun Apple-bruker har én — flytt den)
  DELETE FROM public.apple_health_connections WHERE user_id = email_id;
  UPDATE public.apple_health_connections SET user_id = email_id WHERE user_id = apple_id;

  -- 11. strava_connections (kun Apple har — flytt)
  DELETE FROM public.strava_connections WHERE user_id = email_id;
  UPDATE public.strava_connections SET user_id = email_id WHERE user_id = apple_id;

  -- 12. notification_preferences — behold email-brukerens (vi sletter Apple sin etterpå)
  DELETE FROM public.notification_preferences WHERE user_id = apple_id;

  -- 13. user_roles (admin) — sjekk for eksisterende
  DELETE FROM public.user_roles WHERE user_id = apple_id AND role IN (SELECT role FROM public.user_roles WHERE user_id = email_id);
  UPDATE public.user_roles SET user_id = email_id WHERE user_id = apple_id;

  -- 14. challenges
  UPDATE public.challenges SET created_by = email_id WHERE created_by = apple_id;
  -- challenge_participants — fjern duplikat hvis email-bruker deltar i samme challenge
  DELETE FROM public.challenge_participants
    WHERE user_id = apple_id
      AND challenge_id IN (SELECT challenge_id FROM public.challenge_participants WHERE user_id = email_id);
  UPDATE public.challenge_participants SET user_id = email_id WHERE user_id = apple_id;

  -- 15. community_notifications
  UPDATE public.community_notifications SET user_id = email_id WHERE user_id = apple_id;
  UPDATE public.community_notifications SET from_user_id = email_id WHERE from_user_id = apple_id;

  -- 16. peak_suggestions
  UPDATE public.peak_suggestions SET submitted_by = email_id WHERE submitted_by = apple_id;
  UPDATE public.peak_suggestions SET reviewed_by = email_id WHERE reviewed_by = apple_id;

  -- 17. peaks_db (admin-felt)
  UPDATE public.peaks_db SET created_by = email_id WHERE created_by = apple_id;
  UPDATE public.peaks_db SET route_updated_by = email_id WHERE route_updated_by = apple_id;

  -- 18. PROFILES — overfør innholdet fra Apple-bruker (med riktig navn/avatar) til email-bruker
  UPDATE public.profiles
  SET 
    username = ap.username,
    avatar_url = ap.avatar_url,
    session_type_colors = ap.session_type_colors,
    privacy_workouts = ap.privacy_workouts,
    privacy_workouts_friends = ap.privacy_workouts_friends,
    privacy_stats = ap.privacy_stats,
    privacy_stats_friends = ap.privacy_stats_friends,
    privacy_goals = ap.privacy_goals,
    privacy_goals_friends = ap.privacy_goals_friends,
    privacy_peak_checkins = ap.privacy_peak_checkins,
    privacy_peak_checkins_friends = ap.privacy_peak_checkins_friends,
    privacy_child_profile = ap.privacy_child_profile,
    privacy_child_checkins = ap.privacy_child_checkins,
    updated_at = now()
  FROM (SELECT * FROM public.profiles WHERE id = apple_id) ap
  WHERE public.profiles.id = email_id;

  -- 19. Slett Apple-brukerens profil (handle_new_user-trigger opprettet den)
  DELETE FROM public.profiles WHERE id = apple_id;
  DELETE FROM public.profiles WHERE id = empty_apple_id;

  -- 20. Slett selve auth-brukerne (Apple privaterelay + den nye tomme)
  DELETE FROM auth.users WHERE id = apple_id;
  DELETE FROM auth.users WHERE id = empty_apple_id;
END $$;
