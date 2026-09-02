const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('user')
    .setDescription('Muestra información de un usuario.')
    .addUserOption((option) => option.setName('usuario').setDescription('Usuario a consultar').setRequired(false)),

  async execute(interaction) {
    const user = interaction.options.getUser('usuario') || interaction.user;
    const member = interaction.guild?.members.cache.get(user.id);
    const embed = baseEmbed('INFORMACIÓN DE USUARIO', `Información de ${user}.`)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'Usuario', value: user.tag, inline: true },
        { name: 'ID', value: user.id, inline: true },
        { name: 'Ingreso al servidor', value: member?.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:F>` : '—', inline: false }
      );
    await interaction.reply({ embeds: [embed] });
  },

  guilds: ['official'],
  access: { roleEnvs: ['OFFICIAL_ROLE_MEMBER_ID'] }
};
