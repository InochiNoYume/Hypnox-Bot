const { buildWelcomeEmbed } = require('../services/welcome');

function registerWelcome(client) {
  client.on('guildMemberAdd', async (member) => {
    const guildId = member.guild.id;
    const isStaff = guildId === process.env.STAFF_GUILD_ID;
    const isApplications = guildId === process.env.APPLICATIONS_GUILD_ID;
    if (!isStaff && !isApplications) return;

    const channelId = isStaff
      ? process.env.STAFF_CHANNEL_WELCOME_ID
      : process.env.APPLICATIONS_CHANNEL_WELCOME_ID;
    if (!channelId) return;

    const channel = member.guild.channels.cache.get(channelId);
    if (!channel?.isTextBased()) return;

    try {
      await channel.send({ embeds: [buildWelcomeEmbed(member, isStaff ? 'staff' : 'applications')] });
    } catch (error) {
      console.error(`[HYPNOX] No se pudo enviar bienvenida en ${member.guild.name}:`, error.message);
    }
  });
}

module.exports = { registerWelcome };
