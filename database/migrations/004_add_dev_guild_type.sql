-- Allow the optional development/test Discord server in the guild registry.
alter table public.guilds drop constraint if exists guilds_guild_type_check;
alter table public.guilds add constraint guilds_guild_type_check
  check (guild_type in ('official', 'staff', 'applications', 'dev'));
