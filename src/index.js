require('dotenv').config();

const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const { validateEnv, getEnv } = require('./config/env');
const { getGuildType } = require('./utils/guild');
const { validateCommands } = require('./utils/validateCommands');
const supabase = require('./database/supabase');
const loadCommands = require('./handlers/loadCommands');
const registerEvents = require('./handlers/registerEvents');
const registerPrefix = require('./handlers/registerPrefix');
const { registerWelcome } = require('./handlers/registerWelcome');
const { configurePresence } = require('./utils/presence');

function getConfiguredGuilds() {
  return [
    ['official', getEnv('OFFICIAL_GUILD_ID')],
    ['staff', getEnv('STAFF_GUILD_ID')],
    ['applications', getEnv('APPLICATIONS_GUILD_ID')],
    ['dev', getEnv('DISCORD_DEV_GUILD_ID') || getEnv('DEV_GUILD_ID')]
  ].filter(([, guildId]) => guildId);
}

async function registerSlashCommands(client) {
  const commands = [...client.commands.values()];
  const commandErrors = validateCommands(client.commands);
  if (commandErrors.length) {
    throw new Error(`Definiciones de comandos inválidas: ${commandErrors.join(' | ')}`);
  }

  const guilds = getConfiguredGuilds();
  const rest = new REST({ version: '10' }).setToken(getEnv('DISCORD_TOKEN'));
  let failures = 0;

  console.log(`[HYPNOX] Verificando registro de slash commands en ${guilds.length} guild(s)...`);

  for (const [guildType, guildId] of guilds) {
    const body = commands
      .filter((command) => guildType === 'dev' || (command.guilds || ['official', 'staff', 'applications']).includes(guildType))
      .map((command) => command.data.toJSON());

    try {
      const guild = await client.guilds.fetch(guildId);
      console.log(`[HYPNOX] Guild ${guildType}: ${guild.name} (${guild.id}) — acceso OK.`);

      const registered = await rest.put(
        Routes.applicationGuildCommands(getEnv('DISCORD_CLIENT_ID'), guildId),
        { body }
      );

      const registeredCount = Array.isArray(registered) ? registered.length : 0;
      if (registeredCount !== body.length) {
        failures += 1;
        console.error(`[HYPNOX] Guild ${guildType}: registro incompleto. Esperados ${body.length}, Discord devolvió ${registeredCount}.`);
        continue;
      }

      const registeredNames = new Set(registered.map((command) => command.name));
      const missing = body.map((command) => command.name).filter((name) => !registeredNames.has(name));
      if (missing.length) {
        failures += 1;
        console.error(`[HYPNOX] Guild ${guildType}: faltan comandos después del registro: ${missing.join(', ')}.`);
        continue;
      }

      console.log(`[HYPNOX] Guild ${guildType}: ${registeredCount} slash commands registrados y verificados.`);
    } catch (error) {
      failures += 1;
      console.error(`[HYPNOX] Guild ${guildType} (${guildId}): error registrando comandos: ${error.message}`);
    }
  }

  if (failures) {
    console.error(`[HYPNOX] Registro de slash commands finalizado con ${failures} guild(s) con errores.`);
  } else {
    console.log('[HYPNOX] Registro de slash commands completado correctamente en todas las guilds configuradas.');
  }

  return { guilds: guilds.length, failures };
}

async function assignAutoRole(member, roleEnv, label) {
  const roleId = getEnv(roleEnv);
  if (!roleId || !member.guild.roles.cache.has(roleId)) {
    console.warn(`[HYPNOX] Autorole ${label} no configurado o no encontrado en ${member.guild.name}.`);
    return;
  }
  if (member.roles.cache.has(roleId)) return;

  try {
    await member.roles.add(roleId, `Autorole Hypnox — ${label}`);
    console.log(`[HYPNOX] Autorole asignado: ${label} -> ${member.user.tag} en ${member.guild.name}`);
  } catch (error) {
    console.error(`[HYPNOX] No se pudo asignar autorole ${label} a ${member.user.tag}:`, error.message);
  }
}

function registerAutoRoles(client) {
  client.on('guildMemberAdd', async (member) => {
    try {
      const guildType = getGuildType(member.guild.id);

      if (guildType === 'staff') {
        await assignAutoRole(member, 'STAFF_ROLE_TRAINEE_ID', 'Trainee');
        await assignAutoRole(member, 'STAFF_ROLE_FORMACION_ID', 'Formación');
      } else if (guildType === 'applications') {
        await assignAutoRole(member, 'APPLICATIONS_ROLE_APPLICANT_ID', 'Applicant');
      }
    } catch (error) {
      console.error('[HYPNOX] Error procesando autorole:', error);
    }
  });
}

