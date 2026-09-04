const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const supabase = require('../database/supabase');
const { getGuildRow } = require('../services/guilds');
const { writeLog } = require('../services/logs');
const { brandedEmbed } = require('../utils/embeds');

const data = new SlashCommandBuilder().setName('reportes').setDescription('Gestiona reportes internos de usuarios.')
  .addSubcommand(s=>s.setName('crear').setDescription('Crea un reporte interno.').addUserOption(o=>o.setName('usuario').setDescription('Usuario reportado.').setRequired(true)).addStringOption(o=>o.setName('motivo').setDescription('Motivo.').setMinLength(3).setMaxLength(1000).setRequired(true)))
  .addSubcommand(s=>s.setName('lista').setDescription('Lista reportes pendientes.'))
  .addSubcommand(s=>s.setName('ver').setDescription('Consulta un reporte.').addStringOption(o=>o.setName('id').setDescription('ID del reporte.').setRequired(true)))
  .addSubcommand(s=>s.setName('resolver').setDescription('Resuelve un reporte.').addStringOption(o=>o.setName('id').setDescription('ID.').setRequired(true)).addStringOption(o=>o.setName('resolucion').setDescription('Resolución.').setMaxLength(1000).setRequired(true)))
  .addSubcommand(s=>s.setName('rechazar').setDescription('Rechaza un reporte.').addStringOption(o=>o.setName('id').setDescription('ID.').setRequired(true)).addStringOption(o=>o.setName('resolucion').setDescription('Motivo.').setMaxLength(1000).setRequired(true)));
function staff(i){return i.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)||i.memberPermissions?.has(PermissionFlagsBits.Administrator)}
async function execute(i){
 const sub=i.options.getSubcommand();
 if(['lista','ver','resolver','rechazar'].includes(sub)&&!staff(i)) return i.reply({content:'No tienes permisos para gestionar reportes.',flags:MessageFlags.Ephemeral});
 await i.deferReply({flags:MessageFlags.Ephemeral});
 try{const guild=await getGuildRow(i.guildId); if(!guild)return i.editReply({content:'El servidor no está registrado en Supabase.'});
  if(sub==='crear'){const target=i.options.getUser('usuario',true), reason=i.options.getString('motivo',true); const {data,error}=await supabase.from('reports').insert({guild_id:guild.id,reporter_discord_user_id:i.user.id,target_discord_user_id:target.id,reason}).select().single(); if(error)throw error; await writeLog({guild:i.guild,category:'system',action:'reporte_creado',actorId:i.user.id,targetId:target.id,message:reason,metadata:{reportId:data.id}}); return i.editReply({content:`Reporte creado correctamente. ID: \`${data.id}\`.`});}
  const id=i.options.getString('id');
  if(sub==='lista'){const {data,error}=await supabase.from('reports').select('*').eq('guild_id',guild.id).in('status',['pending','reviewing']).order('created_at',{ascending:false}).limit(10);if(error)throw error;const e=brandedEmbed('REPORTES PENDIENTES','Reportes internos que requieren atención.');e.addFields({name:'◆ REGISTROS',value:(data||[]).map(r=>`\`${r.id}\` · <@${r.target_discord_user_id}> · **${r.status.toUpperCase()}**\n${r.reason.slice(0,180)}`).join('\n\n')||'No hay reportes pendientes.',inline:false});return i.editReply({embeds:[e]});}
  const {data:r,error}=await supabase.from('reports').select('*').eq('guild_id',guild.id).eq('id',id).maybeSingle();if(error)throw error;if(!r)return i.editReply({content:'No se encontró ese reporte.'});
  if(sub==='ver'){const e=brandedEmbed('REPORTE',`Registro interno \`${r.id}\`.`);e.addFields({name:'◆ INFORMACIÓN',value:`Reportante: <@${r.reporter_discord_user_id}>\nUsuario: <@${r.target_discord_user_id}>\nEstado: **${r.status.toUpperCase()}**\nCreado: <t:${Math.floor(new Date(r.created_at).getTime()/1000)}:F>\nMotivo: ${r.reason}`,inline:false});if(r.resolution)e.addFields({name:'◆ RESOLUCIÓN',value:r.resolution,inline:false});return i.editReply({embeds:[e]});}
  const status=sub==='resolver'?'resolved':'rejected', resolution=i.options.getString('resolucion',true);const {error:u}=await supabase.from('reports').update({status,resolution,reviewed_by_discord_user_id:i.user.id,reviewed_at:new Date().toISOString()}).eq('guild_id',guild.id).eq('id',id);if(u)throw u;await writeLog({guild:i.guild,category:'moderation',action:`reporte_${status}`,actorId:i.user.id,targetId:r.target_discord_user_id,message:resolution,metadata:{reportId:id}});return i.editReply({content:`Reporte \`${id}\` marcado como **${status.toUpperCase()}**.`});
 }catch(e){console.error('[HYPNOX] Reportes:',e);return i.editReply({content:'No se pudo procesar el reporte.'}).catch(()=>{});}}
module.exports={data,execute,guilds:['official','staff']};
