const fs = require('node:fs');
const path = require('node:path');

function loadCommands(client) {
  const commandsPath = path.join(__dirname, '..', 'commands');
  if (!fs.existsSync(commandsPath)) throw new Error(`Directorio de comandos no encontrado: ${commandsPath}`);

  const files = fs.readdirSync(commandsPath)
    .filter((file) => file.endsWith('.js'))
    .sort();

  const failures = [];

  for (const file of files) {
    const filePath = path.join(commandsPath, file);

    try {
      delete require.cache[require.resolve(filePath)];
      const command = require(filePath);

      if (!command?.data?.name || typeof command.execute !== 'function') {
        failures.push(`${file}: debe exportar data.name y execute()`);
        continue;
      }

      if (client.commands.has(command.data.name)) {
        failures.push(`${file}: el nombre de comando "${command.data.name}" ya está registrado`);
        continue;
      }

      client.commands.set(command.data.name, command);
    } catch (error) {
      failures.push(`${file}: ${error?.message || String(error)}`);
    }
  }

  if (failures.length) {
    throw new Error(`No se pudieron cargar ${failures.length} comando(s): ${failures.join(' | ')}`);
  }

  console.log(`[HYPNOX] Comandos cargados: ${client.commands.size}`);
}

module.exports = loadCommands;
