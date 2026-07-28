-- Update workout_sessions table
ALTER TABLE public.workout_sessions 
ADD COLUMN IF NOT EXISTS source_primary TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS apple_health_workout_id TEXT,
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'synced',
ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS source_history JSONB DEFAULT '[]'::jsonb;

-- Update goals table
ALTER TABLE public.goals 
ADD COLUMN IF NOT EXISTS repeating BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;