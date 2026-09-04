const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, MessageFlags } = require('discord.js');
const { getGuildType } = require('../utils/guild');
const { getTicket, updateTicket, addTicketEvent } = require('./tickets');
const { getEnv } = require('../config/env');
const { writeLog } = require('./logs');
const { hasConfiguredRole } = require('../utils/permissions');
const { brandedEmbed } = require('../utils/embeds');

const EPHEMERAL = MessageFlags.Ephemeral;

const TICKET_ACCESS = {
  support: ['OFFICIAL_ROLE_FOUNDER_ID','OFFICIAL_ROLE_DIRECTOR_ID','OFFICIAL_ROLE_ADMINISTRATOR_ID','OFFICIAL_ROLE_SRMOD_ID','OFFICIAL_ROLE_MOD_ID','OFFICIAL_ROLE_TMOD_ID','OFFICIAL_ROLE_HELPER_ID'],
  report: ['OFFICIAL_ROLE_FOUNDER_ID','OFFICIAL_ROLE_DIRECTOR_ID','OFFICIAL_ROLE_ADMINISTRATOR_ID','OFFICIAL_ROLE_SRMOD_ID','OFFICIAL_ROLE_MOD_ID','OFFICIAL_ROLE_TMOD_ID'],
  alliance_partner: ['OFFICIAL_ROLE_FOUNDER_ID','OFFICIAL_ROLE_DIRECTOR_ID','OFFICIAL_ROLE_ADMINISTRATOR_ID','OFFICIAL_ROLE_SRMOD_ID','OFFICIAL_ROLE_MOD_ID','OFFICIAL_ROLE_TMOD_ID','OFFICIAL_ROLE_HELPER_ID'],
  contact: ['OFFICIAL_ROLE_FOUNDER_ID','OFFICIAL_ROLE_DIRECTOR_ID','OFFICIAL_ROLE_ADMINISTRATOR_ID'],
  bugs: ['OFFICIAL_ROLE_FOUNDER_ID','OFFICIAL_ROLE_DIRECTOR_ID','OFFICIAL_ROLE_ADMINISTRATOR_ID','OFFICIAL_ROLE_DEVELOPER_ID','OFFICIAL_ROLE_PRODUCER_ID']
};

const ALL_CLOSE_ROLES = [...new Set(Object.values(TICKET_ACCESS).flat())];

function canCloseTicket(interaction, ticket) {
  const roles = TICKET_ACCESS[ticket?.ticket_type] || [];
  return roles.some((roleEnv) => hasConfiguredRole(interaction.member, roleEnv));
}

function isConfiguredStaff(interaction) {
  return ALL_CLOSE_ROLES.some((roleEnv) => hasConfiguredRole(interaction.member, roleEnv));
}

function buildCloseConfirmation() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('hypnox_ticket_close_confirm').setLabel('Confirmar cierre').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('hypnox_ticket_close_reopen').setLabel('Mantener abierto').setStyle(ButtonStyle.Secondary)
  );
}

function buildCloseConfirmationEmbed() {
  const embed = brandedEmbed('CONFIRMACIÓN DE CIERRE', '¿Deseas cerrar este ticket? Si confirmas, se solicitará el motivo del cierre antes de finalizar la atención.');
  embed.setFooter({ text: 'Hypnox Studios • Sistema de atención' });
  return embed;
}

function buildCloseModal() {
  return new ModalBuilder()
    .setCustomId('hypnox_ticket_close_modal')
    .setTitle('CERRAR TICKET')
    .addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('reason')
        .setLabel('Motivo del cierre')
        .setPlaceholder('Indica por qué se cierra este ticket.')
        .setStyle(TextInputStyle.Paragraph)
        .setMinLength(5)
        .setMaxLength(1000)
        .setRequired(true)
    ));
}

