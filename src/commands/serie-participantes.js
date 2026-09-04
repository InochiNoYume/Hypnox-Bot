const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const supabase = require('../database/supabase');
const { getGuildRow } = require('../services/guilds');

const EPHEMERAL = MessageFlags.Ephemeral;
const data = new SlashCommandBuilder()
  .setName('serie-participantes')
  .setDescription('Consulta los participantes registrados de una serie.')
  .addStringOption((o) => o.setName('id').setDescription('ID de la serie.').setRequired(true));

async function execute(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({ content: 'No tienes permisos para consultar participantes.', flags: EPHEMERAL });
  const guild = await getGuildRow(interaction.guildId);
  if (!guild) return interaction.reply({ content: 'Servidor no registrado.', flags: EPHEMERAL });
  const id = interaction.options.getString('id', true);
  try {
    const { data: series, error: seriesError } = await supabase.from('series').select('id,title,status').eq('id', id).eq('guild_id', guild.id).maybeSingle();
    if (seriesError) throw seriesError;
    if (!series) return interaction.reply({ content: 'No se encontró la serie indicada.', flags: EPHEMERAL });
    const { data: participants, error } = await supabase.from('series_participants').select('discord_user_id,joined_at').eq('series_id', id).order('joined_at', { ascending: true });
    if (error) throw error;
    const lines = participants?.length ? participants.map((p, i) => `${i + 1}. <@${p.discord_user_id}> · <t:${Math.floor(new Date(p.joined_at).getTime() / 1000)}:d>`) : ['No hay participantes registrados.'];
    return interaction.reply({ content: `**${series.title}** · ${series.status.toUpperCase()}\nParticipantes: **${participants?.length || 0}**\n\n${lines.join('\n').slice(0, 3800)}`, flags: EPHEMERAL });
  } catch (error) {
    console.error('[HYPNOX] Series participants error:', error);
    return interaction.reply({ content: 'No se pudo consultar la lista de participantes.', flags: EPHEMERAL }).catch(() => {});
  }
}
module.exports = { data, execute, guilds: ['official', 'staff'] };
