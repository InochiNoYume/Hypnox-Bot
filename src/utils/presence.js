const { ActivityType } = require('discord.js');

function configurePresence(client) {
  const status = (process.env.BOT_STATUS || 'dnd').toLowerCase();
  const validStatuses = new Set(['online', 'idle', 'dnd', 'invisible']);
  const normalizedStatus = validStatuses.has(status) ? status : 'dnd';
  const description = process.env.BOT_ACTIVITY || '';

  client.once('clientReady', () => {
    client.user.setPresence({
      status: normalizedStatus,
      activities: description
        ? [{ name: description, type: ActivityType.Watching }]
        : []
    });
    console.log(`[HYPNOX] Estado configurado: ${normalizedStatus}${description ? ` | ${description}` : ''}`);
  });
}

module.exports = { configurePresence };
