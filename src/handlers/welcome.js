const { buildWelcomeEmbed } = require('../services/welcome');

function registerWelcome(client, config) {
  client.on('guildMemberAdd', async (member) => {
    const type = config[member.guild.id];
    if (!type) return;

    const channelId = type === 'staff'
      ? process.env.STAFF_CHANNEL_WELCOME_ID
      : process.env.APPLICATIONS_CHANNEL_WELCOME_ID;
    if (!channelId) return;

    const channel = member.guild.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) return;

    try {
      await channel.send({ embeds: [buildWelcomeEmbed(member, type)] });
    } catch (error) {
      console.error(`[HYPNOX] No se pudo enviar bienvenida en ${member.guild.name}:`, error.message);
    }
  });
}

module.exports = { registerWelcome };
