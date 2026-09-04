# Hypnox Bot

Bot central de **Hypnox Studios** para los servidores de Discord, desarrollado con Node.js, JavaScript, discord.js y Supabase.

## Servidores

- **Official Discord:** comunidad pública, contenido, series, eventos, premios, soporte, alianzas y postulaciones.
- **Staff Team Discord:** moderación, proyectos, departamentos y coordinación interna. No utiliza tickets.
- **Staff Applications Discord:** espacio destinado al proceso de postulación. No utiliza formularios, entrevistas ni tickets.
- **Development Discord:** servidor técnico para pruebas y desarrollo. Recibe el conjunto de comandos de los demás servidores para validar cambios.

## Arquitectura

El bot utiliza una única aplicación de Discord y una única base de datos de Supabase para centralizar la información de los servidores.

- Los servidores, roles y canales se identifican mediante IDs configurados en `.env`.
- Las respuestas y embeds utilizan una identidad visual negra (`#000000`) y no dependen de nombres de roles.
- Los registros se almacenan en Supabase y cada servidor utiliza un único canal de logs configurado.
- `DISCORD_TOKEN` y `SUPABASE_SERVICE_ROLE_KEY` nunca deben publicarse.
- No existe una aplicación web dependiente del bot.

## Autoroles

El bot asigna automáticamente un rol cuando un usuario entra a los servidores correspondientes:

- **Staff Team Discord:** asigna `STAFF_ROLE_TRAINEE_ID` → **Trainee**.
- **Staff Applications Discord:** asigna `APPLICATIONS_ROLE_APPLICANT_ID` → **Applicant**.

El sistema utiliza el evento `guildMemberAdd` y requiere el intent **Guild Members** y que el bot tenga permiso para gestionar los roles. El rol que se asigna debe estar por debajo del rol máximo del bot en la jerarquía de Discord.

Los autoroles solo se asignan al momento de entrada. Cambiar una variable de entorno no aplica retroactivamente el rol a miembros que ya estaban dentro del servidor.

## Postulaciones

El flujo actual es deliberadamente simple:

1. `/abierto` abre la convocatoria y publica el enlace al Discord de postulaciones.
2. Los candidatos realizan su postulación mediante el proceso definido para la convocatoria.
3. El equipo revisa y evalúa las postulaciones.
4. `/cerrado` cierra la convocatoria.
5. `/aceptado @usuario1 ...` publica oficialmente a los usuarios aceptados.

No se utilizan formularios, entrevistas ni tickets para este proceso. La documentación del proceso se publica mediante `/faq-postulaciones` y `/proceso-seleccion` en el servidor de Applications.

## Tickets

El sistema de tickets funciona **únicamente en Official Discord** mediante un panel único, selector de categoría y formulario modal antes de crear el canal.

### Categorías y acceso

| Categoría | Acceso |
|---|---|
| Soporte | Helper en adelante |
| Reporte | T-Mod en adelante |
| Alianza / Partner | Helper en adelante |
| Contacto | Administrator, Director y Founder |
| Bugs / Errores | Developer, Producer, Administrator, Director y Founder |

Los permisos se resuelven mediante IDs de roles configurados en las variables de entorno.

Al reclamar un ticket, el resto de los roles de atención pierde el acceso al canal y se conserva el acceso del creador y del miembro que lo reclamó. Los usuarios con permiso de Administrador de Discord pueden seguir accediendo porque Discord permite que `Administrator` omita los overwrites de canales.

La categoría **Bugs / Errores** registra específicamente los fallos técnicos y está disponible para Developer y Producer, además de Dirección y Administración.

### Formularios

- **Soporte:** asunto, problema, detalles y evidencia opcional.
- **Reporte:** usuario reportado, motivo, descripción y evidencia opcional.
- **Alianza / Partner:** tipo, servidor/comunidad, propuesta, miembros y contacto.
- **Contacto:** asunto, motivo, detalles y evidencia opcional.
- **Bugs / Errores:** asunto, descripción, pasos para reproducir y evidencia opcional.

