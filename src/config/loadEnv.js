const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

const ENV_PATH = process.env.DOTENV_CONFIG_PATH || path.resolve(process.cwd(), '.env');
let loaded = false;

function isEncryptedValue(value) {
  return typeof value === 'string' && value.trim().startsWith('encrypted:');
}

function criticalEnvironmentReady() {
  const hasDiscord = Boolean(process.env.DISCORD_TOKEN && !isEncryptedValue(process.env.DISCORD_TOKEN));
  const hasUrl = Boolean(process.env.SUPABASE_URL && !isEncryptedValue(process.env.SUPABASE_URL));
  const hasSupabaseKey = Boolean(
    (process.env.SUPABASE_SECRET_KEY && !isEncryptedValue(process.env.SUPABASE_SECRET_KEY)) ||
    (process.env.SUPABASE_SERVICE_ROLE_KEY && !isEncryptedValue(process.env.SUPABASE_SERVICE_ROLE_KEY)) ||
    (process.env.SUPABASE_SECRET_KEYS && !isEncryptedValue(process.env.SUPABASE_SECRET_KEYS))
  );
  return hasDiscord && hasUrl && hasSupabaseKey;
}

function loadEnv() {
  if (loaded) return;
  loaded = true;

  dotenv.config({ path: ENV_PATH, quiet: true });

  // Slash commands are part of the normal bot lifecycle. An explicit environment
  // value still wins, but the safe default is to synchronize them on READY.
  if (process.env.SYNC_COMMANDS_ON_READY === undefined) {
    process.env.SYNC_COMMANDS_ON_READY = 'true';
  }

  if (criticalEnvironmentReady()) return;

  let hasEncryptedEntries = false;
  try {
    hasEncryptedEntries = fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/).some((line) => /^\s*[^#=]+\s*=\s*encrypted:/i.test(line));
  } catch {
    // No local .env file is fine when Wispbyte or another host provides process.env directly.
  }

  if (!hasEncryptedEntries) return;

  try {
    const decrypted = {};
    const result = dotenv.config({
      path: ENV_PATH,
      secure: true,
      quiet: true,
      processEnv: decrypted
    });

    if (result.error) throw result.error;

    for (const [key, value] of Object.entries(decrypted)) {
      const current = process.env[key];
      if (current === undefined || current === null || isEncryptedValue(current)) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    const message = error?.message || String(error);
    console.warn(`[HYPNOX][ENV] El archivo .env contiene valores cifrados, pero no se pudo descifrar: ${message}`);
    console.warn('[HYPNOX][ENV] Para un .env cifrado por dotenvx, proporciona DOTENV_PRIVATE_KEY en el entorno del servidor.');
  }
}

module.exports = loadEnv;
