-- Hardening applied to the live Supabase project.
-- Keeps log categories used by the bot valid, protects project tables with RLS,
-- and removes public EXECUTE access from the SECURITY DEFINER event-trigger function.

alter table public.logs drop constraint if exists logs_category_check;
alter table public.logs add constraint logs_category_check
  check (category in ('moderation','ticket','event','giveaway','application','interview','announcement','project','administration','system'));

alter table public.projects enable row level security;
alter table public.project_tasks enable row level security;
revoke all on table public.projects from anon, authenticated;
revoke all on table public.project_tasks from anon, authenticated;
grant all on table public.projects to service_role;
grant all on table public.project_tasks to service_role;

revoke execute on function public.rls_auto_enable() from public;
revoke execute on function public.rls_auto_enable() from anon;
revoke execute on function public.rls_auto_enable() from authenticated;
