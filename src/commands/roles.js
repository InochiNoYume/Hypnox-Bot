const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roles')
    .setDescription('Muestra la jerarquía y roles principales.'),

  async execute(interaction) {
    const description = [
      '**DIRECCIÓN**',
      '`Founder` → `Director` → `Administrator` → `Administrative Assistant`',
      '',
      '**STAFF**',
      '`SrMod` → `Mod` → `T-Mod` → `Helper`',
      '',
      '**GESTIÓN DE PROYECTOS**',
      '`Project Manager` → `Department Lead`',
      '',
      '**DEPARTAMENTOS**',
      '`Producer` · `Developer` · `Editor` · `Builder` · `Content Creator`',
      '',
      '**FORMACIÓN**',
      '`Trainee` — estado de evaluación y formación.'
    ].join('\n');

    const embed = new EmbedBuilder()
      .setColor(Number.parseInt(process.env.BOT_COLOR || '000000', 16))
      .setTitle('HYPNOX STUDIOS — ROLES')
      .setDescription(description)
      .setFooter({ text: 'Hypnox Studios • Jerarquía del Staff' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
