const supabase = require('../database/supabase');
const { getTicket, getTicketCreatorDiscordId } = require('./tickets');

async function getTicketRating(ticketId) {
  const { data, error } = await supabase
    .from('ticket_ratings')
    .select('*')
    .eq('ticket_id', ticketId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function requestTicketRating(ticketId, staffDiscordUserId) {
  const ticket = await getTicket(ticketId);
  if (!ticket) throw new Error('TICKET_NOT_FOUND');
  if (!ticket.assigned_to_discord_user_id) throw new Error('TICKET_NOT_ASSIGNED');
  if (ticket.assigned_to_discord_user_id !== staffDiscordUserId) throw new Error('TICKET_NOT_ASSIGNED_TO_YOU');

  const existing = await getTicketRating(ticket.id);
  if (existing) throw new Error('TICKET_ALREADY_RATED');

  const creatorDiscordUserId = await getTicketCreatorDiscordId(ticket);
  if (!creatorDiscordUserId) throw new Error('TICKET_CREATOR_NOT_FOUND');

  const { data, error } = await supabase
    .from('ticket_ratings')
    .insert({
      ticket_id: ticket.id,
      guild_id: ticket.guild_id,
      staff_discord_user_id: staffDiscordUserId,
      rated_by_discord_user_id: creatorDiscordUserId
    })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') throw new Error('TICKET_ALREADY_RATED');
    throw error;
  }
  return { ticket, rating: data, creatorDiscordUserId };
}

async function submitTicketRating({ ticketId, userId, rating, justification }) {
  const ticket = await getTicket(ticketId);
  if (!ticket) throw new Error('TICKET_NOT_FOUND');
  if (!ticket.assigned_to_discord_user_id) throw new Error('TICKET_NOT_ASSIGNED');

  const numericRating = Number(rating);
  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    throw new Error('INVALID_RATING');
  }

  const cleanJustification = String(justification || '').trim();
  if (cleanJustification.length < 5 || cleanJustification.length > 2000) {
    throw new Error('INVALID_JUSTIFICATION');
  }

  const pending = await supabase
    .from('ticket_ratings')
    .select('id,staff_discord_user_id,rated_by_discord_user_id,submitted_at,rating,justification')
    .eq('ticket_id', ticket.id)
    .maybeSingle();
  if (pending.error) throw pending.error;
  if (!pending.data) throw new Error('RATING_NOT_REQUESTED');
  if (pending.data.rated_by_discord_user_id !== userId) throw new Error('RATING_NOT_FOR_YOU');
  if (pending.data.rating !== null || pending.data.justification !== null) throw new Error('RATING_ALREADY_SUBMITTED');

  const { data, error } = await supabase
    .from('ticket_ratings')
    .update({ rating: numericRating, justification: cleanJustification, submitted_at: new Date().toISOString() })
    .eq('id', pending.data.id)
    .eq('rated_by_discord_user_id', userId)
    .is('rating', null)
    .is('justification', null)
    .select()
    .single();
  if (error) throw error;
  return { ticket, rating: data };
}

async function getStaffTicketHistory(guildId, staffDiscordUserId) {
  const [{ count: claimed, error: claimedError }, { count: resolved, error: resolvedError }, { data: ratings, error: ratingsError }] = await Promise.all([
    supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('guild_id', guildId).eq('assigned_to_discord_user_id', staffDiscordUserId),
    supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('guild_id', guildId).eq('assigned_to_discord_user_id', staffDiscordUserId).eq('status', 'closed'),
    supabase.from('ticket_ratings').select('rating,justification,submitted_at,ticket_id').eq('guild_id', guildId).eq('staff_discord_user_id', staffDiscordUserId).not('rating', 'is', null).order('submitted_at', { ascending: false })
  ]);

  if (claimedError) throw claimedError;
  if (resolvedError) throw resolvedError;
  if (ratingsError) throw ratingsError;

  const values = (ratings || []).map((row) => row.rating).filter(Number.isInteger);
  const average = values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)) : null;
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  values.forEach((value) => { distribution[value] += 1; });

  return {
    claimed: claimed || 0,
    resolved: resolved || 0,
    ratings: values.length,
    average,
    distribution,
    recentRatings: ratings || []
  };
}

module.exports = {
  getTicketRating,
  requestTicketRating,
  submitTicketRating,
  getStaffTicketHistory
};
