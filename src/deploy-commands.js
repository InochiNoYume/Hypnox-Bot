require('dotenv').config();

const { REST, Routes } = require('discord.js');
const { validateEnv, getGuildIds, getEnv } = require('./config/env');
const { validateCommands } = require('./utils/validateCommands');
const loadCommands = require('./handlers/loadCommands');

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_ATTEMPTS = 3;
const DISCORD_RUNTIME_FIELDS = new Set(['id', 'application_id', 'guild_id', 'version']);

function withTimeout(promise, timeoutMs, message) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    })
  ]).finally(() => clearTimeout(timer));
}

function loadCommandData() {
  const client = { commands: new Map() };
  loadCommands(client);

  const commandErrors = validateCommands(client.commands);
  if (commandErrors.length) {
    throw new Error(`Definiciones de comandos inválidas: ${commandErrors.join(' | ')}`);
  }

  return [...client.commands.values()].map((command) => ({
    data: command.data,
    guilds: [...command.guilds]
  }));
}

function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !DISCORD_RUNTIME_FIELDS.has(key))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, val]) => [key, normalize(val)])
    );
  }
  return value;
}

function commandMap(commands) {
  return new Map((commands || []).map((command) => [command.name, normalize(command)]));
}

function commandsEqual(expected, registered) {
  const expectedMap = commandMap(expected);
  const registeredMap = commandMap(registered);
  if (expectedMap.size !== registeredMap.size) return false;

  for (const [name, command] of expectedMap) {
    if (!registeredMap.has(name)) return false;
    if (JSON.stringify(command) !== JSON.stringify(registeredMap.get(name))) return false;
  }
  return true;
}

function expectedForGuild(commands, guildType) {
  return commands
    .filter((command) => guildType === 'dev' || command.guilds.includes(guildType))
    .map((command) => command.data.toJSON());
}

async function requestWithRetry(request, label) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await withTimeout(request(), REQUEST_TIMEOUT_MS, `${label}: Discord REST no respondió en ${REQUEST_TIMEOUT_MS / 1000}s.`);
    } catch (error) {
      lastError = error;
      const status = Number(error?.status || error?.httpStatus || 0);
      const retryable = status === 429 || status >= 500 || !status;
      if (!retryable || attempt === MAX_ATTEMPTS) break;
      const delay = Math.min(1000 * 2 ** (attempt - 1), 4000);
      console.warn(`[HYPNOX][COMMANDS] ${label}: intento ${attempt}/${MAX_ATTEMPTS} falló; reintentando en ${delay}ms.`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  const status = lastError?.status ? ` [HTTP ${lastError.status}]` : '';
  const code = lastError?.code ? ` [Discord ${lastError.code}]` : '';
  const apiMessage = lastError?.rawError?.message || lastError?.message || String(lastError);
  throw new Error(`${label}${status}${code}: ${apiMessage}`);
}

async function syncGuildCommands(rest, guildType, guildId, commands) {
  const body = expectedForGuild(commands, guildType);
  if (guildType !== 'dev' && body.length === 0) {
    throw new Error(`No hay comandos configurados para la guild ${guildType}.`);
  }

  const route = Routes.applicationGuildCommands(getEnv('DISCORD_CLIENT_ID'), guildId);
  const registered = await requestWithRetry(() => rest.get(route), `${guildType} GET`);

  if (commandsEqual(body, registered || [])) {
    console.log(`[HYPNOX][COMMANDS] ${guildType}: ya está sincronizado (${body.length}).`);
    return { changed: false, count: body.length };
  }

  const updated = await requestWithRetry(() => rest.put(route, { body }), `${guildType} PUT`);
  const count = Array.isArray(updated) ? updated.length : body.length;
  console.log(`[HYPNOX][COMMANDS] ${guildType}: comandos registrados (${count}).`);
  return { changed: true, count };
}

async function deploy() {
  validateEnv();

  const rest = new REST({ version: '10' }).setToken(getEnv('DISCORD_TOKEN'));
  const guildIds = getGuildIds();
  const commands = loadCommandData();

  for (const [guildType, guildId] of Object.entries(guildIds)) {
    if (!guildId) continue;
    await syncGuildCommands(rest, guildType, guildId, commands);
  }
}

if (require.main === module) {
  deploy().catch((error) => {
    console.error('[HYPNOX][COMMANDS] Error registrando comandos:', error.message);
    process.exit(1);
  });
}

module.exports = { deploy, loadCommandData, expectedForGuild, commandsEqual, syncGuildCommands };