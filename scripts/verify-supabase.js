require('dotenv').config();

const { getEnv, getSupabaseKey, getGuildIds } = require('../src/config/env');
const supabase = require('../src/database/supabase');

const EXPECTED_GUILD_TYPES = ['official', 'staff', 'applications', 'dev'];

async function verifySupabase() {
  if (!getEnv('SUPABASE_URL')) throw new Error('SUPABASE_URL no está configurado.');
  if (!getSupabaseKey()) throw new Error('No hay una clave de servidor de Supabase utilizable.');

  const configuredGuilds = getGuildIds();
  const missingConfig = EXPECTED_GUILD_TYPES.filter((type) => !configuredGuilds[type]);
  if (missingConfig.length) {
    throw new Error(`Faltan IDs de guild para Supabase: ${missingConfig.join(', ')}`);
  }

  const { data: guilds, error: guildError } = await supabase
    .from('guilds')
    .select('discord_guild_id,guild_type,name,enabled,prefix,server_ip')
    .in('guild_type', EXPECTED_GUILD_TYPES);

  if (guildError) throw new Error(`No se pudo consultar public.guilds: ${guildError.message}`);

  const byType = new Map((guilds || []).map((guild) => [guild.guild_type, guild]));
  for (const guildType of EXPECTED_GUILD_TYPES) {
    const expectedId = String(configuredGuilds[guildType]);
    const row = byType.get(guildType);
    if (!row) throw new Error(`La guild ${guildType} (${expectedId}) no existe en Supabase.`);
    if (String(row.discord_guild_id) !== expectedId) {
      throw new Error(`La guild ${guildType} no coincide: esperado ${expectedId}, Supabase tiene ${row.discord_guild_id}.`);
    }
    if (row.enabled === false) throw new Error(`La guild ${guildType} está deshabilitada en Supabase.`);
    if (!row.prefix || /\s/.test(row.prefix)) throw new Error(`El prefijo de ${guildType} es inválido.`);
  }

  const { error: ticketError } = await supabase
    .from('tickets')
    .select('id,ticket_type,status,oral_voice_channel_id')
    .limit(1);
  if (ticketError) throw new Error(`La tabla public.tickets no responde correctamente: ${ticketError.message}`);

  const { error: eventError } = await supabase
    .from('ticket_events')
    .select('id,event_type')
    .limit(1);
  if (eventError) throw new Error(`La tabla public.ticket_events no responde correctamente: ${eventError.message}`);

  console.log(`[HYPNOX][SUPABASE] OK — ${EXPECTED_GUILD_TYPES.length} guilds sincronizadas, tickets y ticket_events accesibles.`);
  for (const guildType of EXPECTED_GUILD_TYPES) {
    const guild = byType.get(guildType);
    console.log(`[HYPNOX][SUPABASE] ${guildType}: prefix=${guild.prefix} enabled=${guild.enabled ? 'true' : 'false'} ip=${guild.server_ip ? 'configurada' : 'no configurada'}.`);
  }
}

if (require.main === module) {
  verifySupabase().catch((error) => {
    console.error('[HYPNOX][SUPABASE] Verificación fallida:', error.message);
    process.exit(1);
  });
}

module.exports = { verifySupabase };
