const { getGuildType } = require('../utils/guild');
const { hasConfiguredRole } = require('../utils/permissions');

const PREFIX = 'H!';

function extractUserIds(content) {
  return [...String(content || '').matchAll(/<@!?(\d{17,20})>/g)].map((match) => match[1]);
}

function extractChannelId(content) {
  return String(content || '').match(/<#(\d{17,20})>/)?.[1] || null;
}

function extractRoleId(content) {
  return String(content || '').match(/<@&(\d{17,20})>/)?.[1] || null;
}

function getOptionDefinitions(command, subcommand) {
  const options = command?.data?.options || [];
  const sub = options.find((option) => option.type === 1 && option.name === subcommand);
  return sub?.options || options.filter((option) => option.type !== 1 && option.type !== 2);
}

function createPrefixOptions(message, command, subcommand, args) {
  const definitions = getOptionDefinitions(command, subcommand);
  const optionValues = {};
  let positionalIndex = 0;

  for (let index = 0; index < definitions.length; index += 1) {
    const definition = definitions[index];
    const type = definition.type;

    if (type === 6) {
      const ids = extractUserIds(args.join(' '));
      optionValues[definition.name] = ids[positionalIndex] || null;
      positionalIndex += 1;
      continue;
    }

    if (type === 7) {
      optionValues[definition.name] = extractChannelId(args.join(' '));
      continue;
    }

    if (type === 8) {
      optionValues[definition.name] = extractRoleId(args.join(' '));
      continue;
    }

    const isLastDefinition = index === definitions.length - 1;
    const value = isLastDefinition && type === 3
      ? args.slice(positionalIndex).join(' ')
      : args[positionalIndex];

    if (type === 4 || type === 10) {
      const parsed = Number(value);
      optionValues[definition.name] = Number.isFinite(parsed) ? parsed : null;
    } else if (type === 5) {
      optionValues[definition.name] = value == null
        ? null
        : ['true', 'sí', 'si', '1', 'yes'].includes(String(value).toLowerCase());
    } else {
      optionValues[definition.name] = value ?? null;
    }

    positionalIndex += isLastDefinition && type === 3
      ? Math.max(args.length - positionalIndex, 1)
      : 1;
  }

  const getRaw = (name) => optionValues[name] ?? null;

  return {
    getSubcommand: () => subcommand || 'inicio',
    getString: (name) => {
      const value = getRaw(name);
      return value == null ? null : String(value);
    },
    getInteger: (name) => {
      const value = getRaw(name);
      return value == null ? null : Number.parseInt(value, 10);
    },
    getNumber: (name) => {
      const value = getRaw(name);
      return value == null ? null : Number(value);
    },
    getUser: (name) => {
      const id = getRaw(name);
      return id
        ? message.guild.members.cache.get(id)?.user || message.client.users.cache.get(id) || { id }
        : null;
    },
    getUsers: () => extractUserIds(args.join(' ')).map(
      (id) => message.guild.members.cache.get(id)?.user || message.client.users.cache.get(id) || { id }
    ),
    getChannel: (name) => {
      const id = getRaw(name);
      return id ? message.guild.channels.cache.get(id) || { id } : null;
    },
    getRole: (name) => {
      const id = getRaw(name);
      return id ? message.guild.roles.cache.get(id) || { id } : null;
    },
    getBoolean: (name) => {
      const value = getRaw(name);
      if (value == null) return null;
      return ['true', 'sí', 'si', '1', 'yes'].includes(String(value).toLowerCase());
    }
  };
}

function createPrefixInteraction(message, command, commandName, args) {
  const guild = message.guild;
  const subcommands = (command.data.options || []).filter((option) => option.type === 1);
  const requestedSubcommand = subcommands.length ? args[0]?.toLowerCase() : null;
  const subcommand = requestedSubcommand && subcommands.some((option) => option.name === requestedSubcommand)
    ? requestedSubcommand
    : null;
  const optionArgs = subcommand ? args.slice(1) : args;
  const state = { replied: false, deferred: false, replyMessage: null };

  const reply = async (payload) => {
    const sent = await message.reply(payload);
    state.replied = true;
    state.replyMessage = sent;
    return sent;
  };

  const followUp = async (payload) => {
    const sent = await message.channel.send(payload);
    state.replyMessage = state.replyMessage || sent;
    return sent;
  };

  const editReply = async (payload) => {
    if (state.replyMessage?.editable) return state.replyMessage.edit(payload);
    return reply(payload);
  };

  const deleteReply = async () => {
    if (state.replyMessage?.deletable) {
      await state.replyMessage.delete().catch(() => {});
      state.replyMessage = null;
    }
  };

  return {
    commandName,
    guildId: guild.id,
    guild,
    member: message.member,
    memberPermissions: message.member?.permissions || null,
    user: message.author,
    channel: message.channel,
    channelId: message.channel.id,
    message,
    options: createPrefixOptions(message, command, subcommand, optionArgs),
    get replied() { return state.replied; },
    get deferred() { return state.deferred; },
    reply,
    followUp,
    deferReply: async () => { state.deferred = true; },
    editReply,
    deleteReply
  };
}

function canUseCommand(interaction, command, guildType) {
  if (guildType === 'dev') return true;
  if (!command.access?.roleEnvs?.length) return true;
  return command.access.roleEnvs.some((roleEnv) => hasConfiguredRole(interaction.member, roleEnv));
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
  if (!guildType || (guildType !== 'dev' && !(command.guilds || ['official', 'staff', 'applications']).includes(guildType))) {
    return message.reply('Este comando no está disponible en este servidor.');
  }

  if (!canUseCommand({ member: message.member }, command, guildType)) {
    return message.reply('No tienes el rol necesario para usar este comando.');
  }

  const interaction = createPrefixInteraction(message, command, commandName, parts);
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
