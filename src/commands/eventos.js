const { SlashCommandBuilder } = require('discord.js');
const supabase = require('../database/supabase');
const { writeLog } = require('../services/logs');
const { getGuildRow } = require('../services/guilds');
const { brandedEmbed } = require('../utils/embeds');

const OFFICIAL_ROLES = [
  'OFFICIAL_ROLE_FOUNDER_ID', 'OFFICIAL_ROLE_DIRECTOR_ID', 'OFFICIAL_ROLE_ADMINISTRATOR_ID',
  'OFFICIAL_ROLE_SRMOD_ID', 'OFFICIAL_ROLE_MOD_ID', 'OFFICIAL_ROLE_TMOD_ID', 'OFFICIAL_ROLE_HELPER_ID'
];
const PROJECT_ROLES = [
  'STAFF_ROLE_FOUNDER_ID', 'STAFF_ROLE_DIRECTOR_ID', 'STAFF_ROLE_ADMINISTRATIVE_ASSISTANT_ID',
  'STAFF_ROLE_PROJECT_MANAGER_ID', 'STAFF_ROLE_DEPARTMENT_LEAD_ID'
];

const data = new SlashCommandBuilder()
  .setName('evento')
  .setDescription('Gestiona el ciclo de vida de los eventos de Hypnox Studios.')
  .addSubcommand((sub) => sub.setName('crear').setDescription('Programa un nuevo evento.')
    .addStringOption((option) => option.setName('titulo').setDescription('Título del evento.').setRequired(true))
    .addStringOption((option) => option.setName('descripcion').setDescription('Descripción del evento.').setRequired(true))
    .addStringOption((option) => option.setName('inicio').setDescription('Fecha y hora en formato ISO.').setRequired(true))
    .addStringOption((option) => option.setName('fin').setDescription('Fecha y hora de finalización en formato ISO.')))
  .addSubcommand((sub) => sub.setName('editar').setDescription('Actualiza un evento existente.')
    .addStringOption((option) => option.setName('id').setDescription('ID del evento.').setRequired(true))
    .addStringOption((option) => option.setName('titulo').setDescription('Nuevo título.'))
    .addStringOption((option) => option.setName('descripcion').setDescription('Nueva descripción.'))
    .addStringOption((option) => option.setName('inicio').setDescription('Nueva fecha de inicio en formato ISO.'))
    .addStringOption((option) => option.setName('fin').setDescription('Nueva fecha de finalización en formato ISO.')))
  .addSubcommand((sub) => sub.setName('cancelar').setDescription('Cancela un evento programado.')
    .addStringOption((option) => option.setName('id').setDescription('ID del evento.').setRequired(true)))
  .addSubcommand((sub) => sub.setName('iniciar').setDescription('Marca un evento como iniciado.')
    .addStringOption((option) => option.setName('id').setDescription('ID del evento.').setRequired(true)))
  .addSubcommand((sub) => sub.setName('finalizar').setDescription('Marca un evento como finalizado.')
    .addStringOption((option) => option.setName('id').setDescription('ID del evento.').setRequired(true)));

