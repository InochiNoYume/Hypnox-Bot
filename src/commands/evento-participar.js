const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const supabase = require('../database/supabase');
const { getGuildRow } = require('../services/guilds');
const { ensureUser } = require('../services/moderation');
const { writeLog } = require('../services/logs');

const data = new SlashCommandBuilder()
  .setName('evento-participar')
  .setDescription('Gestiona tu participación en un evento.')
  .addSubcommand((sub) => sub
    .setName('unirse')
    .setDescription('Registra tu participación en un evento.')
    .addStringOption((option) => option.setName('id').setDescription('ID del evento.').setRequired(true)))
  .addSubcommand((sub) => sub
    .setName('salir')
    .setDescription('Retira tu participación de un evento.')
    .addStringOption((option) => option.setName('id').setDescription('ID del evento.').setRequired(true)));

async function execute(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    const guild = await getGuildRow(interaction.guildId);
    if (!guild) return interaction.editReply({ content: 'El servidor no está registrado en Supabase.' });

    const id = interaction.options.getString('id', true);
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id,title,status,starts_at,ends_at')
      .eq('guild_id', guild.id)
      .eq('id', id)
      .maybeSingle();
    if (eventError) throw eventError;
    if (!event) return interaction.editReply({ content: 'No se encontró el evento indicado.' });

    const sub = interaction.options.getSubcommand();
    if (sub === 'unirse') {
      if (!['upcoming', 'active'].includes(event.status)) return interaction.editReply({ content: 'Este evento no acepta nuevas participaciones.' });
      const user = await ensureUser(interaction.user);
      const { error } = await supabase.from('event_participants').insert({
        event_id: event.id,
        user_id: user.id,
        discord_user_id: interaction.user.id
      });
      if (error?.code === '23505') return interaction.editReply({ content: 'Ya estás registrado como participante de este evento.' });
      if (error) throw error;
      await writeLog({ guild: interaction.guild, category: 'event', action: 'participant_join', actorId: interaction.user.id, channelId: interaction.channelId, message: event.title, metadata: { eventId: event.id } });
      return interaction.editReply({ content: `Tu participación en **${event.title}** fue registrada correctamente.` });
    }

    const { data: removed, error: removeError } = await supabase
      .from('event_participants')
      .delete()
      .eq('event_id', event.id)
      .eq('discord_user_id', interaction.user.id)
      .select('id')
      .maybeSingle();
    if (removeError) throw removeError;
    if (!removed) return interaction.editReply({ content: 'No estabas registrado como participante de este evento.' });
    await writeLog({ guild: interaction.guild, category: 'event', action: 'participant_leave', actorId: interaction.user.id, channelId: interaction.channelId, message: event.title, metadata: { eventId: event.id } });
    return interaction.editReply({ content: `Tu participación en **${event.title}** fue retirada.` });
  } catch (error) {
    console.error('[HYPNOX] Event participation error:', error);
    return interaction.editReply({ content: 'No se pudo actualizar tu participación. El error fue registrado.' }).catch(() => {});
  }
}

module.exports = { data, execute, guilds: ['official', 'staff'] };
