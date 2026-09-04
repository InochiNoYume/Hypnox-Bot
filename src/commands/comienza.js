const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const { getEnv } = require('../config/env');
const { getGuildRow } = require('../services/guilds');
const { writeLog } = require('../services/logs');
const { brandedEmbed, addSection } = require('../utils/embeds');

const EPHEMERAL = MessageFlags.Ephemeral;

const TYPES = {
  serie: {
    label: 'SERIE',
    participantRoleEnv: 'OFFICIAL_ROLE_SERIES_PARTICIPANT_ID',
    channelEnv: 'OFFICIAL_CHANNEL_SERIES_ID',
    startTitle: 'COMIENZA LA SERIE',
    dmTitle: 'PARTICIPACIÓN — SERIE',
    channelText: 'La serie comienza oficialmente.'
  },
  evento: {
    label: 'EVENTO',
    participantRoleEnv: 'OFFICIAL_ROLE_EVENT_PARTICIPANT_ID',
    channelEnv: 'OFFICIAL_CHANNEL_EVENTS_ID',
    startTitle: 'COMIENZA EL EVENTO',
    dmTitle: 'PARTICIPACIÓN — EVENTO',
    channelText: 'El evento comienza oficialmente.'
  }
};

const data = new SlashCommandBuilder()
  .setName('comienza')
  .setDescription('Inicia oficialmente una serie o evento y avisa a sus participantes.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption((option) => option
    .setName('tipo')
    .setDescription('Tipo de actividad que comenzará.')
    .setRequired(true)
    .addChoices(
      { name: 'Serie', value: 'serie' },
      { name: 'Evento', value: 'evento' }
    ));

function buildChannelEmbed(config) {
  const embed = brandedEmbed(
    config.startTitle,
    `La espera ha terminado. **${config.label.toLowerCase()}** comienza oficialmente.`,
    {
      image: getEnv('OFFICIAL_IMAGE_BANNER') || getEnv('OFFICIAL_IMAGE_ANNOUNCEMENT'),
      footerText: `Hypnox Studios • ${config.label}`
    }
  );

  addSection(embed, 'Estado', `**${config.channelText}**\nLos participantes ya pueden comenzar.`);
  addSection(embed, 'Participantes', 'El aviso también fue enviado por mensaje privado a los miembros con el rol de participante.');
  return embed;
}

function buildDmEmbed(config, guild) {
  const embed = brandedEmbed(
    config.dmTitle,
    `La **${config.label.toLowerCase()}** de **${guild.name}** comienza oficialmente.`,
    {
      image: getEnv('OFFICIAL_IMAGE_BANNER') || getEnv('OFFICIAL_IMAGE_ANNOUNCEMENT'),
      footerText: `Hypnox Studios • ${config.label}`
    }
  );

  addSection(embed, 'Inicio', 'Ya puedes incorporarte y participar en la actividad correspondiente.');
  addSection(embed, 'Canal', `Dirígete a <#${getEnv(config.channelEnv)}> para continuar.`);
  addSection(embed, 'Importante', 'Este mensaje fue enviado automáticamente porque formas parte de los participantes registrados.');
  return embed;
}

async function execute(interaction) {
  await interaction.deferReply({ flags: EPHEMERAL });

  try {
    if (!interaction.guild || interaction.guild.id !== getEnv('OFFICIAL_GUILD_ID')) {
      return interaction.editReply({ content: 'Este comando solo puede utilizarse en el servidor oficial.' });
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.editReply({ content: 'No tienes permisos para utilizar este comando. Se requiere Administrador.' });
    }

    const guild = await getGuildRow(interaction.guild.id);
    if (!guild) return interaction.editReply({ content: 'El servidor aún no está registrado en Supabase.' });

    const type = interaction.options.getString('tipo', true);
    const config = TYPES[type];
    if (!config) return interaction.editReply({ content: 'El tipo seleccionado no es válido.' });

    const participantRoleId = getEnv(config.participantRoleEnv);
    const channelId = getEnv(config.channelEnv);

    if (!participantRoleId || !channelId) {
      return interaction.editReply({
        content: `Falta configurar ${config.participantRoleEnv} o ${config.channelEnv} en el entorno del bot.`
      });
    }

    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased()) {
      return interaction.editReply({ content: `No se encontró un canal de texto válido para ${config.label.toLowerCase()}.` });
    }

    const role = await interaction.guild.roles.fetch(participantRoleId).catch(() => null);
    if (!role) {
      return interaction.editReply({ content: `No se encontró el rol de participantes configurado (${config.participantRoleEnv}).` });
    }

    await interaction.guild.members.fetch();
    const participants = role.members.filter((member) => !member.user.bot);

    const dmEmbed = buildDmEmbed(config, interaction.guild);
    const channelEmbed = buildChannelEmbed(config);

    const dmResults = await Promise.allSettled(
      participants.map((member) => member.send({ embeds: [dmEmbed] }))
    );

    const sent = dmResults.filter((result) => result.status === 'fulfilled').length;
    const failed = dmResults.length - sent;

    const message = await channel.send({ embeds: [channelEmbed] });

    await writeLog({
      guild: interaction.guild,
      category: 'activity',
      action: `comienza_${type}`,
      actorId: interaction.user.id,
      channelId: channel.id,
      message: `${config.label} iniciada. Participantes avisados: ${sent}. DM fallidos: ${failed}.`
    });

    return interaction.editReply({
      content: `${config.label} iniciado correctamente en <#${channel.id}>. Avisos privados enviados: **${sent}**${failed ? ` · No se pudieron enviar: **${failed}**` : ''}. Mensaje publicado: ${message.url}`
    });
  } catch (error) {
    console.error('[HYPNOX] Comienza error:', error);
    return interaction.editReply({ content: 'No se pudo iniciar la actividad. El error fue registrado.' }).catch(() => {});
  }
}

module.exports = {
  data,
  execute,
  guilds: ['official']
};
