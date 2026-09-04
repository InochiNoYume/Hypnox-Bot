const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getEnv } = require('../config/env');
const { brandedEmbed } = require('../utils/embeds');

const EPHEMERAL = MessageFlags.Ephemeral;
const STAFF = ['OFFICIAL_ROLE_FOUNDER_ID', 'OFFICIAL_ROLE_DIRECTOR_ID', 'OFFICIAL_ROLE_ADMINISTRATOR_ID'];
const isAdmin = (member) => STAFF.some((env) => { const id = getEnv(env); return id && member?.roles?.cache?.has(id); });

module.exports = {
  data: new SlashCommandBuilder()
    .setName('faq')
    .setDescription('Publica las preguntas frecuentes del Discord oficial.'),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) return interaction.reply({ content: 'No tienes permisos para publicar las preguntas frecuentes.', flags: EPHEMERAL });
    const channelId = getEnv('OFFICIAL_CHANNEL_FAQ_ID');
    const channel = channelId ? await interaction.guild.channels.fetch(channelId).catch(() => null) : null;
    if (!channel?.isTextBased()) return interaction.reply({ content: 'Configura OFFICIAL_CHANNEL_FAQ_ID en el entorno del bot.', flags: EPHEMERAL });

    const embed = brandedEmbed('PREGUNTAS FRECUENTES', 'Centro de información de Hypnox Studios. Aquí encontrarás respuestas a las consultas más habituales sobre la comunidad, nuestras actividades y nuestros sistemas.', {
      footerText: 'Hypnox Studios • Centro de información'
    });

    embed.addFields(
      { name: '『01』 ¿Qué es Hypnox Studios?', value: 'Es una comunidad y estudio enfocado en Minecraft, dedicado a crear series, eventos, actividades y proyectos para la comunidad.' },
      { name: '『02』 ¿Cómo puedo participar en una serie?', value: 'Revisa los anuncios y canales de series. Cuando exista una convocatoria de participación, allí se indicarán los requisitos y la forma de inscripción.' },
      { name: '『03』 ¿Cómo puedo participar en un evento?', value: 'Consulta el canal de eventos y sigue las instrucciones publicadas en cada convocatoria.' },
      { name: '『04』 ¿Cómo puedo postular al Staff?', value: 'Cuando las postulaciones estén abiertas, el servidor oficial publicará el anuncio correspondiente con el acceso al Discord de Staff Applications.' },
      { name: '『05』 ¿Cómo reporto a un usuario o situación?', value: 'Utiliza el sistema de tickets y selecciona la categoría **Reporte**. Proporciona información clara y, cuando corresponda, pruebas que permitan revisar el caso.' },
      { name: '『06』 ¿Cómo solicito una alianza?', value: 'Abre un ticket mediante la categoría **Alianza / Partner** y proporciona la información solicitada.' },
      { name: '『07』 ¿Cómo contacto directamente con Hypnox Studios?', value: 'Utiliza la categoría **Contacto** del sistema de tickets para comunicarte con el equipo autorizado.' },
      { name: '『08』 ¿Dónde encuentro las redes oficiales?', value: 'Consulta el canal de redes y enlaces para acceder únicamente a los medios oficiales publicados por Hypnox Studios.' },
      { name: '『09』 ¿Dónde puedo hacer una sugerencia?', value: 'Utiliza el canal destinado a sugerencias y explica de forma concreta qué propones y cómo podría mejorar la comunidad.' },
      { name: '『10』 ¿Qué hago si necesito ayuda?', value: 'Consulta primero esta sección y los canales de información. Si no encuentras una respuesta, abre un ticket de **Soporte**.' }
    );

    await channel.send({ embeds: [embed] });
    return interaction.reply({ content: `Preguntas frecuentes publicadas en <#${channel.id}>.`, flags: EPHEMERAL });
  },

  guilds: ['official']
};
