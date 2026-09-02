const { SlashCommandBuilder } = require('discord.js');
const supabase = require('../database/supabase');
const { writeLog } = require('../services/logs');
const { getEnv } = require('../config/env');
const { getGuildRow } = require('../services/guilds');
const types = ['anuncio', 'actividad', 'dinamica', 'evento', 'serie', 'episodio'];
const STAFF_ROLES = [
  'OFFICIAL_ROLE_FOUNDER_ID', 'OFFICIAL_ROLE_DIRECTOR_ID', 'OFFICIAL_ROLE_ADMINISTRATOR_ID',
  'OFFICIAL_ROLE_SRMOD_ID', 'OFFICIAL_ROLE_MOD_ID', 'OFFICIAL_ROLE_TMOD_ID', 'OFFICIAL_ROLE_HELPER_ID',
  'STAFF_ROLE_FOUNDER_ID', 'STAFF_ROLE_DIRECTOR_ID', 'STAFF_ROLE_ADMINISTRATOR_ID', 'STAFF_ROLE_ADMINISTRATIVE_ASSISTANT_ID',
  'STAFF_ROLE_SRMOD_ID', 'STAFF_ROLE_MOD_ID', 'STAFF_ROLE_TMOD_ID', 'STAFF_ROLE_HELPER_ID',
  'STAFF_ROLE_PROJECT_MANAGER_ID', 'STAFF_ROLE_DEPARTMENT_LEAD_ID'
];
const data = new SlashCommandBuilder().setName('anuncio').setDescription('Publica contenido oficial')
  .addStringOption(o => o.setName('tipo').setDescription('Tipo').setRequired(true).addChoices(...types.map(x => ({ name: x[0].toUpperCase() + x.slice(1), value: x }))))
  .addStringOption(o => o.setName('titulo').setDescription('Título').setRequired(true)).addStringOption(o => o.setName('contenido').setDescription('Contenido').setRequired(true)).addStringOption(o => o.setName('imagen').setDescription('URL de imagen'));
async function execute(i) {
  const guild = await getGuildRow(i.guild.id); if (!guild) return i.reply({ content: 'El servidor aún no está registrado en Supabase.', ephemeral: true });
  const type = i.options.getString('tipo'), title = i.options.getString('titulo'), content = i.options.getString('contenido'), image = i.options.getString('imagen') || getEnv('OFFICIAL_IMAGE_ANNOUNCEMENT');
  const embed = { color: 0, title: `HYPNOX STUDIOS — ${type.toUpperCase()}`, description: content, footer: { text: title }, timestamp: new Date().toISOString() }; if (image) embed.image = { url: image };
  const message = await i.channel.send({ embeds: [embed] });
  const { error } = await supabase.from('announcements').insert({ guild_id: guild.id, channel_id: i.channel.id, message_id: message.id, announcement_type: type, title, content, image_url: image || null, author_discord_user_id: i.user.id }); if (error) throw error;
  await writeLog({ guild: i.guild, category: 'announcement', action: type, actorId: i.user.id, channelId: i.channel.id, message: title });
  return i.reply({ content: 'Publicación enviada.', ephemeral: true });
}
module.exports = { data, execute, guilds: ['official', 'staff'], access: { roleEnvs: STAFF_ROLES } };
