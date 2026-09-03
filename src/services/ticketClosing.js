const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const { getEnv } = require('../config/env');
const { getTicket, updateTicket, addTicketEvent } = require('./tickets');
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

function canCloseTicket(interaction, ticket) {
  const roles = TICKET_ACCESS[ticket?.ticket_type] || [];
  return roles.some((roleEnv) => hasConfiguredRole(interaction.member, roleEnv));
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
  const ticket = await getTicket(interaction.channelId);
  if (!ticket) return interaction.reply({ content: 'Este canal no corresponde a un ticket abierto.', flags: EPHEMERAL });
  if (!canCloseTicket(interaction, ticket)) return interaction.reply({ content: 'No tienes permiso para cerrar este ticket.', flags: EPHEMERAL });
  return interaction.showModal(buildCloseModal());
}

async function closeTicketWithReason(interaction, reason) {
  const ticket = await getTicket(interaction.channelId);
  if (!ticket) return interaction.reply({ content: 'Este ticket ya está cerrado o no existe.', flags: EPHEMERAL });
  if (!canCloseTicket(interaction, ticket)) return interaction.reply({ content: 'No tienes permiso para cerrar este ticket.', flags: EPHEMERAL });

  const cleanReason = String(reason || '').trim();
  if (cleanReason.length < 5) return interaction.reply({ content: 'El motivo de cierre debe tener al menos 5 caracteres.', flags: EPHEMERAL });

  const channel = interaction.channel;
  await updateTicket(ticket.id, {
    status: 'closed',
    closed_by_discord_user_id: interaction.user.id,
    closed_at: new Date().toISOString()
  });
  await addTicketEvent(ticket.id, interaction.user.id, 'closed', cleanReason, {
    assigned_to_discord_user_id: ticket.assigned_to_discord_user_id || null,
    reason: cleanReason
  });
  await writeLog({
    guild: interaction.guild,
    category: 'ticket',
    action: 'close',
    actorId: interaction.user.id,
    channelId: channel.id,
    message: `Ticket ${ticket.id} cerrado. Motivo: ${cleanReason}`,
    metadata: { ticketId: ticket.id, reason: cleanReason, assignedTo: ticket.assigned_to_discord_user_id || null }
  });

  const embed = brandedEmbed('TICKET CERRADO', 'La atención de esta solicitud ha finalizado. El canal será eliminado en unos segundos.');
  embed.addFields(
    { name: '◆ CERRADO POR', value: `<@${interaction.user.id}>`, inline: true },
    { name: '◆ MOTIVO', value: cleanReason, inline: false }
  );
  embed.setFooter({ text: 'Hypnox Studios • Sistema de atención' });
  await channel.send({ embeds: [embed] }).catch(() => {});

  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({ content: 'Ticket cerrado. El canal será eliminado en unos segundos.' }).catch(() => {});
  } else {
    await interaction.reply({ content: 'Ticket cerrado. El canal será eliminado en unos segundos.', flags: EPHEMERAL });
  }

  setTimeout(async () => {
    try {
      await channel.delete('Ticket cerrado');
    } catch (error) {
      console.error(`[HYPNOX] No se pudo eliminar el canal del ticket ${channel.id}:`, error);
      await writeLog({ guild: interaction.guild, category: 'ticket', action: 'delete_failed', actorId: interaction.user.id, channelId: channel.id, message: error?.message || 'Error desconocido' }).catch(() => {});
    }
  }, 2000);
}

module.exports = { canCloseTicket, buildCloseModal, showCloseModal, closeTicketWithReason };
