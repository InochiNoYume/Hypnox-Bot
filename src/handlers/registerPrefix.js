const { getGuildType } = require('../utils/guild');
const { hasConfiguredRole } = require('../utils/permissions');

const PREFIX = 'H!';

const COMMUNITY_COMMANDS = new Set(['user', 'serverinfo', 'credits', 'info', 'reglas', 'roles', 'links', 'help']);

function canUseCommand(interaction, command) {
  if (!command.access?.roleEnvs?.length) return true;
  return command.access.roleEnvs.some((roleEnv) => hasConfiguredRole(interaction.member, roleEnv));
}

function makePrefixInteraction(message, commandName, args) {
  const member = message.member;
  const guild = message.guild;
  const options = {
    getSubcommand: () => args[0] || 'inicio',
    getString: (name) => {
      const index = command.data?.options?.findIndex?.((option) => option.name === name);
      return index >= 0 ? args[index + 1] : undefined;
    },
    getUser: () => null,
    getUsers: () => []
  };

  return {
    commandName,
    guildId: guild.id,
    guild,
    member,
    user: message.author,
    channel: message.channel,
    options,
    replied: false,
    deferred: false,
    reply: async (payload) => {
      const sent = await message.reply(payload);
      interaction.replied = true;
      return sent;
    },
    followUp: async (payload) => message.reply(payload)
  };
}

async function handlePrefixMessage(client, message) {
  if (message.author.bot || !message.guild) return;
  if (!message.content.startsWith(PREFIX)) return;

  const raw = message.content.slice(PREFIX.length).trim();
  if (!raw) return;

  const parts = raw.split(/\s+/);
  const commandName = parts.shift().toLowerCase();
  const command = client.commands.get(commandName);
  if (!command) return;

  const guildType = getGuildType(message.guild.id);
  if (!guildType || !(command.guilds || ['official', 'staff', 'applications']).includes(guildType)) {
    return message.reply('Este comando no está disponible en este servidor.');
  }

  if (!canUseCommand({ member: message.member }, command)) {
    return message.reply('No tienes el rol necesario para usar este comando.');
  }

  const interaction = makePrefixInteraction(message, commandName, parts);
  await command.execute(interaction, client);
}

function registerPrefix(client) {
  client.on('messageCreate', (message) => {
    handlePrefixMessage(client, message).catch((error) => {
      console.error('[HYPNOX] Prefix command error:', error);
      if (!message.author.bot) message.reply('No se pudo completar la acción.').catch(() => {});
    });
  });

  console.log(`[HYPNOX] Prefix habilitado: ${PREFIX}`);
}

module.exports = registerPrefix;
