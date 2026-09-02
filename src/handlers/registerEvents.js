const { ChannelType, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { getGuildType } = require('../utils/guild');
const { hasConfiguredRole } = require('../utils/permissions');
const { getEnv } = require('../config/env');
const { createTicket, addTicketEvent } = require('../services/tickets');
const { writeLog } = require('../services/logs');
const { ensureUser } = require('../services/moderation');
const supabase = require('../database/supabase');
const { brandedEmbed } = require('../utils/embeds');

const STAFF_ROLE_ENVS = [
  'OFFICIAL_ROLE_FOUNDER_ID', 'OFFICIAL_ROLE_DIRECTOR_ID', 'OFFICIAL_ROLE_ADMINISTRATOR_ID',
  'OFFICIAL_ROLE_SRMOD_ID', 'OFFICIAL_ROLE_MOD_ID', 'OFFICIAL_ROLE_TMOD_ID', 'OFFICIAL_ROLE_HELPER_ID'
];

const TICKET_ACCESS = {
  soporte: ['OFFICIAL_ROLE_FOUNDER_ID','OFFICIAL_ROLE_DIRECTOR_ID','OFFICIAL_ROLE_ADMINISTRATOR_ID','OFFICIAL_ROLE_SRMOD_ID','OFFICIAL_ROLE_MOD_ID','OFFICIAL_ROLE_TMOD_ID','OFFICIAL_ROLE_HELPER_ID'],
  reporte: ['OFFICIAL_ROLE_FOUNDER_ID','OFFICIAL_ROLE_DIRECTOR_ID','OFFICIAL_ROLE_ADMINISTRATOR_ID','OFFICIAL_ROLE_SRMOD_ID','OFFICIAL_ROLE_MOD_ID','OFFICIAL_ROLE_TMOD_ID'],
  alianza: ['OFFICIAL_ROLE_FOUNDER_ID','OFFICIAL_ROLE_DIRECTOR_ID','OFFICIAL_ROLE_ADMINISTRATOR_ID','OFFICIAL_ROLE_SRMOD_ID','OFFICIAL_ROLE_MOD_ID','OFFICIAL_ROLE_TMOD_ID','OFFICIAL_ROLE_HELPER_ID'],
  contacto: ['OFFICIAL_ROLE_FOUNDER_ID','OFFICIAL_ROLE_DIRECTOR_ID','OFFICIAL_ROLE_ADMINISTRATOR_ID']
};

const TICKET_FORMS = {
  soporte: { title: 'FORMULARIO — SOPORTE', questions: [['asunto','Asunto','¿En qué necesitas ayuda?',false],['problema','Problema','Explica brevemente el problema.',true],['detalles','Detalles','Añade toda la información relevante.',true],['evidencia','Evidencia','Enlace a imágenes, vídeos u otra evidencia. Es opcional.',false]] },
  reporte: { title: 'FORMULARIO — REPORTE', questions: [['usuario','Usuario reportado','Indica el usuario o usuarios involucrados.',false],['motivo','Motivo','Indica el motivo del reporte.',false],['descripcion','Descripción','Explica detalladamente lo ocurrido.',true],['evidencia','Evidencia','Enlace a imágenes, vídeos u otra evidencia. Es opcional.',false]] },
  alianza: { title: 'FORMULARIO — ALIANZA / PARTNER', questions: [['tipo','Tipo de solicitud','Alianza o Partner.',false],['servidor','Servidor / Comunidad','Nombre y descripción breve de tu comunidad.',true],['propuesta','Propuesta','¿Qué colaboración propones?',true],['miembros','Miembros','Cantidad aproximada de miembros activos.',false],['contacto','Contacto','Medio de contacto adicional, si corresponde.',false]] },
  contacto: { title: 'FORMULARIO — CONTACTO', questions: [['asunto','Asunto','Indica el motivo de tu contacto.',false],['motivo','Motivo','Explica qué necesitas comunicar al equipo.',true],['detalles','Detalles','Añade cualquier información adicional.',true],['evidencia','Evidencia','Enlace a imágenes, vídeos u otra evidencia. Es opcional.',false]] }
};

function commandAccessAllowed(interaction, command, guildType) {
  if (guildType === 'dev') return true;
  if (!command.access?.roleEnvs?.length) return true;
  return command.access.roleEnvs.some((roleEnv) => hasConfiguredRole(interaction.member, roleEnv));
}
function ticketStaffRoleIds(guild) { return STAFF_ROLE_ENVS.map((env) => getEnv(env)).filter((id) => id && guild.roles.cache.has(id)); }
function ticketAccessRoleIds(guild, type) { return (TICKET_ACCESS[type] || []).map((env) => getEnv(env)).filter((id) => id && guild.roles.cache.has(id)); }
function ticketChannelName(type, username, userId) { const clean = (value) => String(value).replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase(); return `${clean(type) || 'ticket'}-${clean(username) || userId}`.slice(0, 100); }
function buildTicketModal(type) { const form = TICKET_FORMS[type]; const modal = new ModalBuilder().setCustomId(`hypnox_ticket_modal:${type}`).setTitle(form.title); for (const [id,label,placeholder,paragraph] of form.questions) { const input = new TextInputBuilder().setCustomId(id).setLabel(label).setPlaceholder(placeholder).setStyle(paragraph ? TextInputStyle.Paragraph : TextInputStyle.Short).setRequired(!['evidencia','contacto'].includes(id)); modal.addComponents(new ActionRowBuilder().addComponents(input)); } return modal; }
function collectTicketAnswers(interaction, type) { return Object.fromEntries(TICKET_FORMS[type].questions.map(([id]) => [id, interaction.fields.getTextInputValue(id) || 'No proporcionado.'])); }
function buildTicketEmbed(type, user, answers) { const form = TICKET_FORMS[type]; const embed = brandedEmbed(`HYPNOX STUDIOS — ${type === 'alianza' ? 'ALIANZA / PARTNER' : type.toUpperCase()}`, 'Tu solicitud ha sido registrada correctamente. El equipo de Staff revisará la información y responderá en este canal.'); embed.addFields({name:'◆ SOLICITANTE',value:`<@${user.id}>`,inline:false}, ...form.questions.map(([id,label]) => ({name:`◆ ${label.toUpperCase()}`,value:answers[id] || 'No proporcionado.',inline:false}))); embed.addFields({name:'◆ ATENCIÓN',value:'Espera a un miembro del Staff. La atención puede demorar dependiendo de la disponibilidad del equipo. Si corresponde, puedes dejar evidencia adicional dentro de este ticket.',inline:false}); embed.setFooter({text:'Hypnox Studios • Sistema de atención'}); return embed; }

async function createTicketFromModal(interaction, type) {
  const categoryId = getEnv('OFFICIAL_CHANNEL_TICKETS_CATEGORY_ID');
  const category = categoryId ? await interaction.guild.channels.fetch(categoryId).catch(() => null) : null;
  if (!category || category.type !== ChannelType.GuildCategory) return interaction.reply({content:'El sistema de tickets no está configurado correctamente: falta la categoría de tickets.',ephemeral:true});
  const answers = collectTicketAnswers(interaction, type);
  const accessRoleIds = ticketAccessRoleIds(interaction.guild, type);
  const permissionOverwrites = [
    {id:interaction.guild.roles.everyone.id,deny:[PermissionFlagsBits.ViewChannel]},
    {id:interaction.user.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]},
    ...accessRoleIds.map((id) => ({id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]}))
  ];
  const channel = await interaction.guild.channels.create({name:ticketChannelName(type,interaction.user.username,interaction.user.id),type:ChannelType.GuildText,parent:category.id,permissionOverwrites});
  try {
    const ticket = await createTicket({guildId:interaction.guild.id,channelId:channel.id,creator:interaction.user,type,subtype:type === 'alianza' ? 'alianza_partner' : null});
    await addTicketEvent(ticket.id,interaction.user.id,'created',type,{answers});
    await writeLog({guild:interaction.guild,category:'ticket',action:'create',actorId:interaction.user.id,channelId:channel.id,message:JSON.stringify({type,answers})});
    const mentionRoleId = getEnv('OFFICIAL_TICKET_STAFF_MENTION_ROLE_ID');
    const mention = mentionRoleId && interaction.guild.roles.cache.has(mentionRoleId) ? `<@&${mentionRoleId}>` : '';
    await channel.send({content:mention || undefined,allowedMentions:mention ? {roles:[mentionRoleId]} : undefined,embeds:[buildTicketEmbed(type,interaction.user,answers)]});
    return interaction.reply({content:`Tu ticket fue creado: <#${channel.id}>`,ephemeral:true});
  } catch (error) { await channel.delete().catch(() => {}); throw error; }
}

