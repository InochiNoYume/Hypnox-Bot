const { SlashCommandBuilder } = require('discord.js');
const { brandedEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reglas')
    .setDescription('Muestra y publica el reglamento oficial del servidor.'),

  async execute(interaction) {
    const rules = [
      ['01', 'Respeto entre miembros', 'Mantén un trato respetuoso. No se toleran insultos, acoso, amenazas, discriminación, hostigamiento ni discursos de odio.'],
      ['02', 'Convivencia', 'Evita provocaciones, conflictos innecesarios y comportamientos que perjudiquen la convivencia de la comunidad.'],
      ['03', 'Spam y flood', 'No envíes mensajes repetidos, cadenas, caracteres excesivos, menciones masivas ni contenido diseñado para saturar los canales.'],
      ['04', 'Uso de canales', 'Utiliza cada canal para el propósito indicado y respeta las instrucciones establecidas en su descripción.'],
      ['05', 'Publicidad', 'No promociones servidores, redes, proyectos, productos o servicios sin autorización previa del Staff.'],
      ['06', 'Contenido inapropiado', 'Está prohibido compartir NSFW, gore, contenido sexual, material excesivamente gráfico o cualquier contenido no apto para la comunidad.'],
      ['07', 'Información personal', 'No publiques información personal propia o de terceros. Esto incluye nombres completos, direcciones, números, contraseñas, documentos o datos privados.'],
      ['08', 'Suplantación', 'No suplantes a otros miembros, Staff, creadores, organizaciones o cuentas oficiales de Hypnox Studios.'],
      ['09', 'Fraudes y enlaces maliciosos', 'No compartas estafas, phishing, archivos maliciosos, enlaces sospechosos ni contenido destinado a perjudicar a otros usuarios.'],
      ['10', 'Exploits y abuso', 'No aproveches errores, vulnerabilidades, exploits o fallos del servidor para obtener ventajas o perjudicar a la comunidad.'],
      ['11', 'Bots y automatización', 'No utilices bots, scripts, automatizaciones o herramientas para generar spam, abusar de funciones o alterar el funcionamiento del servidor.'],
      ['12', 'Contenido y propiedad', 'No publiques material que infrinja derechos de autor, ni atribuyas como propio el trabajo de otra persona.'],
      ['13', 'Interacciones con el Staff', 'Respeta las indicaciones del equipo. Si consideras que una decisión debe revisarse, utiliza los medios de contacto establecidos en lugar de generar conflictos públicos.'],
      ['14', 'Tickets y soporte', 'Utiliza el sistema de tickets de forma responsable. No abras múltiples tickets por el mismo asunto ni utilices categorías incorrectas deliberadamente.'],
      ['15', 'Participación en actividades', 'Respeta las condiciones específicas de cada evento, dinámica, serie o actividad. El incumplimiento puede implicar la pérdida de participación o premios.'],
      ['16', 'Cuentas alternativas', 'No utilices cuentas alternativas para evadir sanciones, restricciones o medidas aplicadas por el Staff.'],
      ['17', 'Evasión de sanciones', 'Está prohibido intentar evadir una sanción mediante otra cuenta, cambios de identidad o cualquier otro método.'],
      ['18', 'Decisiones de moderación', 'Las decisiones del Staff deben respetarse mientras se revisa cualquier apelación por los canales correspondientes.'],
      ['19', 'Normas de Discord', 'Todo miembro debe cumplir también los Términos de Servicio y las Normas de la Comunidad de Discord.'],
      ['20', 'Sentido común', 'El Staff puede intervenir ante conductas perjudiciales aunque no estén descritas literalmente en una regla, siempre aplicando criterios razonables y proporcionales.']
    ];

    const embed = brandedEmbed('REGLAMENTO OFICIAL', 'Normas de convivencia de Hypnox Studios. El objetivo de este reglamento es mantener una comunidad segura, organizada y agradable para todos.', {
      footerText: 'Hypnox Studios • Reglamento oficial'
    });

    embed.addFields(...rules.map(([number, title, description]) => ({
      name: `『${number}』 ${title}`,
      value: `↳ ${description}`,
      inline: false
    })));

    embed.addFields(
      {
        name: '◆ MEDIDAS',
        value: 'Las infracciones pueden resultar en advertencias, restricciones, timeout, expulsión o baneo, dependiendo de su gravedad, reincidencia y contexto. El Staff podrá aplicar medidas inmediatas cuando exista un riesgo para la comunidad.'
      },
      {
        name: '◆ ACEPTACIÓN',
        value: 'Al participar en este servidor confirmas que has leído y aceptado el reglamento de Hypnox Studios. El desconocimiento de las normas no exime de su cumplimiento.'
      }
    );

    return interaction.reply({ embeds: [embed] });
  },

  guilds: ['official'],
  access: { roleEnvs: ['OFFICIAL_ROLE_MEMBER_ID'] }
};
