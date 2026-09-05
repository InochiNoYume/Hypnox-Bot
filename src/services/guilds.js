const supabase = require('../database/supabase');
const { getGuildType } = require('../utils/guild');

const DEFAULT_PREFIX = '!';
const prefixCache = new Map();

async function ensureGuild(discordGuild) {
  const guildType = getGuildType(discordGuild.id);
  if (!guildType) throw new Error(`Servidor no configurado en el bot: ${discordGuild.id}`);

  const payload = {
    discord_guild_id: discordGuild.id,
    guild_type: guildType,
    name: discordGuild.name,
    enabled: true
  };

  const { data, error } = await supabase
    .from('guilds')
    .upsert(payload, { onConflict: 'discord_guild_id' })
    .select()
    .single();

  if (error) throw error;
  prefixCache.set(discordGuild.id, data.prefix || DEFAULT_PREFIX);
  return data;
}

async function getGuildRow(discordGuildId) {
  const { data, error } = await supabase
    .from('guilds')
    .select('*')
    .eq('discord_guild_id', discordGuildId)
    .maybeSingle();
  if (error) throw error;
  if (data) prefixCache.set(discordGuildId, data.prefix || DEFAULT_PREFIX);
  return data;
}

async function getGuildPrefix(discordGuildId) {
  if (prefixCache.has(discordGuildId)) return prefixCache.get(discordGuildId);

  const row = await getGuildRow(discordGuildId);
  const prefix = row?.prefix || DEFAULT_PREFIX;
  prefixCache.set(discordGuildId, prefix);
  return prefix;
}

async function setGuildPrefix(discordGuildId, prefix) {
  const value = String(prefix || '').trim();
  if (!value || value.length > 5 || /\s/.test(value)) {
    throw new Error('El prefijo debe tener entre 1 y 5 caracteres y no puede contener espacios.');
  }

  const { data, error } = await supabase
    .from('guilds')
    .update({ prefix: value, updated_at: new Date().toISOString() })
    .eq('discord_guild_id', discordGuildId)
    .select('discord_guild_id, prefix')
    .single();

  if (error) throw error;
  prefixCache.set(discordGuildId, data.prefix);
  return data.prefix;
}

async function getGuildIp(discordGuildId) {
  const row = await getGuildRow(discordGuildId);
  return row?.server_ip || null;
}

async function setGuildIp(discordGuildId, ip) {
  const value = String(ip || '').trim();
  if (!value || value.length > 255 || /[\s<>`]/.test(value)) {
    throw new Error('La IP/dirección del servidor no es válida.');
  }

  const { data, error } = await supabase
    .from('guilds')
    .update({ server_ip: value, updated_at: new Date().toISOString() })
    .eq('discord_guild_id', discordGuildId)
    .select('discord_guild_id, server_ip')
    .single();

  if (error) throw error;
  return data.server_ip;
}

async function clearGuildIp(discordGuildId) {
  const { error } = await supabase
    .from('guilds')
    .update({ server_ip: null, updated_at: new Date().toISOString() })
    .eq('discord_guild_id', discordGuildId);
  if (error) throw error;
}

function clearGuildPrefixCache(discordGuildId) {
  prefixCache.delete(discordGuildId);
}

module.exports = {
  DEFAULT_PREFIX,
  ensureGuild,
  getGuildRow,
  getGuildPrefix,
  setGuildPrefix,
  getGuildIp,
  setGuildIp,
  clearGuildIp,
  clearGuildPrefixCache
};
