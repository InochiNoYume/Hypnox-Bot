const { SlashCommandBuilder } = require('discord.js');
const { getEnv } = require('../config/env');
const supabase = require('../database/supabase');
const { getGuildRow } = require('../services/guilds');
const { writeLog } = require('../services/logs');
const { getGuildType } = require('../utils/guild');
const { hasConfiguredRole } = require('../utils/permissions');

const MANAGEMENT_ROLES = {
  official: ['OFFICIAL_ROLE_FOUNDER_ID', 'OFFICIAL_ROLE_DIRECTOR_ID', 'OFFICIAL_ROLE_ADMINISTRATOR_ID'],
  staff: ['STAFF_ROLE_FOUNDER_ID', 'STAFF_ROLE_DIRECTOR_ID', 'STAFF_ROLE_ADMINISTRATOR_ID'],
  applications: ['APPLICATIONS_ROLE_FOUNDER_ID', 'APPLICATIONS_ROLE_DIRECTOR_ID', 'APPLICATIONS_ROLE_ADMINISTRATOR_ID']
};

const data = new SlashCommandBuilder()
  .setName('administracion')
  .setDescription('Administración del bot')
  .addSubcommand(s => s
    .setName('config')
    .setDescription('Consulta configuración')
    .addStringOption(o => o
      .setName('clave')
      .setDescription('Clave de configuración')
      .setRequired(true)
      .setAutocomplete(true)))
  .addSubcommand(s => s
    .setName('set-channel')
    .setDescription('Configura un canal')
    .addStringOption(o => o
      .setName('tipo')
      .setDescription('Tipo de canal')
      .setRequired(true))
    .addChannelOption(o => o
      .setName('canal')
      .setDescription('Canal a configurar')
      .setRequired(true)))
  .addSubcommand(s => s
    .setName('set-role')
    .setDescription('Configura un rol')
    .addStringOption(o => o
      .setName('tipo')
      .setDescription('Tipo de rol')
      .setRequired(true))
    .addRoleOption(o => o
      .setName('rol')
      .setDescription('Rol a configurar')
      .setRequired(true)))
  .addSubcommand(s => s
    .setName('set-permission')
    .setDescription('Configura permisos')
    .addStringOption(o => o
      .setName('comando')
      .setDescription('Comando a configurar')
      .setRequired(true))
    .addStringOption(o => o
      .setName('permiso')
      .setDescription('Permiso a establecer')
      .setRequired(true)))
  .addSubcommand(s => s
    .setName('maintenance')
    .setDescription('Modo mantenimiento'))
  .addSubcommand(s => s
    .setName('reload')
    .setDescription('Recarga módulos'));

async function execute(interaction) {
  const type = getGuildType(interaction.guild.id);
  const allowed = type === 'dev' || (MANAGEMENT_ROLES[type] || []).some(roleEnv => hasConfiguredRole(interaction.member, roleEnv));
  
  if (!allowed) {
    return interaction.reply({
      content: 'No tienes permisos para usar este comando.',
      flags: 64
    });
  }

  const subcommand = interaction.options.getSubcommand();
  
  // Add your subcommand handlers here
  return interaction.reply({
    content: `Subcomando ${subcommand} ejecutado.`,
    flags: 64
  });
}

module.exports = {
  data,
  execute,
  guilds: ['official', 'staff', 'applications'],
  access: {
    roleEnvs: ['OFFICIAL_ROLE_FOUNDER_ID', 'OFFICIAL_ROLE_DIRECTOR_ID', 'OFFICIAL_ROLE_ADMINISTRATOR_ID', 'STAFF_ROLE_FOUNDER_ID']
  }
};
