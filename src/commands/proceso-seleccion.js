const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getEnv } = require('../config/env');

const STAFF = ['APPLICATIONS_ROLE_FOUNDER_ID', 'APPLICATIONS_ROLE_DIRECTOR_ID', 'APPLICATIONS_ROLE_ADMINISTRATOR_ID'];
const isAdmin = (member) => STAFF.some((env) => { const id = getEnv(env); return id && member?.roles?.cache?.has(id); });

module.exports = {
  data: new SlashCommandBuilder()
    .setName('proceso-seleccion')
    .setDescription('Publica el proceso oficial de selección de Staff.'),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) return interaction.reply({ content: 'No tienes permisos para publicar el proceso de selección.', ephemeral: true });
    const channelId = getEnv('APPLICATIONS_CHANNEL_SELECTION_ID');
    const channel = channelId ? await interaction.guild.channels.fetch(channelId).catch(() => null) : null;
    if (!channel?.isTextBased()) return interaction.reply({ content: 'Configura APPLICATIONS_CHANNEL_SELECTION_ID en el entorno del bot.', ephemeral: true });

    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setTitle('HYPNOX STUDIOS — PROCESO DE SELECCIÓN')
      .setDescription('╭━━━━━━━━━━━━━━━━━━━━━━╮\n          **PROCESO DE INCORPORACIÓN**\n╰━━━━━━━━━━━━━━━━━━━━━━╯\n\nEl proceso de selección busca identificar a las personas que mejor se adapten a las necesidades, responsabilidades y valores actuales de Hypnox Studios.')
      .addFields(
        { name: '『01』 Convocatoria', value: 'Las postulaciones se habilitan mediante un anuncio oficial en el Discord de Hypnox Studios. Solo se consideran postulaciones enviadas durante el periodo indicado.' },
        { name: '『02』 Postulación', value: 'El candidato debe acceder al servidor de Staff Applications mediante el enlace oficial y seguir las instrucciones publicadas en el canal correspondiente.' },
        { name: '『03』 Revisión', value: 'El equipo responsable revisa la información proporcionada y comprueba que la postulación cumpla los requisitos establecidos para la convocatoria.' },
        { name: '『04』 Evaluación', value: 'Se valoran aspectos como responsabilidad, actividad, comunicación, madurez, experiencia, disposición para colaborar y adecuación al puesto solicitado.' },
        { name: '『05』 Decisión', value: 'La decisión final corresponde al equipo autorizado de Hypnox Studios. Cumplir los requisitos no garantiza la aceptación.' },
        { name: '『06』 Resultado', value: 'Los resultados se comunican mediante los canales oficiales. Una persona puede ser aceptada, rechazada o quedar fuera de la convocatoria según las necesidades del momento.' },
        { name: '『07』 Incorporación', value: 'Las personas aceptadas recibirán las indicaciones necesarias para incorporarse al equipo y, cuando corresponda, comenzar su periodo de formación o evaluación.' },
        { name: '『08』 Confidencialidad', value: 'La información utilizada durante la revisión de postulaciones debe tratarse de forma responsable. No compartas conversaciones, decisiones internas ni datos de otros candidatos.' },
        { name: '『09』 Importante', value: 'Hypnox Studios puede modificar requisitos, puestos, etapas o fechas de una convocatoria según las necesidades del proyecto.' }
      )
      .setFooter({ text: 'Hypnox Studios • Staff Applications • Proceso de selección' })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    return interaction.reply({ content: `Proceso de selección publicado en <#${channel.id}>.`, ephemeral: true });
  },

  guilds: ['applications']
};
