require('dotenv').config();

const { REST, Routes } = require('discord.js');
const { getEnv, getGuildIds, validateEnv } = require('../src/config/env');
const { loadCommandData } = require('../src/deploy-commands');

async function verify() {
  validateEnv();

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
      const expected = commands.filter((command) => guildType === 'dev' || command.guilds.includes(guildType));
      const registeredNames = new Set((registered || []).map((command) => command.name));
      const expectedNames = new Set(expected.map((command) => command.data.name));
      const missing = [...expectedNames].filter((name) => !registeredNames.has(name));
      const stale = [...registeredNames].filter((name) => !expectedNames.has(name));

      if (missing.length || stale.length) {
        failed = true;
        console.error(`[HYPNOX] ${guildType}: FALTAN [${missing.join(', ')}] | SOBRAN [${stale.join(', ')}]`);
      } else {
        console.log(`[HYPNOX] ${guildType}: OK — ${registered.length} slash commands registrados.`);
      }
    } catch (error) {
      failed = true;
      console.error(`[HYPNOX] ${guildType}: ERROR — ${error.message}`);
    }
  }

  if (failed) process.exitCode = 1;
}

if (require.main === module) {
  verify().catch((error) => {
    console.error('[HYPNOX] Verificación de comandos fallida:', error.message);
    process.exit(1);
  });
}

module.exports = { verify };
