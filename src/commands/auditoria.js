const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getEnv } = require('../config/env');
const { getGuildType } = require('../utils/guild');
const { getGuildRow } = require('../services/guilds');
const { getAuditData } = require('../services/auditoria');
const { writeLog } = require('../services/logs');
const { brandedEmbed } = require('../utils/embeds');

const EPHEMERAL = MessageFlags.Ephemeral;

const ROLE_ENV_BY_GUILD = {
  official: [
    'OFFICIAL_ROLE_FOUNDER_ID',
    'OFFICIAL_ROLE_DIRECTOR_ID',
    'OFFICIAL_ROLE_ADMINISTRATOR_ID',
    'OFFICIAL_ROLE_SRMOD_ID'
  ],
  staff: [
    'STAFF_ROLE_FOUNDER_ID',
    'STAFF_ROLE_DIRECTOR_ID',
    'STAFF_ROLE_ADMINISTRATIVE_ASSISTANT_ID',
    'STAFF_ROLE_SRMOD_ID'
  ]
};

const data = new SlashCommandBuilder()
  .setName('auditoria')
  .setDescription('Consulta el historial interno de un miembro.')
  .addSubcommand((sub) => sub
    .setName('usuario')
    .setDescription('Consulta la actividad registrada de un usuario.')
    .addUserOption((option) => option
      .setName('usuario')
      .setDescription('Usuario que deseas auditar.')
      .setRequired(true)));

function canAudit(member, guildType) {
  return (ROLE_ENV_BY_GUILD[guildType] || []).some((envKey) => {
    const roleId = getEnv(envKey);
    return Boolean(roleId && member?.roles?.cache?.has(roleId));
  });
}

function formatDate(value) {
  if (!value) return 'Sin fecha';
  const timestamp = Math.floor(new Date(value).getTime() / 1000);
  return Number.isFinite(timestamp) ? `<t:${timestamp}:f>` : 'Sin fecha';
}

function formatAction(row) {
  const reason = row.reason ? ` — ${String(row.reason).slice(0, 180)}` : '';
  const moderator = row.moderator_discord_user_id ? ` · <@${row.moderator_discord_user_id}>` : '';
  return `\`${row.action_type.toUpperCase()}\` · ${formatDate(row.created_at)}${moderator}${reason}`;
}

function formatWarning(row) {
  const state = row.active ? 'ACTIVA' : 'INACTIVA';
  const moderator = row.moderator_discord_user_id ? ` · <@${row.moderator_discord_user_id}>` : '';
  return `\`${state}\` · ${formatDate(row.created_at)}${moderator} — ${String(row.reason || 'Sin razón').slice(0, 180)}\nID: \`${row.id}\``;
}

function formatLog(row) {
  const detail = row.message ? ` — ${String(row.message).slice(0, 150)}` : '';
  const actor = row.actor_discord_user_id ? ` · <@${row.actor_discord_user_id}>` : '';
  return `\`${String(row.category).toUpperCase()}\` / \`${row.action}\` · ${formatDate(row.created_at)}${actor}${detail}`;
}

async function execute(interaction) {
  const guildType = getGuildType(interaction.guildId);
  if (!guildType || !['official', 'staff'].includes(guildType)) {
    return interaction.reply({ content: 'Este comando solo está disponible en los servidores Official y Staff Team.', flags: EPHEMERAL });
  }

  if (!canAudit(interaction.member, guildType)) {
    return interaction.reply({ content: 'No tienes permisos para consultar auditorías. Se requiere SRMOD o superior.', flags: EPHEMERAL });
  }

  await interaction.deferReply({ flags: EPHEMERAL });

  try {
    const target = interaction.options.getUser('usuario', true);
    const guildRow = await getGuildRow(interaction.guildId);
    if (!guildRow) return interaction.editReply({ content: 'El servidor aún no está registrado en Supabase.' });

    const audit = await getAuditData({ guildId: guildRow.id, discordUserId: target.id });
    if (!audit.user) {
      return interaction.editReply({ content: 'No existe un registro de este usuario en la base de datos del servidor.' });
    }

    const embed = brandedEmbed('AUDITORÍA DE USUARIO', `Historial interno registrado para <@${target.id}>.`, {
      footerText: 'Hypnox Studios • Auditoría interna'
    });

    embed.addFields({
      name: '◆ IDENTIDAD',
      value: [
        `Usuario: <@${target.id}>`,
        `ID: \`${target.id}\``,
        `Cuenta registrada: ${formatDate(audit.user.created_at || audit.user.first_seen_at)}`,
        `Última actividad registrada: ${formatDate(audit.user.last_seen_at)}`
      ].join('\n'),
      inline: false
    });

    embed.addFields({
      name: '◆ RESUMEN',
      value: [
        `Advertencias: **${audit.warnings.length}** registradas en este servidor`,
        `Acciones de moderación: **${audit.moderationActions.length}**`,
        `Tickets creados: **${audit.tickets.length}**`,
        `Eventos creados: **${audit.events.length}**`,
        `Anuncios publicados: **${audit.announcements.length}**`,
        `Registros asociados: **${audit.logs.length}**`
      ].join('\n'),
      inline: false
    });

    if (audit.warnings.length) {
      embed.addFields({ name: '◆ ADVERTENCIAS', value: audit.warnings.slice(0, 5).map(formatWarning).join('\n\n').slice(0, 1024), inline: false });
    }

    if (audit.moderationActions.length) {
      embed.addFields({ name: '◆ MODERACIÓN', value: audit.moderationActions.slice(0, 5).map(formatAction).join('\n').slice(0, 1024), inline: false });
    }

    if (audit.logs.length) {
      embed.addFields({ name: '◆ ACTIVIDAD REGISTRADA', value: audit.logs.slice(0, 5).map(formatLog).join('\n').slice(0, 1024), inline: false });
    }

    if (audit.tickets.length) {
      embed.addFields({
        name: '◆ TICKETS',
        value: audit.tickets.slice(0, 5).map((row) => `\`${row.ticket_type}\` · ${row.status.toUpperCase()} · ${formatDate(row.created_at)} · <#${row.discord_channel_id}>`).join('\n').slice(0, 1024),
        inline: false
      });
    }

    await writeLog({
      guild: interaction.guild,
      category: 'administration',
      action: 'auditoria_usuario',
      actorId: interaction.user.id,
      targetId: target.id,
      channelId: interaction.channelId,
      message: `Consulta de auditoría realizada para ${target.id}.`
    });

    return interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('[HYPNOX] Auditoría error:', error);
    return interaction.editReply({ content: 'No se pudo consultar la auditoría. El error fue registrado.' }).catch(() => {});
  }
}

module.exports = { data, execute, guilds: ['official', 'staff'] };
