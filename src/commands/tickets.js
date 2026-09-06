const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, MessageFlags, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getTicket, getTicketCreatorDiscordId, updateTicket, addTicketEvent } = require('../services/tickets');
const { requestTicketRating, getStaffTicketHistory } = require('../services/ticketRatings');
const { writeLog } = require('../services/logs');
const { getEnv } = require('../config/env');
const { hasConfiguredRole } = require('../utils/permissions');
const { brandedEmbed } = require('../utils/embeds');
const { showCloseModal } = require('../services/ticketClosing');

const EPHEMERAL = MessageFlags.Ephemeral;

const STAFF_ROLE_ENVS = [
  'OFFICIAL_ROLE_FOUNDER_ID','OFFICIAL_ROLE_DIRECTOR_ID','OFFICIAL_ROLE_ADMINISTRATOR_ID',
  'OFFICIAL_ROLE_DEVELOPER_ID','OFFICIAL_ROLE_PRODUCER_ID',
  'OFFICIAL_ROLE_SRMOD_ID','OFFICIAL_ROLE_MOD_ID','OFFICIAL_ROLE_TMOD_ID','OFFICIAL_ROLE_HELPER_ID'
];
const HISTORY_LEADERSHIP_ROLES = ['OFFICIAL_ROLE_FOUNDER_ID','OFFICIAL_ROLE_DIRECTOR_ID','OFFICIAL_ROLE_ADMINISTRATOR_ID'];

const TICKET_ACCESS = {
  support: ['OFFICIAL_ROLE_FOUNDER_ID','OFFICIAL_ROLE_DIRECTOR_ID','OFFICIAL_ROLE_ADMINISTRATOR_ID','OFFICIAL_ROLE_SRMOD_ID','OFFICIAL_ROLE_MOD_ID','OFFICIAL_ROLE_TMOD_ID','OFFICIAL_ROLE_HELPER_ID'],
  report: ['OFFICIAL_ROLE_FOUNDER_ID','OFFICIAL_ROLE_DIRECTOR_ID','OFFICIAL_ROLE_ADMINISTRATOR_ID','OFFICIAL_ROLE_SRMOD_ID','OFFICIAL_ROLE_MOD_ID','OFFICIAL_ROLE_TMOD_ID'],
  alliance_partner: ['OFFICIAL_ROLE_FOUNDER_ID','OFFICIAL_ROLE_DIRECTOR_ID','OFFICIAL_ROLE_ADMINISTRATOR_ID','OFFICIAL_ROLE_SRMOD_ID','OFFICIAL_ROLE_MOD_ID','OFFICIAL_ROLE_TMOD_ID','OFFICIAL_ROLE_HELPER_ID'],
  contact: ['OFFICIAL_ROLE_FOUNDER_ID','OFFICIAL_ROLE_DIRECTOR_ID','OFFICIAL_ROLE_ADMINISTRATOR_ID'],
  bugs: ['OFFICIAL_ROLE_FOUNDER_ID','OFFICIAL_ROLE_DIRECTOR_ID','OFFICIAL_ROLE_ADMINISTRATOR_ID','OFFICIAL_ROLE_DEVELOPER_ID','OFFICIAL_ROLE_PRODUCER_ID'],
  boost: STAFF_ROLE_ENVS
};

const data = new SlashCommandBuilder()
  .setName('tickets')
  .setDescription('Gestiona el sistema de atención del servidor oficial.')
  .addSubcommand((s) => s.setName('panel').setDescription('Publica el panel de atención.'))
  .addSubcommand((s) => s.setName('cerrar').setDescription('Solicita el motivo y cierra el ticket actual.'))
  .addSubcommand((s) => s.setName('claim').setDescription('Reclama el ticket actual.'))
  .addSubcommand((s) => s.setName('valorar').setDescription('Solicita al autor una valoración de la atención recibida.'))
  .addSubcommand((s) => s.setName('historial').setDescription('Consulta el rendimiento histórico de un miembro del Staff.').addUserOption((o) => o.setName('usuario').setDescription('Staff que deseas consultar.')))
  .addSubcommand((s) => s.setName('add').setDescription('Añade un usuario al ticket.').addUserOption((o) => o.setName('usuario').setDescription('Usuario que tendrá acceso.').setRequired(true)))
  .addSubcommand((s) => s.setName('remove').setDescription('Retira un usuario del ticket.').addUserOption((o) => o.setName('usuario').setDescription('Usuario al que se retirará el acceso.').setRequired(true)));

const labels = {
  soporte: 'Soporte',
  reporte: 'Reporte',
  alianza: 'Alianza / Partner',
  contacto: 'Contacto',
  bugs: 'Bugs / Errores',
  boost: 'Reclamar Beneficios Boost'
};

