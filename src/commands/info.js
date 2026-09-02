const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Muestra información sobre Hypnox Studios.'),

  async execute(interaction) {
    const embed = baseEmbed(
      'HYPNOX STUDIOS',
      'Comunidad y estudio dedicado a la creación de experiencias dentro de Minecraft mediante series, eventos, actividades y proyectos.'
    );

    embed.addFields(
      { name: 'Servidor', value: interaction.guild?.name || 'Desconocido', inline: true },
      { name: 'Miembros', value: String(interaction.guild?.memberCount ?? '—'), inline: true }
    );

    await interaction.reply({ embeds: [embed] });
  },

  guilds: ['official'],
  access: { roleEnvs: ['OFFICIAL_ROLE_MEMBER_ID'] }
};
