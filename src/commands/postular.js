const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getGuildType } = require('../utils/guild');
const { isAdminOrHigher, getConfiguredChannel, accessDenied, missingChannel, base } = require('../utils/postulacionesPanels');
const EPHEMERAL=MessageFlags.Ephemeral;
const data=new SlashCommandBuilder().setName('postular').setDescription('Publica el acceso oficial para realizar una postulación.').addStringOption(o=>o.setName('link').setDescription('Enlace al medio oficial de postulación.').setRequired(true));
async function execute(interaction){
 if(getGuildType(interaction.guildId)!=='applications')return interaction.reply({content:'Este comando solo está disponible en el Discord Staff Applications.',flags:EPHEMERAL});
 if(!isAdminOrHigher(interaction.member))return interaction.reply({content:accessDenied(),flags:EPHEMERAL});
 await interaction.deferReply({flags:EPHEMERAL});
 try{const {channel,envKey}=await getConfiguredChannel(interaction,'postular');if(!channel)return interaction.editReply({content:missingChannel(envKey||'APPLICATIONS_CHANNEL_APPLY_ID')});const link=interaction.options.getString('link',true);const embed=base('POSTULAR AL STAFF','¿Quieres formar parte de Hypnox Studios? Si la convocatoria se encuentra abierta y cumples los requisitos, puedes iniciar tu postulación desde el siguiente enlace.');embed.addFields({name:'◆ ANTES DE POSTULAR',value:'Lee primero los requisitos y la información del proceso. Asegúrate de entregar datos claros y honestos.'},{name:'◆ POSTULACIÓN',value:link},{name:'◆ IMPORTANTE',value:'Enviar una postulación no garantiza la incorporación al Staff. Todas las postulaciones están sujetas a revisión.'});embed.setFooter({text:'Hypnox Studios • Postulación de Staff'});await channel.send({embeds:[embed]});return interaction.editReply({content:`Mensaje de postulación publicado en <#${channel.id}>.`});}catch(error){console.error('[HYPNOX] Postular error:',error);return interaction.editReply({content:'No se pudo publicar el mensaje de postulación.'}).catch(()=>{});}
}
module.exports={data,execute,guilds:['applications']};
