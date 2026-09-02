const { getEnv } = require('../config/env');
const { getGuildType } = require('./guild');
const { hasConfiguredRole } = require('./permissions');
const { brandedEmbed } = require('./embeds');

const ADMIN_ROLES = {
  staff: ['STAFF_ROLE_FOUNDER_ID', 'STAFF_ROLE_DIRECTOR_ID', 'STAFF_ROLE_ADMINISTRATIVE_ASSISTANT_ID'],
  applications: ['APPLICATIONS_ROLE_FOUNDER_ID', 'APPLICATIONS_ROLE_DIRECTOR_ID', 'APPLICATIONS_ROLE_ADMINISTRATOR_ID']
};

const CHANNELS = {
  staff: { reglamento: 'STAFF_CHANNEL_INTERNAL_RULES_ID' },
  applications: {
    requisitos: 'APPLICATIONS_CHANNEL_REQUIREMENTS_ID',
    informacion: 'APPLICATIONS_CHANNEL_INFORMATION_ID',
    postular: 'APPLICATIONS_CHANNEL_APPLY_ID',
    resultado: 'APPLICATIONS_CHANNEL_RESULTS_ID',
    estado: 'APPLICATIONS_CHANNEL_STATUS_ID'
  }
};

function isAdminOrHigher(member) {
  const guildType = getGuildType(member?.guild?.id);
  const roles = ADMIN_ROLES[guildType] || [];
  return roles.some((roleEnv) => hasConfiguredRole(member, roleEnv));
}

async function getConfiguredChannel(interaction, key) {
  const guildType = getGuildType(interaction.guildId);
  const envKey = CHANNELS[guildType]?.[key];
  if (!envKey) return { channel: null, envKey: null };

  const channelId = getEnv(envKey);
  if (!channelId) return { channel: null, envKey };

  const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
  return { channel: channel?.isTextBased() ? channel : null, envKey };
}

function accessDenied() {
  return 'No tienes el rol administrativo necesario para utilizar este comando.';
}

function missingChannel(envKey) {
  return `Configura ${envKey} en el .env antes de utilizar este comando.`;
}

function base(title, description) {
  return brandedEmbed(title, description);
}

module.exports = { isAdminOrHigher, getConfiguredChannel, accessDenied, missingChannel, base };
