const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getEnv } = require('../config/env');
const { writeLog } = require('../services/logs');
const { brandedEmbed } = require('../utils/embeds');

const EPHEMERAL = MessageFlags.Ephemeral;

const data = new SlashCommandBuilder()
  .setName('abierto')
  .setDescription('Abre oficialmente la postulación de Staff.')
  .addStringOption((option) => option
    .setName('link')
    .setDescription('Enlace del Discord de postulaciones.')
    .setRequired(true));

async function execute(interaction) {
  const channelId = getEnv('OFFICIAL_CHANNEL_APPLICATIONS_ID');
  const channel = channelId ? await interaction.guild.channels.fetch(channelId).catch(() => null) : null;
  if (!channel?.isTextBased()) return interaction.reply({ content: 'Configura OFFICIAL_CHANNEL_APPLICATIONS_ID antes de abrir la postulación.', flags: EPHEMERAL });

  const link = interaction.options.getString('link').trim();
  const image = getEnv('OFFICIAL_IMAGE_ANNOUNCEMENT') || getEnv('OFFICIAL_IMAGE_BANNER');
  const embed = brandedEmbed('POSTULACIONES ABIERTAS', 'El proceso de incorporación de Staff de Hypnox Studios se encuentra oficialmente abierto.\n\nSi deseas participar, accede al servidor de postulaciones mediante el enlace indicado a continuación.', { image });
  embed.addFields({ name: 'SERVIDOR DE POSTULACIONES', value: link, inline: false });
  embed.setFooter({ text: 'Hypnox Studios • Postulaciones de Staff' });

  await channel.send({ embeds: [embed] });
  await writeLog({ guild: interaction.guild, category: 'application', action: 'opened', actorId: interaction.user.id, channelId: channel.id, message: link });
  return interaction.reply({ content: `Postulación abierta en <#${channel.id}>.`, flags: EPHEMERAL });
}

module.exports = { data, execute, guilds: ['official'], access: { roleEnvs: ['OFFICIAL_ROLE_FOUNDER_ID', 'OFFICIAL_ROLE_DIRECTOR_ID', 'OFFICIAL_ROLE_ADMINISTRATOR_ID'] } };
