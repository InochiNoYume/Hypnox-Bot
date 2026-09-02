const { SlashCommandBuilder } = require('discord.js');
const { getGuildType } = require('../utils/guild');
const { hasAnyRole } = require('../utils/permissions');
const { canModerate, canBotModerate } = require('../utils/moderation');
const { createCase, getWarnings, deactivateCase } = require('../services/moderation');
const { writeLog } = require('../services/logs');

const roles = {
  helper: ['OFFICIAL_ROLE_HELPER_ID', 'STAFF_ROLE_HELPER_ID'],
  tmod: ['OFFICIAL_ROLE_TMOD_ID', 'STAFF_ROLE_TMOD_ID'],
  mod: ['OFFICIAL_ROLE_MOD_ID', 'STAFF_ROLE_MOD_ID'],
  srmod: ['OFFICIAL_ROLE_SRMOD_ID', 'STAFF_ROLE_SRMOD_ID'],
  direction: ['OFFICIAL_ROLE_FOUNDER_ID', 'OFFICIAL_ROLE_DIRECTOR_ID', 'OFFICIAL_ROLE_ADMINISTRATOR_ID', 'STAFF_ROLE_FOUNDER_ID', 'STAFF_ROLE_DIRECTOR_ID', 'STAFF_ROLE_ADMINISTRATOR_ID']
};

function allowed(member, level) {
  const order = { helper: 1, tmod: 2, mod: 3, srmod: 4, direction: 5 };
  const accepted = Object.entries(order).filter(([, value]) => value >= order[level]).flatMap(([key]) => roles[key]);
  return hasAnyRole(member, getGuildType(member.guild.id), accepted);
}

function base(name, description) {
  return new SlashCommandBuilder().setName(name).setDescription(description);
}

const command = base('moderacion', 'Herramientas de moderación de Hypnox Studios')
  .addSubcommand(s => s.setName('warn').setDescription('Advierte a un usuario').addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true)).addStringOption(o => o.setName('razon').setDescription('Razón').setRequired(false)))
  .addSubcommand(s => s.setName('warnings').setDescription('Consulta las advertencias de un usuario').addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true)))
  .addSubcommand(s => s.setName('unwarn').setDescription('Desactiva una advertencia').addStringOption(o => o.setName('id').setDescription('ID de la advertencia/caso').setRequired(true)))
  .addSubcommand(s => s.setName('timeout').setDescription('Aplica un timeout').addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true)).addIntegerOption(o => o.setName('minutos').setDescription('Duración en minutos').setMinValue(1).setMaxValue(40320).setRequired(true)).addStringOption(o => o.setName('razon').setDescription('Razón')))
  .addSubcommand(s => s.setName('clear').setDescription('Elimina mensajes recientes').addIntegerOption(o => o.setName('cantidad').setDescription('Cantidad de mensajes').setMinValue(1).setMaxValue(100).setRequired(true)))
  .addSubcommand(s => s.setName('slowmode').setDescription('Configura el slowmode').addIntegerOption(o => o.setName('segundos').setDescription('Segundos, 0 para desactivar').setMinValue(0).setMaxValue(21600).setRequired(true)))
  .addSubcommand(s => s.setName('kick').setDescription('Expulsa a un usuario').addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true)).addStringOption(o => o.setName('razon').setDescription('Razón')))
  .addSubcommand(s => s.setName('ban').setDescription('Banea a un usuario').addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true)).addStringOption(o => o.setName('razon').setDescription('Razón')));

