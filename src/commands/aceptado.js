const { SlashCommandBuilder } = require('discord.js');
const { getEnv } = require('../config/env');
const { writeLog } = require('../services/logs');

const data = new SlashCommandBuilder()
  .setName('aceptado')
  .setDescription('Publica los usuarios aceptados como Staff.')
  .addUserOption((option) => option.setName('usuario1').setDescription('Primer usuario aceptado').setRequired(true))
  .addUserOption((option) => option.setName('usuario2').setDescription('Segundo usuario aceptado').setRequired(false))
  .addUserOption((option) => option.setName('usuario3').setDescription('Tercer usuario aceptado').setRequired(false))
  .addUserOption((option) => option.setName('usuario4').setDescription('Cuarto usuario aceptado').setRequired(false))
  .addUserOption((option) => option.setName('usuario5').setDescription('Quinto usuario aceptado').setRequired(false))
  .addUserOption((option) => option.setName('usuario6').setDescription('Sexto usuario aceptado').setRequired(false))
  .addUserOption((option) => option.setName('usuario7').setDescription('Séptimo usuario aceptado').setRequired(false))
  .addUserOption((option) => option.setName('usuario8').setDescription('Octavo usuario aceptado').setRequired(false))
  .addUserOption((option) => option.setName('usuario9').setDescription('Noveno usuario aceptado').setRequired(false))
  .addUserOption((option) => option.setName('usuario10').setDescription('Décimo usuario aceptado').setRequired(false));

async function execute(interaction) {
  const channelId = getEnv('OFFICIAL_CHANNEL_APPLICATIONS_ID');
  const channel = channelId ? await interaction.guild.channels.fetch(channelId).catch(() => null) : null;
  if (!channel?.isTextBased()) return interaction.reply({ content: 'Configura OFFICIAL_CHANNEL_APPLICATIONS_ID antes de publicar resultados.', ephemeral: true });

  const users = Array.from({ length: 10 }, (_, index) => interaction.options.getUser(`usuario${index + 1}`)).filter(Boolean);
  const mentions = users.map((user) => `<@${user.id}>`).join(', ');

  await channel.send({ embeds: [{ color: 0, title: 'HYPNOX STUDIOS — RESULTADOS DE POSTULACIÓN', description: `Los siguientes usuarios han sido aceptados para formar parte del Staff:\n\n${mentions}`, timestamp: new Date().toISOString() }] });
  await writeLog({ guild: interaction.guild, category: 'application', action: 'accepted', actorId: interaction.user.id, channelId: channel.id, message: users.map((user) => user.id).join(',') });
  return interaction.reply({ content: `Resultado publicado en <#${channel.id}>.`, ephemeral: true });
}

module.exports = { data, execute, guilds: ['official'], access: { roleEnvs: ['OFFICIAL_ROLE_FOUNDER_ID', 'OFFICIAL_ROLE_DIRECTOR_ID', 'OFFICIAL_ROLE_ADMINISTRATOR_ID', 'OFFICIAL_ROLE_SRMOD_ID'] } };
