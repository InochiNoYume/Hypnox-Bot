const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags } = require('discord.js');
const supabase = require('../database/supabase');
const { getGuildRow } = require('../services/guilds');
const { brandedEmbed } = require('../utils/embeds');
const { writeLog } = require('../services/logs');

const EPHEMERAL = MessageFlags.Ephemeral;

const data = new SlashCommandBuilder()
  .setName('encuesta')
  .setDescription('Crea y administra encuestas.')
  .addSubcommand((s) => s
    .setName('crear')
    .setDescription('Crea una encuesta.')
    .addStringOption((o) => o.setName('pregunta').setDescription('Pregunta.').setMaxLength(300).setRequired(true))
    .addStringOption((o) => o.setName('opciones').setDescription('Opciones separadas por | (2 a 5).').setMaxLength(500).setRequired(true)))
  .addSubcommand((s) => s
    .setName('cerrar')
    .setDescription('Cierra una encuesta.')
    .addStringOption((o) => o.setName('id').setDescription('ID de encuesta.').setRequired(true)));

function getVoteCount(votes, index) {
  const value = votes?.[index];
  return Array.isArray(value) ? value.length : Number.isFinite(Number(value)) ? Number(value) : 0;
}

function embed(poll) {
  const votes = poll.votes || {};
  const opts = Array.isArray(poll.options) ? poll.options : [];
  const total = opts.reduce((sum, _, index) => sum + getVoteCount(votes, index), 0);
  return brandedEmbed('ENCUESTA', poll.question, {
    footerText: `Hypnox Studios • ${total} voto${total === 1 ? '' : 's'}`,
    fields: opts.map((option, index) => ({
      name: `◆ ${index + 1}. ${String(option).slice(0, 256)}`,
      value: `**${getVoteCount(votes, index)}** voto${getVoteCount(votes, index) === 1 ? '' : 's'}`,
      inline: true
    }))
  });
}

function row(poll) {
  return new ActionRowBuilder().addComponents(
    poll.options.map((option, index) => new ButtonBuilder()
      .setCustomId(`poll:${poll.id}:${index}`)
      .setLabel(String(option).slice(0, 80))
      .setStyle(ButtonStyle.Secondary))
  );
}

async function execute(i) {
  const sub = i.options.getSubcommand();
  if (!i.memberPermissions?.has(PermissionFlagsBits.ManageGuild) && sub === 'cerrar') {
    return i.reply({ content: 'Se requiere gestionar el servidor.', flags: EPHEMERAL });
  }

  await i.deferReply({ flags: EPHEMERAL });

  try {
    const guild = await getGuildRow(i.guildId);
    if (!guild) return i.editReply({ content: 'El servidor no está registrado.' });

    if (sub === 'crear') {
      const opts = i.options.getString('opciones', true).split('|').map((x) => x.trim()).filter(Boolean);
      const question = i.options.getString('pregunta', true).trim();
      if (!question) return i.editReply({ content: 'La pregunta no puede estar vacía.' });
      if (opts.length < 2 || opts.length > 5) return i.editReply({ content: 'La encuesta debe tener entre 2 y 5 opciones separadas por |.' });

      const { data: poll, error } = await supabase.from('polls').insert({
        guild_id: guild.id,
        channel_id: i.channelId,
        question,
        options: opts,
        votes: {},
        created_by_discord_user_id: i.user.id
      }).select().single();
      if (error) throw error;

      try {
        const msg = await i.channel.send({ embeds: [embed(poll)], components: [row(poll)] });
        const { error: messageError } = await supabase.from('polls').update({ message_id: msg.id }).eq('id', poll.id);
        if (messageError) throw messageError;
      } catch (error) {
        await supabase.from('polls').delete().eq('id', poll.id).catch(() => {});
        throw error;
      }

      await writeLog({
        guild: i.guild,
        category: 'system',
        action: 'encuesta_creada',
        actorId: i.user.id,
        channelId: i.channelId,
        message: question,
        metadata: { pollId: poll.id }
      });
      return i.editReply({ content: `Encuesta creada. ID: \`${poll.id}\`.` });
    }

    const id = i.options.getString('id', true);
    const { data: poll, error } = await supabase
      .from('polls')
      .select('*')
      .eq('guild_id', guild.id)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!poll) return i.editReply({ content: 'No se encontró la encuesta.' });
    if (poll.status === 'closed') return i.editReply({ content: 'La encuesta ya está cerrada.' });

    const { error: closeError } = await supabase
      .from('polls')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', id)
      .eq('guild_id', guild.id)
      .eq('status', 'active');
    if (closeError) throw closeError;

    const channel = await i.guild.channels.fetch(poll.channel_id).catch(() => null);
    if (channel?.isTextBased() && poll.message_id) {
      const message = await channel.messages.fetch(poll.message_id).catch(() => null);
      if (message) await message.edit({ embeds: [embed(poll)], components: [] }).catch(() => {});
    }

    await writeLog({
      guild: i.guild,
      category: 'system',
      action: 'encuesta_cerrada',
      actorId: i.user.id,
      channelId: poll.channel_id,
      message: poll.question,
      metadata: { pollId: poll.id }
    });

    return i.editReply({ content: `Encuesta \`${id}\` cerrada.` });
  } catch (error) {
    console.error('[HYPNOX] Encuesta:', error);
    return i.editReply({ content: 'No se pudo procesar la encuesta. El error fue registrado para revisión.' }).catch(() => {});
  }
}

module.exports = { data, execute, guilds: ['official', 'staff'] };
