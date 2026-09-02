const supabase = require('../database/supabase');

async function ensureGuild(discordGuild) {
  const payload = { discord_guild_id: discordGuild.id, guild_type: discordGuild.id, name: discordGuild.name, enabled: true };
  const { data, error } = await supabase.from('guilds').upsert(payload, { onConflict: 'discord_guild_id' }).select().single();
  if (error) throw error;
  return data;
}
async function getGuildRow(discordGuildId) {
  const { data, error } = await supabase.from('guilds').select('*').eq('discord_guild_id', discordGuildId).maybeSingle();
  if (error) throw error; return data;
}
module.exports = { ensureGuild, getGuildRow };
