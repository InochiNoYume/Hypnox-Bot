const supabase = require('../database/supabase');
const { getGuildType, getGuildLogsChannelId } = require('../utils/guild');
const { brandedEmbed } = require('../utils/embeds');

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
      const embed = brandedEmbed('REGISTRO DEL SISTEMA', 'Actividad registrada por Hypnox Bot.', {
        footerText: 'Hypnox Studios • Registro interno',
        fields: [
          { name: '◆ CATEGORÍA', value: String(category), inline: true },
          { name: '◆ ACCIÓN', value: String(action), inline: true },
          { name: '◆ RESPONSABLE', value: `<@${actorId}>`, inline: true }
        ]
      });

      if (targetId) embed.addFields({ name: '◆ OBJETIVO', value: `<@${targetId}>`, inline: true });
      if (channelId) embed.addFields({ name: '◆ CANAL', value: `<#${channelId}>`, inline: true });
      if (message) embed.addFields({ name: '◆ DETALLE', value: String(message).slice(0, 1024), inline: false });
      await channel.send({ embeds: [embed] }).catch(() => null);
    }
  }

  return data;
}

module.exports = { writeLog };
