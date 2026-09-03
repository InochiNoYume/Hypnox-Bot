require('dotenv').config();

const { REST, Routes } = require('discord.js');
const { getEnv, getGuildIds, validateEnv } = require('../src/config/env');
const { loadCommandData } = require('../src/deploy-commands');

async function verify() {
  validateEnv();

  const rest = new REST({ version: '10' }).setToken(getEnv('DISCORD_TOKEN'));
  const guilds = Object.entries(getGuildIds()).filter(([, guildId]) => guildId);
  const commands = loadCommandData().map((command) => command.data.toJSON());

  if (!commands.length) throw new Error('No hay comandos para registrar.');

  for (const [guildType, guildId] of guilds) {
    try {
      const registered = await rest.get(
        Routes.applicationGuildCommands(getEnv('DISCORD_CLIENT_ID'), guildId)
      );
      const names = new Set((registered || []).map((command) => command.name));
      const expected = commands.filter((command) => guildType === 'dev' || (command.guilds || ['official', 'staff', 'applications']).includes(guildType));
      const missing = expected.map((command) => command.name).filter((name) => !names.has(name));
      const stale = (registered || []).map((command) => command.name).filter((name) => !expected.some((command) => command.name === name));

      if (missing.length || stale.length) {
        console.error(`[HYPNOX] ${guildType}: FALTAN [${missing.join(', ')}] | SOBRAN [${stale.join(', ')}]`);
        continue;
      }

      console.log(`[HYPNOX] ${guildType}: OK — ${registered.length} slash commands registrados.`);
    } catch (error) {
      console.error(`[HYPNOX] ${guildType}: ERROR — ${error.message}`);
    }
  }
}

if (require.main === module) {
  verify().catch((error) => {
    console.error('[HYPNOX] Verificación de comandos fallida:', error.message);
    process.exit(1);
  });
}

module.exports = { verify };
