const { EmbedBuilder } = require('discord.js');

const COLOR = Number.parseInt(process.env.BOT_COLOR || '000000', 16);
const BRAND = 'HYPNOX STUDIOS';
const FOOTER = 'Hypnox Studios • Sistema oficial';
const DIVIDER = '━━━━━━━━━━━━━━━━━━━━━━━━';

function baseEmbed(title, description, options = {}) {
  const embed = new EmbedBuilder()
    .setColor(COLOR)
    .setTimestamp();

  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (options.author) embed.setAuthor({ name: options.author });
  if (options.thumbnail) embed.setThumbnail(options.thumbnail);
  if (options.image) embed.setImage(options.image);
  if (options.fields?.length) embed.addFields(options.fields);
  if (options.footer !== false) embed.setFooter({ text: options.footerText || FOOTER });

  return embed;
}

function brandedEmbed(title, description, options = {}) {
  const cleanTitle = title && String(title).startsWith(`${BRAND} —`)
    ? String(title)
    : title ? `${BRAND} — ${title}` : BRAND;

  return baseEmbed(cleanTitle, description, {
    ...options,
    author: options.author || BRAND
  });
}

function errorEmbed(description) {
  return brandedEmbed('AVISO', description, { footerText: 'Hypnox Studios • Aviso del sistema' });
}

function successEmbed(title, description, options = {}) {
  return brandedEmbed(title, description, options);
}

function infoEmbed(title, description, options = {}) {
  return brandedEmbed(title, description, options);
}

function addSection(embed, title, content, inline = false) {
  embed.addFields({ name: `◆ ${String(title).toUpperCase()}`, value: content, inline });
  return embed;
}

module.exports = {
  baseEmbed,
  brandedEmbed,
  errorEmbed,
  successEmbed,
  infoEmbed,
  addSection,
  COLOR,
  BRAND,
  FOOTER,
  DIVIDER
};
