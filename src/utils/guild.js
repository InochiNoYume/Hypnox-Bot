const config = require('../config/env');

function getGuildType(guildId) {
  if (guildId === config.guilds.official) return 'official';
  if (guildId === config.guilds.staff) return 'staff';
  if (guildId === config.guilds.applications) return 'applications';
  if (config.guilds.dev && guildId === config.guilds.dev) return 'dev';
  return null;
}

function getGuildLogsChannelId(type) {
  const map = {
    official: config.logs.official,
    staff: config.logs.staff,
    applications: config.logs.applications,
    dev: config.logs.dev
  };
  return map[type] || null;
}

module.exports = { getGuildType, getGuildLogsChannelId };
