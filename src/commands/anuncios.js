const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const supabase = require('../database/supabase');
const { writeLog } = require('../services/logs');
const { getEnv } = require('../config/env');
const { getGuildRow } = require('../services/guilds');
const { getGuildType } = require('../utils/guild');
const { brandedEmbed, addSection } = require('../utils/embeds');

const EPHEMERAL = MessageFlags.Ephemeral;

const TYPES = {
  anuncio: { label: 'ANUNCIO OFICIAL', description: 'Comunicación institucional de Hypnox Studios para informar a la comunidad.' },
  actividad: { label: 'ACTIVIDAD', description: 'Actividad organizada por Hypnox Studios para fomentar la participación de la comunidad.' },
  dinamica: { label: 'DINÁMICA', description: 'Dinámica de participación creada para la comunidad de Hypnox Studios.' },
  evento: { label: 'EVENTO', description: 'Información oficial relacionada con un evento de Hypnox Studios.' },
  serie: { label: 'SERIE', description: 'Actualización oficial sobre una serie o producción de Hypnox Studios.' },
  episodio: { label: 'EPISODIO', description: 'Publicación correspondiente a un nuevo episodio o entrega de una serie.' }
};

const DB_ANNOUNCEMENT_TYPES = {
  anuncio: 'official',
  actividad: 'activity',
  dinamica: 'dynamic',
  evento: 'event',
  serie: 'series',
  episodio: 'episode'
};

const STAFF_ROLES = [
  'OFFICIAL_ROLE_FOUNDER_ID', 'OFFICIAL_ROLE_DIRECTOR_ID', 'OFFICIAL_ROLE_ADMINISTRATOR_ID',
  'OFFICIAL_ROLE_SRMOD_ID', 'OFFICIAL_ROLE_MOD_ID', 'OFFICIAL_ROLE_TMOD_ID', 'OFFICIAL_ROLE_HELPER_ID',
  'STAFF_ROLE_FOUNDER_ID', 'STAFF_ROLE_DIRECTOR_ID', 'STAFF_ROLE_ADMINISTRATIVE_ASSISTANT_ID',
  'STAFF_ROLE_SRMOD_ID', 'STAFF_ROLE_MOD_ID', 'STAFF_ROLE_TMOD_ID', 'STAFF_ROLE_HELPER_ID',
  'STAFF_ROLE_PROJECT_MANAGER_ID', 'STAFF_ROLE_DEPARTMENT_LEAD_ID'
];

const data = new SlashCommandBuilder()
  .setName('anuncio')
  .setDescription('Publica una comunicación oficial de Hypnox Studios.')
  .addStringOption((option) => option
    .setName('tipo').setDescription('Clasificación de la publicación.').setRequired(true)
    .addChoices(...Object.entries(TYPES).map(([value, config]) => ({ name: config.label, value }))))
  .addStringOption((option) => option
    .setName('titulo').setDescription('Título principal de la publicación.').setMinLength(1).setMaxLength(180).setRequired(true))
  .addStringOption((option) => option
    .setName('contenido').setDescription('Contenido principal que recibirá la comunidad.').setMinLength(1).setMaxLength(3800).setRequired(true))
  .addStringOption((option) => option
    .setName('imagen').setDescription('URL de una imagen para acompañar la publicación.').setMaxLength(1000));

async function getAnnouncementChannel(interaction) {
  const guildType = getGuildType(interaction.guild.id);
  const envKey = guildType === 'official' ? 'OFFICIAL_CHANNEL_ANNOUNCEMENTS_ID' : 'STAFF_CHANNEL_ANNOUNCEMENTS_ID';
  const channelId = getEnv(envKey);
  if (!channelId) return { channel: guildType === 'staff' && interaction.channel?.isTextBased() ? interaction.channel : null, envKey };
  const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
  return { channel: channel?.isTextBased() ? channel : null, envKey };
}

async function execute(interaction) {
  await interaction.deferReply({ flags: EPHEMERAL });

  try {
    const guild = await getGuildRow(interaction.guild.id);
    if (!guild) return interaction.editReply({ content: 'El servidor aún no está registrado en Supabase.' });

    const type = interaction.options.getString('tipo', true);
    const title = interaction.options.getString('titulo', true).trim();
    const content = interaction.options.getString('contenido', true).trim();
    const guildType = getGuildType(interaction.guild.id);
    const suppliedImage = interaction.options.getString('imagen')?.trim();
    const image = suppliedImage || (guildType === 'official'
      ? getEnv('OFFICIAL_IMAGE_ANNOUNCEMENT') || getEnv('OFFICIAL_IMAGE_BANNER')
      : getEnv('STAFF_IMAGE_ANNOUNCEMENT') || getEnv('STAFF_IMAGE_BANNER'));
    const config = TYPES[type];
    const dbAnnouncementType = DB_ANNOUNCEMENT_TYPES[type];

    if (!config || !dbAnnouncementType) return interaction.editReply({ content: 'El tipo de anuncio no es válido.' });
    const { channel, envKey } = await getAnnouncementChannel(interaction);
    if (!channel) return interaction.editReply({ content: `Configura ${envKey} en el .env antes de publicar anuncios.` });

    const embed = brandedEmbed(title, content, { image, footerText: `Hypnox Studios • ${config.label}` });
    addSection(embed, 'Clasificación', `**${config.label}**\n${config.description}`);

    let message;
    try {
      message = await channel.send({ embeds: [embed] });
      const { error } = await supabase.from('announcements').insert({
        guild_id: guild.id,
        channel_id: channel.id,
        message_id: message.id,
        announcement_type: dbAnnouncementType,
        title,
        content,
        image_url: image || null,
        author_discord_user_id: interaction.user.id
      });
      if (error) throw error;
      await writeLog({ guild: interaction.guild, category: 'announcement', action: type, actorId: interaction.user.id, channelId: channel.id, message: title });
    } catch (error) {
      if (message) await message.delete().catch(() => {});
      throw error;
    }

    return interaction.editReply({ content: `Publicación enviada en <#${channel.id}>.` });
  } catch (error) {
    console.error('[HYPNOX] Announcement error:', error);
    return interaction.editReply({ content: 'No se pudo publicar el anuncio. El error fue registrado.' }).catch(() => {});
  }
}

module.exports = { data, execute, guilds: ['official', 'staff'], access: { roleEnvs: STAFF_ROLES } };
