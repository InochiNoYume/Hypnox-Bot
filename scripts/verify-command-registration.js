require('dotenv').config();

const { REST, Routes } = require('discord.js');
const { getEnv, getGuildIds } = require('../src/config/env');
const { loadCommandData, expectedForGuild, commandsEqual } = require('../src/deploy-commands');

function validateDiscordRegistrationEnv() {
  const required = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID'];
  const missing = required.filter((key) => !getEnv(key));
  if (missing.length) throw new Error(`Variables de entorno faltantes para verificar comandos: ${missing.join(', ')}`);

  const idPattern = /^\d{17,20}$/;
  const invalid = ['DISCORD_CLIENT_ID', ...Object.keys(getGuildIds()).map((type) => `${type.toUpperCase()}_GUILD_ID`)]
    .filter((key) => key === 'DISCORD_CLIENT_ID' || getEnv(key))
    .map((key) => [key, key === 'DISCORD_CLIENT_ID' ? getEnv(key) : getGuildIds()[key.replace('_GUILD_ID', '').toLowerCase()]])
    .filter(([, value]) => value && !idPattern.test(String(value)))
    .map(([key]) => key);

  if (invalid.length) throw new Error(`Snowflakes de Discord inválidos: ${invalid.join(', ')}`);
}

async function verify() {
  validateDiscordRegistrationEnv();

  const rest = new REST({ version: '10' }).setToken(getEnv('DISCORD_TOKEN'));
  const guilds = Object.entries(getGuildIds()).filter(([, guildId]) => guildId);
  const commands = loadCommandData();

  if (!commands.length) throw new Error('No hay comandos para registrar.');

  let failed = false;

  for (const [guildType, guildId] of guilds) {
    try {
      const registered = await rest.get(
        Routes.applicationGuildCommands(getEnv('DISCORD_CLIENT_ID'), guildId)
      );
      const expected = expectedForGuild(commands, guildType);

      if (!commandsEqual(expected, registered || [])) {
        failed = true;
        const expectedNames = new Set(expected.map((command) => command.name));
        const registeredNames = new Set((registered || []).map((command) => command.name));
        const missing = [...expectedNames].filter((name) => !registeredNames.has(name));
        const stale = [...registeredNames].filter((name) => !expectedNames.has(name));
        console.error(`[HYPNOX][COMMANDS] ${guildType}: DESINCRONIZADO — faltan [${missing.join(', ')}] | sobran [${stale.join(', ')}] | esperados ${expected.length} | registrados ${registered.length}.`);
      } else {
        console.log(`[HYPNOX][COMMANDS] ${guildType}: OK — ${registered.length} comandos registrados.`);
      }
    } catch (error) {
      failed = true;
      console.error(`[HYPNOX][COMMANDS] ${guildType}: ERROR — ${error.message}`);
    }
  }

  if (failed) process.exitCode = 1;
}

if (require.main === module) {
  verify().catch((error) => {
    console.error('[HYPNOX][COMMANDS] Verificación fallida:', error.message);
    process.exit(1);
  });
}

module.exports = { verify, validateDiscordRegistrationEnv };