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

function readEmail(key) {
  const value = getEnv(key);
  if (!value) return null;
  const email = String(value).trim();
  return email || null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('links')
    .setDescription('Muestra los enlaces oficiales de Hypnox Studios.'),

  async execute(interaction) {
    const officialLinks = [
      ['Discord', readUrl('OFFICIAL_DISCORD_URL')],
      ['Web', readUrl('WEBSITE_URL')],
      ['YouTube', readUrl('YOUTUBE_URL')],
      ['TikTok', readUrl('TIKTOK_URL')],
      ['Instagram', readUrl('INSTAGRAM_URL')]
    ].filter(([, url]) => url);

    const supportLinks = [
      ['PayPal', readUrl('OFFICIAL_PAYPAL_URL')],
      ['Ko-fi', readUrl('OFFICIAL_KOFI_URL')]
    ].filter(([, url]) => url);

    const contactEmail = readEmail('OFFICIAL_CONTACT_EMAIL');
    const allLinks = [...officialLinks, ...supportLinks];

    const embed = brandedEmbed('ENLACES OFICIALES',
      'Accede a los espacios oficiales de **Hypnox Studios**, apoya nuestro trabajo o ponte en contacto con nosotros.',
      { footerText: 'Hypnox Studios • Canales oficiales' }
    );

    if (officialLinks.length) {
      addSection(
        embed,
        'Nuestros espacios',
        officialLinks.map(([name, url]) => `**${name}**\n${url}`).join('\n\n')
      );
    }

    if (supportLinks.length) {
      addSection(
        embed,
        'Apoya el proyecto',
        supportLinks.map(([name, url]) => {
          const description = name === 'PayPal'
            ? 'Apoya el desarrollo y mantenimiento de Hypnox Studios.'
            : 'Apoya nuestro trabajo y ayúdanos a seguir creando nuevos proyectos.';
          return `**${name}** — ${description}\n${url}`;
        }).join('\n\n')
      );
    }

    if (contactEmail) {
      addSection(embed, 'Contacto', `**Correo oficial**\n${contactEmail}`);
    }

    if (!allLinks.length && !contactEmail) {
      addSection(embed, 'Estado', 'No se encontraron enlaces oficiales configurados en el entorno del bot.');
      return interaction.reply({ embeds: [embed] });
    }

    const buttons = [
      ...allLinks.map(([name, url]) =>
        new ButtonBuilder()
          .setLabel(name)
          .setStyle(ButtonStyle.Link)
          .setURL(url)
      ),
      ...(contactEmail ? [
        new ButtonBuilder()
          .setLabel('Contacto')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(contactEmail)}`)
      ] : [])
    ];

    const components = [];
    for (let index = 0; index < buttons.length; index += 5) {
      components.push(new ActionRowBuilder().addComponents(buttons.slice(index, index + 5)));
    }

    return interaction.reply({ embeds: [embed], components });
  },

  guilds: ['official'],
  access: { roleEnvs: ['OFFICIAL_ROLE_MEMBER_ID'] }
};
