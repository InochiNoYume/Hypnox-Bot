-- Prevent two concurrent staff actions from reassigning an already claimed ticket.
-- Assignment may transition only from NULL to a user; a claimed ticket cannot be reassigned.
create or replace function public.prevent_ticket_reassignment()
returns trigger
language plpgsql
as $$
begin
  if old.assigned_to_discord_user_id is not null
     and new.assigned_to_discord_user_id is distinct from old.assigned_to_discord_user_id then
    raise exception 'TICKET_ALREADY_ASSIGNED' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_ticket_reassignment on public.tickets;
create trigger prevent_ticket_reassignment
before update of assigned_to_discord_user_id on public.tickets
for each row
execute function public.prevent_ticket_reassignment();
