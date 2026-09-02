const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reglas')
    .setDescription('Muestra las reglas principales del servidor.'),

  async execute(interaction) {
    const rules = [
      'Respeta a todos los miembros en todo momento.',
      'No se permiten insultos, acoso, discriminación ni discursos de odio.',
      'No hagas spam, flood ni publicidad sin autorización.',
      'Utiliza cada canal para el tema que corresponde.',
      'No compartas contenido NSFW, gore o inapropiado.',
      'No compartas información personal propia o de terceros.',
      'No abuses de bugs, exploits o fallos del servidor.',
      'No suplantes la identidad de otros miembros o Staff.',
      'Evita conflictos y discusiones innecesarias.',
      'Respeta las decisiones del equipo de moderación.'
    ];

    const embed = new EmbedBuilder()
      .setColor(Number.parseInt(process.env.BOT_COLOR || '000000', 16))
      .setTitle('HYPNOX STUDIOS — REGLAS')
      .setDescription(rules.map((rule, index) => `**${index + 1}.** ${rule}`).join('\n'))
      .setFooter({ text: 'Hypnox Studios • Normativa de la comunidad' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
