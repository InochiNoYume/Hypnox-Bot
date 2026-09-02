# Hypnox Bot

Bot central de Hypnox Studios para tres servidores de Discord, desarrollado con Node.js, JavaScript, discord.js y Supabase.

## Servidores
- **Official Discord:** comunidad, contenido, series, eventos, premios, soporte y postulaciones publicadas.
- **Staff Team Discord:** moderación, proyectos y coordinación interna. No utiliza tickets.
- **Staff Applications Discord:** espacio destinado al proceso de postulación. No utiliza tickets ni canal de entrevistas; el bot centraliza la información y la referencia al servidor desde el Discord oficial.

## Postulaciones
El flujo actual es simple:
- `/abierto`: abre la convocatoria y publica el enlace del Discord de postulaciones en el canal oficial configurado.
- `/cerrado`: cierra la convocatoria y publica el aviso en el canal oficial.
- `/aceptado @usuario1 ...`: publica los usuarios aceptados en el canal oficial de postulaciones.

No se utilizan formularios, entrevistas, tickets ni el sistema antiguo de fases dentro del bot.

## Tickets
El sistema de tickets funciona únicamente en el **Official Discord** mediante un panel único y un formulario previo a la creación del canal.

- **Soporte:** Helper en adelante.
- **Reporte:** T-Mod en adelante.
- **Alianza / Partner:** Helper en adelante.
- **Contacto:** Administrator, Director y Founder.

Los permisos se resuelven mediante IDs de roles configurados en las variables de entorno. Al reclamar un ticket, se oculta al resto del Staff y se conserva el acceso del creador y del miembro que lo reclamó. Los usuarios con permiso de Administrador de Discord pueden seguir accediendo por las reglas de permisos de Discord.

El formulario utiliza categorías internas en español para la interfaz y las normaliza a los valores aceptados por la base de datos (`support`, `report`, `alliance_partner`, `contact`). Esto evita que la creación del canal dependa directamente de los valores del esquema SQL.

## Módulos
- **Información:** help, reglas, roles, links e información general.
- **Comunidad:** `/user`, `/serverinfo` y `/credits`, restringidos al ID del rol de miembro del Official Discord.
- **Moderación:** warn, warnings, unwarn, timeout, clear, slowmode, kick y ban.
- **Tickets:** panel, formularios, creación, claim, cierre, adición y retirada de usuarios.
- **Anuncios:** publicación oficial con embed negro e imagen configurable.
- **Eventos:** crear, editar, cancelar, iniciar y finalizar.
- **Premios:** sorteos, participación por botón, finalización, reroll y registro de entrega.
- **Proyectos:** creación, edición, estado, cierre y asignación de manager.
- **Administración:** configuración, canales, roles, permisos, mantenimiento y recarga.
- **Logs:** un canal de logs por servidor y persistencia en Supabase.

## Ayuda
`/help inicio` muestra las categorías disponibles y su función. La disponibilidad de las categorías se filtra mediante los IDs de roles configurados para cada servidor.

## Configuración
1. Copia `.env.example` a `.env`.
2. Completa las credenciales e IDs necesarios.
3. Ejecuta `npm install`.
4. Registra los comandos con `npm run deploy`.
5. Inicia el bot con `npm start`.

Nunca subas `.env` a GitHub ni publiques `DISCORD_TOKEN` o `SUPABASE_SERVICE_ROLE_KEY`.

## Variables principales
Las credenciales y la configuración operativa se cargan desde variables de entorno. Los IDs de servidores, roles, canales e imágenes también se mantienen fuera del código para evitar depender de nombres de Discord.

La configuración de tickets incluye `OFFICIAL_TICKET_STAFF_MENTION_ROLE_ID`, utilizada únicamente para mencionar el rol configurado cuando se crea un ticket.

## Base de datos
Las migraciones se encuentran en `database/migrations/`.

- `20260901000000_initial_hypnox_bot_schema.sql`: esquema inicial.
- `002_projects.sql`: tablas de proyectos y tareas.
- `003_remove_old_application_flow.sql`: elimina el flujo antiguo de postulaciones y entrevistas.
- `004_add_dev_guild_type.sql`: habilita el tipo de servidor de desarrollo/pruebas.
- `20260902040000_harden_logs_and_rls_auto_enable.sql`: corrige categorías de logs utilizadas por el bot, refuerza RLS en proyectos y tareas y restringe la ejecución pública de la función `rls_auto_enable()`.

Algunas migraciones históricas ya habían sido aplicadas directamente en el proyecto de Supabase antes de quedar registradas en el historial de migraciones. Por eso no deben ejecutarse nuevamente de forma ciega en una base ya existente; primero se debe comprobar el estado de la base.

## Requisitos
- Node.js 22 o superior.
- Aplicación de Discord con token y Client ID.
- Permisos adecuados en los tres servidores.
- Proyecto Supabase con `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`.
