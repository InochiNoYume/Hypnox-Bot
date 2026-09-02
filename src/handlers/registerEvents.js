const { getGuildType } = require('../utils/guild');

function registerEvents(client) {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    const guildType = interaction.guildId ? getGuildType(interaction.guildId) : null;
    const allowedGuilds = command.guilds || ['official', 'staff', 'applications'];
    if (!guildType || !allowedGuilds.includes(guildType)) {
      return interaction.reply({ content: 'Este comando no está disponible en este servidor.', ephemeral: true });
    }

    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error(`[HYPNOX] Error en /${interaction.commandName}:`, error);
      const payload = { content: 'Ocurrió un error al ejecutar este comando.', ephemeral: true };
      if (interaction.replied || interaction.deferred) await interaction.followUp(payload).catch(() => {});
      else await interaction.reply(payload).catch(() => {});
    }
  });
}

module.exports = registerEvents;
