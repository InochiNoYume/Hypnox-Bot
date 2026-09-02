const { EmbedBuilder } = require('discord.js');

const COLOR = Number.parseInt(process.env.BOT_COLOR || '000000', 16);

function baseEmbed(title, description) {
  const embed = new EmbedBuilder().setColor(COLOR);
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  return embed.setTimestamp();
}

function errorEmbed(description) {
  return baseEmbed('HYPNOX STUDIOS', description);
}

module.exports = { baseEmbed, errorEmbed, COLOR };
