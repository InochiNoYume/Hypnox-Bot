require('dotenv').config();

const { REST, Routes } = require('discord.js');
const { getGuildIds, getEnv } = require('./config/env');
const { validateCommands } = require('./utils/validateCommands');
const loadCommands = require('./handlers/loadCommands');

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_ATTEMPTS = 3;
const COMMAND_KEYS = new Set([
  'type',
  'name',
  'description',
  'options',
  'default_member_permissions',
  'dm_permission',
  'nsfw'
]);
const OPTION_KEYS = new Set([
  'type',
  'name',
  'description',
  'required',
  'choices',
  'options',
  'channel_types',
  'autocomplete',
  'min_value',
  'max_value',
  'min_length',
  'max_length'
]);

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

function normalizePrimitive(value, key) {
  if (key === 'default_member_permissions') {
    return value == null ? null : String(value);
  }
  return value;
}

function normalizeChoice(choice) {
  if (!choice || typeof choice !== 'object') return choice;
  const result = {};
  for (const key of ['name', 'value']) {
    if (key in choice) result[key] = normalize(choice[key], key);
  }
  return result;
}

function normalizeOption(option) {
  if (!option || typeof option !== 'object') return option;
  const result = {};
  for (const key of OPTION_KEYS) {
    if (!(key in option)) continue;
    const value = option[key];
    if (key === 'choices' && Array.isArray(value)) result[key] = value.map(normalizeChoice);
    else if (key === 'options' && Array.isArray(value)) result[key] = value.map(normalizeOption);
    else if (key === 'channel_types' && Array.isArray(value)) result[key] = [...value].map(Number).sort((a, b) => a - b);
    else result[key] = normalize(value, key);
  }
  return sortObject(result);
}

function sortObject(object) {
  return Object.fromEntries(Object.entries(object).sort(([a], [b]) => a.localeCompare(b)));
}

function normalize(value, key = null) {
  if (Array.isArray(value)) {
    return value.map((item) => normalize(item)).filter((item) => item !== undefined);
  }
  if (value && typeof value === 'object') {
    if (key && OPTION_KEYS.has(key)) return normalizeOption(value);
    const allowed = key === null ? COMMAND_KEYS : null;
    const result = {};
    for (const [childKey, childValue] of Object.entries(value)) {
      if (allowed && !allowed.has(childKey)) continue;
      if (childKey === 'options' && Array.isArray(childValue)) result[childKey] = childValue.map(normalizeOption);
      else if (childKey === 'default_member_permissions') result[childKey] = normalizePrimitive(childValue, childKey);
      else result[childKey] = normalize(childValue, childKey);
    }
    return sortObject(result);
  }
  return normalizePrimitive(value, key);
}

function commandMap(commands) {
  return new Map((commands || []).map((command) => [command.name, normalize(command)]));
}

function commandsEqual(expected, registered) {
  const expectedMap = commandMap(expected);
  const registeredMap = commandMap(registered);
  if (expectedMap.size !== registeredMap.size) return false;

  for (const [name, expectedCommand] of expectedMap) {
    if (!registeredMap.has(name)) return false;
    if (JSON.stringify(expectedCommand) !== JSON.stringify(registeredMap.get(name))) return false;
  }
  return true;
}

function commandDifferences(expected, registered) {
  const differences = [];
  const expectedMap = commandMap(expected);
  const registeredMap = commandMap(registered);

  for (const name of new Set([...expectedMap.keys(), ...registeredMap.keys()])) {
    if (!expectedMap.has(name)) {
      differences.push(`${name}: solo existe en Discord`);
      continue;
    }
    if (!registeredMap.has(name)) {
      differences.push(`${name}: solo existe en el código`);
      continue;
    }
    const expectedJson = JSON.stringify(expectedMap.get(name), null, 2);
    const registeredJson = JSON.stringify(registeredMap.get(name), null, 2);
    if (expectedJson !== registeredJson) {
      differences.push(`${name}: definición distinta`);
    }
  }

  return differences;
}

function expectedForGuild(commands, guildType) {
  return commands
    .filter((command) => guildType === 'dev' || command.guilds.includes(guildType))
    .map((command) => command.data.toJSON());
}

function validateDeployEnv() {
  const required = [
    'DISCORD_TOKEN',
    'DISCORD_CLIENT_ID',
    'OFFICIAL_GUILD_ID',
    'STAFF_GUILD_ID',
    'APPLICATIONS_GUILD_ID'
  ];
  const missing = required.filter((key) => !getEnv(key));
  if (missing.length) throw new Error(`Variables necesarias para registrar comandos faltantes: ${missing.join(', ')}`);

  const token = getEnv('DISCORD_TOKEN');
  if (/\s/.test(token)) throw new Error('DISCORD_TOKEN parece inválido: contiene espacios o saltos de línea.');

  const idPattern = /^\d{17,20}$/;
  const invalid = ['DISCORD_CLIENT_ID', 'OFFICIAL_GUILD_ID', 'STAFF_GUILD_ID', 'APPLICATIONS_GUILD_ID', 'DISCORD_DEV_GUILD_ID']
    .map((key) => [key, getEnv(key)])
    .filter(([, value]) => value && !idPattern.test(String(value)))
    .map(([key]) => key);

  if (invalid.length) throw new Error(`Snowflakes de Discord inválidos en: ${invalid.join(', ')}`);
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

  const differences = commandDifferences(body, registered || []);
  if (differences.length) {
    console.warn(`[HYPNOX][COMMANDS] ${guildType}: diferencias detectadas — ${differences.join(' | ')}`);
  }

  const updated = await requestWithRetry(() => rest.put(route, { body }), `${guildType} PUT`);
  const count = Array.isArray(updated) ? updated.length : body.length;
  console.log(`[HYPNOX][COMMANDS] ${guildType}: comandos registrados (${count}).`);
  return { changed: true, count };
}

async function deploy() {
  validateDeployEnv();

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

module.exports = { deploy, loadCommandData, expectedForGuild, commandsEqual, syncGuildCommands, validateDeployEnv, normalize, commandDifferences };