const select = () => new ActionRowBuilder().addComponents(
  new StringSelectMenuBuilder()
    .setCustomId('hypnox_ticket_type')
    .setPlaceholder('Selecciona el área que necesitas')
    .addOptions(Object.entries(labels).map(([value, label]) => ({
      label,
      value,
      description: `Abrir una solicitud de ${label.toLowerCase()}`
    })))
);

function ratingButton(ticketId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`hypnox_ticket_rating:${ticketId}`).setLabel('Valorar ticket').setStyle(ButtonStyle.Primary)
  );
}

function isStaff(i) {
  return STAFF_ROLE_ENVS.some((env) => hasConfiguredRole(i.member, env));
}

function isLeadership(i) {
  return HISTORY_LEADERSHIP_ROLES.some((env) => hasConfiguredRole(i.member, env));
}

function canHandleTicket(i, ticket) {
  const roles = TICKET_ACCESS[ticket?.ticket_type] || [];
  return roles.some((env) => hasConfiguredRole(i.member, env));
}

function isConfiguredStaffUser(guild, userId) {
  return guild.members.cache.get(userId)?.roles.cache.some((role) => STAFF_ROLE_ENVS.some((env) => getEnv(env) === role.id)) || false;
}

function formatRating(value) {
  return value ? `${value}/5` : 'Sin valoraciones';
}

function buildHistoryEmbed(member, history) {
  const embed = brandedEmbed('HISTORIAL DE STAFF', 'Registro de desempeño basado en tickets reclamados, tickets resueltos y valoraciones de usuarios.');
  embed.addFields(
    { name: '◆ STAFF', value: `<@${member.id}>`, inline: false },
    { name: '◆ PUNTAJE DE DESEMPEÑO', value: `**${history.score}/100**\n${history.performanceLevel}`, inline: false },
    { name: '◆ TICKETS RECLAMADOS', value: String(history.claimed), inline: true },
    { name: '◆ TICKETS RESUELTOS', value: String(history.resolved), inline: true },
    { name: '◆ VALORACIONES', value: String(history.ratings), inline: true },
    { name: '◆ PROMEDIO', value: formatRating(history.average), inline: true },
    { name: '◆ DISTRIBUCIÓN', value: `5/5: ${history.distribution[5]} · 4/5: ${history.distribution[4]} · 3/5: ${history.distribution[3]} · 2/5: ${history.distribution[2]} · 1/5: ${history.distribution[1]}`, inline: false }
  );
  const recent = history.recentRatings.slice(0, 5);
  if (recent.length) embed.addFields({ name: '◆ VALORACIONES RECIENTES', value: recent.map((row) => `${row.rating}/5 · ${row.justification}`).join('\n').slice(0, 1024), inline: false });
  embed.setFooter({ text: 'Hypnox Studios • Evaluación de Staff' });
  return embed;
}

