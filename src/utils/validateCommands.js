const { Collection } = require('discord.js');

function validateCommands(commands) {
  const errors = [];
  const names = new Set();

  for (const [key, command] of commands) {
    if (!command?.data?.name || typeof command.execute !== 'function') {
      errors.push(`${key}: estructura inválida`);
      continue;
    }

    const name = command.data.name;
    if (!/^[a-z0-9_-]{1,32}$/.test(name)) {
      errors.push(`${name}: nombre de slash command inválido`);
    }
    if (names.has(name)) {
      errors.push(`${name}: comando duplicado`);
    }
    names.add(name);

    try {
      command.data.toJSON();
    } catch (error) {
      errors.push(`${name}: definición inválida (${error.message})`);
    }
  }

  return errors;
}

module.exports = { validateCommands };
