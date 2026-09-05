alter table public.tickets
  add column if not exists oral_voice_channel_id text null;

create index if not exists idx_tickets_oral_voice_channel_id
  on public.tickets (oral_voice_channel_id)
  where oral_voice_channel_id is not null;