async function showCloseModal(interaction) {
  if (getGuildType(interaction.guildId) !== 'official') {
    return interaction.reply({ content: 'El sistema de tickets solo está disponible en el servidor oficial.', flags: EPHEMERAL });
  }
  if (!isConfiguredStaff(interaction)) {
    return interaction.reply({ content: 'Solo el personal autorizado mediante los roles configurados puede cerrar tickets.', flags: EPHEMERAL });
  }
  const ticket = await getTicket(interaction.channelId).catch(() => null);
  if (!ticket) return interaction.reply({ content: 'Este canal no corresponde a un ticket abierto.', flags: EPHEMERAL });
  if (!canCloseTicket(interaction, ticket)) {
    return interaction.reply({ content: 'No tienes permiso para cerrar este tipo de ticket.', flags: EPHEMERAL });
  }
  return interaction.reply({ embeds: [buildCloseConfirmationEmbed()], components: [buildCloseConfirmation()], flags: EPHEMERAL });
}

async function confirmClose(interaction) {
  if (getGuildType(interaction.guildId) !== 'official') {
    return interaction.reply({ content: 'El sistema de tickets solo está disponible en el servidor oficial.', flags: EPHEMERAL });
  }
  const ticket = await getTicket(interaction.channelId).catch(() => null);
  if (!ticket) return interaction.update({ content: 'Este ticket ya está cerrado o no existe.', embeds: [], components: [] });
  if (!canCloseTicket(interaction, ticket)) {
    return interaction.reply({ content: 'No tienes permiso para cerrar este tipo de ticket.', flags: EPHEMERAL });
  }
  return interaction.showModal(buildCloseModal());
}

async function keepTicketOpen(interaction) {
  return interaction.update({ content: 'Cierre cancelado. El ticket permanece abierto.', embeds: [], components: [] });
}

async function buildTranscript(channel, ticket, closedBy = null, reason = null) {
  const messages = [];
  let before;
  while (true) {
    const batch = await channel.messages.fetch({ limit: 100, ...(before ? { before } : {}) });
    if (!batch.size) break;
    messages.push(...batch.values());
    before = batch.last().id;
    if (batch.size < 100) break;
  }
  messages.reverse();
  const lines = [
    'HYPNOX STUDIOS — TRANSCRIPT DE TICKET',
    `Canal: #${channel.name}`,
    `ID del canal: ${channel.id}`,
    `ID del ticket: ${ticket?.id || 'N/D'}`,
    `Tipo: ${ticket?.ticket_type || 'N/D'}`,
    `Cerrado por: ${closedBy ? `${closedBy.tag || closedBy.username} (${closedBy.id})` : 'N/D'}`,
    `Motivo: ${reason || 'N/D'}`,
    `Generado: ${new Date().toISOString()}`,
    '',
    '------------------------------------------------------------',
    ''
  ];
  for (const message of messages) {
    const timestamp = new Date(message.createdTimestamp).toISOString();
    const author = `${message.author?.tag || message.author?.username || 'Usuario'} (${message.author?.id || 'N/D'})`;
    const content = message.content?.trim() || '[Sin contenido de texto]';
    lines.push(`[${timestamp}] ${author}: ${content}`);
    if (message.attachments?.size) {
      for (const attachment of message.attachments.values()) lines.push(`  Adjunto: ${attachment.url}`);
    }
  }
  return Buffer.from(lines.join('\n'), 'utf8');
}

async function sendTranscript(channel, interaction, ticket, reason = null) {
  const buffer = await buildTranscript(channel, ticket, interaction.user, reason);
  const attachment = new AttachmentBuilder(buffer, { name: `transcript-${channel.id}.txt` });
  const logsChannelId = getEnv('OFFICIAL_LOGS_CHANNEL_ID');
  const logsChannel = logsChannelId ? await interaction.guild.channels.fetch(logsChannelId).catch(() => null) : null;
  if (logsChannel?.isTextBased()) {
    await logsChannel.send({ content: `Transcript del ticket <#${channel.id}> generado por <@${interaction.user.id}>.`, files: [attachment] });
    return true;
  }
  return false;
}

