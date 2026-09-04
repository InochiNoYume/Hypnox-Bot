const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const supabase = require('../database/supabase');
const { getGuildRow } = require('../services/guilds');
const { brandedEmbed } = require('../utils/embeds');

const data = new SlashCommandBuilder()
  .setName('evento-participantes')
  .setDescription('Consulta los participantes registrados de un evento.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addStringOption((option) => option.setName('id').setDescription('ID del evento.').setRequired(true));

async function execute(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({ content: 'Se requiere Gestionar servidor.', flags: MessageFlags.Ephemeral });
  }
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    const guild = await getGuildRow(interaction.guildId);
    if (!guild) return interaction.editReply({ content: 'El servidor no está registrado en Supabase.' });
    const id = interaction.options.getString('id', true);
    const { data: event, error: eventError } = await supabase.from('events').select('id,title,status,starts_at').eq('guild_id', guild.id).eq('id', id).maybeSingle();
    if (eventError) throw eventError;
    if (!event) return interaction.editReply({ content: 'No se encontró el evento indicado.' });

    const { data: participants, error } = await supabase
      .from('event_participants')
      .select('discord_user_id,joined_at')
      .eq('event_id', id)
      .order('joined_at', { ascending: true })
      .limit(100);
    if (error) throw error;

    const lines = (participants || []).map((p, index) => `${index + 1}. <@${p.discord_user_id}> · <t:${Math.floor(new Date(p.joined_at).getTime() / 1000)}:R>`);
    const embed = brandedEmbed('PARTICIPANTES DEL EVENTO', `Registro de participantes para **${event.title}**.`, {
      footerText: `Hypnox Studios • ${participants?.length || 0} participante${participants?.length === 1 ? '' : 's'}`
    });
    embed.addFields(
      { name: '◆ ESTADO', value: `**${event.status.toUpperCase()}**`, inline: true },
      { name: '◆ INICIO', value: event.starts_at ? `<t:${Math.floor(new Date(event.starts_at).getTime() / 1000)}:F>` : 'Sin fecha', inline: true },
      { name: '◆ LISTA', value: lines.length ? lines.join('\n').slice(0, 1024) : 'No hay participantes registrados.', inline: false }
    );
    return interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('[HYPNOX] Event participant roster error:', error);
    return interaction.editReply({ content: 'No se pudo consultar la lista de participantes.' }).catch(() => {});
  }
}

module.exports = { data, execute, guilds: ['official', 'staff'] };
