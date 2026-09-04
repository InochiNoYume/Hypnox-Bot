const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const supabase = require('../database/supabase');
const { getGuildRow } = require('../services/guilds');
const { writeLog } = require('../services/logs');
const { brandedEmbed } = require('../utils/embeds');

const EPHEMERAL = MessageFlags.Ephemeral;
const MANAGEMENT_ROLES = [
  'OFFICIAL_ROLE_FOUNDER_ID', 'OFFICIAL_ROLE_DIRECTOR_ID', 'OFFICIAL_ROLE_ADMINISTRATOR_ID',
  'STAFF_ROLE_FOUNDER_ID', 'STAFF_ROLE_DIRECTOR_ID', 'STAFF_ROLE_ADMINISTRATIVE_ASSISTANT_ID'
];

const data = new SlashCommandBuilder()
  .setName('premio')
  .setDescription('Gestiona sorteos, premios y entregas oficiales.')
  .addSubcommand((sub) => sub.setName('crear').setDescription('Crea y publica un nuevo sorteo.')
    .addStringOption((option) => option.setName('titulo').setDescription('Título del sorteo.').setRequired(true))
    .addStringOption((option) => option.setName('premio').setDescription('Premio que se entregará.').setRequired(true))
    .addIntegerOption((option) => option.setName('ganadores').setDescription('Cantidad de ganadores.').setMinValue(1).setMaxValue(20).setRequired(true))
    .addIntegerOption((option) => option.setName('minutos').setDescription('Duración del sorteo en minutos.').setMinValue(1).setMaxValue(10080).setRequired(true)))
  .addSubcommand((sub) => sub.setName('finalizar').setDescription('Finaliza un sorteo y selecciona sus ganadores.')
    .addStringOption((option) => option.setName('id').setDescription('ID del sorteo.').setRequired(true)))
  .addSubcommand((sub) => sub.setName('reroll').setDescription('Realiza un nuevo sorteo entre los participantes.')
    .addStringOption((option) => option.setName('id').setDescription('ID del sorteo.').setRequired(true)))
  .addSubcommand((sub) => sub.setName('entregar').setDescription('Registra la entrega de un premio.')
    .addUserOption((option) => option.setName('usuario').setDescription('Ganador del premio.').setRequired(true))
    .addStringOption((option) => option.setName('detalle').setDescription('Detalle de la entrega.').setRequired(true)));

