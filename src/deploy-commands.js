require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');
const { validateEnv, getGuildIds, getEnv } = require('./config/env');

function loadCommandData() {
  const commandsPath = path.join(__dirname, 'commands');
  const files = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

  return files
    .map((file) => require(path.join(commandsPath, file)))
    .filter((command) => command?.data?.name)
    .map((command) => ({
      data: command.data,
      guilds: command.guilds || ['official', 'staff', 'applications']
    }));
}

async function deploy() {
  validateEnv();

  const rest = new REST({ version: '10' }).setToken(getEnv('DISCORD_TOKEN'));
  const guildIds = getGuildIds();
  const commands = loadCommandData();

  for (const [guildType, guildId] of Object.entries(guildIds)) {
    if (!guildId) continue;

    const body = commands
      .filter((command) => guildType === 'dev' || command.guilds.includes(guildType))
      .map((command) => command.data.toJSON());

    await rest.put(
      Routes.applicationGuildCommands(getEnv('DISCORD_CLIENT_ID'), guildId),
      { body }
    );

    console.log(`[HYPNOX] Comandos registrados en ${guildType}: ${body.length}`);
  }
}

if (require.main === module) {
  deploy().catch((error) => {
    console.error('[HYPNOX] Error registrando comandos:', error);
    process.exit(1);
  });
}

module.exports = { deploy, loadCommandData };
