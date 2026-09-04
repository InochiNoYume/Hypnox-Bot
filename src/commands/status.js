const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { getEnv } = require('../config/env');
const { getGuildType } = require('../utils/guild');
const supabase = require('../database/supabase');
const { brandedEmbed } = require('../utils/embeds');

const data = new SlashCommandBuilder()
  .setName('status').setDescription('Muestra el estado interno de Hypnox Bot.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

async function execute(i) {
  if (!i.memberPermissions?.has(PermissionFlagsBits.Administrator)) return i.reply({ content: 'Se requiere Administrador.', flags: MessageFlags.Ephemeral });
  await i.deferReply({ flags: MessageFlags.Ephemeral });
  const started = Date.now();
  let db = 'OFFLINE'; let dbLatency = null;
  try { const t = Date.now(); const { error } = await supabase.from('guilds').select('id').limit(1); if (!error) { db = 'ONLINE'; dbLatency = Date.now() - t; } } catch {}
  const guilds = i.client.guilds.cache.filter(g => getGuildType(g.id)).size;
  const uptime = Math.floor(i.client.uptime / 1000);
  const embed = brandedEmbed('SYSTEM STATUS', 'Estado operativo interno de Hypnox Bot.', { footerText: `Hypnox Studios • Comprobación ${Date.now() - started} ms` });
  embed.addFields(
    { name: '◆ DISCORD', value: `Estado: **ONLINE**\nGateway: **${i.client.ws.status === 0 ? 'ONLINE' : 'CONECTANDO'}**\nPing: **${i.client.ws.ping} ms**`, inline: true },
    { name: '◆ SUPABASE', value: `Estado: **${db}**\nLatencia: **${dbLatency === null ? '—' : `${dbLatency} ms`}**`, inline: true },
    { name: '◆ SISTEMA', value: `Guilds configuradas: **${guilds}**\nUptime: **${Math.floor(uptime / 86400)}d ${Math.floor(uptime / 3600) % 24}h ${Math.floor(uptime / 60) % 60}m**\nNode: **${process.version}**`, inline: false }
  );
  return i.editReply({ embeds: [embed] });
}
module.exports = { data, execute, guilds: ['official','staff','applications'] };
