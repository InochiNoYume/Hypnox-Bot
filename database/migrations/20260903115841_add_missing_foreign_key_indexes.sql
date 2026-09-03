-- Add covering indexes for foreign keys reported by Supabase Performance Advisor.
create index if not exists idx_giveaway_entries_user on public.giveaway_entries (user_id);
create index if not exists idx_guild_members_user on public.guild_members (user_id);
create index if not exists idx_moderation_actions_target_user on public.moderation_actions (target_user_id);
create index if not exists idx_tickets_creator_user on public.tickets (creator_user_id);
create index if not exists idx_warnings_user on public.warnings (user_id);
