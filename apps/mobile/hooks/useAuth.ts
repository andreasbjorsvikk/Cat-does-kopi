import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { UserProfile } from '@/types/workout';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (data && !error) {
      setProfile({
        id: data.id,
        username: data.username,
        avatarUrl: data.avatar_url,
        createdAt: data.created_at,
        privacyPeakCheckins: data.privacy_peak_checkins,
        privacyWorkouts: data.privacy_workouts,
        privacyStats: data.privacy_stats,
        privacyGoals: data.privacy_goals,
        privacyChildProfile: data.privacy_child_profile,
        privacyChildCheckins: data.privacy_child_checkins,
        adminMode: data.admin_mode,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshProfile = () => {
    if (user) fetchProfile(user.id);
  };

  return { user, profile, loading, refreshProfile };
}