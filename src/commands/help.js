const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { canViewHelpCategory } = require('../utils/helpPermissions');

const CATEGORIES = {
  informacion: {
    title: 'INFORMACIÓN',
    description: 'Comandos de información general de Hypnox Studios.',
    commands: ['/info', '/reglas', '/roles', '/links', '/user', '/serverinfo', '/credits']
  },
  moderacion: {
    title: 'MODERACIÓN',
    description: 'Herramientas de moderación según tu nivel dentro del Staff.',
    commands: ['/warn', '/warnings', '/unwarn', '/timeout', '/clear', '/slowmode', '/kick', '/ban']
  },
  tickets: {
    title: 'TICKETS',
    description: 'Sistema de atención, reportes, alianzas y contacto.',
    commands: ['/tickets', '/ticket cerrar', '/ticket agregar', '/ticket quitar', '/ticket reclamar', '/ticket transferir']
  },
  anuncios: {
    title: 'ANUNCIOS',
    description: 'Publicación de contenido oficial de Hypnox Studios.',
    commands: ['/anuncio', '/actividad', '/dinamica', '/evento', '/serie', '/episodio']
  },
  eventos: {
    title: 'EVENTOS',
    description: 'Gestión del ciclo de vida de eventos.',
    commands: ['/crear-evento', '/editar-evento', '/cancelar-evento', '/iniciar-evento', '/finalizar-evento']
  },
  comunidad: {
    title: 'COMUNIDAD',
    description: 'Comandos destinados a la comunidad.',
    commands: ['/user', '/serverinfo', '/credits']
  },
  premios: {
    title: 'PREMIOS',
    description: 'Gestión de sorteos y premios.',
    commands: ['/giveaway', '/finalizar-giveaway', '/reroll', '/premio']
  },
  administracion: {
    title: 'ADMINISTRACIÓN',
    description: 'Configuración y control interno del bot.',
    commands: ['/config', '/set-channel', '/set-role', '/set-permission', '/maintenance', '/reload']
  }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Muestra la ayuda del bot por categoría.')
    .addSubcommand((subcommand) => subcommand.setName('informacion').setDescription('Comandos de información.'))
    .addSubcommand((subcommand) => subcommand.setName('moderacion').setDescription('Comandos de moderación.'))
    .addSubcommand((subcommand) => subcommand.setName('tickets').setDescription('Comandos del sistema de tickets.'))
    .addSubcommand((subcommand) => subcommand.setName('anuncios').setDescription('Comandos de anuncios.'))
    .addSubcommand((subcommand) => subcommand.setName('eventos').setDescription('Comandos de eventos.'))
    .addSubcommand((subcommand) => subcommand.setName('comunidad').setDescription('Comandos de comunidad.'))
    .addSubcommand((subcommand) => subcommand.setName('premios').setDescription('Comandos de premios.'))
    .addSubcommand((subcommand) => subcommand.setName('administracion').setDescription('Comandos de administración.')),

  async execute(interaction) {
    const category = interaction.options.getSubcommand();

    if (!canViewHelpCategory(interaction.member, category)) {
      return interaction.reply({
        content: 'No tienes permisos para consultar esta categoría.',
        ephemeral: true
      });
    }

    const data = CATEGORIES[category];
    const embed = new EmbedBuilder()
      .setColor(Number.parseInt(process.env.BOT_COLOR || '000000', 16))
      .setTitle(`HYPNOX STUDIOS — ${data.title}`)
      .setDescription(data.description)
      .addFields({
        name: 'Comandos disponibles',
        value: data.commands.map((command) => `\`${command}\``).join('\n')
      })
      .setFooter({ text: 'Hypnox Studios • Sistema de ayuda' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
