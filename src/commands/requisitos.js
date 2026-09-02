const { SlashCommandBuilder } = require('discord.js');
const { getGuildType } = require('../utils/guild');
const { isAdminOrHigher, getConfiguredChannel, accessDenied, missingChannel, base } = require('../utils/postulacionesPanels');

const data = new SlashCommandBuilder()
  .setName('requisitos')
  .setDescription('Publica los requisitos para postular al Staff.');

async function execute(interaction) {
  if (getGuildType(interaction.guildId) !== 'applications') return interaction.reply({ content: 'Este comando solo está disponible en el Discord Staff Applications.', ephemeral: true });
  if (!isAdminOrHigher(interaction.member)) return interaction.reply({ content: accessDenied(), ephemeral: true });
  const { channel, envKey } = await getConfiguredChannel(interaction, 'requisitos');
  if (!channel) return interaction.reply({ content: missingChannel(envKey || 'APPLICATIONS_CHANNEL_REQUIREMENTS_ID'), ephemeral: true });

  const embed = base('REQUISITOS DE POSTULACIÓN', 'Antes de postular a Hypnox Studios, asegúrate de cumplir con los siguientes requisitos.');
  embed.addFields(
    { name: '◆ COMPROMISO', value: 'Contar con disponibilidad y disposición para colaborar de forma responsable dentro del equipo.', inline: false },
    { name: '◆ MADUREZ Y RESPETO', value: 'Mantener una conducta respetuosa, profesional y adecuada para trabajar en equipo.', inline: false },
    { name: '◆ EXPERIENCIA', value: 'La experiencia previa puede ser valorada según el cargo, pero no es requisito absoluto para todas las áreas.', inline: false },
    { name: '◆ TRABAJO EN EQUIPO', value: 'Saber recibir indicaciones, comunicar problemas y colaborar con los demás integrantes.', inline: false },
    { name: '◆ ACTIVIDAD', value: 'Mantener una participación razonable y cumplir las responsabilidades asumidas al ingresar.', inline: false },
    { name: '◆ INFORMACIÓN REAL', value: 'La información entregada durante la postulación debe ser clara, coherente y honesta.', inline: false }
  );
  embed.setFooter({ text: 'Hypnox Studios • Requisitos de Staff' });
  await channel.send({ embeds: [embed] });
  return interaction.reply({ content: `Requisitos publicados en <#${channel.id}>.`, ephemeral: true });
}

module.exports = { data, execute, guilds: ['applications'] };
