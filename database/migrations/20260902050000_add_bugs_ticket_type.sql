-- Add the technical Bugs / Errores ticket category used by the Discord bot.
-- Safe for existing databases: only the ticket_type constraint is extended.

alter table public.tickets
  drop constraint if exists tickets_ticket_type_check;

alter table public.tickets
  add constraint tickets_ticket_type_check
  check (ticket_type in ('support','report','alliance_partner','contact','bugs'));
