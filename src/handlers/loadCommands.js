const fs = require('node:fs');
const path = require('node:path');

function loadCommands(client) {
  const commandsPath = path.join(__dirname, '..', 'commands');
  if (!fs.existsSync(commandsPath)) return;

  const files = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

  for (const file of files) {
    const filePath = path.join(commandsPath, file);
    delete require.cache[require.resolve(filePath)];
    const command = require(filePath);

    if (!command?.data?.name || typeof command.execute !== 'function') {
      console.warn(`[HYPNOX] Comando ignorado: ${file}`);
      continue;
    }

    client.commands.set(command.data.name, command);
  }

  console.log(`[HYPNOX] Comandos cargados: ${client.commands.size}`);
}

module.exports = loadCommands;
