require('dotenv').config();

const { REST, Routes } = require('discord.js');
const { getEnv, getGuildIds } = require('../src/config/env');
const { loadCommandData, expectedForGuild, commandsEqual, commandDifferences } = require('../src/deploy-commands');

function validateDiscordRegistrationEnv() {
  const required = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID'];
  const missing = required.filter((key) => !getEnv(key));
  if (missing.length) throw new Error(`Variables de entorno faltantes para verificar comandos: ${missing.join(', ')}`);

  const idPattern = /^\d{17,20}$/;
  const values = [
    ['DISCORD_CLIENT_ID', getEnv('DISCORD_CLIENT_ID')],
    ...Object.entries(getGuildIds()).map(([guildType, guildId]) => [`${guildType.toUpperCase()}_GUILD_ID`, guildId])
  ];
  const invalid = values
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
      const actual = Array.isArray(registered) ? registered : [];

      if (!commandsEqual(expected, actual)) {
        failed = true;
        const expectedNames = new Set(expected.map((command) => command.name));
        const registeredNames = new Set(actual.map((command) => command.name));
        const missing = [...expectedNames].filter((name) => !registeredNames.has(name));
        const stale = [...registeredNames].filter((name) => !expectedNames.has(name));
        const differences = commandDifferences(expected, actual);
        console.error(`[HYPNOX][COMMANDS] ${guildType}: DESINCRONIZADO — faltan [${missing.join(', ')}] | sobran [${stale.join(', ')}] | esperados ${expected.length} | registrados ${actual.length}.`);
        if (differences.length) console.error(`[HYPNOX][COMMANDS] ${guildType}: diferencias — ${differences.join(' | ')}`);
      } else {
        console.log(`[HYPNOX][COMMANDS] ${guildType}: OK — ${actual.length} comandos registrados.`);
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
