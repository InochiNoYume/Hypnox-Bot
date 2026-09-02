const supabase = require('../database/supabase');
const { getGuildRow } = require('./guilds');
const { ensureUser } = require('./moderation');

const TICKET_TYPE_DB = {
  soporte: 'support',
  reporte: 'report',
  alianza: 'alliance_partner',
  contacto: 'contact'
};

function normalizeTicketType(type) {
  const normalized = TICKET_TYPE_DB[type] || type;
  if (!['support', 'report', 'alliance_partner', 'contact'].includes(normalized)) {
    throw new Error('Tipo de ticket no válido');
  }
  return normalized;
}

async function createTicket({ guildId, channelId, creator, type, subtype = null }) {
  const guild = await getGuildRow(guildId);
  if (!guild) throw new Error('Guild no registrada');
  const user = await ensureUser(creator);
  const ticketType = normalizeTicketType(type);
  const { data, error } = await supabase
    .from('tickets')
    .insert({
      guild_id: guild.id,
      discord_channel_id: channelId,
      creator_user_id: user.id,
      ticket_type: ticketType,
      subtype,
      status: 'open'
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function getTicket(channelId) {
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('discord_channel_id', channelId)
    .eq('status', 'open')
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getTicketCreatorDiscordId(ticket) {
  if (!ticket?.creator_user_id) return null;
  const { data, error } = await supabase
    .from('users')
    .select('discord_user_id')
    .eq('id', ticket.creator_user_id)
    .maybeSingle();
  if (error) throw error;
  return data?.discord_user_id || null;
}

async function updateTicket(id, patch) {
  const { data, error } = await supabase.from('tickets').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

async function addTicketEvent(ticketId, actorId, eventType, content = null, metadata = {}) {
  const { error } = await supabase.from('ticket_events').insert({
    ticket_id: ticketId,
    actor_discord_user_id: actorId,
    event_type: eventType,
    content,
    metadata
  });
  if (error) throw error;
}

module.exports = { createTicket, getTicket, getTicketCreatorDiscordId, updateTicket, addTicketEvent };
