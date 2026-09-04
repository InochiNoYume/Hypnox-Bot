require('./loadEnv')();

const required = [
  'DISCORD_TOKEN',
  'DISCORD_CLIENT_ID',
  'OFFICIAL_GUILD_ID',
  'STAFF_GUILD_ID',
  'APPLICATIONS_GUILD_ID',
  'SUPABASE_URL'
];

const DISCORD_ID_PATTERN = /^\d{17,20}$/;

function getEnv(key, fallback = undefined) {
  const value = process.env[key];
  if (value === undefined || value === null) return fallback;
  return typeof value === 'string' ? value.trim() : value;
}

function getSupabaseKey() {
  const direct = getEnv('SUPABASE_SECRET_KEY') || getEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (direct && !String(direct).startsWith('encrypted:')) return direct;

  const rawKeys = getEnv('SUPABASE_SECRET_KEYS');
  if (rawKeys && !String(rawKeys).startsWith('encrypted:')) {
    try {
      const parsed = JSON.parse(rawKeys);
      if (parsed && typeof parsed === 'object') {
        const defaultKey = parsed.default;
        if (typeof defaultKey === 'string' && defaultKey.trim()) return defaultKey.trim();
      }
    } catch {
      // Invalid optional JSON; validation below will report the missing usable key.
    }
  }

  return undefined;
}

function getDiscordIdKeys() {
  return Object.keys(process.env)
    .filter((key) => key.endsWith('_ID'))
    .filter((key) => !key.startsWith('SUPABASE_'));
}

function validateEnv() {
  const missing = required.filter((key) => !getEnv(key));
  if (missing.length) throw new Error(`Variables de entorno faltantes: ${missing.join(', ')}`);

  const supabaseKey = getSupabaseKey();
  if (!supabaseKey) {
    throw new Error('Falta una clave de servidor de Supabase. Configura SUPABASE_SECRET_KEY (preferida) o SUPABASE_SERVICE_ROLE_KEY.');
  }

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

  const invalidIds = getDiscordIdKeys()
    .map((key) => [key, getEnv(key)])
    .filter(([, value]) => value && !DISCORD_ID_PATTERN.test(String(value)))
    .map(([key]) => key);

  if (invalidIds.length) {
    throw new Error(`Snowflakes de Discord inválidos en: ${invalidIds.join(', ')}`);
  }

  const status = getEnv('BOT_STATUS', 'dnd');
  if (!['online', 'idle', 'dnd', 'invisible'].includes(status)) {
    throw new Error(`BOT_STATUS inválido: ${status}. Usa online, idle, dnd o invisible.`);
  }

  const debug = getEnv('DEBUG', 'false').toLowerCase();
  if (!['true', 'false'].includes(debug)) {
    throw new Error(`DEBUG inválido: ${debug}. Usa true o false.`);
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

module.exports = { validateEnv, getEnv, getSupabaseKey, getGuildIds, guilds, logs };