const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getEnv } = require('../config/env');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('links')
    .setDescription('Muestra los enlaces oficiales de Hypnox Studios.'),

  async execute(interaction) {
    const links = [
      ['Discord', getEnv('OFFICIAL_DISCORD_URL')],
      ['Web', getEnv('WEBSITE_URL')],
      ['YouTube', getEnv('YOUTUBE_URL')],
      ['TikTok', getEnv('TIKTOK_URL')],
      ['Instagram', getEnv('INSTAGRAM_URL')]
    ].filter(([, url]) => url);

    const description = links.length
      ? links.map(([name, url]) => `**${name}:** ${url}`).join('\n')
      : 'Los enlaces oficiales todavía no están configurados.';

    const embed = new EmbedBuilder()
      .setColor(Number.parseInt(process.env.BOT_COLOR || '000000', 16))
      .setTitle('HYPNOX STUDIOS — ENLACES')
      .setDescription(description)
      .setFooter({ text: 'Hypnox Studios • Enlaces oficiales' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  },

  guilds: ['official'],
  access: { roleEnvs: ['OFFICIAL_ROLE_MEMBER_ID'] }
};
