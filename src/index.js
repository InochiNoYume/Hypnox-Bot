require('dotenv').config();

const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { validateEnv, getEnv } = require('./config/env');
const supabase = require('./database/supabase');
const loadCommands = require('./handlers/loadCommands');
const registerEvents = require('./handlers/registerEvents');

async function bootstrap() {
  validateEnv();
  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
  client.commands = new Collection();
  loadCommands(client);
  registerEvents(client);

  client.once('ready', async () => {
    console.log(`[HYPNOX] Conectado como ${client.user.tag}`);
    const servers = [
      { discord_guild_id: getEnv('OFFICIAL_GUILD_ID'), guild_type: 'official', name: 'Hypnox Studios Official Discord' },
      { discord_guild_id: getEnv('STAFF_GUILD_ID'), guild_type: 'staff', name: 'Hypnox Studios Staff Team Discord' },
      { discord_guild_id: getEnv('APPLICATIONS_GUILD_ID'), guild_type: 'applications', name: 'Hypnox Studios Staff Applications Discord' }
    ];
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
