const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');
const { createTicket, getTicket, updateTicket, addTicketEvent } = require('../services/tickets');
const { writeLog } = require('../services/logs');

const data = new SlashCommandBuilder()
  .setName('tickets')
  .setDescription('Sistema de tickets del servidor oficial.')
  .addSubcommand((s) => s.setName('panel').setDescription('Publica el panel de tickets'))
  .addSubcommand((s) => s.setName('cerrar').setDescription('Cierra el ticket actual'))
  .addSubcommand((s) => s.setName('claim').setDescription('Toma el ticket actual'))
  .addSubcommand((s) => s.setName('add').setDescription('Añade un usuario al ticket').addUserOption((o) => o.setName('usuario').setDescription('Usuario').setRequired(true)))
  .addSubcommand((s) => s.setName('remove').setDescription('Retira un usuario del ticket').addUserOption((o) => o.setName('usuario').setDescription('Usuario').setRequired(true)));

const labels = { soporte: 'Soporte', reporte: 'Reporte', alianza: 'Alianza / Partner', contacto: 'Contacto' };
const select = () => new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('hypnox_ticket_type').setPlaceholder('Selecciona el tipo de ticket').addOptions(Object.entries(labels).map(([value, label]) => ({ label, value, description: `Abrir ticket de ${label.toLowerCase()}` }))));

function isStaff(interaction) {
  return interaction.member.permissions.has(PermissionFlagsBits.ManageChannels) || interaction.member.permissions.has(PermissionFlagsBits.ManageGuild);
}

async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  if (sub === 'panel') {
    if (!isStaff(interaction)) return interaction.reply({ content: 'No tienes permisos para publicar el panel.', ephemeral: true });
    return interaction.reply({ embeds: [{ color: 0, title: 'HYPNOX STUDIOS — TICKETS', description: 'Selecciona una opción del menú para abrir un ticket.\n\nLos tickets de Alianza / Partner se gestionan directamente con el equipo.' }], components: [select()] });
  }

  const ticket = await getTicket(interaction.channel.id);
  if (!ticket) return interaction.reply({ content: 'Este canal no es un ticket activo.', ephemeral: true });
  if (sub === 'cerrar') {
    if (!isStaff(interaction) && ticket.creator_user_id !== interaction.user.id) return interaction.reply({ content: 'No puedes cerrar este ticket.', ephemeral: true });
    await updateTicket(ticket.id, { status: 'closed', closed_by_discord_user_id: interaction.user.id, closed_at: new Date().toISOString() });
    await addTicketEvent(ticket.id, interaction.user.id, 'closed');
    await writeLog({ guild: interaction.guild, category: 'ticket', action: 'close', actorId: interaction.user.id, channelId: interaction.channel.id });
    await interaction.reply({ content: 'Ticket cerrado. Este canal será eliminado en unos segundos.' });
    setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
    return;
  }

  if (!isStaff(interaction)) return interaction.reply({ content: 'Esta acción es exclusiva del Staff.', ephemeral: true });
  if (sub === 'claim') {
    await updateTicket(ticket.id, { assigned_to_discord_user_id: interaction.user.id });
    await addTicketEvent(ticket.id, interaction.user.id, 'claimed');
    return interaction.reply({ content: `Ticket asignado a <@${interaction.user.id}>.` });
  }

  const user = interaction.options.getUser('usuario');
  if (sub === 'add') {
    await interaction.channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true });
    await addTicketEvent(ticket.id, interaction.user.id, 'member_added', user.id);
    return interaction.reply({ content: `Se añadió a <@${user.id}>.` });
  }

  await interaction.channel.permissionOverwrites.delete(user.id).catch(() => {});
  await addTicketEvent(ticket.id, interaction.user.id, 'member_removed', user.id);
  return interaction.reply({ content: `Se retiró a <@${user.id}>.` });
}

module.exports = { data, execute, select, labels, guilds: ['official'] };
