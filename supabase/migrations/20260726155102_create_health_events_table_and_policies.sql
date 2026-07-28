create table if not exists public.health_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  type       text not null,          -- 'sickness' | 'injury'
  date_from  date not null,
  date_to    date,                   -- NULL = pågående
  notes      text,
  created_at timestamptz not null default now()
);

revoke all on public.health_events from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.health_events to authenticated;
grant all on public.health_events to service_role;

alter table public.health_events enable row level security;

do $$
declare
  r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'health_events'
  loop
    execute format('drop policy if exists %I on public.health_events', r.policyname);
  end loop;
end $$;

create policy "Users can view own health events"
  on public.health_events
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own health events"
  on public.health_events
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own health events"
  on public.health_events
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own health events"
  on public.health_events
  for delete
  to authenticated
  using (auth.uid() = user_id);