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
- `DISCORD_TOKEN` y las claves secretas de Supabase nunca deben publicarse.
- No existe una aplicación web dependiente del bot.

## Comandos

Hypnox admite **dos formas de uso**:

- **Slash commands:** `/comando` y `/comando subcomando`.
- **Comandos de prefijo:** `!comando` y `!comando-subcomando`.

El prefijo predeterminado es `!` y puede configurarse por servidor mediante `/prefijo`. Para los comandos con subcomandos se recomienda utilizar siempre la forma con guiones en el sistema de prefijo.

### Ejemplos

```text
/help
/help premios
!help
!help-premios
```

Para un comando con subcomando:

```text
Slash:   /tickets panel
Prefijo: !tickets-panel

Slash:   /premio crear
Prefijo: !premio-crear

Slash:   /evento crear
Prefijo: !evento-crear

Slash:   /moderacion warn
Prefijo: !moderacion-warn
```

El parser de prefijo distingue el comando base y el subcomando incluso cuando el nombre del comando principal ya contiene guiones. Por ejemplo, `!evento-participar-unirse` se interpreta como el comando `evento-participar` con el subcomando `unirse`.

### Información

```text
/help inicio             → !help-inicio
/info                    → !info
/reglas                  → !reglas
/roles                   → !roles
/links                   → !links
```

### Comunidad

```text
/user                    → !user
/serverinfo              → !serverinfo
/credits                 → !credits
```

### Moderación

```text
/moderacion warn         → !moderacion-warn
/moderacion warnings     → !moderacion-warnings
/moderacion unwarn       → !moderacion-unwarn
/moderacion timeout      → !moderacion-timeout
/moderacion clear        → !moderacion-clear
/moderacion slowmode     → !moderacion-slowmode
/moderacion kick         → !moderacion-kick
/moderacion ban          → !moderacion-ban
```

### Tickets

```text
/tickets panel           → !tickets-panel
/tickets cerrar          → !tickets-cerrar
/tickets claim           → !tickets-claim
/tickets valorar         → !tickets-valorar
/tickets historial       → !tickets-historial
/tickets add             → !tickets-add
/tickets remove          → !tickets-remove
```

El panel de tickets incluye Soporte, Reporte, Alianza / Partner, Contacto, Bugs / Errores y Reclamar Beneficios Boost cuando el rol Boost está configurado.

La valoración de tickets se registra en `ticket_ratings` y `/tickets historial` permite consultar el desempeño histórico del Staff según tickets reclamados, resueltos y valoraciones recibidas.

### Anuncios

```text
/anuncio                       → !anuncio
/anuncio-programado crear     → !anuncio-programado-crear
/anuncio-programado lista     → !anuncio-programado-lista
/anuncio-programado cancelar  → !anuncio-programado-cancelar
```

### Eventos

```text
/evento crear                 → !evento-crear
/evento editar                → !evento-editar
/evento cancelar              → !evento-cancelar
/evento iniciar               → !evento-iniciar
/evento finalizar             → !evento-finalizar
/evento-participar unirse     → !evento-participar-unirse
/evento-participar salir      → !evento-participar-salir
/evento-participantes         → !evento-participantes
/comienza                     → !comienza
```

### Premios

```text
/premio crear                 → !premio-crear
/premio finalizar             → !premio-finalizar
/premio reroll                → !premio-reroll
/premio entregar              → !premio-entregar
```

### Postulaciones

```text
/abierto                      → !abierto
/cerrado                      → !cerrado
/aceptado @usuario            → !aceptado @usuario
/requisitos                   → !requisitos
/informacion                  → !informacion
/postular                     → !postular
/resultado <resultado>        → !resultado <resultado>
/estado-postulacion           → !estado-postulacion
/proceso-seleccion            → !proceso-seleccion
/faq-postulaciones            → !faq-postulaciones
/reglamento-interno           → !reglamento-interno
```

### Proyectos

```text
/proyecto crear               → !proyecto-crear
/proyecto editar              → !proyecto-editar
/proyecto estado              → !proyecto-estado
/proyecto cerrar              → !proyecto-cerrar
/proyecto asignar             → !proyecto-asignar
```

### Administración