function registerEvents(client) {
  client.on('interactionCreate', async (interaction) => {
    try {
      if (interaction.isButton() && interaction.customId.startsWith('hypnox_giveaway:')) {
        const id = interaction.customId.split(':')[1];
        const {data:giveaway} = await supabase.from('giveaways').select('id,status,ends_at').eq('id',id).maybeSingle();
        if (!giveaway || giveaway.status !== 'active' || new Date(giveaway.ends_at) <= new Date()) return interaction.reply({content:'Este sorteo ya finalizó.',ephemeral:true});
        const user = await ensureUser(interaction.user); const {error} = await supabase.from('giveaway_entries').insert({giveaway_id:id,user_id:user.id});
        if (error?.code === '23505') return interaction.reply({content:'Ya estás participando en este sorteo.',ephemeral:true}); if (error) throw error;
        return interaction.reply({content:'Tu participación fue registrada.',ephemeral:true});
      }
      if (interaction.isStringSelectMenu() && interaction.customId === 'hypnox_ticket_type') {
        if (getGuildType(interaction.guildId) !== 'official') return interaction.reply({content:'El sistema de tickets solo está disponible en el servidor oficial.',ephemeral:true});
        const type = interaction.values[0]; if (!TICKET_FORMS[type]) return interaction.reply({content:'La categoría de ticket no es válida.',ephemeral:true}); return interaction.showModal(buildTicketModal(type));
      }
      if (interaction.isModalSubmit() && interaction.customId.startsWith('hypnox_ticket_modal:')) {
        if (getGuildType(interaction.guildId) !== 'official') return interaction.reply({content:'El sistema de tickets solo está disponible en el servidor oficial.',ephemeral:true});
        const type = interaction.customId.split(':')[1]; if (!TICKET_FORMS[type]) return interaction.reply({content:'El formulario de ticket no es válido.',ephemeral:true}); return createTicketFromModal(interaction,type);
      }
      if (!interaction.isChatInputCommand()) return;
      const command = client.commands.get(interaction.commandName); if (!command) return;
      const guildType = interaction.guildId ? getGuildType(interaction.guildId) : null;
      if (!guildType || (guildType !== 'dev' && !(command.guilds || ['official','staff','applications']).includes(guildType))) return interaction.reply({content:'Este comando no está disponible en este servidor.',ephemeral:true});
      if (!commandAccessAllowed(interaction,command,guildType)) return interaction.reply({content:'No tienes el rol necesario para usar este comando.',ephemeral:true});
      await command.execute(interaction,client);
    } catch (error) {
      console.error('[HYPNOX] Interaction error:',error); const payload={content:'No se pudo completar la acción.',ephemeral:true};
      if (interaction.replied || interaction.deferred) await interaction.followUp(payload).catch(() => {}); else await interaction.reply(payload).catch(() => {});
    }
  });
}
module.exports = registerEvents;
