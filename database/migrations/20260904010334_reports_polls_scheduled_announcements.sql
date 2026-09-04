create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  reporter_discord_user_id text not null,
  target_discord_user_id text not null,
  reason text not null,
  status text not null default 'pending' check (status in ('pending','reviewing','resolved','rejected')),
  reviewed_by_discord_user_id text,
  resolution text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  channel_id text not null,
  message_id text,
  question text not null,
  options jsonb not null,
  votes jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active','closed')),
  ends_at timestamptz,
  created_by_discord_user_id text not null,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists public.scheduled_announcements (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  channel_id text not null,
  announcement_type text not null,
  title text not null,
  content text not null,
  image_url text,
  scheduled_for timestamptz not null,
  created_by_discord_user_id text not null,
  status text not null default 'pending' check (status in ('pending','sent','cancelled','failed')),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_reports_guild_status on public.reports(guild_id,status);
create index if not exists idx_polls_guild_status on public.polls(guild_id,status);
create index if not exists idx_scheduled_announcements_due on public.scheduled_announcements(status,scheduled_for);

alter table public.reports enable row level security;
alter table public.polls enable row level security;
alter table public.scheduled_announcements enable row level security;
revoke all on table public.reports, public.polls, public.scheduled_announcements from anon, authenticated;
grant all on table public.reports, public.polls, public.scheduled_announcements to service_role;