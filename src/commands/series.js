const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const supabase = require('../database/supabase');
const { getGuildRow } = require('../services/guilds');
const { writeLog } = require('../services/logs');
const { brandedEmbed } = require('../utils/embeds');
const { getEnv } = require('../config/env');

const EPHEMERAL = MessageFlags.Ephemeral;
const STAFF_ROLES = [
  'OFFICIAL_ROLE_FOUNDER_ID', 'OFFICIAL_ROLE_DIRECTOR_ID', 'OFFICIAL_ROLE_ADMINISTRATOR_ID',
  'OFFICIAL_ROLE_SRMOD_ID', 'STAFF_ROLE_FOUNDER_ID', 'STAFF_ROLE_DIRECTOR_ID',
  'STAFF_ROLE_ADMINISTRATIVE_ASSISTANT_ID', 'STAFF_ROLE_PROJECT_MANAGER_ID', 'STAFF_ROLE_DEPARTMENT_LEAD_ID'
];

const data = new SlashCommandBuilder()
  .setName('serie')
  .setDescription('Gestiona el ciclo de vida de las series de Hypnox Studios.')
  .addSubcommand((s) => s.setName('crear').setDescription('Programa una nueva serie.')
    .addStringOption((o) => o.setName('titulo').setDescription('Título de la serie.').setRequired(true))
    .addStringOption((o) => o.setName('descripcion').setDescription('Descripción.').setRequired(true))
    .addStringOption((o) => o.setName('inicio').setDescription('Fecha y hora ISO de inicio.').setRequired(true))
    .addStringOption((o) => o.setName('fin').setDescription('Fecha y hora ISO de finalización.')))
  .addSubcommand((s) => s.setName('editar').setDescription('Edita una serie.')
    .addStringOption((o) => o.setName('id').setDescription('ID de la serie.').setRequired(true))
    .addStringOption((o) => o.setName('titulo').setDescription('Nuevo título.'))
    .addStringOption((o) => o.setName('descripcion').setDescription('Nueva descripción.'))
    .addStringOption((o) => o.setName('inicio').setDescription('Nueva fecha y hora ISO de inicio.'))
    .addStringOption((o) => o.setName('fin').setDescription('Nueva fecha y hora ISO de finalización.')))
  .addSubcommand((s) => s.setName('cancelar').setDescription('Cancela una serie.').addStringOption((o) => o.setName('id').setDescription('ID.').setRequired(true)))
  .addSubcommand((s) => s.setName('iniciar').setDescription('Inicia una serie.').addStringOption((o) => o.setName('id').setDescription('ID.').setRequired(true)))
  .addSubcommand((s) => s.setName('finalizar').setDescription('Finaliza una serie.').addStringOption((o) => o.setName('id').setDescription('ID.').setRequired(true)));

function canManage(member) {
  return Boolean(member?.permissions?.has(PermissionFlagsBits.Administrator)) || STAFF_ROLES.some((key) => {
    const roleId = getEnv(key);
    return roleId && member?.roles?.cache?.has(roleId);
  });
}

function dateTag(value) {
  return `<t:${Math.floor(new Date(value).getTime() / 1000)}:F>`;
}

