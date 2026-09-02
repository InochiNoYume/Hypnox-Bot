const { SlashCommandBuilder } = require('discord.js');
const { brandedEmbed } = require('../utils/embeds');
const { canViewHelpCategory } = require('../utils/helpPermissions');
const { getGuildType } = require('../utils/guild');

const CATEGORIES = {
  informacion: { title: 'INFORMACIÓN', description: 'Comandos generales para consultar información, normativa y enlaces oficiales.' },
  comunidad: { title: 'COMUNIDAD', description: 'Herramientas disponibles para los miembros del servidor oficial.' },
  moderacion: { title: 'MODERACIÓN', description: 'Herramientas destinadas al control, seguridad y convivencia de la comunidad.' },
  tickets: { title: 'TICKETS', description: 'Gestión del sistema de soporte, reportes, alianzas, partners y contacto.' },
  anuncios: { title: 'ANUNCIOS', description: 'Publicación de comunicaciones, actividades, dinámicas, series y contenido oficial.' },
  eventos: { title: 'EVENTOS', description: 'Creación y gestión del ciclo completo de eventos de Hypnox Studios.' },
  premios: { title: 'PREMIOS', description: 'Gestión de sorteos, premios, ganadores y entregas.' },
  postulaciones: { title: 'POSTULACIONES', description: 'Apertura, cierre y publicación de resultados del proceso de incorporación de Staff.' },
  proyectos: { title: 'PROYECTOS', description: 'Gestión interna de proyectos, responsables, estados y planificación.' },
  administracion: { title: 'ADMINISTRACIÓN', description: 'Configuración avanzada del bot y parámetros internos de cada servidor.' }
};

const COMMANDS = {
  informacion: ['/info', '/reglas', '/roles', '/links'],
  comunidad: ['/user', '/serverinfo', '/credits'],
  moderacion: ['/moderacion warn', '/moderacion warnings', '/moderacion unwarn', '/moderacion timeout', '/moderacion clear', '/moderacion slowmode', '/moderacion kick', '/moderacion ban'],
  tickets: ['/tickets panel', '/tickets cerrar', '/tickets claim', '/tickets add', '/tickets remove'],
  anuncios: ['/anuncio'],
  eventos: ['/evento crear', '/evento editar', '/evento cancelar', '/evento iniciar', '/evento finalizar'],
  premios: ['/premio crear', '/premio finalizar', '/premio reroll', '/premio entregar'],
  postulaciones: ['/abierto', '/cerrado', '/aceptado'],
  proyectos: ['/proyecto crear', '/proyecto editar', '/proyecto estado', '/proyecto cerrar', '/proyecto asignar'],
  administracion: ['/administracion config', '/administracion set-channel', '/administracion set-role', '/administracion set-permission', '/administracion maintenance', '/administracion reload']
};

const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Consulta las categorías y comandos disponibles.')
  .addSubcommand((sub) => sub.setName('inicio').setDescription('Muestra el panel general de ayuda.'))
  .addSubcommand((sub) => sub.setName('informacion').setDescription('Comandos de información y recursos.'))
  .addSubcommand((sub) => sub.setName('comunidad').setDescription('Comandos disponibles para miembros.'))
  .addSubcommand((sub) => sub.setName('moderacion').setDescription('Herramientas de moderación.'))
  .addSubcommand((sub) => sub.setName('tickets').setDescription('Gestión de tickets.'))
  .addSubcommand((sub) => sub.setName('anuncios').setDescription('Publicaciones oficiales.'))
  .addSubcommand((sub) => sub.setName('eventos').setDescription('Gestión de eventos.'))
  .addSubcommand((sub) => sub.setName('premios').setDescription('Gestión de premios y sorteos.'))
  .addSubcommand((sub) => sub.setName('postulaciones').setDescription('Gestión de postulaciones de Staff.'))
  .addSubcommand((sub) => sub.setName('proyectos').setDescription('Gestión de proyectos internos.'))
  .addSubcommand((sub) => sub.setName('administracion').setDescription('Configuración administrativa.'));

async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const guildType = getGuildType(interaction.guildId);

  if (subcommand === 'inicio') {
    const embed = brandedEmbed('CENTRO DE AYUDA', 'Consulta las categorías disponibles para este servidor y utiliza el subcomando correspondiente para ver sus herramientas.');
    embed.addFields(Object.values(CATEGORIES).map((category) => ({
      name: `◆ ${category.title}`,
      value: category.description,
      inline: false
    })));
    embed.setFooter({ text: 'Hypnox Studios • Usa /help <categoría> para consultar los comandos.' });
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (!canViewHelpCategory(interaction.member, subcommand)) {
    return interaction.reply({ content: 'No tienes el rol necesario para consultar esta categoría.', ephemeral: true });
  }

  const commands = COMMANDS[subcommand] || [];
  const unavailable = guildType === 'applications' && ['tickets', 'anuncios', 'eventos', 'premios', 'postulaciones', 'proyectos'].includes(subcommand);
  const description = unavailable
    ? `${CATEGORIES[subcommand].description}\n\nEsta categoría no está habilitada en este servidor.`
    : `${CATEGORIES[subcommand].description}\n\n${commands.map((command) => `◆ \`${command}\``).join('\n')}`;

  const embed = brandedEmbed(CATEGORIES[subcommand].title, description);
  embed.setFooter({ text: `Hypnox Studios • ${commands.length} comando${commands.length === 1 ? '' : 's'} disponible${commands.length === 1 ? '' : 's'}.` });
  return interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = { data, execute, guilds: ['official', 'staff', 'applications'] };
