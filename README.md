# Hypnox Bot

Bot central de Hypnox Studios para tres servidores de Discord, desarrollado con Node.js, JavaScript, discord.js y Supabase.

## Servidores
- Official Discord: comunidad, contenido, series, eventos, premios, soporte y postulaciones publicadas.
- Staff Team Discord: moderación, proyectos y coordinación interna. No utiliza tickets.
- Staff Applications Discord: espacio destinado al proceso de postulación. No utiliza tickets ni canal de entrevistas; el bot solo centraliza la referencia al servidor desde el Discord oficial.

## Postulaciones
El flujo actual es simple:
- `/abierto`: abre la postulación y publica el enlace del Discord de postulaciones en el canal oficial configurado.
- `/cerrado`: cierra la postulación y publica el aviso en el canal oficial.
- `/aceptado @usuario1 ...`: publica los usuarios aceptados en el canal oficial de postulaciones.

No se utilizan formularios, entrevistas, tickets ni el sistema antiguo de fases dentro del bot.

## Módulos
- Información: help, reglas, roles, links e información general.
- Comunidad: `/user`, `/serverinfo` y `/credits`, restringidos al ID del rol de miembro del servidor oficial.
- Moderación: warn, warnings, unwarn, timeout, clear, slowmode, kick y ban.
- Tickets: panel único en el servidor oficial con Soporte, Reporte, Alianza / Partner y Contacto.
- Anuncios: publicación oficial con embed negro e imagen configurable.
- Eventos: crear, editar, cancelar, iniciar y finalizar.
- Premios: sorteos, participación por botón, finalización, reroll y registro de entrega.
- Proyectos: creación, edición, estado, cierre y asignación de manager.
- Administración: configuración, canales, roles, permisos, mantenimiento y recarga.
- Logs: un canal de logs por servidor y persistencia en Supabase.

## Ayuda
`/help inicio` muestra un embed con las categorías y la función de cada una. Los subcomandos de `/help` están restringidos mediante IDs de roles, por lo que cada usuario solo puede consultar las categorías que le corresponden.

## Configuración
1. Copia `.env.example` a `.env`.
2. Completa credenciales e IDs.
3. Ejecuta `npm install`.
4. Registra comandos con `npm run deploy`.
5. Inicia con `npm start`.

Nunca subas `.env` a GitHub.

## Base de datos
Las migraciones están en `database/migrations/`:
- `001_initial_schema.sql`: base principal.
- `002_projects.sql`: proyectos y tareas.
- `003_remove_old_application_flow.sql`: elimina el sistema antiguo de postulaciones e entrevistas.

## Requisitos
- Node.js 22 o superior.
- Aplicación de Discord con token y Client ID.
- Permisos adecuados en los tres servidores.
- Proyecto Supabase.
