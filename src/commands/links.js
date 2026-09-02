const { SlashCommandBuilder } = require('discord.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getEnv } = require('../config/env');
const { brandedEmbed, addSection } = require('../utils/embeds');

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

    const embed = brandedEmbed('ENLACES OFICIALES',
      'Accede a los espacios oficiales de **Hypnox Studios** y encuentra nuestras comunidades, contenido y proyectos.',
      { footerText: 'Hypnox Studios • Canales oficiales' }
    );

    if (!links.length) {
      addSection(embed, 'Estado', 'No se encontraron enlaces oficiales configurados en el entorno del bot.');
      return interaction.reply({ embeds: [embed] });
    }

    addSection(
      embed,
      'Nuestros espacios',
      links.map(([name, url]) => `**${name}**\n${url}`).join('\n\n')
    );

    const buttons = links.slice(0, 5).map(([name, url]) =>
      new ButtonBuilder()
        .setLabel(name)
        .setStyle(ButtonStyle.Link)
        .setURL(url)
    );

    const components = [];
    for (let index = 0; index < buttons.length; index += 5) {
      components.push(new ActionRowBuilder().addComponents(buttons.slice(index, index + 5)));
    }

    return interaction.reply({ embeds: [embed], components });
  },

  guilds: ['official'],
  access: { roleEnvs: ['OFFICIAL_ROLE_MEMBER_ID'] }
};
