const { SlashCommandBuilder } = require('discord.js');
const supabase = require('../database/supabase');
const { writeLog } = require('../services/logs');
const { getEnv } = require('../config/env');
const { getGuildRow } = require('../services/guilds');
const { brandedEmbed } = require('../utils/embeds');

const TYPES = {
  anuncio: {
    label: 'ANUNCIO OFICIAL',
    description: 'Comunicación institucional de Hypnox Studios para informar a la comunidad.'
  },
  actividad: {
    label: 'ACTIVIDAD',
    description: 'Actividad organizada por Hypnox Studios para fomentar la participación de la comunidad.'
  },
  dinamica: {
    label: 'DINÁMICA',
    description: 'Dinámica de participación creada para la comunidad de Hypnox Studios.'
  },
  evento: {
    label: 'EVENTO',
    description: 'Información oficial relacionada con un evento de Hypnox Studios.'
  },
  serie: {
    label: 'SERIE',
    description: 'Actualización oficial sobre una serie o producción de Hypnox Studios.'
  },
  episodio: {
    label: 'EPISODIO',
    description: 'Publicación correspondiente a un nuevo episodio o entrega de una serie.'
  }
};

const STAFF_ROLES = [
  'OFFICIAL_ROLE_FOUNDER_ID', 'OFFICIAL_ROLE_DIRECTOR_ID', 'OFFICIAL_ROLE_ADMINISTRATOR_ID',
  'OFFICIAL_ROLE_SRMOD_ID', 'OFFICIAL_ROLE_MOD_ID', 'OFFICIAL_ROLE_TMOD_ID', 'OFFICIAL_ROLE_HELPER_ID',
  'STAFF_ROLE_FOUNDER_ID', 'STAFF_ROLE_DIRECTOR_ID', 'STAFF_ROLE_ADMINISTRATOR_ID', 'STAFF_ROLE_ADMINISTRATIVE_ASSISTANT_ID',
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
    .setRequired(true))
  .addStringOption((option) => option
    .setName('contenido')
    .setDescription('Contenido principal que recibirá la comunidad.')
    .setRequired(true))
  .addStringOption((option) => option
    .setName('imagen')
    .setDescription('URL de una imagen para acompañar la publicación.'));

async function execute(interaction) {
  const guild = await getGuildRow(interaction.guild.id);
  if (!guild) return interaction.reply({ content: 'El servidor aún no está registrado en Supabase.', ephemeral: true });

  const type = interaction.options.getString('tipo');
  const title = interaction.options.getString('titulo');
  const content = interaction.options.getString('contenido');
  const image = interaction.options.getString('imagen') || getEnv('OFFICIAL_IMAGE_ANNOUNCEMENT');
  const config = TYPES[type];

  const embed = brandedEmbed(title, content, { image });
  embed.addFields({
    name: '◆ CLASIFICACIÓN',
    value: `**${config.label}**\n${config.description}`,
    inline: false
  });

  const message = await interaction.channel.send({ embeds: [embed] });
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

  return interaction.reply({ content: 'Publicación enviada correctamente.', ephemeral: true });
}

module.exports = { data, execute, guilds: ['official', 'staff'], access: { roleEnvs: STAFF_ROLES } };
