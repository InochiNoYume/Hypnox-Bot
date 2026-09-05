const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getGuildType } = require('../utils/guild');
const { isAdminOrHigher, getConfiguredChannel, accessDenied, missingChannel, base } = require('../utils/postulacionesPanels');
const EPHEMERAL=MessageFlags.Ephemeral;
const data=new SlashCommandBuilder().setName('resultado').setDescription('Publica el resultado de una convocatoria de Staff.').addStringOption(o=>o.setName('resultado').setDescription('Resultado o usuarios seleccionados para la convocatoria.').setRequired(true));
async function execute(interaction){
 if(getGuildType(interaction.guildId)!=='applications')return interaction.reply({content:'Este comando solo está disponible en el Discord Staff Applications.',flags:EPHEMERAL});if(!isAdminOrHigher(interaction.member))return interaction.reply({content:accessDenied(),flags:EPHEMERAL});
 await interaction.deferReply({flags:EPHEMERAL});
 try{const {channel,envKey}=await getConfiguredChannel(interaction,'resultado');if(!channel)return interaction.editReply({content:missingChannel(envKey||'APPLICATIONS_CHANNEL_RESULTS_ID')});const result=interaction.options.getString('resultado',true);const embed=base('RESULTADO DE POSTULACIONES','La revisión de la convocatoria ha finalizado. A continuación se comunica el resultado correspondiente.');embed.addFields({name:'◆ RESULTADO',value:result},{name:'◆ SIGUIENTE PASO',value:'Las personas seleccionadas recibirán las indicaciones correspondientes por los medios oficiales de Hypnox Studios.'},{name:'◆ AGRADECIMIENTO',value:'Agradecemos a todas las personas que participaron y dedicaron su tiempo al proceso.'});embed.setFooter({text:'Hypnox Studios • Resultados de Staff'});await channel.send({embeds:[embed]});return interaction.editReply({content:`Resultado publicado en <#${channel.id}>.`});}catch(error){console.error('[HYPNOX] Result error:',error);return interaction.editReply({content:'No se pudo publicar el resultado.'}).catch(()=>{});}
}
module.exports={data,execute,guilds:['applications']};
