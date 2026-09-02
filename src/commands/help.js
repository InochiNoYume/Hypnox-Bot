const { SlashCommandBuilder } = require('discord.js');
const { canViewHelpCategory } = require('../utils/helpPermissions');
const { getGuildType } = require('../utils/guild');

const CATEGORIES = {
  informacion: { title: 'INFORMACIÓN', description: 'Comandos generales de información y recursos del servidor.' },
  moderacion: { title: 'MODERACIÓN', description: 'Herramientas para administrar, sancionar y mantener el orden.' },
  tickets: { title: 'TICKETS', description: 'Sistema de soporte, reportes, alianzas/partners y contacto.' },
  anuncios: { title: 'ANUNCIOS', description: 'Publicación de anuncios, actividades, dinámicas, series y contenido oficial.' },
  eventos: { title: 'EVENTOS', description: 'Creación, edición, gestión y cierre de eventos.' },
  comunidad: { title: 'COMUNIDAD', description: 'Comandos para consultar información del usuario, del servidor y los créditos.' },
  premios: { title: 'PREMIOS', description: 'Gestión de sorteos, premios, ganadores y entregas.' },
  administracion: { title: 'ADMINISTRACIÓN', description: 'Configuración interna del bot y del servidor.' }
};

const COMMANDS = {
  informacion: ['/info', '/reglas', '/roles', '/links'],
  moderacion: ['/moderacion warn', '/moderacion warnings', '/moderacion unwarn', '/moderacion timeout', '/moderacion clear', '/moderacion slowmode', '/moderacion kick', '/moderacion ban'],
  tickets: ['/tickets panel', '/tickets cerrar', '/tickets claim', '/tickets add', '/tickets remove'],
  anuncios: ['/anuncio'],
  eventos: ['/evento crear', '/evento editar', '/evento cancelar', '/evento iniciar', '/evento finalizar'],
  comunidad: ['/user', '/serverinfo', '/credits'],
  premios: ['/premio crear', '/premio finalizar', '/premio reroll', '/premio entregar'],
  administracion: ['/administracion config', '/administracion set-channel', '/administracion set-role', '/administracion set-permission', '/administracion maintenance', '/administracion reload']
};

const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Muestra las categorías y comandos disponibles.')
  .addSubcommand((sub) => sub.setName('inicio').setDescription('Muestra las categorías de ayuda.'))
  .addSubcommand((sub) => sub.setName('informacion').setDescription('Comandos de información.'))
  .addSubcommand((sub) => sub.setName('moderacion').setDescription('Comandos de moderación.'))
  .addSubcommand((sub) => sub.setName('tickets').setDescription('Comandos de tickets.'))
  .addSubcommand((sub) => sub.setName('anuncios').setDescription('Comandos de anuncios.'))
  .addSubcommand((sub) => sub.setName('eventos').setDescription('Comandos de eventos.'))
  .addSubcommand((sub) => sub.setName('comunidad').setDescription('Comandos para miembros.'))
  .addSubcommand((sub) => sub.setName('premios').setDescription('Comandos de premios.'))
  .addSubcommand((sub) => sub.setName('administracion').setDescription('Comandos de administración.'));

async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const guildType = getGuildType(interaction.guildId);

  if (subcommand === 'inicio') {
    const description = Object.values(CATEGORIES).map((category) => `**${category.title}**\n${category.description}`).join('\n\n');
    return interaction.reply({ embeds: [{ color: 0, title: 'HYPNOX STUDIOS — AYUDA', description, footer: { text: 'Los subcomandos de /help requieren el rol correspondiente.' }, timestamp: new Date().toISOString() }], ephemeral: true });
  }

  if (!canViewHelpCategory(interaction.member, subcommand)) {
    return interaction.reply({ content: 'No tienes el ID de rol necesario para consultar esta categoría.', ephemeral: true });
  }

  const commands = COMMANDS[subcommand] || [];
  const extra = subcommand === 'tickets' && guildType !== 'official' ? '\n\nEste sistema solo está habilitado en el servidor oficial.' : '';
  return interaction.reply({ embeds: [{ color: 0, title: `HYPNOX STUDIOS — ${CATEGORIES[subcommand].title}`, description: `${CATEGORIES[subcommand].description}\n\n${commands.map((command) => `\`${command}\``).join('\n')}${extra}`, timestamp: new Date().toISOString() }], ephemeral: true });
}

module.exports = { data, execute };