async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const required = { warn: 'helper', warnings: 'helper', unwarn: 'tmod', timeout: 'tmod', clear: 'tmod', slowmode: 'tmod', kick: 'mod', ban: 'srmod' }[sub];
  if (!allowed(interaction.member, required)) return interaction.reply({ content: 'No tienes permisos para utilizar esta función.', ephemeral: true });

  const guild = interaction.guild;
  try {
    if (sub === 'warnings') {
      const user = interaction.options.getUser('usuario');
      const rows = await getWarnings(guild.id, user.id);
      const active = rows.filter(x => x.active);
      return interaction.reply({ embeds: [{ color: 0x000000, title: 'HYPNOX STUDIOS — ADVERTENCIAS', description: `Usuario: <@${user.id}>\nAdvertencias activas: **${active.length}**\n\n${active.slice(0, 10).map(x => `\`${x.id}\` — ${x.reason || 'Sin razón'}`).join('\n') || 'No registra advertencias activas.'}` }] });
    }

    if (sub === 'unwarn') {
      const id = interaction.options.getString('id');
      await deactivateCase(guild.id, id, interaction.user.id);
      await writeLog({ guild, category: 'moderation', action: 'unwarn', actorId: interaction.user.id, message: `Caso ${id} desactivado.` });
      return interaction.reply({ embeds: [{ color: 0x000000, title: 'HYPNOX STUDIOS', description: 'La advertencia fue desactivada correctamente.' }] });
    }

    if (sub === 'clear') {
      const amount = interaction.options.getInteger('cantidad');
      const deleted = await interaction.channel.bulkDelete(amount, true);
      await writeLog({ guild, category: 'moderation', action: 'clear', actorId: interaction.user.id, channelId: interaction.channel.id, message: `${deleted.size} mensajes eliminados.` });
      return interaction.reply({ content: `Se eliminaron ${deleted.size} mensajes.`, ephemeral: true });
    }

    if (sub === 'slowmode') {
      const seconds = interaction.options.getInteger('segundos');
      await interaction.channel.setRateLimitPerUser(seconds);
      await writeLog({ guild, category: 'moderation', action: 'slowmode', actorId: interaction.user.id, channelId: interaction.channel.id, message: `Slowmode configurado en ${seconds} segundos.` });
      return interaction.reply({ embeds: [{ color: 0x000000, title: 'HYPNOX STUDIOS', description: `Slowmode configurado en **${seconds} segundos**.` }] });
    }

    const user = interaction.options.getUser('usuario');
    const member = await guild.members.fetch(user.id).catch(() => null);
    const reason = interaction.options.getString('razon') || 'Sin razón especificada';
    if (!member || !canModerate(interaction.member, member)) return interaction.reply({ content: 'No puedes moderar a ese usuario por jerarquía.', ephemeral: true });

    if (sub === 'warn') {
      const row = await createCase({ guildId: guild.id, targetId: user.id, moderatorId: interaction.user.id, type: 'warn', reason });
      await writeLog({ guild, category: 'moderation', action: 'warn', actorId: interaction.user.id, targetId: user.id, message: reason, metadata: { caseId: row.id } });
      return interaction.reply({ embeds: [{ color: 0x000000, title: 'HYPNOX STUDIOS — ADVERTENCIA', description: `Se registró una advertencia para <@${user.id}>.\n**Razón:** ${reason}` }] });
    }

    if (!canBotModerate(member)) return interaction.reply({ content: 'El bot no puede aplicar esta acción debido a la jerarquía de roles.', ephemeral: true });

    if (sub === 'timeout') {
      const minutes = interaction.options.getInteger('minutos');
      await member.timeout(minutes * 60 * 1000, reason);
      await createCase({ guildId: guild.id, targetId: user.id, moderatorId: interaction.user.id, type: 'timeout', reason, durationSeconds: minutes * 60 });
      await writeLog({ guild, category: 'moderation', action: 'timeout', actorId: interaction.user.id, targetId: user.id, message: `${minutes} minutos — ${reason}` });
      return interaction.reply({ embeds: [{ color: 0x000000, title: 'HYPNOX STUDIOS — TIMEOUT', description: `<@${user.id}> recibió un timeout de **${minutes} minutos**.` }] });
    }

    if (sub === 'kick') {
      await member.kick(reason);
      await createCase({ guildId: guild.id, targetId: user.id, moderatorId: interaction.user.id, type: 'kick', reason });
      await writeLog({ guild, category: 'moderation', action: 'kick', actorId: interaction.user.id, targetId: user.id, message: reason });
      return interaction.reply({ embeds: [{ color: 0x000000, title: 'HYPNOX STUDIOS — KICK', description: `<@${user.id}> fue expulsado.` }] });
    }

    await member.ban({ reason, deleteMessageSeconds: 0 });
    await createCase({ guildId: guild.id, targetId: user.id, moderatorId: interaction.user.id, type: 'ban', reason });
    await writeLog({ guild, category: 'moderation', action: 'ban', actorId: interaction.user.id, targetId: user.id, message: reason });
    return interaction.reply({ embeds: [{ color: 0x000000, title: 'HYPNOX STUDIOS — BAN', description: `<@${user.id}> fue baneado.` }] });
  } catch (error) {
    console.error('Moderation error:', error);
    if (interaction.replied || interaction.deferred) return interaction.followUp({ content: 'No se pudo completar la acción.', ephemeral: true });
    return interaction.reply({ content: 'No se pudo completar la acción.', ephemeral: true });
  }
}

module.exports = { data: command, execute };
