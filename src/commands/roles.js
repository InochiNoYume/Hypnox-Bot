const { SlashCommandBuilder } = require('discord.js');
const { brandedEmbed, addSection } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roles')
    .setDescription('Muestra la jerarquía y roles principales.'),

  async execute(interaction) {
    const embed = brandedEmbed('ESTRUCTURA DEL STAFF', 'La organización de Hypnox Studios se divide por dirección, operación, gestión, departamentos y formación.');
    addSection(embed, 'Dirección', '`Founder` → `Director` → `Administrator` → `Administrative Assistant`');
    addSection(embed, 'Staff', '`SrMod` → `Mod` → `T-Mod` → `Helper`');
    addSection(embed, 'Gestión de proyectos', '`Project Manager` → `Department Lead`');
    addSection(embed, 'Departamentos', '`Producer` · `Developer` · `Editor` · `Builder` · `Content Creator`');
    addSection(embed, 'Formación', '`Trainee` — estado de evaluación y formación.');
    embed.setFooter({ text: 'Hypnox Studios • Estructura oficial del Staff' });

    return interaction.reply({ embeds: [embed] });
  },

  guilds: ['official'],
  access: { roleEnvs: ['OFFICIAL_ROLE_MEMBER_ID'] }
};
