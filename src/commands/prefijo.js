const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getGuildPrefix, setGuildPrefix, DEFAULT_PREFIX } = require('../services/guilds');

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

const data = new SlashCommandBuilder()
  .setName('prefijo')
  .setDescription('Configura el prefijo de comandos de este servidor.')
  .addSubcommand((subcommand) => subcommand
    .setName('establecer')
    .setDescription('Establece un nuevo prefijo para este servidor.')
    .addStringOption((option) => option
      .setName('prefijo')
      .setDescription('Nuevo prefijo, de 1 a 5 caracteres y sin espacios.')
      .setMinLength(1)
      .setMaxLength(5)
      .setRequired(true)))
  .addSubcommand((subcommand) => subcommand
    .setName('ver')
    .setDescription('Muestra el prefijo actual del servidor.'))
  .addSubcommand((subcommand) => subcommand
    .setName('restablecer')
    .setDescription(`Restablece el prefijo predeterminado (${DEFAULT_PREFIX}).`));

async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();

  try {
    if (subcommand === 'ver') {
      const prefix = await getGuildPrefix(interaction.guild.id);
      return interaction.reply({
        content: `El prefijo actual de este servidor es: \`${prefix}\``,
        flags: MessageFlags.Ephemeral
      });
    }

    const prefix = subcommand === 'restablecer'
      ? DEFAULT_PREFIX
      : interaction.options.getString('prefijo', true).trim();

    const updated = await setGuildPrefix(interaction.guild.id, prefix);
    return interaction.reply({
      content: subcommand === 'restablecer'
        ? `Prefijo restablecido a \`${updated}\`.`
        : `Prefijo actualizado correctamente a \`${updated}\`.`,
      flags: MessageFlags.Ephemeral
    });
  } catch (error) {
    console.error('[HYPNOX][PREFIX] Error configurando prefijo:', error);
    return interaction.reply({
      content: error.message || 'No se pudo actualizar el prefijo.',
      flags: MessageFlags.Ephemeral
    });
  }
}

module.exports = {
  data,
  execute,
  guilds: ['official', 'staff', 'applications'],
  access: { roleEnvs: MANAGEMENT_ROLES }
};
