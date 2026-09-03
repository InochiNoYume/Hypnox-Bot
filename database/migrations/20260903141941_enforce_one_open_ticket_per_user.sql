-- Keep ticket creation safe under concurrent requests.
-- A member can have at most one open ticket per guild.
create unique index if not exists idx_tickets_one_open_per_creator
on public.tickets (guild_id, creator_user_id)
where status = 'open';
