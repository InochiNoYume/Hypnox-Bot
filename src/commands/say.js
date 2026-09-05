const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const MANAGEMENT_ROLES=['OFFICIAL_ROLE_FOUNDER_ID','OFFICIAL_ROLE_DIRECTOR_ID','OFFICIAL_ROLE_ADMINISTRATOR_ID','STAFF_ROLE_FOUNDER_ID','STAFF_ROLE_DIRECTOR_ID','STAFF_ROLE_ADMINISTRATIVE_ASSISTANT_ID','APPLICATIONS_ROLE_FOUNDER_ID','APPLICATIONS_ROLE_DIRECTOR_ID','APPLICATIONS_ROLE_ADMINISTRATOR_ID'];
const EPHEMERAL=MessageFlags.Ephemeral;
const data=new SlashCommandBuilder().setName('say').setDescription('Publica un mensaje como Hypnox Bot.').addStringOption(o=>o.setName('mensaje').setDescription('Contenido que se publicará en el canal actual.').setRequired(true));
async function execute(interaction){
 const message=interaction.options.getString('mensaje',true).trim();if(!message)return interaction.reply({content:'Debes indicar un mensaje.',flags:EPHEMERAL});
 await interaction.deferReply({flags:EPHEMERAL});
 try{await interaction.channel.send({content:message,allowedMentions:{parse:[]}});if(interaction.message){await interaction.message.delete().catch(()=>{});return;}if(interaction.isChatInputCommand?.()){await interaction.editReply({content:'Mensaje publicado.'});setTimeout(()=>interaction.deleteReply().catch(()=>{}),1200);}}
 catch(error){console.error('[HYPNOX] Say error:',error);return interaction.editReply({content:'No se pudo publicar el mensaje.'}).catch(()=>{});}
}
module.exports={data,execute,guilds:['official','staff','applications'],access:{roleEnvs:MANAGEMENT_ROLES}};
