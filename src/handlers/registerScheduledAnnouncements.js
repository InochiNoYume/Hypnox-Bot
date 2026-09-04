const { brandedEmbed } = require('../utils/embeds');
const { writeLog } = require('../services/logs');
const supabase = require('../database/supabase');

let schedulerRunning = false;
const processingIds = new Set();

async function processScheduledAnnouncements(client) {
  if (schedulerRunning) return;
  schedulerRunning = true;

  try {
    const now = new Date().toISOString();
    const { data: rows, error } = await supabase
      .from('scheduled_announcements')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', now)
      .order('scheduled_for', { ascending: true })
      .limit(10);

    if (error) {
      console.error('[HYPNOX] Scheduler:', error.message);
      return;
    }

    for (const row of rows || []) {
      if (processingIds.has(row.id)) continue;
      processingIds.add(row.id);

      try {
        const { data: claim, error: claimError } = await supabase
          .from('scheduled_announcements')
          .update({ status: 'pending' })
          .eq('id', row.id)
          .eq('status', 'pending')
          .select('id')
          .maybeSingle();

        if (claimError || !claim) continue;

        const { data: guildRow, error: guildError } = await supabase
          .from('guilds')
          .select('discord_guild_id')
          .eq('id', row.guild_id)
          .maybeSingle();
        if (guildError) throw guildError;

        const guild = guildRow?.discord_guild_id
          ? client.guilds.cache.get(guildRow.discord_guild_id) || await client.guilds.fetch(guildRow.discord_guild_id).catch(() => null)
          : null;
        const channel = guild ? await guild.channels.fetch(row.channel_id).catch(() => null) : null;
        if (!channel?.isTextBased()) throw new Error('Canal no disponible.');

        const embed = brandedEmbed(row.title, row.content, {
          image: row.image_url || undefined,
          footerText: `Hypnox Studios • ${String(row.announcement_type).toUpperCase()}`
        });

        await channel.send({ embeds: [embed] });

        const { error: sentError } = await supabase
          .from('scheduled_announcements')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', row.id)
          .eq('status', 'pending');
        if (sentError) throw sentError;

        if (guild) {
          await writeLog({
            guild,
            category: 'system',
            action: 'anuncio_programado_enviado',
            actorId: row.created_by_discord_user_id,
            channelId: row.channel_id,
            message: row.title,
            metadata: { scheduleId: row.id }
          });
        }
      } catch (error) {
        await supabase
          .from('scheduled_announcements')
          .update({ status: 'failed' })
          .eq('id', row.id)
          .eq('status', 'pending')
          .catch(() => {});
        console.error(`[HYPNOX] Scheduled announcement ${row.id}:`, error.message);
      } finally {
        processingIds.delete(row.id);
      }
    }
  } finally {
    schedulerRunning = false;
  }
}

function registerScheduledAnnouncements(client) {
  processScheduledAnnouncements(client).catch((error) => console.error('[HYPNOX] Scheduler startup:', error));
  const interval = setInterval(() => {
    processScheduledAnnouncements(client).catch((error) => console.error('[HYPNOX] Scheduler loop:', error));
  }, 30_000);
  interval.unref();
  return interval;
}

module.exports = { registerScheduledAnnouncements, processScheduledAnnouncements };
