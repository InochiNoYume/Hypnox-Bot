const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const supabase = require('../database/supabase');
const { getGuildRow } = require('../services/guilds');
const { writeLog } = require('../services/logs');
const { brandedEmbed } = require('../utils/embeds');

const MANAGEMENT_ROLES = [
  'OFFICIAL_ROLE_FOUNDER_ID', 'OFFICIAL_ROLE_DIRECTOR_ID', 'OFFICIAL_ROLE_ADMINISTRATOR_ID',
  'STAFF_ROLE_FOUNDER_ID', 'STAFF_ROLE_DIRECTOR_ID', 'STAFF_ROLE_ADMINISTRATIVE_ASSISTANT_ID'
];

const data = new SlashCommandBuilder()
  .setName('premio')
  .setDescription('Gestiona sorteos, premios y entregas oficiales.')
  .addSubcommand((sub) => sub
    .setName('crear')
    .setDescription('Crea y publica un nuevo sorteo.')
    .addStringOption((option) => option.setName('titulo').setDescription('Título del sorteo.').setRequired(true))
    .addStringOption((option) => option.setName('premio').setDescription('Premio que se entregará.').setRequired(true))
    .addIntegerOption((option) => option.setName('ganadores').setDescription('Cantidad de ganadores.').setMinValue(1).setMaxValue(20).setRequired(true))
    .addIntegerOption((option) => option.setName('minutos').setDescription('Duración del sorteo en minutos.').setMinValue(1).setMaxValue(10080).setRequired(true)))
  .addSubcommand((sub) => sub
    .setName('finalizar')
    .setDescription('Finaliza un sorteo y selecciona sus ganadores.')
    .addStringOption((option) => option.setName('id').setDescription('ID del sorteo.').setRequired(true)))
  .addSubcommand((sub) => sub
    .setName('reroll')
    .setDescription('Realiza un nuevo sorteo entre los participantes.')
    .addStringOption((option) => option.setName('id').setDescription('ID del sorteo.').setRequired(true)))
  .addSubcommand((sub) => sub
    .setName('entregar')
    .setDescription('Registra la entrega de un premio.')
    .addUserOption((option) => option.setName('usuario').setDescription('Ganador del premio.').setRequired(true))
    .addStringOption((option) => option.setName('detalle').setDescription('Detalle de la entrega.').setRequired(true)));

async function execute(interaction) {
  const guild = await getGuildRow(interaction.guild.id);
  if (!guild) return interaction.reply({ content: 'Servidor no registrado.', ephemeral: true });

  const sub = interaction.options.getSubcommand();

  try {
    if (sub === 'crear') {
      const ends = new Date(Date.now() + interaction.options.getInteger('minutos') * 60000);
      const { data: giveaway, error } = await supabase.from('giveaways').insert({
        guild_id: guild.id,
        channel_id: interaction.channel.id,
        title: interaction.options.getString('titulo'),
        prize: interaction.options.getString('premio'),
        winner_count: interaction.options.getInteger('ganadores'),
        status: 'active',
        ends_at: ends.toISOString(),
        created_by_discord_user_id: interaction.user.id
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

      const components = [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`hypnox_giveaway:${giveaway.id}`).setLabel('Participar').setStyle(ButtonStyle.Secondary)
      )];
      const message = await interaction.channel.send({ embeds: [embed], components });
      const { error: messageError } = await supabase.from('giveaways').update({ message_id: message.id }).eq('id', giveaway.id);
      if (messageError) throw messageError;
      await writeLog({ guild: interaction.guild, category: 'giveaway', action: 'create', actorId: interaction.user.id, message: giveaway.title });
      return interaction.reply({ content: `Sorteo creado: \`${giveaway.id}\``, ephemeral: true });
    }

    if (sub === 'entregar') {
      const user = interaction.options.getUser('usuario');
      const detail = interaction.options.getString('detalle');
      await writeLog({ guild: interaction.guild, category: 'giveaway', action: 'deliver', actorId: interaction.user.id, targetId: user.id, message: detail });
      return interaction.reply({ content: 'Entrega registrada correctamente en los registros.', ephemeral: true });
    }

    const id = interaction.options.getString('id');
    const { data: giveaway, error } = await supabase.from('giveaways')
      .select('*').eq('id', id).eq('guild_id', guild.id).maybeSingle();
    if (error) throw error;
    if (!giveaway) return interaction.reply({ content: 'No se encontró el sorteo indicado.', ephemeral: true });
    if (giveaway.status !== 'active' && sub === 'finalizar') return interaction.reply({ content: 'Este sorteo ya no está activo.', ephemeral: true });

    const { data: entries, error: entriesError } = await supabase
      .from('giveaway_entries').select('user_id').eq('giveaway_id', id);
    if (entriesError) throw entriesError;

    const pool = (entries || []).map((entry) => entry.user_id);
    if (!pool.length) return interaction.reply({ content: 'No hay participantes para seleccionar.', ephemeral: true });
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const winnerIds = pool.slice(0, giveaway.winner_count);
    const { data: users, error: usersError } = await supabase.from('users').select('id,discord_user_id').in('id', winnerIds);
    if (usersError) throw usersError;
    const mentions = (users || []).map((user) => `◆ <@${user.discord_user_id}>`);

    const { error: finishError } = await supabase.from('giveaways').update({
      status: 'finished',
      winners: winnerIds,
      finished_at: new Date().toISOString()
    }).eq('id', id);
    if (finishError) throw finishError;

    await writeLog({
      guild: interaction.guild,
      category: 'giveaway',
      action: sub,
      actorId: interaction.user.id,
      message: id,
      metadata: { winners: winnerIds }
    });

    const embed = brandedEmbed(sub === 'reroll' ? 'NUEVO RESULTADO' : 'RESULTADO DEL SORTEO', giveaway.title);
    embed.addFields(
      { name: 'PREMIO', value: giveaway.prize, inline: true },
      { name: 'GANADORES', value: mentions.length ? mentions.join('\n') : 'No hubo participantes.', inline: false }
    );
    embed.setFooter({ text: `Hypnox Studios • ${sub === 'reroll' ? 'Nuevo resultado' : 'Sorteo finalizado'}` });
    return interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('[HYPNOX] Giveaway error:', error);
    return interaction.reply({ content: 'No se pudo gestionar el sorteo.', ephemeral: true });
  }
}

module.exports = { data, execute, guilds: ['official', 'staff'], access: { roleEnvs: MANAGEMENT_ROLES } };
