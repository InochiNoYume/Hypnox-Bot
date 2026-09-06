alter table public.ticket_events drop constraint if exists ticket_events_event_type_check;

alter table public.ticket_events
  add constraint ticket_events_event_type_check
  check (event_type in ('created','assigned','message','closed','reopened','type_changed','oral_assistance_created'));
