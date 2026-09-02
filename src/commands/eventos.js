const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const supabase = require('../database/supabase');
const { writeLog } = require('../services/logs');
const { getGuildRow } = require('../services/guilds');
const data = new SlashCommandBuilder().setName('evento').setDescription('Gestiona eventos')
  .addSubcommand(s => s.setName('crear').setDescription('Crea un evento').addStringOption(o => o.setName('titulo').setDescription('Título').setRequired(true)).addStringOption(o => o.setName('descripcion').setDescription('Descripción').setRequired(true)).addStringOption(o => o.setName('inicio').setDescription('Fecha ISO').setRequired(true)).addStringOption(o => o.setName('fin').setDescription('Fecha ISO')))
  .addSubcommand(s => s.setName('editar').setDescription('Edita un evento').addStringOption(o => o.setName('id').setDescription('ID').setRequired(true)).addStringOption(o => o.setName('titulo').setDescription('Título')).addStringOption(o => o.setName('descripcion').setDescription('Descripción')).addStringOption(o => o.setName('inicio').setDescription('Fecha ISO')))
  .addSubcommand(s => s.setName('cancelar').setDescription('Cancela un evento').addStringOption(o => o.setName('id').setDescription('ID').setRequired(true)))
  .addSubcommand(s => s.setName('iniciar').setDescription('Inicia un evento').addStringOption(o => o.setName('id').setDescription('ID').setRequired(true)))
  .addSubcommand(s => s.setName('finalizar').setDescription('Finaliza un evento').addStringOption(o => o.setName('id').setDescription('ID').setRequired(true)));
async function execute(i) {
  if (!i.member.permissions.has(PermissionFlagsBits.ManageGuild)) return i.reply({ content: 'No tienes permisos.', ephemeral: true });
  const guild = await getGuildRow(i.guild.id); if (!guild) return i.reply({ content: 'Servidor no registrado.', ephemeral: true });
  try {
    const sub = i.options.getSubcommand();
    if (sub === 'crear') {
      const start = new Date(i.options.getString('inicio')); const endText = i.options.getString('fin'); const end = endText ? new Date(endText) : null;
      if (Number.isNaN(start.getTime()) || (end && Number.isNaN(end.getTime()))) return i.reply({ content: 'Fecha ISO inválida.', ephemeral: true });
      const { data: event, error } = await supabase.from('events').insert({ guild_id: guild.id, channel_id: i.channel.id, title: i.options.getString('titulo'), description: i.options.getString('descripcion'), starts_at: start.toISOString(), ends_at: end?.toISOString() || null, status: 'scheduled', created_by_discord_user_id: i.user.id }).select().single(); if (error) throw error;
      const msg = await i.channel.send({ embeds: [{ color: 0, title: 'HYPNOX STUDIOS — EVENTO', description: `${event.title}\n\n${event.description}\n\nInicio: <t:${Math.floor(start.getTime()/1000)}:F>` }] }); await supabase.from('events').update({ message_id: msg.id }).eq('id', event.id);
      await writeLog({ guild: i.guild, category: 'event', action: 'create', actorId: i.user.id, channelId: i.channel.id, message: event.title, metadata: { eventId: event.id } }); return i.reply({ content: `Evento creado: \`${event.id}\``, ephemeral: true });
    }
    const id = i.options.getString('id'); const patch = { updated_at: new Date().toISOString() };
    if (sub === 'editar') { const t=i.options.getString('titulo'), d=i.options.getString('descripcion'), s=i.options.getString('inicio'); if(t)patch.title=t;if(d)patch.description=d;if(s){const dt=new Date(s);if(Number.isNaN(dt.getTime()))return i.reply({content:'Fecha ISO inválida.',ephemeral:true});patch.starts_at=dt.toISOString();} }
    else patch.status = { cancelar: 'cancelled', iniciar: 'live', finalizar: 'finished' }[sub];
    const { data: updated, error } = await supabase.from('events').update(patch).eq('id', id).eq('guild_id', guild.id).select().single(); if(error)throw error;
    await writeLog({ guild: i.guild, category: 'event', action: sub, actorId: i.user.id, message: id }); return i.reply({ content: `Evento actualizado: ${updated.title}.`, ephemeral: true });
  } catch(e){ console.error(e); return i.reply({content:'No se pudo gestionar el evento.',ephemeral:true}); }
}
module.exports={data,execute,guilds:['official','staff']};
