import { supabase } from "@/lib/supabase";
import { WorkoutSession, WeeklyStats, SessionType } from "@/types/workout";
function rowToSession(row: any): WorkoutSession {
  return {
    id: row.id,
    type: row.type as SessionType,
    title: row.title || undefined,
    date: row.date,
    durationMinutes: row.duration_minutes,
    distance: row.distance || undefined,
    elevationGain: row.elevation_gain || undefined,
    notes: row.notes || undefined,
    userId: row.user_id,
    averageHeartrate: row.average_heartrate || undefined,
    maxHeartrate: row.max_heartrate || undefined,
    summaryPolyline: row.summary_polyline || undefined,
    stravaActivityId: row.strava_activity_id || undefined,
    sourcePrimary: row.source_primary || undefined,
    appleHealthWorkoutId: row.apple_health_workout_id || undefined,
    syncStatus: row.sync_status || undefined,
    importedAt: row.imported_at || undefined,
    sourceHistory: row.source_history || undefined,
    userModified: row.user_modified || false,
    excludeFromCount: row.exclude_from_count || false,
  };
}

export const workoutService = {
  async getAll(userId?: string): Promise<WorkoutSession[]> {
    if (!userId) return [];
    try {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []).map(rowToSession);
    } catch (err) {
      console.error("Could not fetch workout sessions:", err);
      throw err;
    }
  },

  async getById(id: string): Promise<WorkoutSession | null> {
    try {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data ? rowToSession(data) : null;
    } catch (err) {
      console.error(`Could not fetch workout session ${id}:`, err);
      return null;
    }
  },

  async add(session: Omit<WorkoutSession, "id">, userId: string | undefined): Promise<WorkoutSession> {
    if (!userId) throw new Error("Du må være logget inn for å lagre økter.");

    try {
      const { data, error } = await supabase
        .from("workout_sessions")
        .insert({
          user_id: userId,
          type: session.type,
          title: session.title || null,
          date: session.date,
          duration_minutes: session.durationMinutes,
          distance: session.distance || null,
          elevation_gain: session.elevationGain || null,
          notes: session.notes || null,
          exclude_from_count: session.excludeFromCount || false,
          average_heartrate: session.averageHeartrate || null,
          max_heartrate: session.maxHeartrate || null,
          summary_polyline: session.summaryPolyline || null,
          strava_activity_id: session.stravaActivityId || null,
          source_primary: session.sourcePrimary || 'manual',
          apple_health_workout_id: session.appleHealthWorkoutId || null,
          sync_status: session.syncStatus || 'synced',
          imported_at: session.importedAt || null,
          source_history: session.sourceHistory || '[]',
          user_modified: session.userModified ?? true,
        })
        .select()
        .single();
      if (error) throw error;
      return rowToSession(data);
    } catch (err) {
      console.error("Database insert error:", err);
      throw err;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase.from("workout_sessions").delete().eq("id", id);
      if (error) throw error;
    } catch (err) {
      console.warn("Could not delete workout session from DB:", err);
    }
  },

  async update(id: string, session: Partial<Omit<WorkoutSession, "id">>): Promise<WorkoutSession> {
    try {
      const updateData: any = {};
      if (session.type !== undefined) updateData.type = session.type;
      if (session.title !== undefined) updateData.title = session.title || null;
      if (session.date !== undefined) updateData.date = session.date;
      if (session.durationMinutes !== undefined) updateData.duration_minutes = session.durationMinutes;
      if (session.distance !== undefined) updateData.distance = session.distance || null;
      if (session.elevationGain !== undefined) updateData.elevation_gain = session.elevationGain || null;
      if (session.notes !== undefined) updateData.notes = session.notes || null;
      if (session.excludeFromCount !== undefined) updateData.exclude_from_count = session.excludeFromCount;
      if (session.averageHeartrate !== undefined) updateData.average_heartrate = session.averageHeartrate || null;
      if (session.maxHeartrate !== undefined) updateData.max_heartrate = session.maxHeartrate || null;
      if (session.summaryPolyline !== undefined) updateData.summary_polyline = session.summaryPolyline || null;
      if (session.stravaActivityId !== undefined) updateData.strava_activity_id = session.stravaActivityId || null;
      if (session.sourcePrimary !== undefined) updateData.source_primary = session.sourcePrimary;
      if (session.appleHealthWorkoutId !== undefined) updateData.apple_health_workout_id = session.appleHealthWorkoutId || null;
      if (session.syncStatus !== undefined) updateData.sync_status = session.syncStatus;
      if (session.importedAt !== undefined) updateData.imported_at = session.importedAt || null;
      if (session.sourceHistory !== undefined) updateData.source_history = session.sourceHistory;
      if (session.userModified !== undefined) updateData.user_modified = session.userModified;

      const { data, error } = await supabase
        .from("workout_sessions")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return rowToSession(data);
    } catch (err) {
      console.error("Database update error:", err);
      throw err;
    }
  },

  computeStats(sessions: WorkoutSession[]): WeeklyStats {
    const sessionsByType = {} as Record<SessionType, number>;
    const types: SessionType[] = [
      "styrke", "løping", "fjelltur", "svømming", "sykling", "gå", "tennis",
      "yoga", "fotball", "trappemaskin", "roing", "kajakk", "tredemølle", "annet"
    ];
    types.forEach(t => { sessionsByType[t] = 0; });
    sessions.forEach(s => {
      if (!s.excludeFromCount && sessionsByType[s.type] !== undefined) {
        sessionsByType[s.type]++;
      }
    });

    return {
      totalSessions: sessions.filter(s => !s.excludeFromCount).length,
      totalMinutes: sessions.reduce((sum, s) => sum + s.durationMinutes, 0),
      totalDistance: sessions.reduce((sum, s) => sum + (s.distance || 0), 0),
      totalElevation: sessions.reduce((sum, s) => sum + (s.elevationGain || 0), 0),
      sessionsByType,
    };
  }
};