const fs = require('node:fs');
const path = require('node:path');

// Safe placeholders so module imports can be validated without connecting to Discord or Supabase.
process.env.DISCORD_TOKEN ||= 'validation-token';
process.env.DISCORD_CLIENT_ID ||= '123456789012345678';
process.env.OFFICIAL_GUILD_ID ||= '123456789012345678';
process.env.STAFF_GUILD_ID ||= '123456789012345679';
process.env.APPLICATIONS_GUILD_ID ||= '123456789012345680';
process.env.SUPABASE_URL ||= 'https://validation.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'validation-service-role-key';

const root = path.resolve(__dirname, '..', 'src');
const files = [];

function collect(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(fullPath);
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(fullPath);
  }
}

collect(root);
files.sort();

for (const file of files) {
  delete require.cache[require.resolve(file)];
  require(file);
}

console.log(`[HYPNOX] Module validation OK: ${files.length} archivos cargados.`);
