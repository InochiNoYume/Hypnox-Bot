-- Make scheduled announcement processing safe across multiple bot instances.
-- Existing rows remain pending/sent/cancelled/failed; processing is transient.

alter table public.scheduled_announcements
  add column if not exists processing_at timestamptz;

alter table public.scheduled_announcements
  drop constraint if exists scheduled_announcements_status_check;

alter table public.scheduled_announcements
  add constraint scheduled_announcements_status_check
  check (status in ('pending','processing','sent','cancelled','failed'));

create index if not exists idx_scheduled_announcements_processing
  on public.scheduled_announcements(status, processing_at);

create index if not exists idx_event_participants_user_id
  on public.event_participants(user_id);

create index if not exists idx_series_participants_user_id
  on public.series_participants(user_id);

create index if not exists idx_scheduled_announcements_guild_id
  on public.scheduled_announcements(guild_id);
