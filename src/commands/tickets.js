const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { createTicket, getTicket, getTicketCreatorDiscordId, updateTicket, addTicketEvent } = require('../services/tickets');
const { writeLog } = require('../services/logs');
const { getEnv } = require('../config/env');
const { hasConfiguredRole } = require('../utils/permissions');
const { brandedEmbed } = require('../utils/embeds');

const STAFF_ROLE_ENVS = [
  'OFFICIAL_ROLE_FOUNDER_ID','OFFICIAL_ROLE_DIRECTOR_ID','OFFICIAL_ROLE_ADMINISTRATOR_ID',
  'OFFICIAL_ROLE_SRMOD_ID','OFFICIAL_ROLE_MOD_ID','OFFICIAL_ROLE_TMOD_ID','OFFICIAL_ROLE_HELPER_ID'
];

const data = new SlashCommandBuilder().setName('tickets').setDescription('Gestiona el sistema de atención del servidor oficial.')
  .addSubcommand((s)=>s.setName('panel').setDescription('Publica el panel de atención.'))
  .addSubcommand((s)=>s.setName('cerrar').setDescription('Cierra el ticket actual.'))
  .addSubcommand((s)=>s.setName('claim').setDescription('Reclama el ticket actual.'))
  .addSubcommand((s)=>s.setName('add').setDescription('Añade un usuario al ticket.').addUserOption((o)=>o.setName('usuario').setDescription('Usuario que tendrá acceso.').setRequired(true)))
  .addSubcommand((s)=>s.setName('remove').setDescription('Retira un usuario del ticket.').addUserOption((o)=>o.setName('usuario').setDescription('Usuario al que se retirará el acceso.').setRequired(true)));

const labels = { soporte:'Soporte', reporte:'Reporte', alianza:'Alianza / Partner', contacto:'Contacto', bugs:'Bugs / Errores' };
const select = () => new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('hypnox_ticket_type').setPlaceholder('Selecciona el área que necesitas').addOptions(Object.entries(labels).map(([value,label])=>({label,value,description:`Abrir una solicitud de ${label.toLowerCase()}`}))));
function isStaff(i){return STAFF_ROLE_ENVS.some((env)=>hasConfiguredRole(i.member,env));}

async function hideStaffFromTicket(channel, claimedUserId){
  for(const env of STAFF_ROLE_ENVS){const roleId=getEnv(env);if(!roleId)continue;await channel.permissionOverwrites.edit(roleId,{ViewChannel:false,SendMessages:false,ReadMessageHistory:false}).catch(()=>{});}
  if(claimedUserId)await channel.permissionOverwrites.edit(claimedUserId,{ViewChannel:true,SendMessages:true,ReadMessageHistory:true});
}
async function deleteTicketChannel(channel,guild){if(!channel||channel.deleted)return;try{await channel.delete('Ticket cerrado');}catch(error){console.error(`[HYPNOX] No se pudo eliminar el ticket ${channel.id}:`,error);await writeLog({guild,category:'ticket',action:'delete_failed',actorId:null,channelId:channel.id}).catch(()=>{});}}

