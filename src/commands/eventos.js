const { SlashCommandBuilder } = require('discord.js');
const supabase = require('../database/supabase');
const { writeLog } = require('../services/logs');
const { getGuildRow } = require('../services/guilds');
const { brandedEmbed } = require('../utils/embeds');

const STAFF_ROLES = [
  'OFFICIAL_ROLE_FOUNDER_ID', 'OFFICIAL_ROLE_DIRECTOR_ID', 'OFFICIAL_ROLE_ADMINISTRATOR_ID',
  'OFFICIAL_ROLE_SRMOD_ID', 'OFFICIAL_ROLE_MOD_ID', 'OFFICIAL_ROLE_TMOD_ID', 'OFFICIAL_ROLE_HELPER_ID',
  'STAFF_ROLE_FOUNDER_ID', 'STAFF_ROLE_DIRECTOR_ID', 'STAFF_ROLE_ADMINISTRATOR_ID', 'STAFF_ROLE_ADMINISTRATIVE_ASSISTANT_ID',
  'STAFF_ROLE_SRMOD_ID', 'STAFF_ROLE_MOD_ID', 'STAFF_ROLE_TMOD_ID', 'STAFF_ROLE_HELPER_ID',
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
    .addStringOption((option) => option.setName('inicio').setDescription('Nueva fecha de inicio en formato ISO.')))
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
      if (Number.isNaN(start.getTime()) || (end && Number.isNaN(end.getTime()))) {
        return interaction.reply({ content: 'Fecha ISO inválida.', ephemeral: true });
      }
      if (end && end <= start) {
        return interaction.reply({ content: 'La fecha de finalización debe ser posterior a la fecha de inicio.', ephemeral: true });
      }

      const { data: event, error } = await supabase.from('events').insert({
        guild_id: guild.id,
        channel_id: interaction.channel.id,
        title: interaction.options.getString('titulo'),
        description: interaction.options.getString('descripcion'),
        starts_at: start.toISOString(),
        ends_at: end?.toISOString() || null,
        status: 'upcoming',
        created_by_discord_user_id: interaction.user.id
      }).select().single();
      if (error) throw error;

      const embed = brandedEmbed('EVENTO', event.description);
      embed.addFields(
        { name: 'TÍTULO', value: event.title, inline: false },
        { name: 'INICIO', value: `<t:${Math.floor(start.getTime() / 1000)}:F>`, inline: true },
        { name: 'ESTADO', value: 'Programado', inline: true }
      );
      if (end) embed.addFields({ name: 'FINALIZACIÓN', value: `<t:${Math.floor(end.getTime() / 1000)}:F>`, inline: true });
      embed.setFooter({ text: 'Hypnox Studios • Gestión de eventos' });

      const message = await interaction.channel.send({ embeds: [embed] });
      await supabase.from('events').update({ message_id: message.id }).eq('id', event.id);
      await writeLog({ guild: interaction.guild, category: 'event', action: 'create', actorId: interaction.user.id, channelId: interaction.channel.id, message: event.title, metadata: { eventId: event.id } });
      return interaction.reply({ content: `Evento creado: \`${event.id}\``, ephemeral: true });
    }

    const id = interaction.options.getString('id');
    const patch = { updated_at: new Date().toISOString() };
    if (sub === 'editar') {
      const title = interaction.options.getString('titulo');
      const description = interaction.options.getString('descripcion');
      const startText = interaction.options.getString('inicio');
      if (!title && !description && !startText) {
        return interaction.reply({ content: 'Debes indicar al menos un campo para actualizar.', ephemeral: true });
      }
      if (title) patch.title = title;
      if (description) patch.description = description;
      if (startText) {
        const start = new Date(startText);
        if (Number.isNaN(start.getTime())) return interaction.reply({ content: 'Fecha ISO inválida.', ephemeral: true });
        patch.starts_at = start.toISOString();
      }
    } else {
      patch.status = { cancelar: 'cancelled', iniciar: 'active', finalizar: 'finished' }[sub];
    }

    const { data: updated, error } = await supabase.from('events').update(patch).eq('id', id).eq('guild_id', guild.id).select().single();
    if (error) throw error;
    await writeLog({ guild: interaction.guild, category: 'event', action: sub, actorId: interaction.user.id, message: id });
    return interaction.reply({ content: `Evento actualizado: ${updated.title}.`, ephemeral: true });
  } catch (error) {
    console.error(error);
    return interaction.reply({ content: 'No se pudo gestionar el evento.', ephemeral: true });
  }
}

module.exports = { data, execute, guilds: ['official', 'staff'], access: { roleEnvs: STAFF_ROLES } };