Los valores de interfaz se normalizan antes de guardarse en Supabase. La base de datos acepta actualmente `support`, `report`, `alliance_partner`, `contact` y `bugs`.

## Eventos y participación

El sistema de eventos permite crear, editar, cancelar, iniciar y finalizar actividades mediante `/evento`.

La participación de miembros se registra por evento en Supabase:

- `/evento-participar unirse <id>` registra al miembro en un evento programado o activo.
- `/evento-participar salir <id>` retira su participación.
- `/evento-participantes <id>` permite al equipo consultar la lista registrada.
- La base de datos evita registros duplicados por evento y usuario.
- `/comienza tipo:Evento` continúa utilizando el rol configurado de participantes para los avisos generales de inicio.

Las participaciones utilizan el ID de Discord como referencia operativa y los datos internos permanecen protegidos mediante RLS y acceso `service_role`.

## Monitorización y administración

- `/status` muestra el estado interno de Discord, Gateway, Supabase, guilds reconocidas, uptime y versión de Node. Está limitado a Administradores.
- `/auditoria usuario` consulta el historial interno registrado de un miembro para Staff autorizado.
- `/reportes` gestiona reportes internos de usuarios.
- `/encuesta` permite crear y cerrar encuestas con interacción mediante botones.
- `/anuncio-programado` permite programar comunicaciones futuras; un worker interno revisa y publica las pendientes.

## Módulos

- **Información:** help, reglas, links e información general.
- **Moderación:** warn, warnings, unwarn, timeout, clear, slowmode, kick y ban.
- **Tickets:** panel, formularios, creación, claim, cierre, adición y retirada de usuarios.
- **Anuncios:** publicaciones oficiales con embed negro e imagen configurable.
- **Anuncios programados:** programación y publicación automática de comunicaciones.
- **Eventos:** creación, edición, ciclo de vida y participación de miembros.
- **Series:** comunicación y comienzo mediante el sistema de actividades configurado.
- **Premios:** sorteos, participación, finalización, reroll y registro de entrega.
- **Proyectos:** creación, edición, estado, cierre y asignación de manager.
- **Postulaciones:** apertura, cierre, resultados, requisitos, FAQ y documentación del proceso.
- **Autoroles:** asignación automática de Trainee en Staff Team y Applicant en Staff Applications.
- **Administración:** configuración, canales, roles, permisos, mantenimiento y recarga.
- **Logs:** un canal de logs por servidor y persistencia en Supabase.

## Ayuda

`/help inicio` muestra las categorías disponibles. La disponibilidad de las funciones se filtra mediante los IDs de roles configurados para cada servidor.

## Configuración

1. Copia `.env.example` a `.env`.
2. Completa las credenciales, IDs de servidores, roles y canales necesarios.
3. Para los autoroles, configura `STAFF_ROLE_TRAINEE_ID` y `APPLICATIONS_ROLE_APPLICANT_ID`.
4. Ejecuta `npm install`.
5. Registra los comandos con `npm run deploy` cuando corresponda.
6. Inicia el bot con `npm start`.

En Wispbyte, las variables de entorno se mantienen en la configuración del servicio y **no deben reemplazarse por un `.env` del repositorio**. Después de actualizar el código, reinicia el servicio para aplicar la nueva versión usando las variables que ya están configuradas allí.

## Variables principales

La configuración operativa se mantiene fuera del código.

### Official Discord

Incluye IDs para Dirección, Administración, moderación, **Developer**, **Producer**, canales de tickets, anuncios, postulaciones, información, FAQ y reglamento.

Para Bugs / Errores son necesarias las siguientes variables si se quiere habilitar ese acceso:

```env
OFFICIAL_ROLE_DEVELOPER_ID=
OFFICIAL_ROLE_PRODUCER_ID=
```