async function execute(i){
  const sub=i.options.getSubcommand();
  if(sub==='panel'){
    if(!isStaff(i))return i.reply({content:'No tienes permisos para publicar el panel.',ephemeral:true});
    const id=getEnv('OFFICIAL_CHANNEL_TICKETS_ID');const ch=id?await i.guild.channels.fetch(id).catch(()=>null):i.channel;if(!ch?.isTextBased())return i.reply({content:'Configura OFFICIAL_CHANNEL_TICKETS_ID.',ephemeral:true});
    const embed=brandedEmbed('CENTRO DE ATENCIÓN',[
      '**HYPNOX STUDIOS**','',
      'Este es el centro oficial de atención de nuestra comunidad. Selecciona el área correspondiente para crear una solicitud y comunicarte directamente con el equipo encargado.','',
      '╭━━━━━━━━━━━━━━━━━━━━━━╮','        **ÁREAS DE ATENCIÓN**','╰━━━━━━━━━━━━━━━━━━━━━━╯','',
      '◆ **Soporte**','> Consultas, problemas generales, dudas sobre el servidor o asistencia con algún funcionamiento de la comunidad.','',
      '◆ **Reporte**','> Informa situaciones que requieran revisión por parte del equipo de moderación. Incluye toda la información necesaria.','',
      '◆ **Alianza / Partner**','> Solicitudes de colaboración, alianzas y propuestas entre Hypnox Studios y otras comunidades o proyectos.','',
      '◆ **Contacto**','> Comunicación directa con la dirección para asuntos administrativos o institucionales.','',
      '◆ **Bugs / Errores**','> Reporta errores técnicos, fallos de funcionamiento o problemas relacionados con sistemas, contenido o desarrollo. Estos casos serán revisados por Developer y Producer, además de la Dirección y Administración.','',
      '╭━━━━━━━━━━━━━━━━━━━━━━╮','       **ANTES DE CREAR UN TICKET**','╰━━━━━━━━━━━━━━━━━━━━━━╯','',
      '> Selecciona únicamente el motivo que corresponda a tu solicitud.','> Explica tu situación de forma clara y proporciona los datos necesarios.','> En Bugs / Errores, incluye pasos para reproducir el problema y evidencia cuando sea posible.','> No abras múltiples tickets para el mismo asunto.','> Mantén una comunicación respetuosa durante toda la atención.','',
      'Una vez creado el ticket, el equipo correspondiente podrá revisar tu solicitud y atenderla dentro de este canal.'
    ].join('\n'));
    embed.setFooter({text:'Hypnox Studios • Centro oficial de atención'});const image=getEnv('OFFICIAL_IMAGE_TICKETS');if(image)embed.setImage(image);await ch.send({embeds:[embed],components:[select()]});return i.reply({content:'Panel de atención publicado.',ephemeral:true});
  }
  const ticket=await getTicket(i.channel.id);if(!ticket)return i.reply({content:'Este canal no es un ticket activo.',ephemeral:true});const creatorDiscordId=await getTicketCreatorDiscordId(ticket);
  if(sub==='cerrar'){
    if(!isStaff(i)&&creatorDiscordId!==i.user.id)return i.reply({content:'No puedes cerrar este ticket.',ephemeral:true});
    await updateTicket(ticket.id,{status:'closed',closed_by_discord_user_id:i.user.id,closed_at:new Date().toISOString()});await addTicketEvent(ticket.id,i.user.id,'closed');await writeLog({guild:i.guild,category:'ticket',action:'close',actorId:i.user.id,channelId:i.channel.id});await i.reply({content:'Ticket cerrado. El canal será eliminado en unos segundos.'});setTimeout(()=>deleteTicketChannel(i.channel,i.guild),2000);return;
  }
  if(!isStaff(i))return i.reply({content:'Esta acción es exclusiva del Staff.',ephemeral:true});
  if(sub==='claim'){
    if(ticket.assigned_to_discord_user_id)return i.reply({content:'Este ticket ya fue reclamado.',ephemeral:true});
    await updateTicket(ticket.id,{assigned_to_discord_user_id:i.user.id});await hideStaffFromTicket(i.channel,i.user.id);if(creatorDiscordId)await i.channel.permissionOverwrites.edit(creatorDiscordId,{ViewChannel:true,SendMessages:true,ReadMessageHistory:true});await addTicketEvent(ticket.id,i.user.id,'assigned');await writeLog({guild:i.guild,category:'ticket',action:'claim',actorId:i.user.id,channelId:i.channel.id});return i.reply({content:`Ticket reclamado por <@${i.user.id}>.`});
  }
  const user=i.options.getUser('usuario');if(sub==='add'){await i.channel.permissionOverwrites.edit(user.id,{ViewChannel:true,SendMessages:true,ReadMessageHistory:true});await addTicketEvent(ticket.id,i.user.id,'message',`Usuario añadido: ${user.id}`);return i.reply({content:`Se añadió a <@${user.id}>.`});}await i.channel.permissionOverwrites.delete(user.id).catch(()=>{});await addTicketEvent(ticket.id,i.user.id,'message',`Usuario retirado: ${user.id}`);return i.reply({content:`Se retiró a <@${user.id}>.`});
}
module.exports={data,execute,select,labels,guilds:['official']};
