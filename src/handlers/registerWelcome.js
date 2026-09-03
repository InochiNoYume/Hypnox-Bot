const { buildWelcomeEmbed } = require('../services/welcome');
const { getEnv } = require('../config/env');
const { getGuildType } = require('../utils/guild');

function registerWelcome(client) {
  client.on('guildMemberAdd', async (member) => {
    const guildType = getGuildType(member.guild.id);
    if (guildType !== 'staff' && guildType !== 'applications') return;

    const channelId = guildType === 'staff'
      ? getEnv('STAFF_CHANNEL_WELCOME_ID')
      : getEnv('APPLICATIONS_CHANNEL_WELCOME_ID');
    if (!channelId) return;

    const channel = await member.guild.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased()) return;

    try {
      await channel.send({ embeds: [buildWelcomeEmbed(member, guildType)] });
    } catch (error) {
      console.error(`[HYPNOX] No se pudo enviar bienvenida en ${member.guild.name}:`, error.message);
    }
  });
}

module.exports = { registerWelcome };
