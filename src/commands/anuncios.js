const { SlashCommandBuilder } = require('discord.js');
const supabase = require('../database/supabase');
const { writeLog } = require('../services/logs');
const { getEnv } = require('../config/env');
const { getGuildRow } = require('../services/guilds');
const { brandedEmbed, addSection } = require('../utils/embeds');

const TYPES = {
  anuncio: { label: 'ANUNCIO OFICIAL', description: 'Comunicación institucional de Hypnox Studios para informar a la comunidad.' },
  actividad: { label: 'ACTIVIDAD', description: 'Actividad organizada por Hypnox Studios para fomentar la participación de la comunidad.' },
  dinamica: { label: 'DINÁMICA', description: 'Dinámica de participación creada para la comunidad de Hypnox Studios.' },
  evento: { label: 'EVENTO', description: 'Información oficial relacionada con un evento de Hypnox Studios.' },
  serie: { label: 'SERIE', description: 'Actualización oficial sobre una serie o producción de Hypnox Studios.' },
  episodio: { label: 'EPISODIO', description: 'Publicación correspondiente a un nuevo episodio o entrega de una serie.' }
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
    .setName('tipo')
    .setDescription('Clasificación de la publicación.')
    .setRequired(true)
    .addChoices(...Object.entries(TYPES).map(([value, config]) => ({ name: config.label, value }))))
  .addStringOption((option) => option
    .setName('titulo')
    .setDescription('Título principal de la publicación.')
    .setMinLength(1)
    .setMaxLength(180)
    .setRequired(true))
  .addStringOption((option) => option
    .setName('contenido')
    .setDescription('Contenido principal que recibirá la comunidad.')
    .setMinLength(1)
    .setMaxLength(3800)
    .setRequired(true))
  .addStringOption((option) => option
    .setName('imagen')
    .setDescription('URL de una imagen para acompañar la publicación.')
    .setMaxLength(1000));

async function execute(interaction) {
  const guild = await getGuildRow(interaction.guild.id);
  if (!guild) return interaction.reply({ content: 'El servidor aún no está registrado en Supabase.', ephemeral: true });

  const type = interaction.options.getString('tipo', true);
  const title = interaction.options.getString('titulo', true).trim();
  const content = interaction.options.getString('contenido', true).trim();
  const image = interaction.options.getString('imagen')?.trim() || getEnv('OFFICIAL_IMAGE_ANNOUNCEMENT');
  const config = TYPES[type];

  if (!config) return interaction.reply({ content: 'El tipo de anuncio no es válido.', ephemeral: true });
  if (title.length > 180) return interaction.reply({ content: 'El título es demasiado largo.', ephemeral: true });
  if (content.length > 3800) return interaction.reply({ content: 'El contenido es demasiado largo.', ephemeral: true });

  const embed = brandedEmbed(title, content, {
    image,
    footerText: `Hypnox Studios • ${config.label}`
  });
  addSection(embed, 'Clasificación', `**${config.label}**\n${config.description}`);

  let message;
  try {
    message = await interaction.channel.send({ embeds: [embed] });
    const { error } = await supabase.from('announcements').insert({
      guild_id: guild.id,
      channel_id: interaction.channel.id,
      message_id: message.id,
      announcement_type: type,
      title,
      content,
      image_url: image || null,
      author_discord_user_id: interaction.user.id
    });
    if (error) throw error;

    await writeLog({
      guild: interaction.guild,
      category: 'announcement',
      action: type,
      actorId: interaction.user.id,
      channelId: interaction.channel.id,
      message: title
    });
  } catch (error) {
    if (message) await message.delete().catch(() => {});
    console.error('[HYPNOX] Announcement error:', error);
    return interaction.reply({ content: 'No se pudo publicar el anuncio. El error fue registrado.', ephemeral: true });
  }

  return interaction.reply({ content: 'Publicación enviada correctamente.', ephemeral: true });
}

module.exports = { data, execute, guilds: ['official', 'staff'], access: { roleEnvs: STAFF_ROLES } };
