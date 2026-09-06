create table if not exists public.ticket_ratings (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null unique references public.tickets(id) on delete cascade,
  guild_id uuid not null references public.guilds(id) on delete cascade,
  staff_discord_user_id text not null,
  rated_by_discord_user_id text not null,
  rating integer check (rating between 1 and 5),
  justification text check (justification is null or char_length(btrim(justification)) between 5 and 2000),
  requested_at timestamptz not null default now(),
  submitted_at timestamptz
);

create index if not exists idx_ticket_ratings_guild_staff on public.ticket_ratings(guild_id, staff_discord_user_id);
create index if not exists idx_ticket_ratings_submitted_at on public.ticket_ratings(submitted_at desc);

alter table public.ticket_ratings enable row level security;