```text
/administracion config         → !administracion-config
/administracion set-channel    → !administracion-set-channel
/administracion set-role       → !administracion-set-role
/administracion set-permission → !administracion-set-permission
/administracion maintenance    → !administracion-maintenance
/administracion reload        → !administracion-reload
/auditoria usuario             → !auditoria-usuario
/status                        → !status
/reportes lista                → !reportes-lista
/reportes ver                  → !reportes-ver
/reportes resolver             → !reportes-resolver
/reportes rechazar             → !reportes-rechazar
/encuesta crear                → !encuesta-crear
/encuesta cerrar               → !encuesta-cerrar
/prefijo establecer            → !prefijo-establecer
/prefijo ver                   → !prefijo-ver
/prefijo restablecer           → !prefijo-restablecer
/say <mensaje>                 → !say <mensaje>
```

Los comandos disponibles dependen del servidor y de los permisos o roles configurados. `/help` y `!help` muestran el centro de ayuda correspondiente.

## Respuestas de interacciones

Discord exige que una interacción sea reconocida dentro de su ventana inicial. Por ello, los comandos que realizan operaciones de Supabase, consultas de canales/roles, creación de tickets, publicaciones o tareas potencialmente lentas deben reconocer primero la interacción mediante `deferReply` y continuar con `editReply`.

El flujo de eventos también dispone de un manejador central de errores que responde o utiliza `followUp` cuando la interacción ya fue reconocida. Esto evita que un error interno termine silenciosamente en una interacción sin respuesta.

Se corrigieron especialmente los comandos de publicación de postulaciones y contenido que realizaban consultas a Discord antes de responder, incluyendo:

- `/abierto`
- `/cerrado`
- `/aceptado`
- `/resultado`
- `/faq`
- `/faq-postulaciones`
- `/proceso-seleccion`
- `/prefijo`
- `/say`

Esto reduce el riesgo de mostrar **“La aplicación no respondió”** cuando Discord o Supabase tardan más de lo esperado.

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

En Staff Applications, `/requisitos`, `/informacion`, `/postular`, `/estado-postulacion`, `/resultado`, `/proceso-seleccion` y `/faq-postulaciones` documentan y gestionan el flujo correspondiente.

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
| Reclamar Beneficios Boost | Todos los Staff pueden atender; solo usuarios con `OFFICIAL_ROLE_BOOST_ID` pueden abrirlo |

Los permisos se resuelven mediante IDs de roles configurados en las variables de entorno.

Al reclamar un ticket, el resto de los roles de atención pierde el acceso al canal y se conserva el acceso del creador y del miembro que lo reclamó. Los usuarios con permiso de Administrador de Discord pueden seguir accediendo porque Discord permite que `Administrator` omita los overwrites de canales.

La categoría **Bugs / Errores** registra específicamente los fallos técnicos y está disponible para Developer y Producer, además de Dirección y Administración.

### Asistencia Oral

Cada ticket dispone de un botón **Asistencia Oral** para el Staff autorizado. Al utilizarlo se crea un canal de voz `asistencia-oral` dentro de la categoría del ticket, con acceso para el creador y el Staff correspondiente. No se crean canales duplicados y el canal se elimina al cerrar el ticket.

### Valoración y desempeño

Cuando un Staff asignado utiliza `/tickets valorar`, el sistema crea una solicitud de valoración para el autor del ticket. El autor puede puntuar la atención de 1 a 5 y dejar un justificativo de 5 a 2000 caracteres.

`/tickets historial` muestra tickets reclamados, tickets resueltos, cantidad de valoraciones, promedio, distribución de puntuaciones, valoraciones recientes y un puntaje de desempeño de referencia sobre 100.

El puntaje es un indicador de evaluación y no realiza ascensos automáticos.

### Formularios

- **Soporte:** asunto, problema, detalles y evidencia opcional.
- **Reporte:** usuario reportado, motivo, descripción y evidencia opcional.
- **Alianza / Partner:** tipo, servidor/comunidad, propuesta, miembros y contacto.
- **Contacto:** asunto, motivo, detalles y evidencia opcional.
- **Bugs / Errores:** asunto, descripción, pasos para reproducir y evidencia opcional.
- **Boost:** asunto, cantidad de Boosts, detalles y evidencia opcional.

Los valores de interfaz se normalizan antes de guardarse en Supabase. La base de datos acepta actualmente `support`, `report`, `alliance_partner`, `contact`, `bugs` y `boost`.

