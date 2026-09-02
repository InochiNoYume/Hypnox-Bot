const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getEnv } = require('../config/env');

function readUrl(key) {
  const value = getEnv(key);
  if (!value) return null;
  const url = String(value).trim();
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('links')
    .setDescription('Muestra los enlaces oficiales de Hypnox Studios.'),

  async execute(interaction) {
    const links = [
      ['Discord', readUrl('OFFICIAL_DISCORD_URL')],
      ['Web', readUrl('WEBSITE_URL')],
      ['YouTube', readUrl('YOUTUBE_URL')],
      ['TikTok', readUrl('TIKTOK_URL')],
      ['Instagram', readUrl('INSTAGRAM_URL')]
    ].filter(([, url]) => url);

    const description = links.length
      ? links.map(([name, url]) => `**${name}:** [Abrir enlace](${url})`).join('\n')
      : 'No se encontraron enlaces oficiales configurados en el entorno del bot.';

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
