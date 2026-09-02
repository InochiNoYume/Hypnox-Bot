const { SlashCommandBuilder } = require('discord.js');
const { brandedEmbed, addSection } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roles')
    .setDescription('Muestra la estructura y los roles del Staff Team.'),

  async execute(interaction) {
    const embed = brandedEmbed(
      'ESTRUCTURA DEL STAFF',
      'Estructura interna de Hypnox Studios Staff Team. Los roles de departamento identifican funciones y no implican una jerarquía global por sí mismos.'
    );

    addSection(embed, 'Dirección', '`Founder` → `Director` → `Administrative Assistant`');
    addSection(embed, 'Staff', '`SrMod` → `Mod` → `T-Mod` → `Helper`');
    addSection(embed, 'Gestión de proyectos', '`Project Manager` → `Department Lead`');
    addSection(embed, 'Departamentos', '`Producer` · `Developer` · `Editor` · `Builder` · `Content Creator`');
    addSection(embed, 'Formación', '`Trainee` — estado de evaluación y formación.');
    embed.setFooter({ text: 'Hypnox Studios • Staff Team • Estructura oficial' });

    return interaction.reply({ embeds: [embed] });
  },

  guilds: ['staff'],
  access: {
    roleEnvs: [
      'STAFF_ROLE_FOUNDER_ID',
      'STAFF_ROLE_DIRECTOR_ID',
      'STAFF_ROLE_ADMINISTRATIVE_ASSISTANT_ID',
      'STAFF_ROLE_SRMOD_ID',
      'STAFF_ROLE_MOD_ID',
      'STAFF_ROLE_TMOD_ID',
      'STAFF_ROLE_HELPER_ID',
      'STAFF_ROLE_PROJECT_MANAGER_ID',
      'STAFF_ROLE_DEPARTMENT_LEAD_ID',
      'STAFF_ROLE_PRODUCER_ID',
      'STAFF_ROLE_DEVELOPER_ID',
      'STAFF_ROLE_EDITOR_ID',
      'STAFF_ROLE_BUILDER_ID',
      'STAFF_ROLE_CONTENT_CREATOR_ID',
      'STAFF_ROLE_TRAINEE_ID'
    ]
  }
};
