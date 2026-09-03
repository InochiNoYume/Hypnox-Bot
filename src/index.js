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
  console.log('[HYPNOX] Verificando conexión con Supabase...');
  const startedAt = Date.now();
  const { error } = await withTimeout(
    supabase.from('guilds').select('id').limit(1),
    15_000,
    'Supabase no respondió dentro de 15 segundos.'
  );

  if (error) {
    throw new Error(`Supabase no está correctamente configurado o accesible: ${error.message}`);
  }

  console.log(`[HYPNOX] Supabase conectado correctamente (${Date.now() - startedAt} ms).`);
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

      const registered = await withTimeout(
        rest.put(Routes.applicationGuildCommands(getEnv('DISCORD_CLIENT_ID'), guildId), { body }),
        15_000,
        `Discord REST no respondió al registrar comandos de ${guildType}.`
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
  client.on('warn', (message) => console.warn(`[HYPNOX][DISCORD WARN] ${message}`));
  client.on('shardError', (error) => console.error('[HYPNOX][DISCORD SHARD ERROR]', error));
  client.on('shardDisconnect', (event, shardId) => console.warn(`[HYPNOX][DISCORD] Shard ${shardId} desconectado. Código ${event?.code ?? 'desconocido'}.`));
  client.on('shardReconnecting', (shardId) => console.warn(`[HYPNOX][DISCORD] Shard ${shardId} intentando reconectar...`));
  client.on('invalidated', () => console.error('[HYPNOX][DISCORD] La sesión fue invalidada. Será necesario volver a iniciar sesión.'));
}

async function verifyDiscordToken() {
  const token = getEnv('DISCORD_TOKEN');
  if (!token) throw new Error('DISCORD_TOKEN no está configurado.');
  console.log('[HYPNOX] Token de Discord presente. Se validará mediante el Gateway.');
}

async function loginWithDiagnostics(client) {
  const timeoutMs = 45_000;
  console.log('[HYPNOX] Iniciando conexión con Discord Gateway...');
  console.log(`[HYPNOX] Token configurado: ${getEnv('DISCORD_TOKEN') ? 'sí' : 'no'}. Client ID configurado: ${getEnv('DISCORD_CLIENT_ID') ? 'sí' : 'no'}.`);

  try {
    await withTimeout(
      client.login(getEnv('DISCORD_TOKEN')),
      timeoutMs,
      `Discord Gateway no respondió dentro de ${timeoutMs / 1000} segundos. Revisa el token, la conectividad de Wispbyte y el acceso a intents privilegiados.`
    );
    console.log('[HYPNOX] Inicio de sesión solicitado correctamente. Esperando clientReady...');
  } catch (error) {
    const message = error?.message || String(error);
    throw new Error(`No se pudo iniciar sesión en Discord: ${message}`);
  }
}

async function handleClientReady(client) {
  console.log(`[HYPNOX] CONECTADO COMO ${client.user.tag} (${client.user.id})`);

  try {
    await registerSlashCommands(client);
  } catch (error) {
    console.error('[HYPNOX] Error durante el registro de slash commands:', error);
  }

  try {
    const servers = [
      { discord_guild_id: getEnv('OFFICIAL_GUILD_ID'), guild_type: 'official', name: 'Hypnox Studios Official Discord' },
      { discord_guild_id: getEnv('STAFF_GUILD_ID'), guild_type: 'staff', name: 'Hypnox Studios Staff Team Discord' },
      { discord_guild_id: getEnv('APPLICATIONS_GUILD_ID'), guild_type: 'applications', name: 'Hypnox Studios Staff Applications Discord' }
    ];
    const devGuildId = getEnv('DISCORD_DEV_GUILD_ID') || getEnv('DEV_GUILD_ID');
    if (devGuildId) servers.push({ discord_guild_id: devGuildId, guild_type: 'dev', name: 'Hypnox Studios Development Server' });

    const validServers = servers.filter((server) => server.discord_guild_id);
    const { error } = await withTimeout(
      supabase.from('guilds').upsert(validServers, { onConflict: 'discord_guild_id' }),
      15_000,
      'Supabase no respondió al sincronizar servidores.'
    );
    if (error) throw error;
    console.log('[HYPNOX] Servidores sincronizados con Supabase.');
  } catch (error) {
    console.error('[HYPNOX] Error sincronizando servidores con Supabase:', error.message);
  }

  try {
    await verifySupabaseConnection();
  } catch (error) {
    console.error('[HYPNOX] Supabase está fuera de servicio o mal configurado, pero Discord permanece conectado:', error.message);
  }
}

async function bootstrap() {
  validateEnv();
  console.log('[HYPNOX] Variables de entorno validadas.');

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
  console.log(`[HYPNOX] Validación de comandos OK: ${client.commands.size} comandos.`);

  registerEvents(client);
  registerPrefix(client);
  registerAutoRoles(client);
  registerWelcome(client);
  configurePresence(client);
  registerConnectionDiagnostics(client);

  client.once('clientReady', () => {
    handleClientReady(client).catch((error) => console.error('[HYPNOX] Error inesperado en clientReady:', error));
  });

  client.on('error', error => console.error('[HYPNOX] Discord client error:', error));
  process.on('unhandledRejection', error => console.error('[HYPNOX] Unhandled rejection:', error));
  process.on('uncaughtException', error => console.error('[HYPNOX] Uncaught exception:', error));

  await verifyDiscordToken();
  await loginWithDiagnostics(client);
}

if (require.main === module) {
  bootstrap().catch(error => {
    console.error('[HYPNOX] Error iniciando el bot:', error);
    process.exit(1);
  });
}

module.exports = { bootstrap, registerSlashCommands, registerAutoRoles, registerConnectionDiagnostics, verifyDiscordToken, loginWithDiagnostics, verifySupabaseConnection };
