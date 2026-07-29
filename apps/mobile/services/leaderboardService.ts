import { supabase } from '@/lib/supabase';
import { PeakCheckin } from './peakCheckinService';
import { fetchPeaks } from './peakDbService';

export interface LeaderboardEntry {
  userId: string;
  name: string;
  avatarUrl: string | null;
  emoji?: string;
  uniquePeaks: number;
  totalTrips: number;
  isChild: boolean;
  isMe: boolean;
}

export type LeaderboardPeriod = 'month' | 'year' | 'total';
export type LeaderboardScope = 'global' | 'friends';
export type LeaderboardMetric = 'unique' | 'trips';

export async function getLeaderboardData(
  currentUserId: string,
  scope: LeaderboardScope,
  period: LeaderboardPeriod
): Promise<LeaderboardEntry[]> {
  // 1. Calculate date filter
  let startDate: string | null = null;
  const now = new Date();
  
  if (period === 'month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startDate = startOfMonth.toISOString();
  } else if (period === 'year') {
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    startDate = startOfYear.toISOString();
  }

  // 2. Determine scope user IDs
  let scopeIds: string[] | null = null;
  if (scope === 'friends') {
    // Get friends
    const { data: friendships } = await supabase
      .from('friendships')
      .select('user_id, friend_id')
      .eq('status', 'accepted')
      .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`);
    
    const friendIds = new Set<string>();
    friendIds.add(currentUserId);
    (friendships || []).forEach(f => {
      if (f.user_id === currentUserId) friendIds.add(f.friend_id);
      else friendIds.add(f.user_id);
    });

    // Also include children of current user
    const { data: children } = await supabase
      .from('child_profiles')
      .select('id')
      .eq('parent_user_id', currentUserId);
    
    (children || []).forEach(c => friendIds.add(c.id));
    
    scopeIds = Array.from(friendIds);
  }

  // 3. Fetch check-ins
  let query = supabase.from('peak_checkins').select('*');
  
  if (startDate) {
    query = query.gte('checked_in_at', startDate);
  }
  
  if (scopeIds) {
    query = query.in('user_id', scopeIds);
  }

  const { data: checkins, error } = await query;
  if (error) throw error;
  
  const rawCheckins = (checkins || []) as PeakCheckin[];

  // 4. Filter out unpublished peaks
  const allPeaks = await fetchPeaks();
  const publishedPeakIds = new Set(allPeaks.map(p => p.id));
  const filteredCheckins = rawCheckins.filter(c => publishedPeakIds.has(c.peak_id));

  if (filteredCheckins.length === 0) return [];

  // 5. Aggregate check-ins by user
  const userStats = new Map<string, { uniquePeaks: Set<string>; totalTrips: number }>();
  filteredCheckins.forEach(c => {
    if (!userStats.has(c.user_id)) {
      userStats.set(c.user_id, { uniquePeaks: new Set(), totalTrips: 0 });
    }
    const stats = userStats.get(c.user_id)!;
    stats.uniquePeaks.add(c.peak_id);
    stats.totalTrips++;
  });

  const userIds = Array.from(userStats.keys());

  // 6. Fetch profiles and child profiles in batches
  const [profilesRes, childrenRes] = await Promise.all([
    supabase.from('profiles').select('id, username, avatar_url').in('id', userIds),
    supabase.from('child_profiles').select('id, name, avatar_url, emoji').in('id', userIds)
  ]);

  if (profilesRes.error) throw profilesRes.error;
  if (childrenRes.error) throw childrenRes.error;

  const profileMap = new Map(profilesRes.data.map(p => [p.id, p]));
  const childMap = new Map(childrenRes.data.map(c => [c.id, c]));

  // 7. Map to LeaderboardEntry
  return userIds.map(uid => {
    const stats = userStats.get(uid)!;
    const profile = profileMap.get(uid);
    const child = childMap.get(uid);
    
    return {
      userId: uid,
      name: child ? child.name : (profile?.username || 'Anonym'),
      avatarUrl: child ? child.avatar_url : profile?.avatar_url,
      emoji: child ? child.emoji : undefined,
      uniquePeaks: stats.uniquePeaks.size,
      totalTrips: stats.totalTrips,
      isChild: !!child,
      isMe: uid === currentUserId
    };
  });
}

export async function getPeakLeaderboardData(
  peakId: string
): Promise<LeaderboardEntry[]> {
  // 1. Fetch all check-ins for this specific peak
  const { data: checkins, error } = await supabase
    .from('peak_checkins')
    .select('*')
    .eq('peak_id', peakId);
  
  if (error) throw error;
  const rawCheckins = (checkins || []) as PeakCheckin[];

  if (rawCheckins.length === 0) return [];

  // 2. Aggregate check-ins by user
  const userStats = new Map<string, { totalTrips: number }>();
  rawCheckins.forEach(c => {
    if (!userStats.has(c.user_id)) {
      userStats.set(c.user_id, { totalTrips: 0 });
    }
    const stats = userStats.get(c.user_id)!;
    stats.totalTrips++;
  });

  const userIds = Array.from(userStats.keys());

  // 3. Fetch profiles and child profiles in batches
  const [profilesRes, childrenRes] = await Promise.all([
    supabase.from('profiles').select('id, username, avatar_url').in('id', userIds),
    supabase.from('child_profiles').select('id, name, avatar_url, emoji').in('id', userIds)
  ]);

  if (profilesRes.error) throw profilesRes.error;
  if (childrenRes.error) throw childrenRes.error;

  const profileMap = new Map(profilesRes.data.map(p => [p.id, p]));
  const childMap = new Map(childrenRes.data.map(c => [c.id, c]));

  // 4. Map to LeaderboardEntry
  const entries = userIds.map(uid => {
    const stats = userStats.get(uid)!;
    const profile = profileMap.get(uid);
    const child = childMap.get(uid);
    
    return {
      userId: uid,
      name: child ? child.name : (profile?.username || 'Anonym'),
      avatarUrl: child ? child.avatar_url : profile?.avatar_url,
      emoji: child ? child.emoji : undefined,
      uniquePeaks: 1, // Only this peak
      totalTrips: stats.totalTrips,
      isChild: !!child,
      isMe: false // Not specifically needed here, will be calculated in component
    };
  });

  // 5. Sort by trips and take top 10
  return entries
    .sort((a, b) => b.totalTrips - a.totalTrips || a.name.localeCompare(b.name))
    .slice(0, 10);
}