## Eventos y participación

El sistema de eventos permite crear, editar, cancelar, iniciar y finalizar actividades mediante `/evento`.

La participación de miembros se registra por evento en Supabase:

- `/evento-participar unirse <id>` registra al miembro en un evento programado o activo.
- `/evento-participar salir <id>` retira su participación.
- `/evento-participantes <id>` permite al equipo consultar la lista registrada.
- La base de datos evita registros duplicados por evento y usuario.
- `/comienza tipo:Evento` continúa utilizando el rol configurado de participantes para los avisos generales de inicio.

Las participaciones utilizan el ID de Discord como referencia operativa y los datos internos permanecen protegidos mediante RLS y acceso de servidor.

## Monitorización y administración

- `/status` muestra el estado interno de Discord, Gateway, Supabase, guilds reconocidas, uptime y versión de Node. Está limitado a Administradores.
- `/auditoria usuario` consulta el historial interno registrado de un miembro para Staff autorizado.
- `/reportes` gestiona reportes internos de usuarios.
- `/encuesta` permite crear y cerrar encuestas con interacción mediante botones.
- `/anuncio-programado` permite programar comunicaciones futuras; un worker interno revisa y publica las pendientes.
- `/prefijo` consulta y modifica el prefijo por servidor.

## Módulos

- **Información:** help, reglas, links e información general.
- **Moderación:** warn, warnings, unwarn, timeout, clear, slowmode, kick y ban.
- **Tickets:** panel, formularios, creación, claim, cierre, valoración, historial, adición, retirada y asistencia oral.
- **Anuncios:** publicaciones oficiales con embed e imagen configurable.
- **Anuncios programados:** programación y publicación automática de comunicaciones.
- **Eventos:** creación, edición, ciclo de vida y participación de miembros.
- **Series:** gestión y participación de actividades configuradas.
- **Premios:** sorteos, participación, finalización, reroll y registro de entrega.
- **Proyectos:** creación, edición, estado, cierre y asignación de manager.
- **Postulaciones:** apertura, cierre, resultados, requisitos, FAQ y documentación del proceso.
- **Autoroles:** asignación automática de Trainee en Staff Team y Applicant en Staff Applications.
- **Administración:** configuración, canales, roles, permisos, mantenimiento, auditoría y recarga.
- **Logs:** un canal de logs por servidor y persistencia en Supabase.

## Ayuda

`/help inicio` o `!help-inicio` muestran las categorías disponibles. Para consultar una categoría:

```text
/help premios
!help-premios
```

La disponibilidad de las funciones se filtra mediante los IDs de roles configurados para cada servidor.

## Registro de comandos Slash

Los comandos `/` se registran mediante **Discord REST API v10** usando `discord.js`. El registro utiliza las rutas de comandos por guild de Discord y no depende del Gateway.

El proyecto dispone de:

```text
npm run deploy
npm run verify:discord
```

El workflow de GitHub Actions instala las dependencias, valida las definiciones, comprueba Supabase, registra los comandos y finalmente verifica que las guilds tengan los comandos esperados.

## Configuración

1. Copia `.env.example` a `.env`.
2. Completa las credenciales, IDs de servidores, roles y canales necesarios.
3. Para los autoroles, configura `STAFF_ROLE_TRAINEE_ID` y `APPLICATIONS_ROLE_APPLICANT_ID`.
4. Configura los enlaces de `/links` mediante las variables `OFFICIAL_*_URL` y el correo mediante `OFFICIAL_CONTACT_EMAIL`.
5. Ejecuta `npm install`.
6. Registra los comandos con `npm run deploy` cuando corresponda.
7. Inicia el bot con `npm start`.

En Wispbyte, las variables de entorno se mantienen en la configuración del servicio y **no deben reemplazarse por un `.env` del repositorio**. Después de actualizar el código, reinicia el servicio para aplicar la nueva versión usando las variables que ya están configuradas allí.

## Variables principales

La configuración operativa se mantiene fuera del código.

### Official Discord

Incluye IDs para Dirección, Administración, moderación, **Developer**, **Producer**, **Boost**, canales de tickets, anuncios, postulaciones, información, FAQ y reglamento.

Para Bugs / Errores son necesarias las siguientes variables si se quiere habilitar ese acceso:

