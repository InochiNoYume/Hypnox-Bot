-- Defense in depth: the ticket assignment trigger function is not a public API.
-- Trigger functions do not need EXECUTE grants from application roles.
revoke execute on function public.prevent_ticket_reassignment() from public, anon, authenticated;
