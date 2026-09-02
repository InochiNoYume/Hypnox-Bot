const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const supabase = require('../database/supabase');
const { writeLog } = require('../services/logs');

const data = new SlashCommandBuilder().setName('evento').setDescription('Gestiona eventos de Hypnox Studios')
  .addSubcommand(s => s.setName('crear').setDescription('Crea un evento').addStringOption(o => o.setName('titulo').setDescription('Título').setRequired(true)).addStringOption(o => o.setName('descripcion').setDescription('Descripción').setRequired(true)).addStringOption(o => o.setName('inicio').setDescription('Fecha ISO').setRequired(true)).addStringOption(o => o.setName('fin').setDescription('Fecha ISO').setRequired(false)))
  .addSubcommand(s => s.setName('editar').setDescription('Edita un evento').addStringOption(o => o.setName('id').setDescription('ID').setRequired(true)).addStringOption(o => o.setName('titulo').setDescription('Nuevo título')).addStringOption(o => o.setName('descripcion').setDescription('Nueva descripción')).addStringOption(o => o.setName('inicio').setDescription('Nueva fecha ISO')))
  .addSubcommand(s => s.setName('cancelar').setDescription('Cancela un evento').addStringOption(o => o.setName('id').setDescription('ID').setRequired(true)))
  .addSubcommand(s => s.setName('iniciar').setDescription('Marca un evento como iniciado').addStringOption(o => o.setName('id').setDescription('ID').setRequired(true)))
  .addSubcommand(s => s.setName('finalizar').setDescription('Finaliza un evento').addStringOption(o => o.setName('id').setDescription('ID').setRequired(true)));
async function execute(i) {
  if (!i.member.permissions.has(PermissionFlagsBits.ManageGuild)) return i.reply({ content: 'No tienes permisos para gestionar eventos.', ephemeral: true });
  const sub = i.options.getSubcommand();
  try {
    if (sub === 'crear') {
      const row = { guild_id: i.guild.id, channel_id: i.channel.id, title: i.options.getString('titulo'), description: i.options.getString('descripcion'), starts_at: new Date(i.options.getString('inicio')).toISOString(), ends_at: i.options.getString('fin') ? new Date(i.options.getString('fin')).toISOString() : null, status: 'scheduled', created_by_discord_user_id: i.user.id };
      const { data: event, error } = await supabase.from('events').insert(row).select().single(); if (error) throw error;
      const msg = await i.channel.send({ embeds: [{ color: 0, title: `HYPNOX STUDIOS — EVENTO`, description: `${event.title}\n\n${event.description}\n\nInicio: <t:${Math.floor(new Date(event.starts_at).getTime()/1000)}:F>` }] });
      await supabase.from('events').update({ message_id: msg.id }).eq('id', event.id);
      await writeLog({ guild: i.guild, category: 'event', action: 'create', actorId: i.user.id, channelId: i.channel.id, message: event.title, metadata: { eventId: event.id } });
      return i.reply({ content: `Evento creado: \`${event.id}\``, ephemeral: true });
    }
    const id = i.options.getString('id'); const patch = { updated_at: new Date().toISOString() };
    if (sub === 'editar') { if (i.options.getString('titulo')) patch.title = i.options.getString('titulo'); if (i.options.getString('descripcion')) patch.description = i.options.getString('descripcion'); if (i.options.getString('inicio')) patch.starts_at = new Date(i.options.getString('inicio')).toISOString(); }
    else patch.status = ({ cancelar: 'cancelled', iniciar: 'live', finalizar: 'finished' })[sub];
    const { error } = await supabase.from('events').update(patch).eq('id', id).eq('guild_id', i.guild.id); if (error) throw error;
    await writeLog({ guild: i.guild, category: 'event', action: sub, actorId: i.user.id, message: id });
    return i.reply({ content: 'Evento actualizado correctamente.', ephemeral: true });
  } catch (e) { console.error(e); return i.reply({ content: 'No se pudo gestionar el evento. Revisa las fechas y el ID.', ephemeral: true }); }
}
module.exports = { data, execute, guilds: ['official', 'staff'] };
