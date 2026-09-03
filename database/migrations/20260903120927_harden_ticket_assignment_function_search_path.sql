-- Harden the ticket assignment trigger function against search_path manipulation.
create or replace function public.prevent_ticket_reassignment()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.assigned_to_discord_user_id is not null
     and new.assigned_to_discord_user_id is distinct from old.assigned_to_discord_user_id then
    raise exception 'TICKET_ALREADY_ASSIGNED' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
