const VALID_GUILDS = new Set(['official', 'staff', 'applications']);

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

    if (!Array.isArray(command.guilds) || command.guilds.length === 0) {
      errors.push(`${name}: debe declarar al menos un guild de destino`);
    } else {
      const invalidGuilds = command.guilds.filter((guild) => !VALID_GUILDS.has(guild));
      const duplicatedGuilds = command.guilds.filter((guild, index) => command.guilds.indexOf(guild) !== index);
      if (invalidGuilds.length) errors.push(`${name}: guild(s) inválida(s): ${invalidGuilds.join(', ')}`);
      if (duplicatedGuilds.length) errors.push(`${name}: guild(s) duplicada(s): ${[...new Set(duplicatedGuilds)].join(', ')}`);
    }

    try {
      command.data.toJSON();
    } catch (error) {
      errors.push(`${name}: definición inválida (${error.message})`);
    }
  }

  return errors;
}

module.exports = { validateCommands, VALID_GUILDS };