const { getEnv } = require('../config/env');

const LEVELS = {
  helper: ['HELPER'],
  tmod: ['TMOD', 'MOD', 'SRMOD', 'ADMINISTRATOR', 'DIRECTOR', 'FOUNDER'],
  mod: ['MOD', 'SRMOD', 'ADMINISTRATOR', 'DIRECTOR', 'FOUNDER'],
  srmod: ['SRMOD', 'ADMINISTRATOR', 'DIRECTOR', 'FOUNDER'],
  management: ['PROJECT_MANAGER', 'DEPARTMENT_LEAD', 'ADMINISTRATOR', 'DIRECTOR', 'FOUNDER'],
  announcements: ['PROJECT_MANAGER', 'DEPARTMENT_LEAD', 'ADMINISTRATOR', 'DIRECTOR', 'FOUNDER'],
  administration: ['ADMINISTRATOR', 'DIRECTOR', 'FOUNDER']
};

function roleEnv(guildType, role) {
  const prefix = guildType === 'official' ? 'OFFICIAL' : guildType === 'staff' ? 'STAFF' : 'APPLICATIONS';
  return `${prefix}_ROLE_${role}_ID`;
}

function hasRole(member, guildType, role) {
  const id = getEnv(roleEnv(guildType, role));
  return Boolean(id && member?.roles?.cache?.has(id));
}

function hasLevel(member, guildType, level) {
  return (LEVELS[level] || []).some((role) => hasRole(member, guildType, role));
}

function isStaff(member, guildType) {
  return hasLevel(member, guildType, 'helper');
}

module.exports = { hasRole, hasLevel, isStaff, LEVELS };
