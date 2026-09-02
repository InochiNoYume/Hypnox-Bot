-- Hypnox Bot initial database schema
-- PostgreSQL / Supabase

create extension if not exists pgcrypto;

create table public.guilds (
  id uuid primary key default gen_random_uuid(),
  discord_guild_id text not null unique,
  guild_type text not null check (guild_type in ('official','staff','applications')),
  name text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.guild_config (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  config_key text not null,
  config_value text,
  updated_at timestamptz not null default now(),
  unique (guild_id, config_key)
);

create table public.users (
  id uuid primary key default gen_random_uuid(),
  discord_user_id text not null unique,
  username text,
  display_name text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.guild_members (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  joined_at timestamptz,
  nickname text,
  is_staff boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (guild_id, user_id)
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  permission_key text not null,
  role_ids text[] not null default '{}',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (guild_id, permission_key)
);

create table public.warnings (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  moderator_discord_user_id text not null,
  reason text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  target_user_id uuid references public.users(id) on delete set null,
  moderator_discord_user_id text not null,
  action_type text not null check (action_type in ('ban','kick','timeout','warn','unwarn','clear','slowmode')),
  reason text,
  duration_seconds integer,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  discord_channel_id text not null unique,
  creator_user_id uuid not null references public.users(id) on delete restrict,
  ticket_type text not null check (ticket_type in ('support','report','alliance_partner','contact')),
  subtype text check (subtype in ('alliance','partner')),
  status text not null default 'open' check (status in ('open','closed')),
  assigned_to_discord_user_id text,
  closed_by_discord_user_id text,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table public.ticket_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  actor_discord_user_id text not null,
  event_type text not null check (event_type in ('created','assigned','message','closed','reopened','type_changed')),
  content text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  channel_id text not null,
  message_id text,
  announcement_type text not null check (announcement_type in ('official','activity','dynamic','event','series','episode')),
  title text not null,
  content text not null,
  image_url text,
  author_discord_user_id text not null,
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  channel_id text,
  message_id text,
  title text not null,
  description text,
  status text not null default 'upcoming' check (status in ('upcoming','active','finished','cancelled')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_by_discord_user_id text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.giveaways (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  channel_id text not null,
  message_id text unique,
  title text not null,
  prize text not null,
  winner_count integer not null default 1 check (winner_count > 0),
  status text not null default 'active' check (status in ('active','finished','cancelled')),
  ends_at timestamptz not null,
  created_by_discord_user_id text not null,
  winners text[] not null default '{}',
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table public.giveaway_entries (
  id uuid primary key default gen_random_uuid(),
  giveaway_id uuid not null references public.giveaways(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (giveaway_id, user_id)
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  applicant_user_id uuid not null references public.users(id) on delete restrict,
  phase integer not null default 1 check (phase in (1,2)),
  status text not null default 'pending' check (status in ('pending','approved','rejected','passed','failed','withdrawn','cooldown')),
  form_response jsonb not null default '{}',
  reviewer_discord_user_id text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  cooldown_until timestamptz
);

create table public.interviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  interviewer_discord_user_id text not null,
  scheduled_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled','no_show')),
  result text check (result in ('passed','failed','pending')),
  notes text,
  created_at timestamptz not null default now()
);

create table public.logs (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  category text not null check (category in ('moderation','ticket','event','giveaway','application','interview','administration','system')),
  action text not null,
  actor_discord_user_id text,
  target_discord_user_id text,
  channel_id text,
  message text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_guild_members_guild on public.guild_members(guild_id);
create index idx_warnings_guild_user on public.warnings(guild_id, user_id, active);
create index idx_moderation_actions_guild_created on public.moderation_actions(guild_id, created_at desc);
create index idx_tickets_guild_status on public.tickets(guild_id, status);
create index idx_ticket_events_ticket_created on public.ticket_events(ticket_id, created_at);
create index idx_announcements_guild_created on public.announcements(guild_id, created_at desc);
create index idx_events_guild_status on public.events(guild_id, status);
create index idx_giveaways_guild_status on public.giveaways(guild_id, status);
create index idx_giveaway_entries_giveaway on public.giveaway_entries(giveaway_id);
create index idx_applications_guild_status on public.applications(guild_id, status);
create index idx_applications_applicant on public.applications(applicant_user_id);
create index idx_interviews_application on public.interviews(application_id);
create index idx_logs_guild_category_created on public.logs(guild_id, category, created_at desc);

alter table public.guilds enable row level security;
alter table public.guild_config enable row level security;
alter table public.users enable row level security;
alter table public.guild_members enable row level security;
alter table public.permissions enable row level security;
alter table public.warnings enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_events enable row level security;
alter table public.announcements enable row level security;
alter table public.events enable row level security;
alter table public.giveaways enable row level security;
alter table public.giveaway_entries enable row level security;
alter table public.applications enable row level security;
alter table public.interviews enable row level security;
alter table public.logs enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant all on all tables in schema public to service_role;
