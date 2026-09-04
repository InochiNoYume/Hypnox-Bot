create table if not exists public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  discord_user_id text not null,
  joined_at timestamptz not null default now(),
  unique (event_id, discord_user_id)
);

create index if not exists idx_event_participants_event_id on public.event_participants(event_id);
create index if not exists idx_event_participants_discord_user_id on public.event_participants(discord_user_id);

alter table public.event_participants enable row level security;
revoke all on table public.event_participants from anon, authenticated;
grant all on table public.event_participants to service_role;