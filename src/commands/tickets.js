const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { createTicket, getTicket, getTicketCreatorDiscordId, updateTicket, addTicketEvent } = require('../services/tickets');
const { writeLog } = require('../services/logs');
const { getEnv } = require('../config/env');
const { hasConfiguredRole } = require('../utils/permissions');
const { brandedEmbed } = require('../utils/embeds');

const STAFF_ROLE_ENVS = ['OFFICIAL_ROLE_FOUNDER_ID','OFFICIAL_ROLE_DIRECTOR_ID','OFFICIAL_ROLE_ADMINISTRATOR_ID','OFFICIAL_ROLE_SRMOD_ID','OFFICIAL_ROLE_MOD_ID','OFFICIAL_ROLE_TMOD_ID','OFFICIAL_ROLE_HELPER_ID'];
const data = new SlashCommandBuilder().setName('tickets').setDescription('Gestiona el sistema de atención del servidor oficial.')
  .addSubcommand((s)=>s.setName('panel').setDescription('Publica el panel de atención.'))
  .addSubcommand((s)=>s.setName('cerrar').setDescription('Cierra el ticket actual.'))
  .addSubcommand((s)=>s.setName('claim').setDescription('Reclama el ticket actual.'))
  .addSubcommand((s)=>s.setName('add').setDescription('Añade un usuario al ticket.').addUserOption((o)=>o.setName('usuario').setDescription('Usuario que tendrá acceso.').setRequired(true)))
  .addSubcommand((s)=>s.setName('remove').setDescription('Retira un usuario del ticket.').addUserOption((o)=>o.setName('usuario').setDescription('Usuario al que se retirará el acceso.').setRequired(true)));

const labels={soporte:'Soporte',reporte:'Reporte',alianza:'Alianza / Partner',contacto:'Contacto'};
const select=()=>new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('hypnox_ticket_type').setPlaceholder('Selecciona el motivo de contacto').addOptions(Object.entries(labels).map(([value,label])=>({label,value,description:`Abrir un ticket de ${label.toLowerCase()}`}))));
function isStaff(i){return STAFF_ROLE_ENVS.some((env)=>hasConfiguredRole(i.member,env));}

async function execute(i){
  const sub=i.options.getSubcommand();
  if(sub==='panel'){
    if(!isStaff(i))return i.reply({content:'No tienes permisos para publicar el panel.',ephemeral:true});
    const id=getEnv('OFFICIAL_CHANNEL_TICKETS_ID');
    const ch=id?await i.guild.channels.fetch(id).catch(()=>null):i.channel;
    if(!ch?.isTextBased())return i.reply({content:'Configura OFFICIAL_CHANNEL_TICKETS_ID.',ephemeral:true});
    const embed=brandedEmbed('CENTRO DE ATENCIÓN','Selecciona una categoría en el menú para comunicarte con el equipo de Hypnox Studios.\n\n◆ **Soporte** — Ayuda y consultas generales.\n◆ **Reporte** — Informa una situación que requiera revisión.\n◆ **Alianza / Partner** — Solicitudes de colaboración.\n◆ **Contacto** — Comunicación directa con el equipo.');
    embed.setFooter({text:'Hypnox Studios • Centro de atención'});
    await ch.send({embeds:[embed],components:[select()]});
    return i.reply({content:'Panel de atención publicado.',ephemeral:true});
  }

  const ticket=await getTicket(i.channel.id);if(!ticket)return i.reply({content:'Este canal no es un ticket activo.',ephemeral:true});
  const creatorDiscordId = await getTicketCreatorDiscordId(ticket);
  if(sub==='cerrar'){if(!isStaff(i)&&creatorDiscordId!==i.user.id)return i.reply({content:'No puedes cerrar este ticket.',ephemeral:true});await updateTicket(ticket.id,{status:'closed',closed_by_discord_user_id:i.user.id,closed_at:new Date().toISOString()});await addTicketEvent(ticket.id,i.user.id,'closed');await writeLog({guild:i.guild,category:'ticket',action:'close',actorId:i.user.id,channelId:i.channel.id});await i.reply({content:'Ticket cerrado. Este canal será eliminado en unos segundos.'});setTimeout(()=>i.channel.delete().catch(()=>{}),3000);return;}
  if(!isStaff(i))return i.reply({content:'Esta acción es exclusiva del Staff.',ephemeral:true});
  if(sub==='claim'){if(ticket.assigned_to_discord_user_id)return i.reply({content:'Este ticket ya fue reclamado.',ephemeral:true});await updateTicket(ticket.id,{assigned_to_discord_user_id:i.user.id});for(const env of STAFF_ROLE_ENVS){const roleId=getEnv(env);if(roleId)await i.channel.permissionOverwrites.edit(roleId,{ViewChannel:false}).catch(()=>{});}await i.channel.permissionOverwrites.edit(i.user.id,{ViewChannel:true,SendMessages:true,ReadMessageHistory:true});if(creatorDiscordId)await i.channel.permissionOverwrites.edit(creatorDiscordId,{ViewChannel:true,SendMessages:true,ReadMessageHistory:true});await addTicketEvent(ticket.id,i.user.id,'claimed');await writeLog({guild:i.guild,category:'ticket',action:'claim',actorId:i.user.id,channelId:i.channel.id});return i.reply({content:`Ticket reclamado por <@${i.user.id}>.`});}
  const user=i.options.getUser('usuario');
  if(sub==='add'){await i.channel.permissionOverwrites.edit(user.id,{ViewChannel:true,SendMessages:true,ReadMessageHistory:true});await addTicketEvent(ticket.id,i.user.id,'member_added',user.id);return i.reply({content:`Se añadió a <@${user.id}>.`});}
  await i.channel.permissionOverwrites.delete(user.id).catch(()=>{});await addTicketEvent(ticket.id,i.user.id,'member_removed',user.id);return i.reply({content:`Se retiró a <@${user.id}>.`});
}
module.exports={data,execute,select,labels,guilds:['official']};
