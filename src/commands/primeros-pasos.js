const { SlashCommandBuilder } = require('discord.js');
const { brandedEmbed } = require('../utils/embeds');

const data = new SlashCommandBuilder()
  .setName('primeros-pasos')
  .setDescription('Muestra la guía de primeros pasos del servidor.');

async function execute(interaction) {
  const isStaff = interaction.guild.id === process.env.STAFF_GUILD_ID;
  const embed = brandedEmbed(
    'PRIMEROS PASOS',
    isStaff
      ? '◆ Revisa las reglas internas.\n◆ Consulta la información del Staff Team.\n◆ Revisa los canales de tu departamento.\n◆ Mantén la confidencialidad de la información interna.\n◆ Sigue las indicaciones de Dirección y responsables de proyecto.'
      : '◆ Revisa los requisitos.\n◆ Lee la información del proceso.\n◆ Consulta las preguntas frecuentes.\n◆ Revisa el estado de las convocatorias.\n◆ Postúlate únicamente cuando exista una convocatoria abierta.'
  );
  return interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = { data, execute, guilds: ['staff', 'applications'] };
