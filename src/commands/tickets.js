const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');
const { getEnv } = require('../config/env');
const { getGuildType } = require('../utils/guild');
const { createTicket, getTicket, updateTicket, addTicketEvent } = require('../services/tickets');
const { writeLog } = require('../services/logs');

const data = new SlashCommandBuilder().setName('tickets').setDescription('Sistema de tickets de Hypnox Studios')
  .addSubcommand(s => s.setName('panel').setDescription('Publica el panel de tickets'))
  .addSubcommand(s => s.setName('cerrar').setDescription('Cierra el ticket actual'))
  .addSubcommand(s => s.setName('claim').setDescription('Toma el ticket actual'))
  .addSubcommand(s => s.setName('add').setDescription('Añade un usuario al ticket').addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true)))
  .addSubcommand(s => s.setName('remove').setDescription('Retira un usuario del ticket').addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true)));

const labels = { soporte: 'Soporte', reporte: 'Reporte', alianza: 'Alianza / Partner', contacto: 'Contacto' };
const select = () => new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('hypnox_ticket_type').setPlaceholder('Selecciona el tipo de ticket').addOptions(Object.entries(labels).map(([value, label]) => ({ label, value, description: `Abrir ticket de ${label.toLowerCase()}` }))));

function isStaff(i) { return i.member.permissions.has(PermissionFlagsBits.ManageChannels) || i.member.permissions.has(PermissionFlagsBits.ManageGuild); }

async function execute(i) {
  const sub = i.options.getSubcommand();
  if (sub === 'panel') {
    if (!isStaff(i)) return i.reply({ content: 'No tienes permisos para publicar el panel.', ephemeral: true });
    return i.reply({ embeds: [{ color: 0, title: 'HYPNOX STUDIOS — TICKETS', description: 'Selecciona una opción del menú para abrir un ticket.\n\nLos tickets de Alianza / Partner se gestionan directamente con el equipo.' }], components: [select()] });
  }
  const ticket = await getTicket(i.channel.id);
  if (!ticket) return i.reply({ content: 'Este canal no es un ticket activo.', ephemeral: true });
  if (sub === 'cerrar') {
    if (!isStaff(i) && ticket.creator_user_id !== i.user.id) return i.reply({ content: 'No puedes cerrar este ticket.', ephemeral: true });
    await updateTicket(ticket.id, { status: 'closed', closed_by_discord_user_id: i.user.id, closed_at: new Date().toISOString() });
    await addTicketEvent(ticket.id, i.user.id, 'closed'); await writeLog({ guild: i.guild, category: 'ticket', action: 'close', actorId: i.user.id, channelId: i.channel.id });
    await i.reply({ content: 'Ticket cerrado. Este canal será eliminado en unos segundos.' });
    setTimeout(() => i.channel.delete().catch(() => {}), 3000); return;
  }
  if (!isStaff(i)) return i.reply({ content: 'Esta acción es exclusiva del Staff.', ephemeral: true });
  if (sub === 'claim') { await updateTicket(ticket.id, { assigned_to_discord_user_id: i.user.id }); await addTicketEvent(ticket.id, i.user.id, 'claimed'); return i.reply({ content: `Ticket asignado a <@${i.user.id}>.` }); }
  const user = i.options.getUser('usuario');
  if (sub === 'add') { await i.channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true }); await addTicketEvent(ticket.id, i.user.id, 'member_added', user.id); return i.reply({ content: `Se añadió a <@${user.id}>.` }); }
  await i.channel.permissionOverwrites.delete(user.id).catch(() => {}); await addTicketEvent(ticket.id, i.user.id, 'member_removed', user.id); return i.reply({ content: `Se retiró a <@${user.id}>.` });
}

module.exports = { data, execute, select, labels, guilds: ['official', 'staff'] };
