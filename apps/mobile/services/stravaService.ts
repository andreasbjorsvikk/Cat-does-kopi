import { supabase } from '@/lib/supabase';
import { WorkoutStreams } from '@/types/workout';

// Static references for Expo env inlining
const expoSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
// Fallback for local dev
const viteSupabaseUrl = process.env.VITE_SUPABASE_URL;

const supabaseUrl = expoSupabaseUrl || viteSupabaseUrl || "";
const FUNCTION_URL = `${supabaseUrl}/functions/v1/strava`;

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');
  return {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

export const stravaService = {
  async fetchStreams(sessionId: string, stravaActivityId: number): Promise<WorkoutStreams> {
    const headers = await getAuthHeaders();
    const res = await fetch(
      `${FUNCTION_URL}?action=fetch-streams&session_id=${sessionId}&strava_activity_id=${stravaActivityId}`,
      { method: 'POST', headers }
    );
    if (!res.ok) throw new Error('Failed to fetch streams');
    return res.json();
  },

  async getStatus(): Promise<{ connected: boolean; athlete_id?: number }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${FUNCTION_URL}?action=status`, { headers });
    if (!res.ok) throw new Error('Failed to fetch Strava status');
    return res.json();
  },

  async getConnectUrl(): Promise<{ url: string }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${FUNCTION_URL}?action=auth-url`, { headers });
    if (!res.ok) throw new Error('Failed to fetch Strava auth URL');
    return res.json();
  },

  async disconnect(): Promise<{ ok: boolean }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${FUNCTION_URL}?action=disconnect`, { method: 'POST', headers });
    if (!res.ok) throw new Error('Failed to disconnect from Strava');
    return res.json();
  },

  async sync(): Promise<{ synced: number; merged: number; total: number }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${FUNCTION_URL}?action=sync`, { method: 'POST', headers });
    if (!res.ok) throw new Error('Failed to sync Strava activities');
    return res.json();
  }
};