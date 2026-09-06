const fs = require('node:fs');
const path = require('node:path');

// Safe placeholders so module imports can be validated without connecting to Discord or Supabase.
process.env.HYPNOX_VALIDATION_ONLY = '1';
process.env.DISCORD_TOKEN ||= 'validation-token';
process.env.DISCORD_CLIENT_ID ||= '123456789012345678';
process.env.OFFICIAL_GUILD_ID ||= '123456789012345678';
process.env.STAFF_GUILD_ID ||= '123456789012345679';
process.env.APPLICATIONS_GUILD_ID ||= '123456789012345680';
process.env.DEV_GUILD_ID ||= '123456789012345681';
process.env.DISCORD_DEV_GUILD_ID ||= '123456789012345681';
process.env.SUPABASE_URL ||= 'https://validation.supabase.co';
process.env.SUPABASE_SECRET_KEY ||= 'validation-secret-key';
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

// index.js is the production bootstrap and connects to Discord.
// Never import it during CI module validation.
const filesToValidate = files.filter((file) => path.basename(file) !== 'index.js');

for (const file of filesToValidate) {
  delete require.cache[require.resolve(file)];
  require(file);
}

const commandsPath = path.join(root, 'commands');
const commandEntries = fs.readdirSync(commandsPath)
  .filter((file) => file.endsWith('.js'))
  .sort()
  .map((file) => require(path.join(commandsPath, file)));

const commandMap = new Map();
for (const command of commandEntries) {
  if (command?.data?.name) commandMap.set(command.data.name, command);
}

const { validateCommands } = require(path.join(root, 'utils', 'validateCommands'));
const commandErrors = validateCommands(commandMap);

if (commandErrors.length) {
  throw new Error(`Validación de comandos fallida: ${commandErrors.join(' | ')}`);
}

console.log(`[HYPNOX] Module validation OK: ${filesToValidate.length} archivos cargados; ${commandEntries.length} comandos válidos; rutas de guild validadas.`);
