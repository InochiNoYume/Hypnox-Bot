const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getGuildType } = require('../utils/guild');
const { isAdminOrHigher, getConfiguredChannel, accessDenied, missingChannel, base } = require('../utils/postulacionesPanels');

const EPHEMERAL = MessageFlags.Ephemeral;

const data = new SlashCommandBuilder()
  .setName('informacion')
  .setDescription('Publica la información general del proceso de Staff.');

async function execute(interaction) {
  if (getGuildType(interaction.guildId) !== 'applications') return interaction.reply({ content: 'Este comando solo está disponible en el Discord Staff Applications.', flags: EPHEMERAL });
  if (!isAdminOrHigher(interaction.member)) return interaction.reply({ content: accessDenied(), flags: EPHEMERAL });
  const { channel, envKey } = await getConfiguredChannel(interaction, 'informacion');
  if (!channel) return interaction.reply({ content: missingChannel(envKey || 'APPLICATIONS_CHANNEL_INFORMATION_ID'), flags: EPHEMERAL });

  const embed = base('INFORMACIÓN DE POSTULACIONES', 'Información general sobre el proceso de incorporación al Staff de Hypnox Studios.');
  embed.addFields(
    { name: '◆ PROCESO', value: 'Las postulaciones se gestionan desde este servidor cuando la convocatoria se encuentra abierta. Revisa siempre los canales oficiales antes de enviar tu postulación.', inline: false },
    { name: '◆ ÁREAS', value: 'Las incorporaciones pueden estar orientadas a distintas funciones de Staff y departamentos según las necesidades actuales de Hypnox Studios.', inline: false },
    { name: '◆ EVALUACIÓN', value: 'Cada postulación será revisada por el equipo responsable. Cumplir los requisitos no garantiza la aceptación.', inline: false },
    { name: '◆ COMUNICACIÓN', value: 'Toda información importante sobre el estado de la convocatoria y sus resultados será publicada mediante los canales oficiales.', inline: false },
    { name: '◆ IMPORTANTE', value: 'No envíes información personal sensible. Utiliza únicamente los medios y enlaces indicados por Hypnox Studios.', inline: false }
  );
  embed.setFooter({ text: 'Hypnox Studios • Información de Postulaciones' });
  await channel.send({ embeds: [embed] });
  return interaction.reply({ content: `Información publicada en <#${channel.id}>.`, flags: EPHEMERAL });
}

module.exports = { data, execute, guilds: ['applications'] };
