import { supabase } from '@/lib/supabase';
import { HealthEvent } from '@/types/workout';

function rowToHealthEvent(row: any): HealthEvent {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    dateFrom: row.date_from,
    dateTo: row.date_to,
    notes: row.notes || undefined,
    createdAt: row.created_at,
  };
}

export const healthEventService = {
  async getAll(userId: string): Promise<HealthEvent[]> {
    const { data, error } = await supabase
      .from('health_events')
      .select('*')
      .eq('user_id', userId)
      .order('date_from', { ascending: false });

    if (error) throw error;
    return (data || []).map(rowToHealthEvent);
  },

  async add(userId: string, event: Omit<HealthEvent, 'id' | 'createdAt' | 'userId'>): Promise<HealthEvent> {
    const { data, error } = await supabase
      .from('health_events')
      .insert({
        user_id: userId,
        type: event.type,
        date_from: event.dateFrom,
        date_to: event.dateTo,
        notes: event.notes,
      })
      .select()
      .single();

    if (error) throw error;
    return rowToHealthEvent(data);
  },

  async update(id: string, event: Partial<Omit<HealthEvent, 'id' | 'createdAt' | 'userId'>>): Promise<void> {
    const { error } = await supabase
      .from('health_events')
      .update({
        type: event.type,
        date_from: event.dateFrom,
        date_to: event.dateTo,
        notes: event.notes,
      })
      .eq('id', id);

    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('health_events')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};