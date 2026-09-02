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
  if (missing.length) {
    throw new Error(`Variables de entorno faltantes: ${missing.join(', ')}`);
  }
}

function getEnv(key, fallback = undefined) {
  return process.env[key] ?? fallback;
}

function getGuildIds() {
  return {
    official: getEnv('OFFICIAL_GUILD_ID'),
    staff: getEnv('STAFF_GUILD_ID'),
    applications: getEnv('APPLICATIONS_GUILD_ID')
  };
}

module.exports = { validateEnv, getEnv, getGuildIds };
