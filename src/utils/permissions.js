const { getEnv } = require('../config/env');

const ROLE_ENV_BY_GUILD = {
  official: [
    'OFFICIAL_ROLE_FOUNDER_ID',
    'OFFICIAL_ROLE_DIRECTOR_ID',
    'OFFICIAL_ROLE_ADMINISTRATOR_ID',
    'OFFICIAL_ROLE_SRMOD_ID',
    'OFFICIAL_ROLE_MOD_ID',
    'OFFICIAL_ROLE_TMOD_ID',
    'OFFICIAL_ROLE_HELPER_ID'
  ],
  staff: [
    'STAFF_ROLE_FOUNDER_ID',
    'STAFF_ROLE_DIRECTOR_ID',
    'STAFF_ROLE_ADMINISTRATOR_ID',
    'STAFF_ROLE_SRMOD_ID',
    'STAFF_ROLE_MOD_ID',
    'STAFF_ROLE_TMOD_ID',
    'STAFF_ROLE_HELPER_ID',
    'STAFF_ROLE_PROJECT_MANAGER_ID',
    'STAFF_ROLE_DEPARTMENT_LEAD_ID'
  ],
  applications: [
    'APPLICATIONS_ROLE_FOUNDER_ID',
    'APPLICATIONS_ROLE_DIRECTOR_ID',
    'APPLICATIONS_ROLE_ADMINISTRATOR_ID',
    'APPLICATIONS_ROLE_APPLICATION_MANAGER_ID',
    'APPLICATIONS_ROLE_APPLICATION_REVIEWER_ID',
    'APPLICATIONS_ROLE_INTERVIEWER_ID'
  ]
};

function hasConfiguredRole(member, roleEnv) {
  const roleId = getEnv(roleEnv);
  return Boolean(roleId && member?.roles?.cache?.has(roleId));
}

function hasAnyRole(member, guildType, extraRoleEnvs = []) {
  const roles = [...(ROLE_ENV_BY_GUILD[guildType] || []), ...extraRoleEnvs];
  return roles.some((roleEnv) => hasConfiguredRole(member, roleEnv));
}

module.exports = { hasConfiguredRole, hasAnyRole, ROLE_ENV_BY_GUILD };
