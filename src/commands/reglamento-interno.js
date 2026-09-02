const { SlashCommandBuilder } = require('discord.js');
const { getGuildType } = require('../utils/guild');
const { isAdminOrHigher, getConfiguredChannel, accessDenied, missingChannel, base } = require('../utils/postulacionesPanels');

const data = new SlashCommandBuilder()
  .setName('reglamento-interno')
  .setDescription('Publica el Reglamento Interno en el servidor Staff.');

async function execute(interaction) {
  if (getGuildType(interaction.guildId) !== 'staff') return interaction.reply({ content: 'Este comando solo está disponible en el Discord Staff Team.', ephemeral: true });
  if (!isAdminOrHigher(interaction.member)) return interaction.reply({ content: accessDenied(), ephemeral: true });

  const { channel, envKey } = await getConfiguredChannel(interaction, 'reglamento');
  if (!channel) return interaction.reply({ content: missingChannel(envKey || 'STAFF_CHANNEL_INTERNAL_RULES_ID'), ephemeral: true });

  const embed = base('REGLAMENTO INTERNO', 'Normativa interna de Hypnox Studios para el funcionamiento del equipo Staff.');
  embed.addFields(
    { name: '◆ CONDUCTA', value: 'Mantén una actitud profesional, respetuosa y responsable con todo el equipo. Las diferencias internas deben resolverse por los canales correspondientes.', inline: false },
    { name: '◆ RESPONSABILIDAD', value: 'Cada miembro debe cumplir las funciones de su puesto, respetar las indicaciones de sus superiores y comunicar cualquier inconveniente que afecte su trabajo.', inline: false },
    { name: '◆ CONFIDENCIALIDAD', value: 'La información interna, documentos, conversaciones, proyectos y decisiones de Staff no deben compartirse fuera de los espacios autorizados.', inline: false },
    { name: '◆ ACTIVIDAD', value: 'Se espera participación y compromiso acorde al cargo. Si no puedes cumplir tus funciones durante un periodo, informa previamente a la Dirección.', inline: false },
    { name: '◆ PROYECTOS', value: 'Los proyectos deben seguir la planificación establecida y mantenerse coordinados con el responsable correspondiente. No se deben realizar cambios relevantes sin autorización cuando afecten al proyecto.', inline: false },
    { name: '◆ MODERACIÓN', value: 'Las acciones de moderación deben ser proporcionales, justificadas y registradas cuando corresponda. No se permite utilizar los permisos para beneficio personal.', inline: false },
    { name: '◆ INCUMPLIMIENTOS', value: 'El incumplimiento del reglamento puede derivar en advertencias, suspensión de funciones o retiro del Staff, según la gravedad y las circunstancias.', inline: false }
  );
  embed.setFooter({ text: 'Hypnox Studios • Reglamento Interno Staff' });

  await channel.send({ embeds: [embed] });
  return interaction.reply({ content: `Reglamento Interno publicado en <#${channel.id}>.`, ephemeral: true });
}

module.exports = { data, execute, guilds: ['staff'] };
