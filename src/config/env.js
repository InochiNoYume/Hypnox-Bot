const required = [
  'DISCORD_TOKEN',
  'DISCORD_CLIENT_ID',
  'OFFICIAL_GUILD_ID',
  'STAFF_GUILD_ID',
  'APPLICATIONS_GUILD_ID',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

function validateEnv() {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Variables de entorno faltantes: ${missing.join(', ')}`);
}

function getEnv(key, fallback = undefined) { return process.env[key] ?? fallback; }

const guilds = {
  official: getEnv('OFFICIAL_GUILD_ID'),
  staff: getEnv('STAFF_GUILD_ID'),
  applications: getEnv('APPLICATIONS_GUILD_ID'),
  dev: getEnv('DISCORD_DEV_GUILD_ID') || getEnv('DEV_GUILD_ID')
};

const logs = {
  official: getEnv('OFFICIAL_LOGS_CHANNEL_ID'),
  staff: getEnv('STAFF_LOGS_CHANNEL_ID'),
  applications: getEnv('APPLICATIONS_LOGS_CHANNEL_ID'),
  dev: getEnv('DEV_LOGS_CHANNEL_ID')
};

function getGuildIds() { return guilds; }

module.exports = { validateEnv, getEnv, getGuildIds, guilds, logs };
