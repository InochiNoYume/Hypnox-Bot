const { MessageFlags } = require('discord.js');
const supabase = require('../database/supabase');
const { brandedEmbed } = require('../utils/embeds');

function registerPolls(client) {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton() || !interaction.customId.startsWith('poll:')) return;
    const [, id, optionIndex] = interaction.customId.split(':');
    try {
      const { data: poll, error } = await supabase.from('polls').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!poll || poll.status !== 'active') return interaction.reply({ content: 'Esta encuesta ya está cerrada.', flags: MessageFlags.Ephemeral });
      const index = Number(optionIndex);
      if (!Number.isInteger(index) || index < 0 || index >= poll.options.length) return interaction.reply({ content: 'La opción seleccionada no es válida.', flags: MessageFlags.Ephemeral });
      const votes = { ...(poll.votes || {}) };
      const previous = Object.entries(votes).find(([, voters]) => Array.isArray(voters) && voters.includes(interaction.user.id));
      if (previous) votes[previous[0]] = previous[1].filter(id => id !== interaction.user.id);
      votes[index] = Array.isArray(votes[index]) ? [...votes[index], interaction.user.id] : [interaction.user.id];
      const { error: updateError } = await supabase.from('polls').update({ votes }).eq('id', id).eq('status', 'active');
      if (updateError) throw updateError;
      const total = Object.values(votes).reduce((sum, voters) => sum + (Array.isArray(voters) ? voters.length : 0), 0);
      const embed = brandedEmbed('ENCUESTA', poll.question, { footerText: `Hypnox Studios • ${total} voto${total === 1 ? '' : 's'}` });
      embed.addFields(poll.options.map((option, i) => ({ name: `◆ ${i + 1}. ${option}`, value: `**${Array.isArray(votes[i]) ? votes[i].length : 0}** voto${(Array.isArray(votes[i]) ? votes[i].length : 0) === 1 ? '' : 's'}`, inline: true })));
      if (interaction.message) await interaction.message.edit({ embeds: [embed] }).catch(() => {});
      return interaction.reply({ content: `Voto registrado: **${poll.options[index]}**. Puedes cambiarlo votando otra opción.`, flags: MessageFlags.Ephemeral });
    } catch (error) {
      console.error('[HYPNOX] Poll interaction:', error);
      return interaction.reply({ content: 'No se pudo registrar el voto.', flags: MessageFlags.Ephemeral }).catch(() => {});
    }
  });
}
module.exports = { registerPolls };
