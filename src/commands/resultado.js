const { SlashCommandBuilder } = require('discord.js');
const { getGuildType } = require('../utils/guild');
const { isAdminOrHigher, getConfiguredChannel, accessDenied, missingChannel, base } = require('../utils/postulacionesPanels');

const data = new SlashCommandBuilder()
  .setName('resultado')
  .setDescription('Publica el resultado de una convocatoria de Staff.')
  .addStringOption((option) => option
    .setName('resultado')
    .setDescription('Resultado o usuarios seleccionados para la convocatoria.')
    .setRequired(true));

async function execute(interaction) {
  if (getGuildType(interaction.guildId) !== 'applications') return interaction.reply({ content: 'Este comando solo está disponible en el Discord Staff Applications.', ephemeral: true });
  if (!isAdminOrHigher(interaction.member)) return interaction.reply({ content: accessDenied(), ephemeral: true });
  const { channel, envKey } = await getConfiguredChannel(interaction, 'resultado');
  if (!channel) return interaction.reply({ content: missingChannel(envKey || 'APPLICATIONS_CHANNEL_RESULTS_ID'), ephemeral: true });

  const result = interaction.options.getString('resultado', true);
  const embed = base('RESULTADO DE POSTULACIONES', 'La revisión de la convocatoria ha finalizado. A continuación se comunica el resultado correspondiente.');
  embed.addFields(
    { name: '◆ RESULTADO', value: result, inline: false },
    { name: '◆ SIGUIENTE PASO', value: 'Las personas seleccionadas recibirán las indicaciones correspondientes por los medios oficiales de Hypnox Studios.', inline: false },
    { name: '◆ AGRADECIMIENTO', value: 'Agradecemos a todas las personas que participaron y dedicaron su tiempo al proceso.', inline: false }
  );
  embed.setFooter({ text: 'Hypnox Studios • Resultados de Staff' });
  await channel.send({ embeds: [embed] });
  return interaction.reply({ content: `Resultado publicado en <#${channel.id}>.`, ephemeral: true });
}

module.exports = { data, execute, guilds: ['applications'] };