async function execute(i) {
  const sub = i.options.getSubcommand();

  if (sub === 'panel') {
    if (!isStaff(i)) return i.reply({ content: 'No tienes permisos para publicar el panel.', flags: EPHEMERAL });
    const id = getEnv('OFFICIAL_CHANNEL_TICKETS_ID');
    const ch = id ? await i.guild.channels.fetch(id).catch(() => null) : i.channel;
    if (!ch?.isTextBased()) return i.reply({ content: 'Configura OFFICIAL_CHANNEL_TICKETS_ID.', flags: EPHEMERAL });
    const embed = brandedEmbed('CENTRO DE ATENCIÓN', [
      '**HYPNOX STUDIOS**', '',
      'Este es el centro oficial de atención de nuestra comunidad. Selecciona el área correspondiente para crear una solicitud y comunicarte directamente con el equipo encargado.', '',
      '╭━━━━━━━━━━━━━━━━━━━━━━╮', '        **ÁREAS DE ATENCIÓN**', '╰━━━━━━━━━━━━━━━━━━━━━━╯', '',
      '◆ **Soporte**', '> Consultas, problemas generales, dudas sobre el servidor o asistencia con algún funcionamiento de la comunidad.', '',
      '◆ **Reporte**', '> Informa situaciones que requieran revisión por parte del equipo de moderación. Incluye toda la información necesaria.', '',
      '◆ **Alianza / Partner**', '> Solicitudes de colaboración, alianzas y propuestas entre Hypnox Studios y otras comunidades o proyectos.', '',
      '◆ **Contacto**', '> Comunicación directa con la dirección para asuntos administrativos o institucionales.', '',
      '◆ **Bugs / Errores**', '> Reporta errores técnicos, fallos de funcionamiento o problemas relacionados con sistemas, contenido o desarrollo. Estos casos serán revisados por Developer y Producer, además de la Dirección y Administración.', '',
      '◆ **Reclamar Beneficios Boost**', '> Solicita los beneficios correspondientes por apoyar y boostear el servidor. Esta área está disponible exclusivamente para miembros que tengan el rol Boost.', '',
      '╭━━━━━━━━━━━━━━━━━━━━━━╮', '       **ANTES DE CREAR UN TICKET**', '╰━━━━━━━━━━━━━━━━━━━━━━╯', '',
      '> Selecciona únicamente el motivo que corresponda a tu solicitud.',
      '> Explica tu situación de forma clara y proporciona los datos necesarios.',
      '> En Bugs / Errores, incluye pasos para reproducir el problema y evidencia cuando sea posible.',
      '> No abras múltiples tickets para el mismo asunto.',
      '> Mantén una comunicación respetuosa durante toda la atención.', '',
      'Una vez creado el ticket, el equipo correspondiente podrá revisar tu solicitud y atenderla dentro de este canal.'
    ].join('\n'));
    embed.setFooter({ text: 'Hypnox Studios • Centro oficial de atención' });
    const image = getEnv('OFFICIAL_IMAGE_TICKETS') || getEnv('OFFICIAL_IMAGE_BANNER');
    if (image) embed.setImage(image);
    await ch.send({ embeds: [embed], components: [select()] });
    return i.reply({ content: 'Panel de atención publicado.', flags: EPHEMERAL });
  }

  if (sub === 'historial') {
    if (!isStaff(i)) return i.reply({ content: 'Solo el personal autorizado puede consultar historiales de Staff.', flags: EPHEMERAL });
    const target = i.options.getUser('usuario') || i.user;
    if (target.id !== i.user.id && !isLeadership(i)) return i.reply({ content: 'Solo Dirección, Administración o Founder pueden consultar el historial de otro miembro del Staff.', flags: EPHEMERAL });
    const member = await i.guild.members.fetch(target.id).catch(() => null);
    if (!member || !isConfiguredStaffUser(i.guild, target.id)) return i.reply({ content: 'El usuario indicado no tiene un rol de Staff configurado.', flags: EPHEMERAL });
    await i.deferReply({ flags: EPHEMERAL });
    try {
      const guildRow = await require('../services/guilds').getGuildRow(i.guild.id);
      if (!guildRow) return i.editReply({ content: 'Servidor no registrado.' });
      const history = await getStaffTicketHistory(guildRow.id, target.id);
      return i.editReply({ embeds: [buildHistoryEmbed(member, history)] });
    } catch (error) {
      console.error('[HYPNOX] Ticket history error:', error);
      return i.editReply({ content: 'No se pudo consultar el historial de Staff. El error fue registrado para revisión.' }).catch(() => {});
    }
  }

  if (sub === 'cerrar') return showCloseModal(i);

  if (sub === 'valorar') {
    if (!isStaff(i)) return i.reply({ content: 'Solo el personal autorizado puede solicitar una valoración.', flags: EPHEMERAL });
    await i.deferReply({ flags: EPHEMERAL });
    try {
      const ticket = await getTicket(i.channel.id);
      if (!ticket) return i.editReply({ content: 'Este canal no corresponde a un ticket abierto.' });
      if (!canHandleTicket(i, ticket)) return i.editReply({ content: 'No tienes permiso para gestionar este tipo de ticket.' });
      if (ticket.assigned_to_discord_user_id !== i.user.id) return i.editReply({ content: 'Solo el Staff que reclamó este ticket puede solicitar su valoración.' });
      const creatorDiscordId = await getTicketCreatorDiscordId(ticket);
      if (!creatorDiscordId) return i.editReply({ content: 'No se pudo identificar al autor del ticket.' });
      await requestTicketRating(ticket.id, i.user.id);
      const embed = brandedEmbed('VALORACIÓN DE ATENCIÓN', `La atención de este ticket fue realizada por **${i.member.displayName || i.user.username}**.\n\nQueremos conocer cómo fue tu experiencia con la información y atención entregadas por el Staff.`);
      embed.addFields({ name: '◆ STAFF QUE ATENDIÓ', value: `<@${i.user.id}>`, inline: true }, { name: '◆ SOLICITANTE', value: `<@${creatorDiscordId}>`, inline: true }, { name: '◆ VALORACIÓN', value: 'Del 1 al 5, indica qué tan buena fue la información y atención recibida.', inline: false });
      embed.setFooter({ text: 'Hypnox Studios • Evaluación de atención' });
      await i.channel.send({ content: `<@${creatorDiscordId}>`, allowedMentions: { users: [creatorDiscordId] }, embeds: [embed], components: [ratingButton(ticket.id)] });
      await addTicketEvent(ticket.id, i.user.id, 'message', 'Solicitud de valoración enviada al autor.', { rating_requested: true });
      await writeLog({ guild: i.guild, category: 'ticket', action: 'rating_requested', actorId: i.user.id, channelId: i.channel.id, metadata: { ticketId: ticket.id, ratedUserId: creatorDiscordId } });
      return i.editReply({ content: `Se solicitó la valoración a <@${creatorDiscordId}>.` });
    } catch (error) {
      const messages = { RATING_ALREADY_REQUESTED: 'La valoración ya fue solicitada para este ticket.', TICKET_ALREADY_RATED: 'Este ticket ya tiene una valoración registrada.', TICKET_NOT_ASSIGNED: 'Este ticket todavía no ha sido reclamado.', TICKET_NOT_ASSIGNED_TO_YOU: 'Solo el Staff que reclamó este ticket puede solicitar la valoración.', TICKET_CREATOR_NOT_FOUND: 'No se pudo identificar al autor del ticket.' };
      console.error('[HYPNOX] Ticket rating request error:', error);
      return i.editReply({ content: messages[error?.message] || 'No se pudo solicitar la valoración. El error fue registrado para revisión.' }).catch(() => {});
    }
  }

  const ticket = await getTicket(i.channel.id);
  if (!ticket) return i.reply({ content: 'Este canal no es un ticket activo.', flags: EPHEMERAL });
  const creatorDiscordId = await getTicketCreatorDiscordId(ticket);
  if (!canHandleTicket(i, ticket)) return i.reply({ content: 'No tienes permiso para gestionar este tipo de ticket.', flags: EPHEMERAL });

  if (sub === 'claim') {
    if (ticket.assigned_to_discord_user_id) return i.reply({ content: `Este ticket ya fue reclamado por <@${ticket.assigned_to_discord_user_id}>.`, flags: EPHEMERAL });
    try {
      await updateTicket(ticket.id, { assigned_to_discord_user_id: i.user.id });
    } catch (error) {
      if (error?.message === 'TICKET_ALREADY_ASSIGNED' || error?.code === 'P0001') {
        const current = await getTicket(i.channel.id).catch(() => null);
        if (current?.assigned_to_discord_user_id) return i.reply({ content: `Este ticket ya fue reclamado por <@${current.assigned_to_discord_user_id}>.`, flags: EPHEMERAL });
      }
      throw error;
    }
    await hideStaffFromTicket(i.channel, i.user.id);
    if (creatorDiscordId) await i.channel.permissionOverwrites.edit(creatorDiscordId, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
    await addTicketEvent(ticket.id, i.user.id, 'assigned').catch((error) => console.error('[HYPNOX] No se pudo registrar asignación de ticket:', error?.message || error));
    await writeLog({ guild: i.guild, category: 'ticket', action: 'claim', actorId: i.user.id, channelId: i.channel.id });
    return i.reply({ content: `Ticket reclamado por <@${i.user.id}>.` });
  }

  const user = i.options.getUser('usuario');
  if (sub === 'add') {
    await i.channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
    await addTicketEvent(ticket.id, i.user.id, 'message', `Usuario añadido: ${user.id}`).catch((error) => console.error('[HYPNOX] No se pudo registrar usuario añadido:', error?.message || error));
    await writeLog({ guild: i.guild, category: 'ticket', action: 'add_member', actorId: i.user.id, targetId: user.id, channelId: i.channel.id });
    return i.reply({ content: `Se añadió a <@${user.id}>.` });
  }

  await i.channel.permissionOverwrites.delete(user.id).catch(() => {});
  await addTicketEvent(ticket.id, i.user.id, 'message', `Usuario retirado: ${user.id}`).catch((error) => console.error('[HYPNOX] No se pudo registrar usuario retirado:', error?.message || error));
  await writeLog({ guild: i.guild, category: 'ticket', action: 'remove_member', actorId: i.user.id, targetId: user.id, channelId: i.channel.id });
  return i.reply({ content: `Se retiró a <@${user.id}>.` });
}

function hideStaffFromTicket(channel, claimedUserId) {
  return Promise.all(STAFF_ROLE_ENVS.map(async (env) => {
    const roleId = getEnv(env);
    if (!roleId || !channel.guild.roles.cache.has(roleId)) return;
    await channel.permissionOverwrites.edit(roleId, { ViewChannel: false, SendMessages: false, ReadMessageHistory: false }).catch(() => {});
  })).then(() => claimedUserId ? channel.permissionOverwrites.edit(claimedUserId, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true }) : null);
}

module.exports = { data, execute, select, labels, guilds: ['official'] };
