const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const supabase = require('../database/supabase');
const { writeLog } = require('../services/logs');
const { getEnv } = require('../config/env');

const types = ['anuncio', 'actividad', 'dinamica', 'evento', 'serie', 'episodio'];
const data = new SlashCommandBuilder().setName('anuncio').setDescription('Publica contenido oficial de Hypnox Studios')
  .addStringOption(o => o.setName('tipo').setDescription('Tipo de publicación').setRequired(true).addChoices(...types.map(x => ({ name: x[0].toUpperCase() + x.slice(1), value: x }))))
  .addStringOption(o => o.setName('titulo').setDescription('Título').setRequired(true))
  .addStringOption(o => o.setName('contenido').setDescription('Contenido').setRequired(true))
  .addStringOption(o => o.setName('imagen').setDescription('URL de imagen').setRequired(false));

async function execute(i) {
  if (!i.member.permissions.has(PermissionFlagsBits.ManageGuild)) return i.reply({ content: 'No tienes permisos para publicar anuncios.', ephemeral: true });
  const type = i.options.getString('tipo'); const title = i.options.getString('titulo'); const content = i.options.getString('contenido'); const image = i.options.getString('imagen') || getEnv('OFFICIAL_IMAGE_ANNOUNCEMENT');
  const embed = { color: 0, title: `HYPNOX STUDIOS — ${type.toUpperCase()}`, description: content, footer: { text: title }, timestamp: new Date().toISOString() };
  if (image) embed.image = { url: image };
  const message = await i.channel.send({ embeds: [embed] });
  await supabase.from('announcements').insert({ guild_id: i.guild.id, channel_id: i.channel.id, message_id: message.id, announcement_type: type, title, content, image_url: image || null, author_discord_user_id: i.user.id });
  await writeLog({ guild: i.guild, category: 'announcement', action: type, actorId: i.user.id, channelId: i.channel.id, message: title });
  return i.reply({ content: 'Publicación enviada.', ephemeral: true });
}
module.exports = { data, execute, guilds: ['official', 'staff'] };
