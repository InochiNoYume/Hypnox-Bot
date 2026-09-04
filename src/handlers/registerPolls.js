const { MessageFlags } = require('discord.js');
const supabase = require('../database/supabase');
const { brandedEmbed } = require('../utils/embeds');

const pollLocks = new Map();

function enqueuePoll(id, task) {
  const previous = pollLocks.get(id) || Promise.resolve();
  const current = previous.catch(() => {}).then(task);
  pollLocks.set(id, current);
  return current.finally(() => {
    if (pollLocks.get(id) === current) pollLocks.delete(id);
  });
}

function registerPolls(client) {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton() || !interaction.customId.startsWith('poll:')) return;

    const [, id, optionIndex] = interaction.customId.split(':');
    if (!id) return interaction.reply({ content: 'Esta encuesta no es válida.', flags: MessageFlags.Ephemeral }).catch(() => {});

    await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});

    try {
      await enqueuePoll(id, async () => {
        const { data: poll, error } = await supabase
          .from('polls')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (error) throw error;
        if (!poll || poll.status !== 'active') {
          return interaction.editReply({ content: 'Esta encuesta ya está cerrada.' });
        }

        const options = Array.isArray(poll.options) ? poll.options : [];
        const index = Number(optionIndex);
        if (!Number.isInteger(index) || index < 0 || index >= options.length) {
          return interaction.editReply({ content: 'La opción seleccionada no es válida.' });
        }

        const votes = { ...(poll.votes || {}) };
        for (const [key, voters] of Object.entries(votes)) {
          if (Array.isArray(voters)) {
            votes[key] = voters.filter((discordUserId) => discordUserId !== interaction.user.id);
          }
        }

        votes[index] = Array.isArray(votes[index]) ? votes[index] : [];
        votes[index].push(interaction.user.id);

        const { error: updateError } = await supabase
          .from('polls')
          .update({ votes })
          .eq('id', id)
          .eq('status', 'active');
        if (updateError) throw updateError;

        const total = Object.values(votes).reduce(
          (sum, voters) => sum + (Array.isArray(voters) ? voters.length : 0),
          0
        );
        const embed = brandedEmbed('ENCUESTA', poll.question, {
          footerText: `Hypnox Studios • ${total} voto${total === 1 ? '' : 's'}`
        });
        embed.addFields(
          options.map((option, i) => {
            const count = Array.isArray(votes[i]) ? votes[i].length : 0;
            return {
              name: `◆ ${i + 1}. ${String(option).slice(0, 256)}`,
              value: `**${count}** voto${count === 1 ? '' : 's'}`,
              inline: true
            };
          })
        );

        if (interaction.message) {
          await interaction.message.edit({ embeds: [embed] }).catch(() => {});
        }

        return interaction.editReply({
          content: `Voto registrado: **${String(options[index])}**. Puedes cambiarlo votando otra opción.`
        });
      });
    } catch (error) {
      console.error('[HYPNOX] Poll interaction:', error);
      return interaction.editReply({ content: 'No se pudo registrar el voto. El error fue registrado para revisión.' }).catch(() => {});
    }
  });
}

module.exports = { registerPolls };
