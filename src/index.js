require('dotenv').config();

const { Client, GatewayIntentBits, Collection, REST, Events } = require('discord.js');
const { validateEnv, getEnv, getGuildIds } = require('./config/env');
const { getGuildType } = require('./utils/guild');
const { validateCommands } = require('./utils/validateCommands');
const { loadCommandData, syncGuildCommands } = require('./deploy-commands');
const supabase = require('./database/supabase');
const loadCommands = require('./handlers/loadCommands');
const registerEvents = require('./handlers/registerEvents');
const registerPrefix = require('./handlers/registerPrefix');
const { registerWelcome } = require('./handlers/registerWelcome');
const { registerPolls } = require('./handlers/registerPolls');
const { registerScheduledAnnouncements } = require('./handlers/registerScheduledAnnouncements');
const { configurePresence } = require('./utils/presence');

const REQUEST_TIMEOUT_MS = 15_000;
const GATEWAY_WAIT_MS = 45_000;
const GATEWAY_HTTP_TIMEOUT_MS = 10_000;
const READY_WATCHDOG_MS = 60_000;
const schedulerClients = new WeakSet();

function getConfiguredGuilds() {
  return Object.entries(getGuildIds()).filter(([, guildId]) => guildId);
}

async function withTimeout(promise, timeoutMs, message) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function verifySupabaseConnection() {
  console.log('[HYPNOX][SUPABASE] Verificando conexión...');
  const startedAt = Date.now();
  const { error } = await withTimeout(
    supabase.from('guilds').select('id').limit(1),
    REQUEST_TIMEOUT_MS,
    'Supabase no respondió dentro de 15 segundos.'
  );
  if (error) throw new Error(`Supabase no está correctamente configurado o accesible: ${error.message}`);
  console.log(`[HYPNOX][SUPABASE] Conexión OK (${Date.now() - startedAt} ms).`);
}

