const supabase = require('../database/supabase');

async function getUserByDiscordId(discordUserId) {
  const { data, error } = await supabase
    .from('users')
    .select('id, discord_user_id, username, display_name, first_seen_at, last_seen_at, created_at')
    .eq('discord_user_id', discordUserId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function getAuditData({ guildId, discordUserId }) {
  const user = await getUserByDiscordId(discordUserId);
  if (!user) {
    return {
      user: null,
      warnings: [],
      moderationActions: [],
      logs: [],
      tickets: [],
      events: [],
      announcements: []
    };
  }

  const [warningsResult, moderationResult, logsResult, ticketsResult, eventsResult, announcementsResult] = await Promise.all([
    supabase
      .from('warnings')
      .select('id, reason, active, created_at, expires_at, moderator_discord_user_id')
      .eq('guild_id', guildId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('moderation_actions')
      .select('id, action_type, reason, duration_seconds, created_at, moderator_discord_user_id, metadata')
      .eq('guild_id', guildId)
      .eq('target_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('logs')
      .select('id, category, action, actor_discord_user_id, channel_id, message, metadata, created_at')
      .eq('guild_id', guildId)
      .eq('target_discord_user_id', discordUserId)
      .order('created_at', { ascending: false })
      .limit(15),
    supabase
      .from('tickets')
      .select('id, discord_channel_id, ticket_type, subtype, status, assigned_to_discord_user_id, closed_by_discord_user_id, created_at, closed_at')
      .eq('guild_id', guildId)
      .eq('creator_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('events')
      .select('id, title, status, starts_at, ends_at, created_at, updated_at')
      .eq('guild_id', guildId)
      .eq('created_by_discord_user_id', discordUserId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('announcements')
      .select('id, announcement_type, title, created_at, channel_id')
      .eq('guild_id', guildId)
      .eq('author_discord_user_id', discordUserId)
      .order('created_at', { ascending: false })
      .limit(10)
  ]);

  for (const result of [warningsResult, moderationResult, logsResult, ticketsResult, eventsResult, announcementsResult]) {
    if (result.error) throw result.error;
  }

  return {
    user,
    warnings: warningsResult.data || [],
    moderationActions: moderationResult.data || [],
    logs: logsResult.data || [],
    tickets: ticketsResult.data || [],
    events: eventsResult.data || [],
    announcements: announcementsResult.data || []
  };
}

module.exports = { getAuditData };
