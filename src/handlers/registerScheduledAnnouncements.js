const supabase = require('../database/supabase');
const { brandedEmbed } = require('../utils/embeds');
const { writeLog } = require('../services/logs');

async function processScheduledAnnouncements(client){
 const now=new Date().toISOString();
 const {data:rows,error}=await supabase.from('scheduled_announcements').select('*').eq('status','pending').lte('scheduled_for',now).order('scheduled_for',{ascending:true}).limit(10);
 if(error){console.error('[HYPNOX] Scheduler:',error.message);return;}
 for(const row of rows||[]){
  const claimed=await supabase.from('scheduled_announcements').update({status:'sent',sent_at:new Date().toISOString()}).eq('id',row.id).eq('status','pending').select().maybeSingle();
  if(claimed.error||!claimed.data)continue;
  try{const guild=client.guilds.cache.get((await supabase.from('guilds').select('discord_guild_id').eq('id',row.guild_id).maybeSingle()).data?.discord_guild_id);const channel=guild?await guild.channels.fetch(row.channel_id).catch(()=>null):null;if(!channel?.isTextBased())throw new Error('Canal no disponible');const embed=brandedEmbed(row.title,row.content,{image:row.image_url||undefined,footerText:`Hypnox Studios • ${row.announcement_type.toUpperCase()}`});await channel.send({embeds:[embed]});if(guild)await writeLog({guild,category:'system',action:'anuncio_programado_enviado',actorId:row.created_by_discord_user_id,channelId:row.channel_id,message:row.title,metadata:{scheduleId:row.id}});}catch(error){await supabase.from('scheduled_announcements').update({status:'failed'}).eq('id',row.id);console.error(`[HYPNOX] Scheduled announcement ${row.id}:`,error.message);}
 }
}
function registerScheduledAnnouncements(client){processScheduledAnnouncements(client);setInterval(()=>processScheduledAnnouncements(client),30000).unref();}
module.exports={registerScheduledAnnouncements,processScheduledAnnouncements};
