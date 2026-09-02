const { EmbedBuilder } = require('discord.js');

const COLOR = Number.parseInt(process.env.BOT_COLOR || '000000', 16);
const BRAND = 'HYPNOX STUDIOS';
const FOOTER = 'Hypnox Studios • Sistema oficial';

function baseEmbed(title, description, options = {}) {
  const embed = new EmbedBuilder()
    .setColor(COLOR)
    .setTimestamp();

  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (options.footer !== false) embed.setFooter({ text: options.footerText || FOOTER });
  if (options.author) embed.setAuthor({ name: options.author });
  if (options.thumbnail) embed.setThumbnail(options.thumbnail);
  if (options.image) embed.setImage(options.image);

  return embed;
}

function brandedEmbed(title, description, options = {}) {
  return baseEmbed(title ? `${BRAND} — ${title}` : BRAND, description, {
    ...options,
    author: options.author || BRAND
  });
}

function errorEmbed(description) {
  return brandedEmbed('AVISO', description);
}

module.exports = { baseEmbed, brandedEmbed, errorEmbed, COLOR, BRAND, FOOTER };
