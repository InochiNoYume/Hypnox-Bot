const supabase = require('../database/supabase');
const { EmbedBuilder } = require('discord.js');
const { getGuildType, getGuildLogsChannelId } = require('../utils/guild');

async function writeLog({ guild, category, action, actorId, targetId = null, channelId = null, message = null, metadata = {} }) {
  const guildType = getGuildType(guild.id);
  if (!guildType) return null;

  const { data: guildRow } = await supabase
    .from('guilds')
    .select('id')
    .eq('discord_guild_id', guild.id)
    .maybeSingle();

  if (!guildRow) return null;

  const { data, error } = await supabase
    .from('logs')
    .insert({
      guild_id: guildRow.id,
      category,
      action,
      actor_discord_user_id: actorId,
      target_discord_user_id: targetId,
      channel_id: channelId,
      message,
      metadata
    })
    .select()
    .single();

  if (error) throw error;

  const logsChannelId = getGuildLogsChannelId(guildType);
  if (logsChannelId) {
    const channel = await guild.channels.fetch(logsChannelId).catch(() => null);
    if (channel?.isTextBased()) {
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle('HYPNOX STUDIOS — LOG')
        .addFields(
          { name: 'Categoría', value: category, inline: true },
          { name: 'Acción', value: action, inline: true },
          { name: 'Responsable', value: `<@${actorId}>`, inline: true }
        )
        .setTimestamp();

      if (targetId) embed.addFields({ name: 'Objetivo', value: `<@${targetId}>`, inline: true });
      if (message) embed.addFields({ name: 'Detalle', value: message.slice(0, 1024), inline: false });
      await channel.send({ embeds: [embed] }).catch(() => null);
    }
  }

  return data;
}

module.exports = { writeLog };
