const { SlashCommandBuilder } = require('discord.js');
const { getEnv } = require('../config/env');
const supabase = require('../database/supabase');
const { getGuildRow } = require('../services/guilds');
const { writeLog } = require('../services/logs');
const { getGuildType } = require('../utils/guild');
const { hasConfiguredRole } = require('../utils/permissions');

const MANAGEMENT_ROLES = {
  official: ['OFFICIAL_ROLE_FOUNDER_ID', 'OFFICIAL_ROLE_DIRECTOR_ID', 'OFFICIAL_ROLE_ADMINISTRATOR_ID'],
  staff: ['STAFF_ROLE_FOUNDER_ID', 'STAFF_ROLE_DIRECTOR_ID', 'STAFF_ROLE_ADMINISTRATIVE_ASSISTANT_ID'],
  applications: ['APPLICATIONS_ROLE_FOUNDER_ID', 'APPLICATIONS_ROLE_DIRECTOR_ID', 'APPLICATIONS_ROLE_ADMINISTRATOR_ID']
};

const data = new SlashCommandBuilder()
  .setName('administracion')
  .setDescription('Administración del bot')
  .addSubcommand((s) => s
    .setName('config')
    .setDescription('Consulta configuración')
    .addStringOption((o) => o
      .setName('clave')
      .setDescription('Clave de configuración')
      .setRequired(true)
      .setAutocomplete(true)))
  .addSubcommand((s) => s
    .setName('set-channel')
    .setDescription('Configura un canal')
    .addStringOption((o) => o
      .setName('tipo')
      .setDescription('Tipo de canal')
      .setRequired(true))
    .addChannelOption((o) => o
      .setName('canal')
      .setDescription('Canal a configurar')
      .setRequired(true)))
  .addSubcommand((s) => s
    .setName('set-role')
    .setDescription('Configura un rol')
    .addStringOption((o) => o
      .setName('tipo')
      .setDescription('Tipo de rol')
      .setRequired(true))
    .addRoleOption((o) => o
      .setName('rol')
      .setDescription('Rol a configurar')
      .setRequired(true)))
  .addSubcommand((s) => s
    .setName('set-permission')
    .setDescription('Configura permisos')
    .addStringOption((o) => o
      .setName('comando')
      .setDescription('Comando a configurar')
      .setRequired(true))
    .addStringOption((o) => o
      .setName('permiso')
      .setDescription('Permiso a establecer')
      .setRequired(true)))
  .addSubcommand((s) => s
    .setName('maintenance')
    .setDescription('Modo mantenimiento')
    .addBooleanOption((o) => o
      .setName('estado')
      .setDescription('Activar o desactivar mantenimiento')
      .setRequired(true)))
  .addSubcommand((s) => s
    .setName('reload')
    .setDescription('Recarga módulos'));

async function execute(interaction) {
  const type = getGuildType(interaction.guild.id);
  const allowed = type === 'dev' || (MANAGEMENT_ROLES[type] || []).some((roleEnv) => hasConfiguredRole(interaction.member, roleEnv));

  if (!allowed) {
    return interaction.reply({
      content: 'No tienes permisos para usar este comando.',
      flags: 64
    });
  }

  const subcommand = interaction.options.getSubcommand();

  try {
    if (subcommand === 'config') {
      const clave = interaction.options.getString('clave', true);
      const guildRow = await getGuildRow(interaction.guild.id);
      const value = guildRow?.[clave] ?? 'No configurado';
      return interaction.reply({
        content: `**${clave}**: ${value}`,
        flags: 64
      });
    }

    if (subcommand === 'set-channel') {
      const tipo = interaction.options.getString('tipo', true);
      const canal = interaction.options.getChannel('canal', true);
      await supabase
        .from('guild_config')
        .upsert({
          guild_id: interaction.guild.id,
          [`channel_${tipo}`]: canal.id,
          updated_at: new Date()
        });
      await writeLog({
        guild: interaction.guild,
        category: 'config',
        action: 'set_channel',
        actorId: interaction.user.id,
        message: `Canal ${tipo} configurado: ${canal.id}`
      });
      return interaction.reply({
        content: `Canal ${tipo} configurado correctamente.`,
        flags: 64
      });
    }

    if (subcommand === 'set-role') {
      const tipo = interaction.options.getString('tipo', true);
      const rol = interaction.options.getRole('rol', true);
      await supabase
        .from('guild_config')
        .upsert({
          guild_id: interaction.guild.id,
          [`role_${tipo}`]: rol.id,
          updated_at: new Date()
        });
      await writeLog({
        guild: interaction.guild,
        category: 'config',
        action: 'set_role',
        actorId: interaction.user.id,
        message: `Rol ${tipo} configurado: ${rol.id}`
      });
      return interaction.reply({
        content: `Rol ${tipo} configurado correctamente.`,
        flags: 64
      });
    }

    if (subcommand === 'maintenance') {
      const estado = interaction.options.getBoolean('estado', true);
      await supabase
        .from('guild_config')
        .upsert({
          guild_id: interaction.guild.id,
          maintenance: estado,
          updated_at: new Date()
        });
      await writeLog({
        guild: interaction.guild,
        category: 'config',
        action: 'maintenance',
        actorId: interaction.user.id,
        message: `Mantenimiento ${estado ? 'activado' : 'desactivado'}`
      });
      return interaction.reply({
        content: `Modo mantenimiento ${estado ? 'activado' : 'desactivado'}.`,
        flags: 64
      });
    }

    return interaction.reply({
      content: `Subcomando ${subcommand} no implementado aún.`,
      flags: 64
    });
  } catch (error) {
    console.error('[HYPNOX][ADMIN] Error:', error);
    return interaction.reply({
      content: 'Ocurrió un error al ejecutar el comando.',
      flags: 64
    });
  }
}

module.exports = {
  data,
  execute,
  guilds: ['official', 'staff', 'applications'],
  access: {
    roleEnvs: ['OFFICIAL_ROLE_FOUNDER_ID', 'OFFICIAL_ROLE_DIRECTOR_ID', 'OFFICIAL_ROLE_ADMINISTRATOR_ID', 'STAFF_ROLE_FOUNDER_ID']
  }
};
