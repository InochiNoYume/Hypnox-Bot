const required = [
  'DISCORD_TOKEN',
  'DISCORD_CLIENT_ID',
  'OFFICIAL_GUILD_ID',
  'STAFF_GUILD_ID',
  'APPLICATIONS_GUILD_ID',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const SNOWFLAKE_KEYS = [
  'DISCORD_CLIENT_ID',
  'DISCORD_DEV_GUILD_ID',
  'DEV_GUILD_ID',
  'OFFICIAL_GUILD_ID',
  'STAFF_GUILD_ID',
  'APPLICATIONS_GUILD_ID',
  'OFFICIAL_LOGS_CHANNEL_ID',
  'STAFF_LOGS_CHANNEL_ID',
  'APPLICATIONS_LOGS_CHANNEL_ID',
  'DEV_LOGS_CHANNEL_ID'
];

function getEnv(key, fallback = undefined) {
  const value = process.env[key];
  if (value === undefined || value === null) return fallback;
  return typeof value === 'string' ? value.trim() : value;
}

function validateEnv() {
  const missing = required.filter((key) => !getEnv(key));
  if (missing.length) throw new Error(`Variables de entorno faltantes: ${missing.join(', ')}`);

  const token = getEnv('DISCORD_TOKEN');
  if (!token || /\s/.test(token)) {
    throw new Error('DISCORD_TOKEN parece inválido: está vacío o contiene espacios/saltos de línea.');
  }

  const supabaseUrl = getEnv('SUPABASE_URL');
  try {
    const parsed = new URL(supabaseUrl);
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) throw new Error();
  } catch {
    throw new Error('SUPABASE_URL no es una URL válida.');
  }

  const invalidIds = SNOWFLAKE_KEYS
    .map((key) => [key, getEnv(key)])
    .filter(([, value]) => value && !/^\d{17,20}$/.test(String(value)))
    .map(([key]) => key);

  if (invalidIds.length) {
    throw new Error(`Snowflakes de Discord inválidos en: ${invalidIds.join(', ')}`);
  }

  const status = getEnv('BOT_STATUS', 'dnd');
  if (!['online', 'idle', 'dnd', 'invisible'].includes(status)) {
    throw new Error(`BOT_STATUS inválido: ${status}. Usa online, idle, dnd o invisible.`);
  }
}

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

function getGuildIds() {
  return guilds;
}

module.exports = { validateEnv, getEnv, getGuildIds, guilds, logs };