async function generateTranscript(interaction) {
  if (getGuildType(interaction.guildId) !== 'official') return interaction.reply({ content: 'El sistema de tickets solo está disponible en el servidor oficial.', flags: EPHEMERAL });
  const ticket = await getTicket(interaction.channelId).catch(() => null);
  if (!ticket) return interaction.reply({ content: 'Este canal no corresponde a un ticket abierto.', flags: EPHEMERAL });
  if (!canCloseTicket(interaction, ticket)) return interaction.reply({ content: 'Solo el personal autorizado para este ticket puede generar el transcript.', flags: EPHEMERAL });
  await interaction.deferReply({ flags: EPHEMERAL });
  const sent = await sendTranscript(interaction.channel, interaction, ticket);
  return interaction.editReply({ content: sent ? 'Transcript generado y enviado al canal de logs.' : 'No se pudo encontrar el canal de logs configurado.' });
}

async function closeTicketWithReason(interaction, reason) {
  await interaction.deferReply({ flags: EPHEMERAL });
  try {
    const ticket = await getTicket(interaction.channelId);
    if (!ticket) return interaction.editReply({ content: 'Este ticket ya está cerrado o no existe.' });
    if (!canCloseTicket(interaction, ticket)) return interaction.editReply({ content: 'No tienes permiso para cerrar este tipo de ticket.' });

    const cleanReason = String(reason || '').trim();
    if (cleanReason.length < 5) return interaction.editReply({ content: 'El motivo de cierre debe tener al menos 5 caracteres.' });

    const channel = interaction.channel;
    await sendTranscript(channel, interaction, ticket, cleanReason).catch((error) => console.error('[HYPNOX] Ticket transcript error:', error));
    await updateTicket(ticket.id, { status: 'closed', closed_by_discord_user_id: interaction.user.id, closed_at: new Date().toISOString() });
    await addTicketEvent(ticket.id, interaction.user.id, 'closed', cleanReason, { assigned_to_discord_user_id: ticket.assigned_to_discord_user_id || null, reason: cleanReason });
    await writeLog({ guild: interaction.guild, category: 'ticket', action: 'close', actorId: interaction.user.id, channelId: channel.id, message: `Ticket ${ticket.id} cerrado. Motivo: ${cleanReason}`, metadata: { ticketId: ticket.id, reason: cleanReason, assignedTo: ticket.assigned_to_discord_user_id || null } });

    const embed = brandedEmbed('TICKET CERRADO', 'La atención de esta solicitud ha finalizado. El canal será eliminado en unos segundos.');
    embed.addFields({ name: '◆ CERRADO POR', value: `<@${interaction.user.id}>`, inline: true }, { name: '◆ MOTIVO', value: cleanReason, inline: false });
    embed.setFooter({ text: 'Hypnox Studios • Sistema de atención' });
    await channel.send({ embeds: [embed] }).catch(() => {});
    await interaction.editReply({ content: 'Ticket cerrado. El transcript fue procesado y el canal será eliminado en unos segundos.' });

    setTimeout(async () => {
      try { await channel.delete('Ticket cerrado'); }
      catch (error) { console.error(`[HYPNOX] No se pudo eliminar el canal del ticket ${channel.id}:`, error); await writeLog({ guild: interaction.guild, category: 'ticket', action: 'delete_failed', actorId: interaction.user.id, channelId: channel.id, message: error?.message || 'Error desconocido' }).catch(() => {}); }
    }, 2000);
  } catch (error) {
    console.error('[HYPNOX] Ticket close error:', error);
    return interaction.editReply({ content: 'No se pudo cerrar el ticket. El error fue registrado para revisión.' }).catch(() => {});
  }
}

module.exports = { canCloseTicket, buildCloseModal, showCloseModal, confirmClose, keepTicketOpen, generateTranscript, closeTicketWithReason };
