require('dotenv').config();

const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const { validateEnv, getEnv } = require('./config/env');
const supabase = require('./database/supabase');
const loadCommands = require('./handlers/loadCommands');
const registerEvents = require('./handlers/registerEvents');
const registerPrefix = require('./handlers/registerPrefix');

async function registerSlashCommands(client) {
  const commands = [...client.commands.values()];
  const guilds = [
    ['official', getEnv('OFFICIAL_GUILD_ID')],
    ['staff', getEnv('STAFF_GUILD_ID')],
    ['applications', getEnv('APPLICATIONS_GUILD_ID')],
    ['dev', getEnv('DISCORD_DEV_GUILD_ID') || getEnv('DEV_GUILD_ID')]
  ].filter(([, guildId]) => guildId);

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  for (const [guildType, guildId] of guilds) {
    const body = commands
      .filter((command) => guildType === 'dev' || (command.guilds || ['official', 'staff', 'applications']).includes(guildType))
      .map((command) => command.data.toJSON());

    await rest.put(
      Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, guildId),
      { body }
    );

    console.log(`[HYPNOX] Slash commands registrados en ${guildType}: ${body.length}`);
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
  registerEvents(client);
  registerPrefix(client);

  client.once('clientReady', async () => {
    console.log(`[HYPNOX] Conectado como ${client.user.tag}`);

    try {
      await registerSlashCommands(client);
    } catch (error) {
      console.error('[HYPNOX] Error registrando slash commands:', error);
    }

    const servers = [
      { discord_guild_id: getEnv('OFFICIAL_GUILD_ID'), guild_type: 'official', name: 'Hypnox Studios Official Discord' },
      { discord_guild_id: getEnv('STAFF_GUILD_ID'), guild_type: 'staff', name: 'Hypnox Studios Staff Team Discord' },
      { discord_guild_id: getEnv('APPLICATIONS_GUILD_ID'), guild_type: 'applications', name: 'Hypnox Studios Staff Applications Discord' }
    ];
    const devGuildId = getEnv('DISCORD_DEV_GUILD_ID') || getEnv('DEV_GUILD_ID');
    if (devGuildId) servers.push({ discord_guild_id: devGuildId, guild_type: 'dev', name: 'Hypnox Studios Development Server' });

    const { error } = await supabase.from('guilds').upsert(servers, { onConflict: 'discord_guild_id' });
    if (error) console.error('[HYPNOX] Error sincronizando servidores:', error.message);
    else console.log('[HYPNOX] Servidores sincronizados con Supabase.');
  });

  client.on('error', error => console.error('[HYPNOX] Discord client error:', error));
  process.on('unhandledRejection', error => console.error('[HYPNOX] Unhandled rejection:', error));
  process.on('uncaughtException', error => console.error('[HYPNOX] Uncaught exception:', error));
  await client.login(process.env.DISCORD_TOKEN);
}

bootstrap().catch(error => {
  console.error('[HYPNOX] Error iniciando el bot:', error);
  process.exit(1);
});
