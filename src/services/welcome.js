const { EmbedBuilder } = require('discord.js');
const { getEnv } = require('../utils/env');

const BLACK = 0x000000;

function buildWelcomeEmbed(member, type) {
  const isStaff = type === 'staff';
  const title = isStaff ? 'BIENVENIDO AL STAFF TEAM' : 'BIENVENIDO AL SISTEMA DE POSTULACIONES';
  const body = isStaff
    ? `Bienvenido/a a **Hypnox Studios Staff Team**, ${member}.\n\nEste servidor es el espacio interno de trabajo del equipo. Aquí encontrarás la organización, coordinación y recursos necesarios para participar en los proyectos de Hypnox Studios.`
    : `Bienvenido/a al **servidor de postulaciones de Hypnox Studios**, ${member}.\n\nAquí encontrarás la información oficial del proceso de selección y los espacios destinados a quienes desean formar parte del equipo.`;

  const embed = new EmbedBuilder()
    .setColor(BLACK)
    .setAuthor({ name: 'HYPNOX STUDIOS' })
    .setTitle(title)
    .setDescription(body)
    .addFields(
      {
        name: 'PRIMEROS PASOS',
        value: isStaff
          ? '◆ Revisa las reglas internas.\n◆ Consulta la información del Staff Team.\n◆ Revisa los canales de tu departamento.\n◆ Espera las indicaciones del equipo de Dirección.'
          : '◆ Revisa los requisitos.\n◆ Lee la información del proceso.\n◆ Consulta las preguntas frecuentes.\n◆ Utiliza el canal de postulación cuando haya una convocatoria abierta.'
      },
      {
        name: 'IMPORTANTE',
        value: isStaff
          ? 'Mantén la organización y confidencialidad de la información interna. Las indicaciones oficiales del equipo se publicarán en los canales correspondientes.'
          : 'Las postulaciones solo están disponibles durante períodos oficiales. Cumplir los requisitos no garantiza la aceptación.'
      }
    )
    .setFooter({ text: 'Hypnox Studios • Sistema oficial' })
    .setTimestamp();

  const banner = getEnv(isStaff ? 'STAFF_IMAGE_BANNER' : 'APPLICATIONS_IMAGE_BANNER');
  if (banner) embed.setImage(banner);
  return embed;
}

module.exports = { buildWelcomeEmbed };
