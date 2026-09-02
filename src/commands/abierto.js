const { SlashCommandBuilder } = require('discord.js');
const { getEnv } = require('../config/env');
const { getGuildRow } = require('../services/guilds');
const { writeLog } = require('../services/logs');

const data = new SlashCommandBuilder()
  .setName('abierto')
  .setDescription('Abre oficialmente la postulación de Staff.');

async function execute(interaction) {
  const channelId = getEnv('OFFICIAL_CHANNEL_APPLICATIONS_ID');
  const channel = channelId ? await interaction.guild.channels.fetch(channelId).catch(() => null) : null;
  if (!channel?.isTextBased()) return interaction.reply({ content: 'Configura OFFICIAL_CHANNEL_APPLICATIONS_ID antes de abrir la postulación.', ephemeral: true });

  const link = getEnv('APPLICATIONS_DISCORD_URL');
  const description = link
    ? `Las postulaciones para formar parte del Staff de Hypnox Studios se encuentran oficialmente abiertas.\n\nPostulación: ${link}`
    : 'Las postulaciones para formar parte del Staff de Hypnox Studios se encuentran oficialmente abiertas.\n\nEl enlace del servidor de postulaciones aún no está configurado.';

  await channel.send({ embeds: [{ color: 0, title: 'HYPNOX STUDIOS — POSTULACIONES ABIERTAS', description, timestamp: new Date().toISOString() }] });
  await writeLog({ guild: interaction.guild, category: 'application', action: 'opened', actorId: interaction.user.id, channelId: channel.id });
  return interaction.reply({ content: `Postulación abierta en <#${channel.id}>.`, ephemeral: true });
}

module.exports = { data, execute, guilds: ['official'], access: { roleEnvs: ['OFFICIAL_ROLE_FOUNDER_ID', 'OFFICIAL_ROLE_DIRECTOR_ID', 'OFFICIAL_ROLE_ADMINISTRATOR_ID', 'OFFICIAL_ROLE_SRMOD_ID'] } };
