require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error('[HYPNOX] DISCORD_TOKEN no está configurado.');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', () => {
  console.log(`[HYPNOX] Conectado como ${client.user.tag}`);
  console.log(`[HYPNOX] Servidores: ${client.guilds.cache.size}`);
});

client.on('error', (error) => {
  console.error('[HYPNOX] Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('[HYPNOX] Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('[HYPNOX] Uncaught exception:', error);
});

client.login(token);