`OFFICIAL_TICKET_STAFF_MENTION_ROLE_ID` es opcional y se utiliza únicamente para mencionar el rol configurado al crear un ticket.

Para `/comienza` también se configuran:

```env
OFFICIAL_ROLE_SERIES_PARTICIPANT_ID=
OFFICIAL_ROLE_EVENT_PARTICIPANT_ID=
OFFICIAL_CHANNEL_SERIES_ID=
OFFICIAL_CHANNEL_EVENTS_ID=
```

### Staff Team Discord

El autorole de incorporación utiliza:

```env
STAFF_ROLE_TRAINEE_ID=
```

### Staff Applications Discord

El autorole de incorporación utiliza:

```env
APPLICATIONS_ROLE_APPLICANT_ID=
```

### Otros servidores

Staff Team y Staff Applications mantienen sus propios IDs de roles y canales porque los roles de Discord son específicos de cada servidor. Un ID de rol de Staff Team no puede utilizarse como reemplazo del ID equivalente en otro servidor.

## Base de datos y migraciones

Las migraciones se encuentran en `database/migrations/`.

- `20260901000000_initial_hypnox_bot_schema.sql`: esquema inicial.
- `002_projects.sql`: tablas de proyectos y tareas.
- `003_remove_old_application_flow.sql`: elimina el flujo antiguo de postulaciones y entrevistas.
- `004_add_dev_guild_type.sql`: habilita el tipo de servidor de desarrollo/pruebas.
- `20260902040000_harden_logs_and_rls_auto_enable.sql`: corrige categorías de logs, refuerza RLS en proyectos y tareas y restringe la ejecución pública de `rls_auto_enable()`.
- `20260902050000_add_bugs_ticket_type.sql`: añade `bugs` como tipo válido de ticket.
- `20260903031735_remove_dashboard_access.sql`: limpia restos de una capa de autorización web que ya no forma parte del proyecto.
- `20260903115841_add_missing_foreign_key_indexes.sql`: añade índices para claves foráneas relevantes.
- `20260903120100_protect_ticket_assignment_race.sql`: protege la asignación concurrente de tickets.
- `20260903120927_harden_ticket_assignment_function_search_path.sql`: endurece la función de asignación de tickets.
- `20260903141941_enforce_one_open_ticket_per_user.sql`: limita a un ticket abierto por usuario.
- `20260903235113_revoke_public_trigger_function_execute.sql`: revoca ejecución pública de la función interna correspondiente.
- `20260904010334_reports_polls_scheduled_announcements.sql`: añade reportes, encuestas y anuncios programados.
- `20260904010829_add_event_participants.sql`: añade el registro de participantes por evento.

Las migraciones históricas ya aplicadas no deben ejecutarse nuevamente de forma ciega sobre una base existente. Primero debe comprobarse el estado real de la base de datos.

El bot utiliza `SUPABASE_SERVICE_ROLE_KEY` exclusivamente desde el backend. Esta credencial nunca debe exponerse en el cliente ni publicarse en GitHub.

## Dependencias

Las versiones principales están fijadas en `package.json`:

- Node.js `>=22`
- discord.js `14.27.0`
- @supabase/supabase-js `2.112.4`
- dotenv `17.4.2`

## Seguridad

- Nunca subas `.env` a GitHub.
- Nunca publiques `DISCORD_TOKEN`.
- Nunca publiques `SUPABASE_SERVICE_ROLE_KEY`.
- Mantén RLS habilitado en las tablas expuestas de Supabase.
- Los permisos del bot deben configurarse mediante IDs y no mediante nombres de roles.
- El rol máximo del bot debe estar por encima de los roles de autorole que necesita asignar.
- Antes de aplicar una migración sobre producción, verifica el estado actual de la base de datos.

## Repositorio

**Hypnox Studios — Hypnox Bot**

Repositorio principal y único del código del bot y su infraestructura de configuración.
