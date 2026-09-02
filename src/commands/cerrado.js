const { SlashCommandBuilder } = require('discord.js');
const { getEnv } = require('../config/env');
const { writeLog } = require('../services/logs');
const { brandedEmbed } = require('../utils/embeds');

const data = new SlashCommandBuilder()
  .setName('cerrado')
  .setDescription('Cierra oficialmente la postulación de Staff.');

async function execute(interaction) {
  const channelId = getEnv('OFFICIAL_CHANNEL_APPLICATIONS_ID');
  const channel = channelId ? await interaction.guild.channels.fetch(channelId).catch(() => null) : null;
  if (!channel?.isTextBased()) return interaction.reply({ content: 'Configura OFFICIAL_CHANNEL_APPLICATIONS_ID antes de cerrar la postulación.', ephemeral: true });

  const embed = brandedEmbed('POSTULACIONES CERRADAS', 'El proceso de incorporación de Staff de Hypnox Studios se encuentra oficialmente cerrado.\n\nAgradecemos a todas las personas que participaron y dedicaron su tiempo al proceso.');
  embed.setFooter({ text: 'Hypnox Studios • Postulaciones de Staff' });

  await channel.send({ embeds: [embed] });
  await writeLog({ guild: interaction.guild, category: 'application', action: 'closed', actorId: interaction.user.id, channelId: channel.id });
  return interaction.reply({ content: `Postulación cerrada en <#${channel.id}>.`, ephemeral: true });
}

module.exports = { data, execute, guilds: ['official'], access: { roleEnvs: ['OFFICIAL_ROLE_FOUNDER_ID', 'OFFICIAL_ROLE_DIRECTOR_ID', 'OFFICIAL_ROLE_ADMINISTRATOR_ID', 'OFFICIAL_ROLE_SRMOD_ID'] } };
