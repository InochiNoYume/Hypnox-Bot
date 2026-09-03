require('dotenv').config();

const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { validateEnv, getEnv, getGuildIds } = require('./config/env');
const { getGuildType } = require('./utils/guild');
const { validateCommands } = require('./utils/validateCommands');
const { loadCommandData, syncGuildCommands } = require('./deploy-commands');
const supabase = require('./database/supabase');
const loadCommands = require('./handlers/loadCommands');
const registerEvents = require('./handlers/registerEvents');
const registerPrefix = require('./handlers/registerPrefix');
const { registerWelcome } = require('./handlers/registerWelcome');
const { configurePresence } = require('./utils/presence');

const REQUEST_TIMEOUT_MS = 15_000;

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
  const failures = [];
  const rest = require('./deploy-commands').createRestClient
    ? require('./deploy-commands').createRestClient()
    : null;

  if (!rest) {
    const { REST } = require('discord.js');
    const clientRest = new REST({ version: '10' }).setToken(getEnv('DISCORD_TOKEN'));
    for (const [guildType, guildId] of guilds) {
      try {
        const guild = await withTimeout(client.guilds.fetch(guildId), REQUEST_TIMEOUT_MS, `Discord no respondió al consultar ${guildType}.`);
        await syncGuildCommands(clientRest, guildType, guildId, commands);
        console.log(`[HYPNOX][COMMANDS] ${guildType}: ${guild.name} (${guildId}).`);
      } catch (error) {
        failures.push(guildType);
        console.error(`[HYPNOX][COMMANDS] ${guildType} (${guildId}): ${error.message}`);
      }
    }
  }

  if (failures.length) {
    console.error(`[HYPNOX][COMMANDS] Sincronización incompleta: ${failures.join(', ')}.`);
  } else {
    console.log(`[HYPNOX][COMMANDS] Sincronización completada en ${guilds.length} guild(s).`);
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
  const debugEnabled = getEnv('DEBUG', 'false').toLowerCase() === 'true';

  if (debugEnabled) {
    client.on('debug', (message) => {
      let text = String(message);
      const token = getEnv('DISCORD_TOKEN');
      if (token) text = text.replaceAll(token, '[REDACTED]');
      text = text.replace(/(provided token:\s*)\S+/gi, '$1[REDACTED]');
      if (/heartbeat|heartbeat acknowledged/i.test(text)) return;
      console.log(`[HYPNOX][DISCORD DEBUG] ${text}`);
    });
  }

  client.on('warn', (message) => console.warn(`[HYPNOX][DISCORD WARN] ${message}`));
  client.on('shardError', (error) => console.error('[HYPNOX][DISCORD SHARD ERROR]', error));
  client.on('shardDisconnect', (event, shardId) => console.warn(`[HYPNOX][DISCORD] Shard ${shardId} desconectado. Código ${event?.code ?? 'desconocido'}.`));
  client.on('shardReconnecting', (shardId) => console.warn(`[HYPNOX][DISCORD] Shard ${shardId} intentando reconectar...`));
  client.on('invalidated', () => console.error('[HYPNOX][DISCORD] La sesión fue invalidada. Será necesario volver a iniciar sesión.'));
}

async function verifyDiscordToken() {
  const token = getEnv('DISCORD_TOKEN');
  if (!token) throw new Error('DISCORD_TOKEN no está configurado.');
  console.log('[HYPNOX][TOKEN] Token de Discord presente. Se validará mediante el Gateway.');
}

async function loginWithDiagnostics(client) {
  const timeoutMs = 45_000;
  console.log('[HYPNOX][GATEWAY] Iniciando conexión con Discord Gateway...');
  console.log(`[HYPNOX][TOKEN] Token configurado: ${getEnv('DISCORD_TOKEN') ? 'sí' : 'no'}. Client ID configurado: ${getEnv('DISCORD_CLIENT_ID') ? 'sí' : 'no'}.`);

  try {
    await withTimeout(
      client.login(getEnv('DISCORD_TOKEN')),
      timeoutMs,
      `Discord Gateway no respondió dentro de ${timeoutMs / 1000} segundos. Revisa token, conectividad de Wispbyte e intents privilegiados.`
    );
    console.log('[HYPNOX][GATEWAY] Login aceptado. Esperando clientReady...');
  } catch (error) {
    const message = error?.message || String(error);
    throw new Error(`Gateway/Login falló: ${message}`);
  }
}

async function syncGuildsToSupabase(client) {
  const configured = getConfiguredGuilds();
  const servers = [];

  for (const [guildType, guildId] of configured) {
    try {
      const guild = await withTimeout(client.guilds.fetch(guildId), REQUEST_TIMEOUT_MS, `Discord no respondió al consultar ${guildType}.`);
      servers.push({
        discord_guild_id: guild.id,
        guild_type: guildType,
        name: guild.name,
        enabled: true
      });
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

  try {
    await registerSlashCommands(client);
  } catch (error) {
    console.error('[HYPNOX][COMMANDS] ERROR:', error.message);
  }

  try {
    await syncGuildsToSupabase(client);
  } catch (error) {
    console.error('[HYPNOX][SUPABASE] Error sincronizando servidores:', error.message);
  }

  try {
    await verifySupabaseConnection();
  } catch (error) {
    console.error('[HYPNOX][SUPABASE] ERROR:', error.message);
  }
}

async function bootstrap() {
  validateEnv();
  console.log('[HYPNOX][ENV] Variables de entorno validadas.');

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
  if (commandErrors.length) throw new Error(`Comandos inválidos: ${commandErrors.join(' | ')}`);
  console.log(`[HYPNOX][COMMANDS] Validación OK: ${client.commands.size} comandos cargados.`);

  registerEvents(client);
  registerPrefix(client);
  registerAutoRoles(client);
  registerWelcome(client);
  configurePresence(client);
  registerConnectionDiagnostics(client);

  client.once('clientReady', () => {
    handleClientReady(client).catch((error) => console.error('[HYPNOX][READY] Error inesperado:', error));
  });

  client.on('error', (error) => console.error('[HYPNOX][DISCORD] Client error:', error));
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

module.exports = { bootstrap, registerSlashCommands, registerAutoRoles, registerConnectionDiagnostics, verifyDiscordToken, loginWithDiagnostics, verifySupabaseConnection, syncGuildsToSupabase };