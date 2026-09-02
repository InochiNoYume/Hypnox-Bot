const { ChannelType, PermissionFlagsBits } = require('discord.js');
const { getGuildType } = require('../utils/guild');
const { hasConfiguredRole } = require('../utils/permissions');
const { getEnv } = require('../config/env');
const { createTicket, addTicketEvent } = require('../services/tickets');
const { writeLog } = require('../services/logs');
const { ensureUser } = require('../services/moderation');
const supabase = require('../database/supabase');

const STAFF_ROLE_ENVS = [
  'OFFICIAL_ROLE_FOUNDER_ID', 'OFFICIAL_ROLE_DIRECTOR_ID', 'OFFICIAL_ROLE_ADMINISTRATOR_ID',
  'OFFICIAL_ROLE_SRMOD_ID', 'OFFICIAL_ROLE_MOD_ID', 'OFFICIAL_ROLE_TMOD_ID', 'OFFICIAL_ROLE_HELPER_ID'
];

function commandAccessAllowed(interaction, command, guildType) {
  if (guildType === 'dev') return true;
  if (!command.access?.roleEnvs?.length) return true;
  return command.access.roleEnvs.some((roleEnv) => hasConfiguredRole(interaction.member, roleEnv));
}

function ticketStaffRoleIds(guild) {
  return STAFF_ROLE_ENVS.map((env) => getEnv(env)).filter((id) => id && guild.roles.cache.has(id));
}

function ticketChannelName(type, username, userId) {
  const clean = (value) => String(value).replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  return `${clean(type) || 'ticket'}-${clean(username) || userId}`.slice(0, 100);
}

function registerEvents(client) {
  client.on('interactionCreate', async (interaction) => {
    try {
      if (interaction.isButton() && interaction.customId.startsWith('hypnox_giveaway:')) {
        const id = interaction.customId.split(':')[1];
        const { data: giveaway } = await supabase.from('giveaways').select('id,status,ends_at').eq('id', id).maybeSingle();
        if (!giveaway || giveaway.status !== 'active' || new Date(giveaway.ends_at) <= new Date()) return interaction.reply({ content: 'Este sorteo ya finalizó.', ephemeral: true });
        const user = await ensureUser(interaction.user);
        const { error } = await supabase.from('giveaway_entries').insert({ giveaway_id: id, user_id: user.id });
        if (error?.code === '23505') return interaction.reply({ content: 'Ya estás participando en este sorteo.', ephemeral: true });
        if (error) throw error;
        return interaction.reply({ content: 'Tu participación fue registrada.', ephemeral: true });
      }

      if (interaction.isStringSelectMenu() && interaction.customId === 'hypnox_ticket_type') {
        if (getGuildType(interaction.guildId) !== 'official') return interaction.reply({ content: 'El sistema de tickets solo está disponible en el servidor oficial.', ephemeral: true });
        const type = interaction.values[0];
        const categoryId = getEnv('OFFICIAL_CHANNEL_TICKETS_CATEGORY_ID');
        const category = categoryId ? await interaction.guild.channels.fetch(categoryId).catch(() => null) : null;
        if (!category || category.type !== ChannelType.GuildCategory) return interaction.reply({ content: 'El sistema de tickets no está configurado correctamente: falta la categoría de tickets.', ephemeral: true });

        const staffRoleIds = ticketStaffRoleIds(interaction.guild);
        const permissionOverwrites = [
          { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
          ...staffRoleIds.map((id) => ({ id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }))
        ];

        const channel = await interaction.guild.channels.create({ name: ticketChannelName(type, interaction.user.username, interaction.user.id), type: ChannelType.GuildText, parent: category.id, permissionOverwrites });
        try {
          const ticket = await createTicket({ guildId: interaction.guild.id, channelId: channel.id, creator: interaction.user, type, subtype: type === 'alianza' ? 'alianza_partner' : null });
          await addTicketEvent(ticket.id, interaction.user.id, 'created', type);
          await writeLog({ guild: interaction.guild, category: 'ticket', action: 'create', actorId: interaction.user.id, channelId: channel.id, message: type });
          await channel.send({ content: `<@${interaction.user.id}>`, embeds: [{ color: 0, title: `HYPNOX STUDIOS — ${type === 'alianza' ? 'ALIANZA / PARTNER' : type.toUpperCase()}`, description: 'Describe tu solicitud con el mayor detalle posible. Un miembro del equipo te atenderá.' }] });
          return interaction.reply({ content: `Tu ticket fue creado: <#${channel.id}>`, ephemeral: true });
        } catch (error) {
          await channel.delete().catch(() => {});
          throw error;
        }
      }

      if (!interaction.isChatInputCommand()) return;
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      const guildType = interaction.guildId ? getGuildType(interaction.guildId) : null;
      if (!guildType || (guildType !== 'dev' && !(command.guilds || ['official', 'staff', 'applications']).includes(guildType))) return interaction.reply({ content: 'Este comando no está disponible en este servidor.', ephemeral: true });
      if (!commandAccessAllowed(interaction, command, guildType)) return interaction.reply({ content: 'No tienes el rol necesario para usar este comando.', ephemeral: true });
      await command.execute(interaction, client);
    } catch (error) {
      console.error('[HYPNOX] Interaction error:', error);
      const payload = { content: 'No se pudo completar la acción.', ephemeral: true };
      if (interaction.replied || interaction.deferred) await interaction.followUp(payload).catch(() => {});
      else await interaction.reply(payload).catch(() => {});
    }
  });
}

module.exports = registerEvents;
