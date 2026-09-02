const { getGuildIds } = require('../config/env');

function getGuildType(guildId) {
  const guilds = getGuildIds();

  if (guildId === guilds.official) return 'official';
  if (guildId === guilds.staff) return 'staff';
  if (guildId === guilds.applications) return 'applications';

  return null;
}

module.exports = { getGuildType };
