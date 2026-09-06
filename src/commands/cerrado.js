const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getEnv } = require('../config/env');
const { writeLog } = require('../services/logs');
const { brandedEmbed } = require('../utils/embeds');

const EPHEMERAL = MessageFlags.Ephemeral;

const data = new SlashCommandBuilder()
  .setName('cerrado')
  .setDescription('Cierra oficialmente la postulación de Staff.');

async function execute(interaction) {
  await interaction.deferReply({ flags: EPHEMERAL });

  try {
    const channelId = getEnv('OFFICIAL_CHANNEL_APPLICATIONS_ID');
    const channel = channelId ? await interaction.guild.channels.fetch(channelId).catch(() => null) : null;
    if (!channel?.isTextBased()) return interaction.editReply({ content: 'Configura OFFICIAL_CHANNEL_APPLICATIONS_ID antes de cerrar la postulación.' });

    const image = getEnv('OFFICIAL_IMAGE_ANNOUNCEMENT') || getEnv('OFFICIAL_IMAGE_BANNER');
    const embed = brandedEmbed('POSTULACIONES CERRADAS', 'El proceso de incorporación de Staff de Hypnox Studios se encuentra oficialmente cerrado.\n\nAgradecemos a todas las personas que participaron y dedicaron su tiempo al proceso.', { image });
    embed.setFooter({ text: 'Hypnox Studios • Postulaciones de Staff' });

    await channel.send({ embeds: [embed] });
    await writeLog({ guild: interaction.guild, category: 'application', action: 'closed', actorId: interaction.user.id, channelId: channel.id });
    return interaction.editReply({ content: `Postulación cerrada en <#${channel.id}>.` });
  } catch (error) {
    console.error('[HYPNOX] Cerrado error:', error);
    return interaction.editReply({ content: 'No se pudo cerrar la postulación. El error fue registrado para revisión.' }).catch(() => {});
  }
}

module.exports = { data, execute, guilds: ['official'], access: { roleEnvs: ['OFFICIAL_ROLE_FOUNDER_ID', 'OFFICIAL_ROLE_DIRECTOR_ID', 'OFFICIAL_ROLE_ADMINISTRATOR_ID'] } };
