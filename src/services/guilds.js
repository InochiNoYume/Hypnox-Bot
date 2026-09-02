const supabase = require('../database/supabase');
const { getGuildType } = require('../utils/guild');

async function ensureGuild(discordGuild) {
  const guildType = getGuildType(discordGuild.id);
  if (!guildType) throw new Error(`Servidor no configurado en el bot: ${discordGuild.id}`);

  const payload = {
    discord_guild_id: discordGuild.id,
    guild_type: guildType,
    name: discordGuild.name,
    enabled: true
  };

  const { data, error } = await supabase
    .from('guilds')
    .upsert(payload, { onConflict: 'discord_guild_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getGuildRow(discordGuildId) {
  const { data, error } = await supabase
    .from('guilds')
    .select('*')
    .eq('discord_guild_id', discordGuildId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

module.exports = { ensureGuild, getGuildRow };