async function execute(interaction) {
  if (!canManage(interaction.member)) return interaction.reply({ content: 'No tienes permisos para gestionar series.', flags: EPHEMERAL });
  const guild = await getGuildRow(interaction.guildId);
  if (!guild) return interaction.reply({ content: 'Servidor no registrado.', flags: EPHEMERAL });

  try {
    const sub = interaction.options.getSubcommand();
    if (sub === 'crear') {
      const start = new Date(interaction.options.getString('inicio'));
      const endText = interaction.options.getString('fin');
      const end = endText ? new Date(endText) : null;
      if (Number.isNaN(start.getTime()) || (end && Number.isNaN(end.getTime()))) return interaction.reply({ content: 'Fecha ISO inválida.', flags: EPHEMERAL });
      if (start <= new Date()) return interaction.reply({ content: 'La fecha de inicio debe ser futura.', flags: EPHEMERAL });
      if (end && end <= start) return interaction.reply({ content: 'La fecha de finalización debe ser posterior al inicio.', flags: EPHEMERAL });
      const title = interaction.options.getString('titulo', true).trim();
      const description = interaction.options.getString('descripcion', true).trim();
      if (!title || !description) return interaction.reply({ content: 'El título y la descripción no pueden estar vacíos.', flags: EPHEMERAL });
      const { data: series, error } = await supabase.from('series').insert({ guild_id: guild.id, channel_id: interaction.channelId, title, description, starts_at: start.toISOString(), ends_at: end?.toISOString() || null, created_by_discord_user_id: interaction.user.id }).select().single();
      if (error) throw error;
      const embed = brandedEmbed('SERIE', description, { footerText: 'Hypnox Studios • Gestión de series' });
      embed.addFields({ name: '◆ TÍTULO', value: title }, { name: '◆ INICIO', value: dateTag(start), inline: true }, { name: '◆ ESTADO', value: 'Programada', inline: true }, ...(end ? [{ name: '◆ FINALIZACIÓN', value: dateTag(end), inline: true }] : []));
      const message = await interaction.channel.send({ embeds: [embed] });
      const { error: messageError } = await supabase.from('series').update({ message_id: message.id }).eq('id', series.id).eq('guild_id', guild.id);
      if (messageError) throw messageError;
      await writeLog({ guild: interaction.guild, category: 'event', action: 'serie_creada', actorId: interaction.user.id, channelId: interaction.channelId, message: title, metadata: { seriesId: series.id } });
      return interaction.reply({ content: `Serie creada: \`${series.id}\``, flags: EPHEMERAL });
    }

    const id = interaction.options.getString('id', true);
    const { data: current, error } = await supabase.from('series').select('*').eq('id', id).eq('guild_id', guild.id).maybeSingle();
    if (error) throw error;
    if (!current) return interaction.reply({ content: 'No se encontró la serie indicada.', flags: EPHEMERAL });
    if (sub === 'iniciar' && current.status !== 'upcoming') return interaction.reply({ content: 'Solo puedes iniciar una serie programada.', flags: EPHEMERAL });
    if (sub === 'finalizar' && current.status !== 'active') return interaction.reply({ content: 'Solo puedes finalizar una serie activa.', flags: EPHEMERAL });
    if (sub === 'cancelar' && current.status === 'cancelled') return interaction.reply({ content: 'Esta serie ya está cancelada.', flags: EPHEMERAL });
    if (sub === 'editar' && !['upcoming', 'active'].includes(current.status)) return interaction.reply({ content: 'Solo puedes editar una serie programada o activa.', flags: EPHEMERAL });

    const patch = { updated_at: new Date().toISOString() };
    if (sub === 'editar') {
      const title = interaction.options.getString('titulo');
      const description = interaction.options.getString('descripcion');
      const startText = interaction.options.getString('inicio');
      const endText = interaction.options.getString('fin');
      if (!title && !description && !startText && !endText) return interaction.reply({ content: 'Debes indicar al menos un campo.', flags: EPHEMERAL });
      if (title !== null) { const value = title.trim(); if (!value) return interaction.reply({ content: 'El título no puede quedar vacío.', flags: EPHEMERAL }); patch.title = value; }
      if (description !== null) { const value = description.trim(); if (!value) return interaction.reply({ content: 'La descripción no puede quedar vacía.', flags: EPHEMERAL }); patch.description = value; }
      if (startText) { const d = new Date(startText); if (Number.isNaN(d.getTime()) || d <= new Date()) return interaction.reply({ content: 'Fecha de inicio inválida o no futura.', flags: EPHEMERAL }); patch.starts_at = d.toISOString(); }
      if (endText) { const d = new Date(endText); const start = new Date(patch.starts_at || current.starts_at); if (Number.isNaN(d.getTime()) || d <= start) return interaction.reply({ content: 'Fecha de finalización inválida.', flags: EPHEMERAL }); patch.ends_at = d.toISOString(); }
    } else patch.status = { iniciar: 'active', finalizar: 'finished', cancelar: 'cancelled' }[sub];

    const { data: updated, error: updateError } = await supabase.from('series').update(patch).eq('id', id).eq('guild_id', guild.id).select().single();
    if (updateError) throw updateError;
    await writeLog({ guild: interaction.guild, category: 'event', action: `serie_${sub}`, actorId: interaction.user.id, channelId: interaction.channelId, message: id, metadata: { previousStatus: current.status, newStatus: updated.status } });
    return interaction.reply({ content: `Serie actualizada: ${updated.title}.`, flags: EPHEMERAL });
  } catch (error) {
    console.error('[HYPNOX] Series error:', error);
    return interaction.reply({ content: 'No se pudo gestionar la serie.', flags: EPHEMERAL }).catch(() => {});
  }
}

module.exports = { data, execute, guilds: ['official', 'staff'] };
