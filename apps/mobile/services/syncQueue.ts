import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { Platform } from 'react-native';

const QUEUE_KEY = 'treningsapp_sync_queue';
const DEAD_LETTER_KEY = 'treningsapp_sync_dead_letter';

export type SyncAction = 'insert' | 'update' | 'delete';

export type SyncTable =
  | 'workout_sessions'
  | 'goals'
  | 'primary_goal_periods'
  | 'health_events'
  | 'peak_checkins'
  | 'challenges'
  | 'challenge_participants'
  | 'hiking_records'
  | 'shared_hiking_entries';

export interface SyncOperation {
  id: string;
  table: SyncTable;
  action: SyncAction;
  payload: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
  lastError: string | null;
}

// Helper to load sync queue from AsyncStorage
async function loadQueue(): Promise<SyncOperation[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('[syncQueue] Error loading queue', err);
    return [];
  }
}

// Helper to save sync queue to AsyncStorage
async function saveQueue(ops: SyncOperation[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(ops));
  } catch (err) {
    console.error('[syncQueue] Error saving queue', err);
  }
}

// Helper to load dead letter queue
async function loadDeadLetter(): Promise<SyncOperation[]> {
  try {
    const raw = await AsyncStorage.getItem(DEAD_LETTER_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('[syncQueue] Error loading dead letter queue', err);
    return [];
  }
}

// Helper to save dead letter queue
async function saveDeadLetter(ops: SyncOperation[]): Promise<void> {
  try {
    await AsyncStorage.setItem(DEAD_LETTER_KEY, JSON.stringify(ops));
  } catch (err) {
    console.error('[syncQueue] Error saving dead letter queue', err);
  }
}

/** Enqueue a new operation. Duplicate payloads are silently ignored. */
export async function enqueue(
  table: SyncTable,
  action: SyncAction,
  payload: Record<string, unknown>,
): Promise<void> {
  const queue = await loadQueue();

  const opId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  // Idempotency: skip if an identical operation already exists
  const isDuplicate = queue.some(
    (op) =>
      op.table === table &&
      op.action === action &&
      JSON.stringify(op.payload) === JSON.stringify(payload),
  );
  if (isDuplicate) return;

  queue.push({
    id: opId,
    table,
    action,
    payload,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    lastError: null,
  });

  await saveQueue(queue);
}

/** Return current queue length (for UI indicators). */
export async function queueLength(): Promise<number> {
  return (await loadQueue()).length;
}

/** Return all pending operations (read-only snapshot). */
export async function peekQueue(): Promise<SyncOperation[]> {
  return [...(await loadQueue())];
}

/** Clear the entire queue. */
export async function clearQueue(): Promise<void> {
  await saveQueue([]);
}

const MAX_RETRIES = 5;

/** Process all queued operations sequentially. */
export async function flushQueue(): Promise<number> {
  const queue = await loadQueue();
  if (queue.length === 0) return 0;

  let processed = 0;
  const remaining: SyncOperation[] = [];
  const deadLetterOps: SyncOperation[] = [];

  for (const op of queue) {
    try {
      await executeOperation(op);
      processed++;
    } catch (err: any) {
      const errMsg = err instanceof Error ? err.message : String(err);
      op.retryCount++;
      op.lastError = errMsg;

      if (op.retryCount < MAX_RETRIES) {
        remaining.push(op);
      } else {
        console.error(`[syncQueue] Moving operation to dead-letter after ${MAX_RETRIES} retries:`, op);
        deadLetterOps.push(op);
      }
    }
  }

  await saveQueue(remaining);

  if (deadLetterOps.length > 0) {
    const existing = await loadDeadLetter();
    await saveDeadLetter([...existing, ...deadLetterOps]);
  }

  return processed;
}

/**
 * Start a background flush loop that runs when connectivity returns.
 * Returns a cleanup function.
 */
export function startAutoFlush(onFlushed?: (count: number) => void): () => void {
  let flushing = false;

  const doFlush = async () => {
    if (flushing) return;
    flushing = true;
    try {
      const count = await flushQueue();
      if (count > 0) onFlushed?.(count);
    } finally {
      flushing = false;
    }
  };

  if (Platform.OS === 'web') {
    const handleOnline = () => {
      doFlush();
    };
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }

  // On Native, do a periodic background check every 30 seconds
  const interval = setInterval(() => {
    doFlush();
  }, 30000);

  return () => {
    clearInterval(interval);
  };
}

// Execute a single operation against Supabase
async function executeOperation(op: SyncOperation): Promise<void> {
  const { table, action, payload } = op;

  switch (action) {
    case 'insert': {
      const { localTempId, _offline_temp_id, ...data } = payload as any;
      if (table === 'peak_checkins' && !data.checked_in_at) {
        data.checked_in_at = op.createdAt;
      }
      const { error } = await supabase.from(table).insert(data);
      if (error) throw new Error(error.message);
      break;
    }
    case 'update': {
      const { id, ...data } = payload as any;
      if (!id) throw new Error('Missing ID for update operation');
      const { error } = await supabase.from(table).update(data).eq('id', id);
      if (error) throw new Error(error.message);
      break;
    }
    case 'delete': {
      const { id } = payload as any;
      if (!id) throw new Error('Missing ID for delete operation');
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw new Error(error.message);
      break;
    }
    default:
      throw new Error(`Unsupported action: ${action}`);
  }
}