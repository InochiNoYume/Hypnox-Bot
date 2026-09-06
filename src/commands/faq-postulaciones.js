const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getEnv } = require('../config/env');
const { brandedEmbed } = require('../utils/embeds');

const EPHEMERAL = MessageFlags.Ephemeral;
const STAFF = ['APPLICATIONS_ROLE_FOUNDER_ID', 'APPLICATIONS_ROLE_DIRECTOR_ID', 'APPLICATIONS_ROLE_ADMINISTRATOR_ID'];
const isAdmin = (member) => STAFF.some((env) => { const id = getEnv(env); return id && member?.roles?.cache?.has(id); });

module.exports = {
  data: new SlashCommandBuilder()
    .setName('faq-postulaciones')
    .setDescription('Publica las preguntas frecuentes de Staff Applications.'),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) return interaction.reply({ content: 'No tienes permisos para publicar el FAQ.', flags: EPHEMERAL });
    await interaction.deferReply({ flags: EPHEMERAL });

    try {
      const channelId = getEnv('APPLICATIONS_CHANNEL_FAQ_ID');
      const channel = channelId ? await interaction.guild.channels.fetch(channelId).catch(() => null) : null;
      if (!channel?.isTextBased()) return interaction.editReply({ content: 'Configura APPLICATIONS_CHANNEL_FAQ_ID en el entorno del bot.' });

      const embed = brandedEmbed('FAQ DE POSTULACIONES', 'Centro de orientación para candidatos. Aquí se reúnen las respuestas a las dudas más habituales sobre el proceso de incorporación al Staff.', {
        footerText: 'Hypnox Studios • Staff Applications • FAQ'
      });

      embed.addFields(
        { name: '『01』 ¿Cuándo puedo postular?', value: 'Solo cuando la convocatoria se encuentre abierta. El inicio y cierre serán comunicados oficialmente.' },
        { name: '『02』 ¿Dónde postulo?', value: 'La postulación se realiza siguiendo el enlace y las instrucciones publicadas por Hypnox Studios en el Discord oficial.' },
        { name: '『03』 ¿Necesito una entrevista?', value: 'No existe una entrevista obligatoria dentro del proceso actual. La evaluación se realiza mediante la revisión de la postulación y los criterios definidos para la convocatoria.' },
        { name: '『04』 ¿Necesito abrir un ticket?', value: 'No. Las postulaciones no se gestionan mediante tickets.' },
        { name: '『05』 ¿Ser aceptado está garantizado si cumplo los requisitos?', value: 'No. Los requisitos establecen una base mínima; la decisión también depende de la evaluación y de las necesidades actuales de Hypnox Studios.' },
        { name: '『06』 ¿Puedo postular a más de un puesto?', value: 'Solo si la convocatoria lo permite. Sigue siempre las instrucciones específicas publicadas para ese periodo.' },
        { name: '『07』 ¿Cómo sabré el resultado?', value: 'Los resultados se publicarán mediante los canales oficiales indicados en la convocatoria.' },
        { name: '『08』 ¿Qué ocurre si soy aceptado?', value: 'Recibirás las indicaciones necesarias para incorporarte al equipo y, si corresponde, comenzar tu etapa de formación o evaluación.' },
        { name: '『09』 ¿Puedo volver a postular si soy rechazado?', value: 'Sí, salvo que una convocatoria indique una restricción específica. Deberás esperar a una nueva apertura de postulaciones.' },
        { name: '『10』 ¿Puedo pedir información sobre otra postulación?', value: 'No. La información de otros candidatos y las decisiones internas del proceso son confidenciales.' },
        { name: '『11』 ¿Puedo editar mi postulación después de enviarla?', value: 'Depende del sistema y de las instrucciones de la convocatoria. Si no existe una opción habilitada, no envíes postulaciones duplicadas.' },
        { name: '『12』 ¿Qué pasa si envío información falsa?', value: 'La postulación puede ser descartada y, si corresponde, pueden aplicarse medidas adicionales según la gravedad del caso.' }
      );

      await channel.send({ embeds: [embed] });
      return interaction.editReply({ content: `FAQ publicado en <#${channel.id}>.` });
    } catch (error) {
      console.error('[HYPNOX] FAQ postulaciones error:', error);
      return interaction.editReply({ content: 'No se pudo publicar el FAQ. El error fue registrado para revisión.' }).catch(() => {});
    }
  },

  guilds: ['applications']
};
