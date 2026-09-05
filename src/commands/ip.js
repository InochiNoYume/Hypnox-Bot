const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getGuildIp, setGuildIp, clearGuildIp } = require('../services/guilds');
const { hasConfiguredRole } = require('../utils/permissions');

const MANAGEMENT_ROLES = [
  'OFFICIAL_ROLE_FOUNDER_ID',
  'OFFICIAL_ROLE_DIRECTOR_ID',
  'OFFICIAL_ROLE_ADMINISTRATOR_ID',
  'STAFF_ROLE_FOUNDER_ID',
  'STAFF_ROLE_DIRECTOR_ID',
  'STAFF_ROLE_ADMINISTRATIVE_ASSISTANT_ID',
  'APPLICATIONS_ROLE_FOUNDER_ID',
  'APPLICATIONS_ROLE_DIRECTOR_ID',
  'APPLICATIONS_ROLE_ADMINISTRATOR_ID'
];

const EMBED_COLOR = 0x2B2D31;

const data = new SlashCommandBuilder()
  .setName('ip')
  .setDescription('Muestra la dirección del servidor.')
  .addSubcommand((subcommand) => subcommand
    .setName('ver')
    .setDescription('Muestra la IP configurada actualmente.'))
  .addSubcommand((subcommand) => subcommand
    .setName('establecer')
    .setDescription('Configura o reemplaza la IP del servidor.')
    .addStringOption((option) => option
      .setName('ip')
      .setDescription('IP, dominio o dirección de conexión del servidor.')
      .setMinLength(1)
      .setMaxLength(255)
      .setRequired(true)))
  .addSubcommand((subcommand) => subcommand
    .setName('eliminar')
    .setDescription('Elimina la IP configurada.'));

function createIpEmbed(ip, guild) {
  return new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setTitle('INFORMACIÓN DEL SERVIDOR')
    .setDescription('Utiliza la siguiente dirección para conectarte al servidor.')
    .addFields({
      name: 'Dirección de conexión',
      value: `\`\`\`\n${ip}\n\`\`\``
    })
    .setFooter({ text: `${guild.name} • Información oficial` })
    .setTimestamp();
}

async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const isManagement = MANAGEMENT_ROLES.some((roleEnv) => hasConfiguredRole(interaction.member, roleEnv));

  try {
    if (subcommand === 'ver') {
      const ip = await getGuildIp(interaction.guild.id);
      if (!ip) {
        return interaction.reply({
          content: 'La dirección del servidor todavía no ha sido configurada.',
          flags: MessageFlags.Ephemeral
        });
      }

      return interaction.reply({ embeds: [createIpEmbed(ip, interaction.guild)] });
    }

    if (!isManagement) {
      return interaction.reply({
        content: 'No tienes permisos para configurar la dirección del servidor.',
        flags: MessageFlags.Ephemeral
      });
    }

    if (subcommand === 'eliminar') {
      await clearGuildIp(interaction.guild.id);
      return interaction.reply({
        content: 'La dirección del servidor fue eliminada correctamente.',
        flags: MessageFlags.Ephemeral
      });
    }

    const newIp = interaction.options.getString('ip', true).trim();
    const oldIp = await getGuildIp(interaction.guild.id);
    const updatedIp = await setGuildIp(interaction.guild.id, newIp);

    return interaction.reply({
      content: oldIp && oldIp !== updatedIp
        ? `La dirección del servidor fue actualizada. La dirección anterior \`${oldIp}\` fue reemplazada por \`${updatedIp}\`.`
        : `La dirección del servidor quedó configurada como \`${updatedIp}\`.`,
      flags: MessageFlags.Ephemeral
    });
  } catch (error) {
    console.error('[HYPNOX][IP] Error:', error);
    if (interaction.replied || interaction.deferred) {
      return interaction.editReply({ content: 'No se pudo completar la configuración de la dirección del servidor.' });
    }
    return interaction.reply({
      content: 'No se pudo completar la configuración de la dirección del servidor.',
      flags: MessageFlags.Ephemeral
    });
  }
}

module.exports = {
  data,
  execute,
  guilds: ['official', 'staff', 'applications'],
  access: { roleEnvs: [] }
};
