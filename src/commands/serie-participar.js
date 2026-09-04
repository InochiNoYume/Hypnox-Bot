const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const supabase = require('../database/supabase');
const { getGuildRow } = require('../services/guilds');
const { ensureUser } = require('../services/users');
const { writeLog } = require('../services/logs');

const EPHEMERAL = MessageFlags.Ephemeral;

const data = new SlashCommandBuilder()
  .setName('serie-participar')
  .setDescription('Gestiona tu participación en una serie.')
  .addSubcommand((s) => s
    .setName('unirse')
    .setDescription('Te registra como participante.')
    .addStringOption((o) => o.setName('id').setDescription('ID de la serie.').setRequired(true)))
  .addSubcommand((s) => s
    .setName('salir')
    .setDescription('Retira tu participación.')
    .addStringOption((o) => o.setName('id').setDescription('ID de la serie.').setRequired(true)));

async function execute(interaction) {
  await interaction.deferReply({ flags: EPHEMERAL });

  try {
    const guild = await getGuildRow(interaction.guildId);
    if (!guild) return interaction.editReply({ content: 'Servidor no registrado.' });

    const id = interaction.options.getString('id', true);
    const { data: series, error } = await supabase
      .from('series')
      .select('id,title,status,starts_at')
      .eq('id', id)
      .eq('guild_id', guild.id)
      .maybeSingle();
    if (error) throw error;
    if (!series) return interaction.editReply({ content: 'No se encontró la serie indicada.' });

    const sub = interaction.options.getSubcommand();

    if (sub === 'unirse') {
      if (series.status !== 'upcoming') {
        return interaction.editReply({ content: 'La inscripción solo está disponible mientras la serie está programada.' });
      }

      const user = await ensureUser(interaction.user);
      const { error: insertError } = await supabase
        .from('series_participants')
        .insert({ series_id: series.id, user_id: user.id, discord_user_id: interaction.user.id });

      if (insertError?.code === '23505') {
        return interaction.editReply({ content: 'Ya estás registrado como participante de esta serie.' });
      }
      if (insertError) throw insertError;

      await writeLog({
        guild: interaction.guild,
        category: 'event',
        action: 'serie_participacion_unirse',
        actorId: interaction.user.id,
        channelId: interaction.channelId,
        message: series.title,
        metadata: { seriesId: id }
      });

      return interaction.editReply({ content: `Te has registrado en **${series.title}**.` });
    }

    const { data: removed, error: removeError } = await supabase
      .from('series_participants')
      .delete()
      .eq('series_id', series.id)
      .eq('discord_user_id', interaction.user.id)
      .select('id');

    if (removeError) throw removeError;
    if (!removed?.length) return interaction.editReply({ content: 'No estabas registrado en esta serie.' });

    await writeLog({
      guild: interaction.guild,
      category: 'event',
      action: 'serie_participacion_salir',
      actorId: interaction.user.id,
      channelId: interaction.channelId,
      message: series.title,
      metadata: { seriesId: id }
    });

    return interaction.editReply({ content: `Has salido de **${series.title}**.` });
  } catch (error) {
    console.error('[HYPNOX] Series participation error:', error);
    return interaction.editReply({ content: 'No se pudo actualizar tu participación. El error fue registrado para revisión.' }).catch(() => {});
  }
}

module.exports = { data, execute, guilds: ['official'] };
