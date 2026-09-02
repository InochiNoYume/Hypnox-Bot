const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Muestra información del servidor.'),

  async execute(interaction) {
    const guild = interaction.guild;
    const owner = await guild.fetchOwner();

    const embed = baseEmbed('INFORMACIÓN DEL SERVIDOR', guild.name)
      .setThumbnail(guild.iconURL({ size: 256 }) || null)
      .addFields(
        { name: 'ID', value: guild.id, inline: true },
        { name: 'Miembros', value: String(guild.memberCount), inline: true },
        { name: 'Propietario', value: owner.user.tag, inline: true },
        { name: 'Creado', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: false }
      );

    await interaction.reply({ embeds: [embed] });
  }
};
