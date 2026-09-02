const supabase = require('../database/supabase');

async function ensureUser(discordUser) {
  const payload = { discord_user_id: discordUser.id, username: discordUser.username, display_name: discordUser.globalName || discordUser.username, last_seen_at: new Date().toISOString() };
  const { data, error } = await supabase.from('users').upsert(payload, { onConflict: 'discord_user_id' }).select('id, discord_user_id').single();
  if (error) throw error;
  return data;
}

async function createWarning({ guildId, target, moderator, reason }) {
  const user = await ensureUser(target);
  const { data, error } = await supabase.from('warnings').insert({ guild_id: guildId, user_id: user.id, moderator_discord_user_id: moderator.id, reason: reason || 'Sin razón especificada', active: true }).select().single();
  if (error) throw error;
  return data;
}

async function getWarnings(guildId, target) {
  const user = await ensureUser(target);
  const { data, error } = await supabase.from('warnings').select('*').eq('guild_id', guildId).eq('user_id', user.id).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function createModerationAction({ guildId, target, moderator, actionType, reason, durationSeconds = null, metadata = {} }) {
  const user = await ensureUser(target);
  const { data, error } = await supabase.from('moderation_actions').insert({ guild_id: guildId, target_user_id: user.id, moderator_discord_user_id: moderator.id, action_type: actionType, reason: reason || 'Sin razón especificada', duration_seconds: durationSeconds, metadata }).select().single();
  if (error) throw error;
  return data;
}

async function deactivateWarning({ guildId, warningId }) {
  const { data, error } = await supabase.from('warnings').update({ active: false }).eq('guild_id', guildId).eq('id', warningId).select().single();
  if (error) throw error;
  return data;
}

module.exports = { ensureUser, createWarning, getWarnings, createModerationAction, deactivateWarning };
