const { EmbedBuilder } = require('discord.js');

const parsedColor = Number.parseInt(String(process.env.BOT_COLOR || '000000').replace(/^#/, ''), 16);
const COLOR = Number.isInteger(parsedColor) && parsedColor >= 0 && parsedColor <= 0xffffff ? parsedColor : 0x000000;
const BRAND = 'HYPNOX STUDIOS';
const FOOTER = 'Hypnox Studios • Sistema oficial';
const DIVIDER = '━━━━━━━━━━━━━━━━━━━━━━━━';

function validUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(String(value).trim());
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function baseEmbed(title, description, options = {}) {
  const embed = new EmbedBuilder().setColor(COLOR).setTimestamp();

  if (title) embed.setTitle(String(title).slice(0, 256));
  if (description) embed.setDescription(String(description).slice(0, 4096));
  if (options.author) embed.setAuthor({ name: String(options.author).slice(0, 256) });

  const thumbnail = validUrl(options.thumbnail);
  const image = validUrl(options.image);
  if (thumbnail) embed.setThumbnail(thumbnail);
  if (image) embed.setImage(image);

  if (Array.isArray(options.fields) && options.fields.length) {
    embed.addFields(options.fields.slice(0, 25).map((field) => ({
      name: String(field.name || 'Información').slice(0, 256),
      value: String(field.value || 'Sin información.').slice(0, 1024),
      inline: Boolean(field.inline)
    })));
  }

  if (options.footer !== false) {
    embed.setFooter({ text: String(options.footerText || FOOTER).slice(0, 2048) });
  }

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
  embed.addFields({
    name: `◆ ${String(title).toUpperCase()}`.slice(0, 256),
    value: String(content || 'Sin información.').slice(0, 1024),
    inline: Boolean(inline)
  });
  return embed;
}

module.exports = {
  baseEmbed,
  brandedEmbed,
  errorEmbed,
  successEmbed,
  infoEmbed,
  addSection,
  validUrl,
  COLOR,
  BRAND,
  FOOTER,
  DIVIDER
};
