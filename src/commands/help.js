const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { brandedEmbed } = require('../utils/embeds');
const { getGuildType } = require('../utils/guild');
const { canViewHelpCategory } = require('../utils/helpPermissions');

const CATEGORIES = {
  informacion: { title: 'INFORMACIÓN', description: 'Recursos públicos de Hypnox Studios: información, normativa, roles y enlaces oficiales.', guilds: ['official'] },
  comunidad: { title: 'COMUNIDAD', description: 'Herramientas destinadas a los miembros de la comunidad oficial.', guilds: ['official'] },
  moderacion: { title: 'MODERACIÓN', description: 'Herramientas para mantener el orden, la seguridad y la convivencia.', guilds: ['official', 'staff'] },
  tickets: { title: 'TICKETS', description: 'Gestión de soporte, reportes, alianzas, partners y contacto.', guilds: ['official'] },
  anuncios: { title: 'ANUNCIOS', description: 'Publicaciones oficiales, actividades, dinámicas, series y contenido.', guilds: ['official', 'staff'] },
  eventos: { title: 'EVENTOS', description: 'Creación, gestión y participación en eventos.', guilds: ['official', 'staff'] },
  premios: { title: 'PREMIOS', description: 'Gestión de sorteos, premios, ganadores y entregas.', guilds: ['official', 'staff'] },
  postulaciones: { title: 'POSTULACIONES', description: 'Gestión de convocatorias y proceso de incorporación de Staff.', guilds: ['official', 'applications'] },
  proyectos: { title: 'PROYECTOS', description: 'Gestión interna de proyectos, responsables y planificación.', guilds: ['staff'] },
  administracion: { title: 'ADMINISTRACIÓN', description: 'Configuración avanzada, auditoría y parámetros internos.', guilds: ['official', 'staff', 'applications'] }
};

const COMMANDS = {
  informacion: ['/info', '/reglas', '/roles', '/links'],
  comunidad: ['/user', '/serverinfo', '/credits'],
  moderacion: ['/moderacion warn', '/moderacion warnings', '/moderacion unwarn', '/moderacion timeout', '/moderacion clear', '/moderacion slowmode', '/moderacion kick', '/moderacion ban'],
  tickets: ['/tickets panel', '/tickets cerrar', '/tickets claim', '/tickets valorar', '/tickets historial', '/tickets add', '/tickets remove'],
  anuncios: ['/anuncio', '/anuncio-programado crear', '/anuncio-programado lista', '/anuncio-programado cancelar'],
  eventos: ['/evento crear', '/evento editar', '/evento cancelar', '/evento iniciar', '/evento finalizar', '/evento-participar unirse', '/evento-participar salir', '/evento-participantes'],
  premios: ['/premio crear', '/premio finalizar', '/premio reroll', '/premio entregar'],
  postulaciones: ['/abierto', '/cerrado', '/aceptado', '/requisitos', '/informacion', '/postular', '/resultado', '/estado-postulacion', '/reglamento-interno', '/faq-postulaciones', '/proceso-seleccion'],
  proyectos: ['/proyecto crear', '/proyecto editar', '/proyecto estado', '/proyecto cerrar', '/proyecto asignar'],
  administracion: ['/administracion config', '/administracion set-channel', '/administracion set-role', '/administracion set-permission', '/administracion maintenance', '/administracion reload', '/auditoria usuario', '/status', '/reportes lista', '/reportes ver', '/reportes resolver', '/reportes rechazar', '/encuesta crear', '/encuesta cerrar', '/prefijo establecer', '/prefijo ver', '/prefijo restablecer', '/say']
};

const data = new SlashCommandBuilder()
  .setName('help').setDescription('Consulta las categorías y comandos disponibles.')
  .addSubcommand((s) => s.setName('inicio').setDescription('Muestra el panel general de ayuda.'))
  .addSubcommand((s) => s.setName('informacion').setDescription('Comandos de información.'))
  .addSubcommand((s) => s.setName('comunidad').setDescription('Comandos para miembros.'))
  .addSubcommand((s) => s.setName('moderacion').setDescription('Herramientas de moderación.'))
  .addSubcommand((s) => s.setName('tickets').setDescription('Gestión de tickets.'))
  .addSubcommand((s) => s.setName('anuncios').setDescription('Publicaciones oficiales.'))
  .addSubcommand((s) => s.setName('eventos').setDescription('Gestión de eventos.'))
  .addSubcommand((s) => s.setName('premios').setDescription('Gestión de premios y sorteos.'))
  .addSubcommand((s) => s.setName('postulaciones').setDescription('Gestión de postulaciones.'))
  .addSubcommand((s) => s.setName('proyectos').setDescription('Gestión de proyectos.'))
  .addSubcommand((s) => s.setName('administracion').setDescription('Configuración administrativa.'));

async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const type = getGuildType(interaction.guildId);
  if (sub === 'inicio') {
    const available = Object.entries(CATEGORIES).filter(([, c]) => c.guilds.includes(type)).filter(([key]) => canViewHelpCategory(interaction.member, key)).map(([, c]) => c);
    const embed = brandedEmbed('CENTRO DE AYUDA', 'Panel de referencia de Hypnox Studios.');
    embed.addFields(available.length ? available.map((c) => ({ name: `◆ ${c.title}`, value: c.description, inline: false })) : { name: '◆ ACCESO', value: 'No hay categorías disponibles.', inline: false });
    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
  const category = CATEGORIES[sub];
  if (!category || !category.guilds.includes(type) || !canViewHelpCategory(interaction.member, sub)) return interaction.reply({ content: 'Esta categoría no está disponible para tu rol.', flags: MessageFlags.Ephemeral });
  let commands = COMMANDS[sub] || [];
  if (sub === 'postulaciones' && type === 'official') commands = ['/abierto', '/cerrado', '/aceptado'];
  if (sub === 'postulaciones' && type === 'applications') commands = ['/requisitos', '/informacion', '/postular', '/resultado', '/estado-postulacion', '/proceso-seleccion', '/faq-postulaciones'];
  if (sub === 'eventos') commands = type === 'official' ? COMMANDS.eventos : ['/evento crear', '/evento editar', '/evento cancelar', '/evento iniciar', '/evento finalizar'];
  if (sub === 'anuncios' && type === 'staff') commands = ['/anuncio', '/anuncio-programado crear', '/anuncio-programado lista', '/anuncio-programado cancelar'];
  if (sub === 'administracion' && type === 'applications') commands = ['/administracion config', '/administracion set-channel', '/administracion set-role', '/administracion set-permission', '/administracion maintenance', '/administracion reload'];
  const embed = brandedEmbed(category.title, category.description);
  embed.addFields({ name: '◆ COMANDOS DISPONIBLES', value: commands.map((x) => `\`${x}\``).join('\n') || 'Sin comandos disponibles.', inline: false });
  return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

module.exports = { data, execute, guilds: ['official', 'staff', 'applications'] };