function registerConnectionDiagnostics(client) {
  client.on('debug', (message) => {
    const text = String(message);
    if (/heartbeat|heartbeat acknowledged/i.test(text)) return;
    console.log(`[HYPNOX][DISCORD DEBUG] ${text}`);
  });

  client.on('warn', (message) => {
    console.warn(`[HYPNOX][DISCORD WARN] ${message}`);
  });

  client.on('shardError', (error) => {
    console.error('[HYPNOX][DISCORD SHARD ERROR]', error);
  });

  client.on('shardDisconnect', (event, shardId) => {
    console.warn(`[HYPNOX][DISCORD] Shard ${shardId} desconectado. Código ${event?.code ?? 'desconocido'}.`);
  });

  client.on('shardReconnecting', (shardId) => {
    console.warn(`[HYPNOX][DISCORD] Shard ${shardId} intentando reconectar...`);
  });

  client.on('invalidated', () => {
    console.error('[HYPNOX][DISCORD] La sesión fue invalidada. Será necesario volver a iniciar sesión.');
  });
}

async function verifyDiscordToken() {
  const token = getEnv('DISCORD_TOKEN');
  const clientId = getEnv('DISCORD_CLIENT_ID');
  const rest = new REST({ version: '10' }).setToken(token);

  console.log('[HYPNOX] Verificando credenciales de Discord mediante REST API...');

  try {
    const botUser = await Promise.race([
      rest.get(Routes.user()),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Discord REST no respondió dentro de 15 segundos.')), 15_000))
    ]);

    if (!botUser?.id) throw new Error('Discord no devolvió la identidad del bot.');
    if (clientId && botUser.id !== clientId) {
      throw new Error(`DISCORD_CLIENT_ID no coincide con el bot del token. Token pertenece a ${botUser.id}, pero DISCORD_CLIENT_ID es ${clientId}.`);
    }

    console.log(`[HYPNOX] Credenciales de Discord OK: ${botUser.username ?? botUser.global_name ?? 'bot'} (${botUser.id}).`);
    return botUser;
  } catch (error) {
    const status = error?.status || error?.rawError?.code;
    if (status === 401 || /401|unauthorized|invalid token/i.test(error?.message || '')) {
      throw new Error('DISCORD_TOKEN rechazado por Discord (401 Unauthorized). Genera/copía nuevamente el token del bot y actualízalo en Wispbyte.');
    }
    throw new Error(`No se pudo validar DISCORD_TOKEN con Discord: ${error.message}`);
  }
}

async function loginWithDiagnostics(client) {
  const timeoutMs = 45_000;
  let timer;

  console.log('[HYPNOX] Iniciando conexión con Discord Gateway...');
  console.log(`[HYPNOX] Token configurado: ${getEnv('DISCORD_TOKEN') ? 'sí' : 'no'}. Client ID configurado: ${getEnv('DISCORD_CLIENT_ID') ? 'sí' : 'no'}.`);

  try {
    await Promise.race([
      client.login(getEnv('DISCORD_TOKEN')),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`Discord Gateway no respondió dentro de ${timeoutMs / 1000} segundos. Revisa el token, la conectividad de Wispbyte y el acceso del bot a Discord.`));
        }, timeoutMs);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function bootstrap() {
  validateEnv();
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
  });

  client.commands = new Collection();
  loadCommands(client);

  const commandErrors = validateCommands(client.commands);
  if (commandErrors.length) {
    throw new Error(`Comandos inválidos: ${commandErrors.join(' | ')}`);
  }
  console.log(`[HYPNOX] Validación de comandos OK: ${client.commands.size} comandos.`);

  registerEvents(client);
  registerPrefix(client);
  registerAutoRoles(client);
  registerWelcome(client);
  configurePresence(client);
  registerConnectionDiagnostics(client);

  await verifyDiscordToken();
  await loginWithDiagnostics(client);
}

if (require.main === module) {
  bootstrap().catch(error => {
    console.error('[HYPNOX] Error iniciando el bot:', error);
    process.exit(1);
  });
}

module.exports = { bootstrap, registerSlashCommands, registerAutoRoles, registerConnectionDiagnostics, verifyDiscordToken, loginWithDiagnostics };
