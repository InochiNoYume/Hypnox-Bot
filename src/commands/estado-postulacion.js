const { SlashCommandBuilder } = require('discord.js');
const { getGuildType } = require('../utils/guild');
const { isAdminOrHigher, getConfiguredChannel, accessDenied, missingChannel, base } = require('../utils/postulacionesPanels');

const data = new SlashCommandBuilder()
  .setName('estado-postulacion')
  .setDescription('Publica el estado actual de la convocatoria.')
  .addStringOption((option) => option
    .setName('estado')
    .setDescription('Estado actual de la convocatoria.')
    .setRequired(true)
    .addChoices(
      { name: 'Abierta', value: 'ABIERTA' },
      { name: 'Cerrada', value: 'CERRADA' },
      { name: 'En revisión', value: 'EN REVISIÓN' },
      { name: 'Resultados publicados', value: 'RESULTADOS PUBLICADOS' }
    ))
  .addStringOption((option) => option
    .setName('detalle')
    .setDescription('Información adicional opcional.')
    .setRequired(false));

async function execute(interaction) {
  if (getGuildType(interaction.guildId) !== 'applications') return interaction.reply({ content: 'Este comando solo está disponible en el Discord Staff Applications.', ephemeral: true });
  if (!isAdminOrHigher(interaction.member)) return interaction.reply({ content: accessDenied(), ephemeral: true });
  const { channel, envKey } = await getConfiguredChannel(interaction, 'estado');
  if (!channel) return interaction.reply({ content: missingChannel(envKey || 'APPLICATIONS_CHANNEL_STATUS_ID'), ephemeral: true });

  const status = interaction.options.getString('estado', true);
  const detail = interaction.options.getString('detalle');
  const embed = base('ESTADO DE POSTULACIÓN', `Estado actual de la convocatoria: **${status}**.`);
  embed.addFields({ name: '◆ ESTADO ACTUAL', value: status, inline: false });
  if (detail) embed.addFields({ name: '◆ INFORMACIÓN', value: detail, inline: false });
  embed.addFields({ name: '◆ FUENTE OFICIAL', value: 'Este mensaje corresponde al estado publicado oficialmente por Hypnox Studios. Revisa este canal para futuras actualizaciones.', inline: false });
  embed.setFooter({ text: 'Hypnox Studios • Estado de Postulación' });
  await channel.send({ embeds: [embed] });
  return interaction.reply({ content: `Estado publicado en <#${channel.id}>.`, ephemeral: true });
}

module.exports = { data, execute, guilds: ['applications'] };