function shuffle(values) {
  const pool = [...values];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

async function execute(interaction) {
  const guild = await getGuildRow(interaction.guild.id);
  if (!guild) return interaction.reply({ content: 'Servidor no registrado.', flags: EPHEMERAL });
  const sub = interaction.options.getSubcommand();

  try {
    if (sub === 'crear') {
      const title = interaction.options.getString('titulo').trim();
      const prize = interaction.options.getString('premio').trim();
      const winnerCount = interaction.options.getInteger('ganadores');
      const ends = new Date(Date.now() + interaction.options.getInteger('minutos') * 60000);
      const { data: giveaway, error } = await supabase.from('giveaways').insert({
        guild_id: guild.id, channel_id: interaction.channel.id, title, prize,
        winner_count: winnerCount, status: 'active', ends_at: ends.toISOString(), created_by_discord_user_id: interaction.user.id
      }).select().single();
      if (error) throw error;

      const embed = brandedEmbed('SORTEO', 'Participa en el sorteo siguiendo las condiciones indicadas.');
      embed.addFields(
        { name: 'TÍTULO', value: giveaway.title, inline: false },
        { name: 'PREMIO', value: giveaway.prize, inline: true },
        { name: 'GANADORES', value: String(giveaway.winner_count), inline: true },
        { name: 'FINALIZA', value: `<t:${Math.floor(ends.getTime() / 1000)}:F>`, inline: false }
      );
      embed.setFooter({ text: 'Hypnox Studios • Sorteos oficiales' });
      const components = [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`hypnox_giveaway:${giveaway.id}`).setLabel('Participar').setStyle(ButtonStyle.Secondary))];
      const message = await interaction.channel.send({ embeds: [embed], components });
      const { error: messageError } = await supabase.from('giveaways').update({ message_id: message.id }).eq('id', giveaway.id);
      if (messageError) throw messageError;
      await writeLog({ guild: interaction.guild, category: 'giveaway', action: 'create', actorId: interaction.user.id, channelId: interaction.channel.id, message: giveaway.title, metadata: { giveawayId: giveaway.id } });
      return interaction.reply({ content: `Sorteo creado: \`${giveaway.id}\``, flags: EPHEMERAL });
    }

    if (sub === 'entregar') {
      const user = interaction.options.getUser('usuario');
      const detail = interaction.options.getString('detalle').trim();
      await writeLog({ guild: interaction.guild, category: 'giveaway', action: 'deliver', actorId: interaction.user.id, targetId: user.id, message: detail });
      return interaction.reply({ content: 'Entrega registrada correctamente en los registros.', flags: EPHEMERAL });
    }

    const id = interaction.options.getString('id');
    const { data: giveaway, error } = await supabase.from('giveaways').select('*').eq('id', id).eq('guild_id', guild.id).maybeSingle();
    if (error) throw error;
    if (!giveaway) return interaction.reply({ content: 'No se encontró el sorteo indicado.', flags: EPHEMERAL });

    if (sub === 'finalizar' && giveaway.status !== 'active') return interaction.reply({ content: 'Este sorteo ya no está activo.', flags: EPHEMERAL });
    if (sub === 'reroll' && giveaway.status !== 'finished') return interaction.reply({ content: 'El reroll solo puede realizarse después de finalizar el sorteo.', flags: EPHEMERAL });

    const { data: entries, error: entriesError } = await supabase.from('giveaway_entries').select('user_id').eq('giveaway_id', id);
    if (entriesError) throw entriesError;
    const participants = [...new Set((entries || []).map((entry) => entry.user_id))];
    if (!participants.length) return interaction.reply({ content: 'No hay participantes para seleccionar.', flags: EPHEMERAL });

    let pool = participants;
    if (sub === 'reroll') {
      const previous = Array.isArray(giveaway.winners) ? giveaway.winners : [];
      const withoutPrevious = participants.filter((userId) => !previous.includes(userId));
      if (withoutPrevious.length) pool = withoutPrevious;
    }

    const winnerIds = shuffle(pool).slice(0, Math.min(giveaway.winner_count, pool.length));
    if (!winnerIds.length) return interaction.reply({ content: 'No quedan participantes elegibles para el nuevo resultado.', flags: EPHEMERAL });
    const { data: users, error: usersError } = await supabase.from('users').select('id,discord_user_id').in('id', winnerIds);
    if (usersError) throw usersError;
    const mentions = (users || []).map((user) => `◆ <@${user.discord_user_id}>`);

    const { error: finishError } = await supabase.from('giveaways').update({
      status: 'finished', winners: winnerIds, finished_at: new Date().toISOString()
    }).eq('id', id).eq('guild_id', guild.id);
    if (finishError) throw finishError;

    await writeLog({ guild: interaction.guild, category: 'giveaway', action: sub, actorId: interaction.user.id, message: id, metadata: { winners: winnerIds, excludedPreviousWinners: sub === 'reroll' } });
    const embed = brandedEmbed(sub === 'reroll' ? 'NUEVO RESULTADO' : 'RESULTADO DEL SORTEO', giveaway.title);
    embed.addFields(
      { name: 'PREMIO', value: giveaway.prize, inline: true },
      { name: 'GANADORES', value: mentions.join('\n'), inline: false }
    );
    embed.setFooter({ text: `Hypnox Studios • ${sub === 'reroll' ? 'Nuevo resultado' : 'Sorteo finalizado'}` });
    return interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('[HYPNOX] Giveaway error:', error);
    return interaction.reply({ content: 'No se pudo gestionar el sorteo.', flags: EPHEMERAL }).catch(() => {});
  }
}

module.exports = { data, execute, guilds: ['official', 'staff'], access: { roleEnvs: MANAGEMENT_ROLES } };