async function execute(interaction) {
  const guild = await getGuildRow(interaction.guild.id);
  if (!guild) return interaction.reply({ content: 'Servidor no registrado.', ephemeral: true });

  try {
    const sub = interaction.options.getSubcommand();
    if (sub === 'crear') {
      const start = new Date(interaction.options.getString('inicio'));
      const endText = interaction.options.getString('fin');
      const end = endText ? new Date(endText) : null;
      if (Number.isNaN(start.getTime()) || (end && Number.isNaN(end.getTime()))) return interaction.reply({ content: 'Fecha ISO inválida.', ephemeral: true });
      if (end && end <= start) return interaction.reply({ content: 'La fecha de finalización debe ser posterior a la fecha de inicio.', ephemeral: true });
      if (start <= new Date()) return interaction.reply({ content: 'La fecha de inicio debe ser futura.', ephemeral: true });

      const { data: event, error } = await supabase.from('events').insert({
        guild_id: guild.id, channel_id: interaction.channel.id,
        title: interaction.options.getString('titulo').trim(),
        description: interaction.options.getString('descripcion').trim(),
        starts_at: start.toISOString(), ends_at: end?.toISOString() || null,
        status: 'upcoming', created_by_discord_user_id: interaction.user.id
      }).select().single();
      if (error) throw error;

      const embed = brandedEmbed('EVENTO', event.description);
      embed.addFields(
        { name: 'TÍTULO', value: event.title, inline: false },
        { name: 'INICIO', value: `<t:${Math.floor(start.getTime() / 1000)}:F>`, inline: true },
        { name: 'ESTADO', value: 'Programado', inline: true },
        ...(end ? [{ name: 'FINALIZACIÓN', value: `<t:${Math.floor(end.getTime() / 1000)}:F>`, inline: true }] : [])
      );
      embed.setFooter({ text: 'Hypnox Studios • Gestión de eventos' });
      const message = await interaction.channel.send({ embeds: [embed] });
      const { error: messageError } = await supabase.from('events').update({ message_id: message.id }).eq('id', event.id);
      if (messageError) throw messageError;
      await writeLog({ guild: interaction.guild, category: 'event', action: 'create', actorId: interaction.user.id, channelId: interaction.channel.id, message: event.title, metadata: { eventId: event.id } });
      return interaction.reply({ content: `Evento creado: \`${event.id}\``, ephemeral: true });
    }

    const id = interaction.options.getString('id');
    const { data: current, error: currentError } = await supabase.from('events').select('*').eq('id', id).eq('guild_id', guild.id).maybeSingle();
    if (currentError) throw currentError;
    if (!current) return interaction.reply({ content: 'No se encontró el evento indicado.', ephemeral: true });
    if (['cancelar','iniciar','finalizar'].includes(sub) && current.status === 'finished') return interaction.reply({ content: 'Este evento ya está finalizado.', ephemeral: true });
    if (sub === 'cancelar' && current.status === 'cancelled') return interaction.reply({ content: 'Este evento ya está cancelado.', ephemeral: true });
    if (sub === 'iniciar' && current.status !== 'upcoming') return interaction.reply({ content: 'Solo puedes iniciar un evento programado.', ephemeral: true });
    if (sub === 'finalizar' && current.status !== 'active') return interaction.reply({ content: 'Solo puedes finalizar un evento activo.', ephemeral: true });

    const patch = { updated_at: new Date().toISOString() };
    if (sub === 'editar') {
      if (!['upcoming','active'].includes(current.status)) return interaction.reply({ content: 'Solo puedes editar un evento programado o activo.', ephemeral: true });
      const title = interaction.options.getString('titulo');
      const description = interaction.options.getString('descripcion');
      const startText = interaction.options.getString('inicio');
      const endText = interaction.options.getString('fin');
      if (!title && !description && !startText && !endText) return interaction.reply({ content: 'Debes indicar al menos un campo para actualizar.', ephemeral: true });
      if (title) patch.title = title.trim();
      if (description) patch.description = description.trim();
      const start = startText ? new Date(startText) : new Date(current.starts_at);
      const end = endText ? new Date(endText) : (current.ends_at ? new Date(current.ends_at) : null);
      if (startText && Number.isNaN(start.getTime())) return interaction.reply({ content: 'Fecha de inicio ISO inválida.', ephemeral: true });
      if (endText && Number.isNaN(end.getTime())) return interaction.reply({ content: 'Fecha de finalización ISO inválida.', ephemeral: true });
      if (startText && start <= new Date()) return interaction.reply({ content: 'La fecha de inicio debe ser futura.', ephemeral: true });
      if (end && end <= start) return interaction.reply({ content: 'La fecha de finalización debe ser posterior a la fecha de inicio.', ephemeral: true });
      if (startText) patch.starts_at = start.toISOString();
      if (endText) patch.ends_at = end?.toISOString() || null;
    } else {
      patch.status = { cancelar: 'cancelled', iniciar: 'active', finalizar: 'finished' }[sub];
    }

    const { data: updated, error } = await supabase.from('events').update(patch).eq('id', id).eq('guild_id', guild.id).select().single();
    if (error) throw error;
    await writeLog({ guild: interaction.guild, category: 'event', action: sub, actorId: interaction.user.id, channelId: interaction.channel.id, message: id, metadata: { previousStatus: current.status, newStatus: updated.status } });
    return interaction.reply({ content: `Evento actualizado: ${updated.title}.`, ephemeral: true });
  } catch (error) {
    console.error('[HYPNOX] Event error:', error);
    return interaction.reply({ content: 'No se pudo gestionar el evento.', ephemeral: true }).catch(() => {});
  }
}

module.exports = { data, execute, guilds: ['official', 'staff'], access: { roleEnvs: [...OFFICIAL_ROLES, ...PROJECT_ROLES] } };