async function registerSlashCommands(client) {
  const commands = loadCommandData();
  const guilds = getConfiguredGuilds();
  const rest = new REST({ version: '10' }).setToken(getEnv('DISCORD_TOKEN'));
  const failures = [];

  console.log(`[HYPNOX][COMMANDS] Sincronizando ${guilds.length} guild(s)...`);

  for (const [guildType, guildId] of guilds) {
    try {
      const guild = await withTimeout(
        client.guilds.fetch(guildId),
        REQUEST_TIMEOUT_MS,
        `Discord no respondió al consultar ${guildType}.`
      );
      await syncGuildCommands(rest, guildType, guildId, commands);
      console.log(`[HYPNOX][COMMANDS] ${guildType}: ${guild.name} (${guildId}) — OK.`);
    } catch (error) {
      failures.push(guildType);
      console.error(`[HYPNOX][COMMANDS] ${guildType} (${guildId}): ${error.message}`);
    }
  }

  if (failures.length) console.error(`[HYPNOX][COMMANDS] Sincronización incompleta: ${failures.join(', ')}.`);
  else console.log('[HYPNOX][COMMANDS] Sincronización completada correctamente.');

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
  client.on(Events.GuildMemberAdd, async (member) => {
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
  const debugEnabled = getEnv('DEBUG', 'false').toLowerCase() === 'true';

  client.on(Events.Debug, (message) => {
    let text = String(message);
    const token = getEnv('DISCORD_TOKEN');
    if (token) text = text.replaceAll(token, '[REDACTED]');
    text = text.replace(/(provided token:\s*)\S+/gi, '$1[REDACTED]');

    if (/heartbeat/i.test(text) && !/heartbeat.*fail|heartbeat.*timeout/i.test(text)) return;
    if (!debugEnabled && !/(WebSocket|Gateway|HELLO|IDENTIFY|READY|RESUM|CLOSE|connect|disconnect)/i.test(text)) return;
    console.log(`[HYPNOX][DISCORD DEBUG] ${text}`);
  });

  client.on(Events.Warn, (message) => console.warn(`[HYPNOX][DISCORD WARN] ${message}`));
  client.on(Events.Error, (error) => console.error('[HYPNOX][DISCORD ERROR]', error));
  client.on(Events.ShardError, (error, shardId) => console.error(`[HYPNOX][DISCORD SHARD ERROR] shard=${shardId}`, error));
  client.on(Events.ShardDisconnect, (event, shardId) => console.warn(`[HYPNOX][DISCORD] Shard ${shardId} desconectado. Código ${event?.code ?? 'desconocido'}, razón: ${event?.reason || 'N/D'}.`));
  client.on(Events.ShardReconnecting, (shardId) => console.warn(`[HYPNOX][DISCORD] Shard ${shardId} intentando reconectar...`));
  client.on(Events.ShardReady, (shardId, unavailableGuilds) => console.log(`[HYPNOX][DISCORD] Shard ${shardId} lista. Guilds no disponibles: ${unavailableGuilds?.size ?? 0}.`));
  client.on(Events.Invalidated, () => console.error('[HYPNOX][DISCORD] La sesión fue invalidada. Será necesario volver a iniciar sesión.'));
}

async function verifyDiscordToken() {
  const token = getEnv('DISCORD_TOKEN');
  if (!token) throw new Error('DISCORD_TOKEN no está configurado.');
  console.log('[HYPNOX][TOKEN] Token de Discord presente. Se validará mediante el Gateway.');
}

async function checkDiscordGatewayHttp() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GATEWAY_HTTP_TIMEOUT_MS);
  const startedAt = Date.now();

  try {
    const response = await fetch('https://discord.com/api/v10/gateway', {
      method: 'GET',
      signal: controller.signal,
      headers: { 'User-Agent': 'Hypnox-Bot/1.0' }
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${body.slice(0, 300)}`);
    console.log(`[HYPNOX][GATEWAY] HTTPS de Discord disponible (${Date.now() - startedAt} ms).`);
    return true;
  } catch (error) {
    console.warn(`[HYPNOX][GATEWAY] Preflight HTTPS falló (${Date.now() - startedAt} ms): ${error?.message || error}. Se continuará con discord.js.`);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function waitForClientReady(client, timeoutMs = GATEWAY_WAIT_MS) {
  if (client.isReady()) return true;

  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      client.off(Events.ClientReady, onReady);
      resolve(false);
    }, timeoutMs);

    const onReady = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(true);
    };

    client.once(Events.ClientReady, onReady);
  });
}

async function loginWithDiagnostics(client) {
  const token = getEnv('DISCORD_TOKEN');
  console.log('[HYPNOX][GATEWAY] Iniciando conexión con Discord Gateway...');
  console.log(`[HYPNOX][TOKEN] Token configurado: ${token ? 'sí' : 'no'}. Client ID configurado: ${getEnv('DISCORD_CLIENT_ID') ? 'sí' : 'no'}.`);

  await checkDiscordGatewayHttp();

  const loginPromise = client.login(token);
  loginPromise.catch((error) => {
    console.error('[HYPNOX][GATEWAY] client.login() rechazó la conexión:', error?.message || error);
  });

  try {
    const result = await Promise.race([
      loginPromise,
      new Promise((resolve) => setTimeout(() => resolve(Symbol('gateway-timeout')), GATEWAY_WAIT_MS))
    ]);

    if (typeof result === 'symbol') {
      console.warn(`[HYPNOX][GATEWAY] El login no terminó dentro de ${GATEWAY_WAIT_MS / 1000}s. El proceso continuará para permitir la reconexión automática de discord.js.`);
    } else {
      console.log('[HYPNOX][GATEWAY] client.login() resolvió correctamente.');
    }
  } catch (error) {
    throw new Error(`Gateway/Login falló: ${error?.message || String(error)}`);
  }

  if (client.isReady()) {
    console.log('[HYPNOX][GATEWAY] READY recibido.');
    return true;
  }

  const ready = await waitForClientReady(client, READY_WATCHDOG_MS);
  if (!ready) console.warn(`[HYPNOX][GATEWAY] Sin READY después de ${(GATEWAY_WAIT_MS + READY_WATCHDOG_MS) / 1000}s. No se finalizará el proceso automáticamente.`);
  return ready;
}

async function syncGuildsToSupabase(client) {
  const configured = getConfiguredGuilds();
  const servers = [];

  for (const [guildType, guildId] of configured) {
    try {
      const guild = await withTimeout(
        client.guilds.fetch(guildId),
        REQUEST_TIMEOUT_MS,
        `Discord no respondió al consultar ${guildType}.`
      );
      servers.push({ discord_guild_id: guild.id, guild_type: guildType, name: guild.name, enabled: true });
    } catch (error) {
      console.error(`[HYPNOX][SUPABASE] No se pudo obtener ${guildType} (${guildId}): ${error.message}`);
    }
  }

  if (!servers.length) throw new Error('No se pudo obtener ninguna guild configurada desde Discord.');

  const { error } = await withTimeout(
    supabase.from('guilds').upsert(servers, { onConflict: 'discord_guild_id' }),
    REQUEST_TIMEOUT_MS,
    'Supabase no respondió al sincronizar servidores.'
  );
  if (error) throw error;
  console.log(`[HYPNOX][SUPABASE] ${servers.length} servidor(es) sincronizado(s) correctamente.`);
}

async function handleClientReady(client) {
  console.log(`[HYPNOX][READY] CONECTADO COMO ${client.user.tag} (${client.user.id})`);

  const syncOnReady = getEnv('SYNC_COMMANDS_ON_READY', 'false').toLowerCase() === 'true';
  if (syncOnReady) {
    try {
      await registerSlashCommands(client);
    } catch (error) {
      console.error('[HYPNOX][COMMANDS] ERROR:', error.message);
    }
  } else {
    console.log('[HYPNOX][COMMANDS] Sincronización automática omitida; el Gateway no depende de REST.');
  }

  try { await syncGuildsToSupabase(client); }
  catch (error) { console.error('[HYPNOX][SUPABASE] Error sincronizando servidores:', error.message); }

  try { await verifySupabaseConnection(); }
  catch (error) { console.error('[HYPNOX][SUPABASE] ERROR:', error.message); }

  if (!schedulerClients.has(client)) {
    schedulerClients.add(client);
    registerScheduledAnnouncements(client);
  }
}

function registerGracefulShutdown(client) {
  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[HYPNOX][PROCESS] Señal ${signal} recibida. Cerrando el cliente de Discord...`);
    try { client.destroy(); }
    finally { process.exitCode = 0; }
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

function patchGatewayBotRequest(client, gatewayInformation) {
  if (!client?.rest || typeof client.rest.get !== 'function') {
    throw new Error('No se pudo acceder al REST de discord.js para configurar el Gateway.');
  }

  const originalGet = client.rest.get.bind(client.rest);
  let gatewayRequestCount = 0;

  client.rest.get = async (route, options) => {
    if (String(route) === '/gateway/bot') {
      gatewayRequestCount += 1;
      console.log(`[HYPNOX][GATEWAY] Gateway Bot local (${gatewayRequestCount}) — evitando /gateway/bot por HTTP.`);
      return gatewayInformation;
    }

    return originalGet(route, options);
  };

  console.log('[HYPNOX][GATEWAY] Fallback /gateway/bot configurado sobre REST de discord.js.');
}

async function bootstrap() {
  validateEnv();
  console.log('[HYPNOX][ENV] Variables de entorno validadas.');

  const gatewayInformation = {
    url: 'wss://gateway.discord.gg',
    shards: 1,
    session_start_limit: {
      total: 1000,
      remaining: 1000,
      reset_after: 0,
      max_concurrency: 1
    }
  };

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ],
    ws: {
      shardCount: 1
    }
  });

  patchGatewayBotRequest(client, gatewayInformation);

  client.commands = new Collection();
  loadCommands(client);

  const commandErrors = validateCommands(client.commands);
  if (commandErrors.length) throw new Error(`Comandos inválidos: ${commandErrors.join(' | ')}`);
  console.log(`[HYPNOX][COMMANDS] Validación OK: ${client.commands.size} comandos cargados.`);

  registerEvents(client);
  registerPolls(client);
  registerPrefix(client);
  registerAutoRoles(client);
  registerWelcome(client);
  configurePresence(client);
  registerConnectionDiagnostics(client);
  registerGracefulShutdown(client);

  client.once(Events.ClientReady, () => {
    handleClientReady(client).catch((error) => console.error('[HYPNOX][READY] Error inesperado:', error));
  });

  process.on('unhandledRejection', (error) => console.error('[HYPNOX][PROCESS] Unhandled rejection:', error));
  process.on('uncaughtException', (error) => {
    console.error('[HYPNOX][PROCESS] Uncaught exception:', error);
    process.exitCode = 1;
  });

  await verifyDiscordToken();
  await loginWithDiagnostics(client);
}

if (require.main === module) {
  bootstrap().catch((error) => {
    console.error('[HYPNOX] Error iniciando el bot:', error);
    process.exit(1);
  });
}

module.exports = {
  bootstrap,
  registerSlashCommands,
  registerAutoRoles,
  registerConnectionDiagnostics,
  verifyDiscordToken,
  loginWithDiagnostics,
  verifySupabaseConnection,
  syncGuildsToSupabase,
  checkDiscordGatewayHttp,
  waitForClientReady
};