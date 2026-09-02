const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder().setName('credits').setDescription('Muestra los créditos de Hypnox Studios.'),

  async execute(interaction) {
    const embed = baseEmbed('CRÉDITOS', 'Hypnox Studios\n\nProyecto, comunidad y bot desarrollados para centralizar la gestión de nuestros servidores de Discord.');
    await interaction.reply({ embeds: [embed] });
  },

  guilds: ['official'],
  access: { roleEnvs: ['OFFICIAL_ROLE_MEMBER_ID'] }
};
