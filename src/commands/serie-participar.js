const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const supabase = require('../database/supabase');
const { getGuildRow } = require('../services/guilds');
const { ensureUser } = require('../services/users');
const { writeLog } = require('../services/logs');

const EPHEMERAL = MessageFlags.Ephemeral;
const data = new SlashCommandBuilder()
  .setName('serie-participar')
  .setDescription('Gestiona tu participación en una serie.')
  .addSubcommand((s) => s.setName('unirse').setDescription('Te registra como participante.').addStringOption((o) => o.setName('id').setDescription('ID de la serie.').setRequired(true)))
  .addSubcommand((s) => s.setName('salir').setDescription('Retira tu participación.').addStringOption((o) => o.setName('id').setDescription('ID de la serie.').setRequired(true)));

async function execute(interaction) {
  const guild = await getGuildRow(interaction.guildId);
  if (!guild) return interaction.reply({ content: 'Servidor no registrado.', flags: EPHEMERAL });
  const id = interaction.options.getString('id', true);
  try {
    const { data: series, error } = await supabase.from('series').select('id,title,status,starts_at').eq('id', id).eq('guild_id', guild.id).maybeSingle();
    if (error) throw error;
    if (!series) return interaction.reply({ content: 'No se encontró la serie indicada.', flags: EPHEMERAL });
    const sub = interaction.options.getSubcommand();
    if (sub === 'unirse') {
      if (series.status !== 'upcoming') return interaction.reply({ content: 'La inscripción solo está disponible mientras la serie está programada.', flags: EPHEMERAL });
      const user = await ensureUser(interaction.user);
      const { error: insertError } = await supabase.from('series_participants').insert({ series_id: series.id, user_id: user.id, discord_user_id: interaction.user.id });
      if (insertError?.code === '23505') return interaction.reply({ content: 'Ya estás registrado como participante de esta serie.', flags: EPHEMERAL });
      if (insertError) throw insertError;
      await writeLog({ guild: interaction.guild, category: 'activity', action: 'serie_participacion_unirse', actorId: interaction.user.id, channelId: interaction.channelId, message: series.title, metadata: { seriesId: id } });
      return interaction.reply({ content: `Te has registrado en **${series.title}**.`, flags: EPHEMERAL });
    }
    const { data: removed, error: removeError } = await supabase.from('series_participants').delete().eq('series_id', series.id).eq('discord_user_id', interaction.user.id).select('id');
    if (removeError) throw removeError;
    if (!removed?.length) return interaction.reply({ content: 'No estabas registrado en esta serie.', flags: EPHEMERAL });
    await writeLog({ guild: interaction.guild, category: 'activity', action: 'serie_participacion_salir', actorId: interaction.user.id, channelId: interaction.channelId, message: series.title, metadata: { seriesId: id } });
    return interaction.reply({ content: `Has salido de **${series.title}**.`, flags: EPHEMERAL });
  } catch (error) {
    console.error('[HYPNOX] Series participation error:', error);
    return interaction.reply({ content: 'No se pudo actualizar tu participación.', flags: EPHEMERAL }).catch(() => {});
  }
}
module.exports = { data, execute, guilds: ['official'] };
