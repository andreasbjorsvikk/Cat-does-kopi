import { ExtraGoal, GoalPeriod } from '@/types/workout';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

function rowToGoal(row: any): ExtraGoal {
  return {
    id: row.id,
    metric: row.metric,
    period: row.period as GoalPeriod | 'custom',
    activityType: row.activity_type,
    target: row.target,
    customStart: row.custom_start || undefined,
    customEnd: row.custom_end || undefined,
    showOnHome: row.show_on_home || false,
    repeating: row.repeating || false,
    archived: row.archived || false,
    sort_order: row.sort_order || 0,
    createdAt: row.created_at,
  };
}

export const goalService = {
  async getAll(userId?: string): Promise<ExtraGoal[]> {
    if (!userId) return [];

    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []).map(rowToGoal);
    } catch (err) {
      console.error("Database failed to load goals:", err);
      throw err;
    }
  },

  async add(userId: string | undefined, goal: Omit<ExtraGoal, 'id' | 'createdAt'>): Promise<ExtraGoal> {
    if (!userId) throw new Error("User must be logged in to add a goal");

    try {
      const { data, error } = await supabase
        .from('goals')
        .insert({
          user_id: userId,
          metric: goal.metric,
          period: goal.period,
          activity_type: goal.activityType,
          target: goal.target,
          custom_start: goal.customStart || null,
          custom_end: goal.customEnd || null,
          show_on_home: goal.showOnHome || false,
          sort_order: goal.sort_order || 0,
          repeating: goal.repeating || false,
          archived: goal.archived || false
        })
        .select()
        .single();
      if (error) throw error;
      return rowToGoal(data);
    } catch (err) {
      console.error("Could not save goal to Supabase:", err);
      throw err;
    }
  },

  async update(id: string, data: Partial<Omit<ExtraGoal, 'id' | 'createdAt'>>): Promise<void> {
    try {
      const updateObj: any = {};
      if (data.metric !== undefined) updateObj.metric = data.metric;
      if (data.period !== undefined) updateObj.period = data.period;
      if (data.activityType !== undefined) updateObj.activity_type = data.activityType;
      if (data.target !== undefined) updateObj.target = data.target;
      if (data.customStart !== undefined) updateObj.custom_start = data.customStart || null;
      if (data.customEnd !== undefined) updateObj.custom_end = data.customEnd || null;
      if (data.showOnHome !== undefined) updateObj.show_on_home = data.showOnHome;
      if (data.sort_order !== undefined) updateObj.sort_order = data.sort_order;
      if (data.repeating !== undefined) updateObj.repeating = data.repeating;
      if (data.archived !== undefined) updateObj.archived = data.archived;
      
      const { error } = await supabase.from('goals').update(updateObj).eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error("Could not update goal on Supabase:", err);
      throw err;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase.from('goals').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error("Could not delete goal on Supabase:", err);
      throw err;
    }
  },

  async reorder(userId: string, orderedIds: string[]): Promise<void> {
    const updates = orderedIds.map((id, i) =>
      supabase.from('goals').update({ sort_order: i }).eq('id', id)
    );
    await Promise.all(updates);
  },
};