-- Dashboard access for Hypnox Dashboard
-- Applied to Supabase project Hypnox Bot.

create table if not exists public.dashboard_access (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  discord_user_id text,
  role text not null check (role in ('founder','director','administrative_assistant','project_manager','department_lead')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_dashboard_access_discord_user_id
  on public.dashboard_access(discord_user_id);

alter table public.dashboard_access enable row level security;

revoke all on public.dashboard_access from anon;
revoke all on public.dashboard_access from authenticated;
grant select on public.dashboard_access to authenticated;

drop policy if exists dashboard_access_self_select on public.dashboard_access;
create policy dashboard_access_self_select
  on public.dashboard_access
  for select
  to authenticated
  using ((select auth.uid()) = auth_user_id);

create or replace function public.is_dashboard_user()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.dashboard_access
    where auth_user_id = (select auth.uid())
      and enabled = true
  );
$$;

revoke execute on function public.is_dashboard_user() from public;
grant execute on function public.is_dashboard_user() to authenticated;

-- Dashboard users can read operational data.
-- Mutations remain server-side/admin-side only for now.
do $$
declare
  t text;
begin
  foreach t in array array[
    'guilds','guild_config','users','guild_members','permissions','warnings',
    'moderation_actions','tickets','ticket_events','announcements','events',
    'giveaways','giveaway_entries','projects','project_tasks','logs'
  ] loop
    execute format('drop policy if exists dashboard_read_%I on public.%I', t, t);
    execute format('create policy dashboard_read_%I on public.%I for select to authenticated using ((select public.is_dashboard_user()))', t, t);
  end loop;
end $$;