```env
OFFICIAL_ROLE_DEVELOPER_ID=
OFFICIAL_ROLE_PRODUCER_ID=
```

Para Reclamar Beneficios Boost:

```env
OFFICIAL_ROLE_BOOST_ID=
```

`OFFICIAL_TICKET_STAFF_MENTION_ROLE_ID` es opcional y se utiliza únicamente para mencionar el rol configurado al crear un ticket.

Para `/comienza` también se configuran:

```env
OFFICIAL_ROLE_SERIES_PARTICIPANT_ID=
OFFICIAL_ROLE_EVENT_PARTICIPANT_ID=
OFFICIAL_CHANNEL_SERIES_ID=
OFFICIAL_CHANNEL_EVENTS_ID=
```

### Enlaces oficiales y contacto

```env
OFFICIAL_DISCORD_URL=
WEBSITE_URL=
YOUTUBE_URL=
TIKTOK_URL=
INSTAGRAM_URL=
OFFICIAL_PAYPAL_URL=
OFFICIAL_KOFI_URL=
OFFICIAL_CONTACT_EMAIL=
```

Todos son opcionales. `/links` solo muestra los que estén configurados.

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

Las migraciones del proyecto se encuentran en `database/migrations/`. La base de datos de producción usa Supabase y actualmente contiene las migraciones siguientes:

```text
20260902001129 initial_hypnox_bot_schema
20260902003906 003_remove_old_application_flow
20260902035150 harden_logs_and_rls_auto_enable
20260902134043 add_bugs_ticket_type
20260902172603 dashboard_access
20260903031735 remove_dashboard_access
20260903115841 add_missing_foreign_key_indexes
20260903120100 protect_ticket_assignment_race
20260903120927 harden_ticket_assignment_function_search_path
20260903141941 enforce_one_open_ticket_per_user
20260903235113 revoke_public_trigger_function_execute
20260904010334 reports_polls_scheduled_announcements
20260904010829 add_event_participants
20260904021511 add_series_participants
20260904145643 fix_scheduled_announcements_processing
20260905200453 add_guild_prefix
20260905201837 add_guild_server_ip
20260905211754 add_ticket_oral_voice_channel
20260905215640 add_boost_ticket_type
20260906041542 add_oral_assistance_event_type
20260906051951 add_ticket_staff_ratings_history
20260906052040 allow_pending_ticket_ratings
20260906072503 fix_ticket_rating_pending_timestamp
```

Algunas migraciones históricas de producción tienen un número de versión distinto al nombre del archivo equivalente que permanece en el repositorio. Esto es un histórico de migraciones aplicado durante el desarrollo, no una diferencia funcional del esquema. No se deben ejecutar nuevamente migraciones históricas de producción de forma ciega.

`npm run verify:supabase` comprueba las cuatro guilds configuradas, que estén habilitadas, sus prefijos, `tickets`, `ticket_events` y `ticket_ratings`.

La integridad actual del sistema de tickets se mantiene mediante claves foráneas, restricción de un ticket abierto por usuario y protección contra carreras en asignación.

El bot utiliza claves secretas de Supabase exclusivamente desde el backend. Nunca deben exponerse en el cliente ni publicarse en GitHub.

## Dependencias

Las versiones principales están fijadas en `package.json`:

- Node.js `>=22`
- discord.js `14.27.0`
- @supabase/supabase-js `2.112.4`
- dotenv `17.4.2`

## Seguridad

- Nunca subas `.env` a GitHub.
- Nunca publiques `DISCORD_TOKEN`.
- Nunca publiques las claves secretas de Supabase.
- Mantén RLS habilitado en las tablas de Supabase.
- Los permisos del bot deben configurarse mediante IDs y no mediante nombres de roles.
- El rol máximo del bot debe estar por encima de los roles de autorole que necesita asignar.
- Antes de aplicar una migración sobre producción, verifica el estado actual de la base de datos.

Los avisos actuales del asesor de Supabase son de nivel informativo: RLS está habilitado sin políticas públicas en las tablas protegidas y existen índices marcados como no utilizados. No se agregaron políticas públicas porque el bot trabaja con acceso de servidor y una política permisiva expondría datos internos.

## Repositorio

**Hypnox Studios — Hypnox Bot**

Repositorio principal y único del código del bot y su infraestructura de configuración.
