create table if not exists public.series (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  channel_id text,
  message_id text,
  title text not null,
  description text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null default 'upcoming' check (status in ('upcoming','active','finished','cancelled')),
  created_by_discord_user_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_series_guild_id on public.series(guild_id);
create index if not exists idx_series_status on public.series(status);

create table if not exists public.series_participants (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.series(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  discord_user_id text not null,
  joined_at timestamptz not null default now(),
  unique(series_id, discord_user_id)
);

create index if not exists idx_series_participants_series_id on public.series_participants(series_id);
create index if not exists idx_series_participants_discord_user_id on public.series_participants(discord_user_id);

alter table public.series enable row level security;
alter table public.series_participants enable row level security;
revoke all on public.series from anon, authenticated;
revoke all on public.series_participants from anon, authenticated;
