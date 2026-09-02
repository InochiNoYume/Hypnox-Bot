const { SlashCommandBuilder } = require('discord.js');
const { brandedEmbed } = require('../utils/embeds');
const { getGuildType } = require('../utils/guild');
const { canViewHelpCategory } = require('../utils/helpPermissions');

const CATEGORIES = {
  informacion: { title: 'INFORMACIÓN', description: 'Recursos públicos de Hypnox Studios: información, normativa, roles y enlaces oficiales.', guilds: ['official'] },
  comunidad: { title: 'COMUNIDAD', description: 'Herramientas destinadas a los miembros de la comunidad oficial.', guilds: ['official'] },
  moderacion: { title: 'MODERACIÓN', description: 'Herramientas para mantener el orden, la seguridad y la convivencia dentro de los servidores.', guilds: ['official', 'staff'] },
  tickets: { title: 'TICKETS', description: 'Gestión del sistema de soporte, reportes, alianzas, partners y contacto.', guilds: ['official'] },
  anuncios: { title: 'ANUNCIOS', description: 'Publicación de comunicaciones, actividades, dinámicas, series y contenido oficial.', guilds: ['official', 'staff'] },
  eventos: { title: 'EVENTOS', description: 'Creación y gestión del ciclo de vida de los eventos de Hypnox Studios.', guilds: ['official', 'staff'] },
  premios: { title: 'PREMIOS', description: 'Gestión de sorteos, premios, ganadores y entregas.', guilds: ['official', 'staff'] },
  postulaciones: { title: 'POSTULACIONES', description: 'Gestión de convocatorias y publicación de información, requisitos, estados y resultados del proceso de incorporación de Staff.', guilds: ['official', 'applications'] },
  proyectos: { title: 'PROYECTOS', description: 'Gestión interna de proyectos, responsables, estados y planificación.', guilds: ['staff'] },
  administracion: { title: 'ADMINISTRACIÓN', description: 'Configuración avanzada del bot y parámetros internos de cada servidor.', guilds: ['official', 'staff', 'applications'] }
};

const COMMANDS = {
  informacion: ['/info', '/reglas', '/roles', '/links'],
  comunidad: ['/user', '/serverinfo', '/credits'],
  moderacion: ['/moderacion warn', '/moderacion warnings', '/moderacion unwarn', '/moderacion timeout', '/moderacion clear', '/moderacion slowmode', '/moderacion kick', '/moderacion ban'],
  tickets: ['/tickets panel', '/tickets cerrar', '/tickets claim', '/tickets add', '/tickets remove'],
  anuncios: ['/anuncio'],
  eventos: ['/evento crear', '/evento editar', '/evento cancelar', '/evento iniciar', '/evento finalizar'],
  premios: ['/premio crear', '/premio finalizar', '/premio reroll', '/premio entregar'],
  postulaciones: ['/abierto', '/cerrado', '/aceptado', '/requisitos', '/informacion', '/postular', '/resultado', '/estado-postulacion', '/reglamento-interno'],
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
    const available = Object.entries(CATEGORIES)
      .filter(([, category]) => category.guilds.includes(guildType))
      .filter(([key]) => canViewHelpCategory(interaction.member, key))
      .map(([, category]) => category);

    const embed = brandedEmbed('CENTRO DE AYUDA', 'Panel de referencia de Hypnox Studios. Las categorías mostradas corresponden a los permisos disponibles para tu rol en este servidor.');
    if (available.length) embed.addFields(available.map((category) => ({ name: `◆ ${category.title}`, value: category.description, inline: false })));
    else embed.addFields({ name: '◆ ACCESO', value: 'No hay categorías disponibles para los roles configurados en este servidor.', inline: false });
    embed.setFooter({ text: `Hypnox Studios • ${available.length} categoría${available.length === 1 ? '' : 's'} disponible${available.length === 1 ? '' : 's'}.` });
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  const category = CATEGORIES[subcommand];
  if (!category || !category.guilds.includes(guildType)) return interaction.reply({ content: 'Esta categoría no está disponible en este servidor.', ephemeral: true });
  if (!canViewHelpCategory(interaction.member, subcommand)) return interaction.reply({ content: 'No tienes el rol necesario para consultar esta categoría.', ephemeral: true });

  let commands = COMMANDS[subcommand] || [];
  if (subcommand === 'postulaciones' && guildType === 'official') commands = ['/abierto', '/cerrado', '/aceptado'];
  if (subcommand === 'postulaciones' && guildType === 'applications') commands = ['/requisitos', '/informacion', '/postular', '/resultado', '/estado-postulacion'];

  const embed = brandedEmbed(category.title, category.description);
  embed.addFields({ name: '◆ COMANDOS DISPONIBLES', value: commands.length ? commands.map((command) => `\`${command}\``).join('\n') : 'No hay comandos configurados en esta categoría.', inline: false });
  embed.setFooter({ text: `Hypnox Studios • ${commands.length} comando${commands.length === 1 ? '' : 's'} disponible${commands.length === 1 ? '' : 's'}.` });
  return interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = { data, execute, guilds: ['official', 'staff', 'applications'] };
