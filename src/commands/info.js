const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Muestra información sobre Hypnox Studios.'),

  async execute(interaction) {
    const embed = baseEmbed(
      'HYPNOX STUDIOS — INFORMACIÓN',
      'Comunidad y estudio dedicado a la creación de experiencias dentro de Minecraft mediante series, eventos, actividades y proyectos.'
    );

    embed.addFields(
      {
        name: '◆ SOBRE HYPNOX STUDIOS',
        value: 'Hypnox Studios es un espacio dedicado a crear experiencias dentro de Minecraft, combinando entretenimiento, creatividad y organización.'
      },
      {
        name: '◆ QUÉ ENCONTRARÁS',
        value: 'Series y proyectos de Minecraft, eventos, actividades, dinámicas, premios, participación de la comunidad y colaboraciones.'
      },
      {
        name: '◆ SERIES Y PROYECTOS',
        value: 'En este servidor se publicará la información relacionada con nuestras series, proyectos, próximos lanzamientos y oportunidades de participación.'
      },
      {
        name: '◆ EVENTOS Y ACTIVIDADES',
        value: 'Organizamos actividades y eventos para la comunidad. Las fechas, condiciones y resultados serán comunicados mediante los canales oficiales correspondientes.'
      },
      {
        name: '◆ PARTICIPACIÓN',
        value: 'Dependiendo del proyecto o actividad, los miembros podrán participar como jugadores, creadores, colaboradores o participantes especiales.'
      },
      {
        name: '◆ STAFF',
        value: 'Nuestro equipo se encarga de la administración, moderación, planificación y desarrollo de los distintos proyectos de Hypnox Studios. Las convocatorias se publicarán únicamente por los canales oficiales.'
      },
      {
        name: '◆ SOPORTE',
        value: 'Si necesitas ayuda, realizar un reporte, contactar con el equipo o solicitar una alianza, utiliza el sistema de tickets disponible en el servidor.'
      },
      {
        name: '◆ CANALES DE INFORMACIÓN',
        value: 'Para consultar reglas, preguntas frecuentes, enlaces oficiales y otros recursos, utiliza los canales específicos disponibles en el servidor.'
      }
    );

    return interaction.reply({ embeds: [embed] });
  },

  guilds: ['official'],
  access: { roleEnvs: ['OFFICIAL_ROLE_MEMBER_ID'] }
};
