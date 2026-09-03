-- Remove the abandoned Hypnox Dashboard authorization layer.
-- The bot is the only application layer for Hypnox Studios.

DROP POLICY IF EXISTS dashboard_access_self_select ON public.dashboard_access;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'guilds','guild_config','users','guild_members','permissions','warnings',
    'moderation_actions','tickets','ticket_events','announcements','events',
    'giveaways','giveaway_entries','projects','project_tasks','logs'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS dashboard_read_%I ON public.%I', t, t);
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.is_dashboard_user();
DROP TABLE IF EXISTS public.dashboard_access;
