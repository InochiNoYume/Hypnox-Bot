const { hasConfiguredRole } = require('./permissions');
const { getGuildType } = require('./guilds');

const CATEGORY_PERMISSIONS = {
  informacion: { type: 'any' },
  comunidad: { type: 'any' },
  tickets: { type: 'any' },

  moderacion: {
    type: 'roles',
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
      'STAFF_ROLE_ADMINISTRATIVE_ASSISTANT_ID',
      'STAFF_ROLE_SRMOD_ID',
      'STAFF_ROLE_MOD_ID',
      'STAFF_ROLE_TMOD_ID',
      'STAFF_ROLE_HELPER_ID'
    ]
  },

  anuncios: {
    type: 'roles',
    official: [
      'OFFICIAL_ROLE_FOUNDER_ID',
      'OFFICIAL_ROLE_DIRECTOR_ID',
      'OFFICIAL_ROLE_ADMINISTRATOR_ID',
      'OFFICIAL_ROLE_SRMOD_ID'
    ],
    staff: [
      'STAFF_ROLE_FOUNDER_ID',
      'STAFF_ROLE_DIRECTOR_ID',
      'STAFF_ROLE_ADMINISTRATOR_ID',
      'STAFF_ROLE_ADMINISTRATIVE_ASSISTANT_ID',
      'STAFF_ROLE_PROJECT_MANAGER_ID',
      'STAFF_ROLE_DEPARTMENT_LEAD_ID'
    ]
  },

  eventos: {
    type: 'roles',
    official: [
      'OFFICIAL_ROLE_FOUNDER_ID',
      'OFFICIAL_ROLE_DIRECTOR_ID',
      'OFFICIAL_ROLE_ADMINISTRATOR_ID',
      'OFFICIAL_ROLE_SRMOD_ID'
    ],
    staff: [
      'STAFF_ROLE_FOUNDER_ID',
      'STAFF_ROLE_DIRECTOR_ID',
      'STAFF_ROLE_ADMINISTRATOR_ID',
      'STAFF_ROLE_PROJECT_MANAGER_ID',
      'STAFF_ROLE_DEPARTMENT_LEAD_ID'
    ]
  },

  premios: {
    type: 'roles',
    official: [
      'OFFICIAL_ROLE_FOUNDER_ID',
      'OFFICIAL_ROLE_DIRECTOR_ID',
      'OFFICIAL_ROLE_ADMINISTRATOR_ID',
      'OFFICIAL_ROLE_SRMOD_ID'
    ],
    staff: [
      'STAFF_ROLE_FOUNDER_ID',
      'STAFF_ROLE_DIRECTOR_ID',
      'STAFF_ROLE_ADMINISTRATOR_ID',
      'STAFF_ROLE_PROJECT_MANAGER_ID',
      'STAFF_ROLE_DEPARTMENT_LEAD_ID'
    ]
  },

  administracion: {
    type: 'roles',
    official: [
      'OFFICIAL_ROLE_FOUNDER_ID',
      'OFFICIAL_ROLE_DIRECTOR_ID',
      'OFFICIAL_ROLE_ADMINISTRATOR_ID'
    ],
    staff: [
      'STAFF_ROLE_FOUNDER_ID',
      'STAFF_ROLE_DIRECTOR_ID',
      'STAFF_ROLE_ADMINISTRATOR_ID'
    ],
    applications: [
      'APPLICATIONS_ROLE_FOUNDER_ID',
      'APPLICATIONS_ROLE_DIRECTOR_ID',
      'APPLICATIONS_ROLE_ADMINISTRATOR_ID'
    ]
  }
};

function canViewHelpCategory(member, category) {
  const permission = CATEGORY_PERMISSIONS[category];
  if (!permission) return false;
  if (permission.type === 'any') return true;

  const guildType = getGuildType(member?.guild?.id);
  const allowedRoles = permission[guildType] || [];

  return allowedRoles.some((roleEnv) => hasConfiguredRole(member, roleEnv));
}

module.exports = { CATEGORY_PERMISSIONS, canViewHelpCategory };
