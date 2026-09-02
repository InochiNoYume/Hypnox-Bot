const { SlashCommandBuilder } = require('discord.js');
const { hasConfiguredRole } = require('../utils/permissions');

const MANAGEMENT_ROLES = [
  'OFFICIAL_ROLE_FOUNDER_ID', 'OFFICIAL_ROLE_DIRECTOR_ID', 'OFFICIAL_ROLE_ADMINISTRATOR_ID',
  'STAFF_ROLE_FOUNDER_ID', 'STAFF_ROLE_DIRECTOR_ID', 'STAFF_ROLE_ADMINISTRATOR_ID',
  'APPLICATIONS_ROLE_FOUNDER_ID', 'APPLICATIONS_ROLE_DIRECTOR_ID', 'APPLICATIONS_ROLE_ADMINISTRATOR_ID'
];

const data = new SlashCommandBuilder()
  .setName('say')
  .setDescription('Publica un mensaje como Hypnox Bot.')
  .addStringOption((option) => option
    .setName('mensaje')
    .setDescription('Contenido que se publicará en el canal actual.')
    .setRequired(true));

async function execute(interaction) {
  const message = interaction.options.getString('mensaje', true).trim();
  if (!message) return interaction.reply({ content: 'Debes indicar un mensaje.', ephemeral: true });

  await interaction.channel.send({ content: message, allowedMentions: { parse: [] } });

  if (interaction.isChatInputCommand?.()) {
    await interaction.reply({ content: 'Mensaje publicado.', ephemeral: true });
    setTimeout(() => interaction.deleteReply().catch(() => {}), 1200);
  }
}

module.exports = {
  data,
  execute,
  guilds: ['official', 'staff', 'applications'],
  access: { roleEnvs: MANAGEMENT_ROLES }
};
