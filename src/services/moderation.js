const supabase = require('../database/supabase');

async function createCase({ guildId, targetId, moderatorId, type, reason, durationSeconds = null }) {
  const { data, error } = await supabase
    .from('moderation_cases')
    .insert({
      guild_id: guildId,
      user_id: targetId,
      moderator_id: moderatorId,
      type,
      reason: reason || 'Sin razón especificada',
      duration_seconds: durationSeconds,
      active: true
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getWarnings(guildId, userId) {
  const { data, error } = await supabase
    .from('moderation_cases')
    .select('*')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .eq('type', 'warn')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

async function deactivateCase(guildId, caseId, moderatorId) {
  const { data, error } = await supabase
    .from('moderation_cases')
    .update({ active: false, resolved_by: moderatorId, resolved_at: new Date().toISOString() })
    .eq('guild_id', guildId)
    .eq('id', caseId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

module.exports = { createCase, getWarnings, deactivateCase };
