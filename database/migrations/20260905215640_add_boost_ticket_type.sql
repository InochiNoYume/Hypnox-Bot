alter table public.tickets drop constraint if exists tickets_ticket_type_check;

alter table public.tickets
  add constraint tickets_ticket_type_check
  check (ticket_type = any (array['support'::text, 'report'::text, 'alliance_partner'::text, 'contact'::text, 'bugs'::text, 'boost'::text]));
