# Hypnox Bot

Bot central de Hypnox Studios para tres servidores de Discord, desarrollado con Node.js, JavaScript, discord.js y Supabase.

## Servidores
- Official Discord: comunidad, contenido, series, eventos, premios y soporte.
- Staff Team Discord: moderación, proyectos y coordinación interna.
- Staff Applications Discord: postulaciones, revisión y entrevistas.

## Módulos
- Información: help, reglas, roles, links, info, user, serverinfo y credits.
- Moderación: warn, warnings, unwarn, timeout, clear, slowmode, kick y ban.
- Tickets: panel único con Soporte, Reporte, Alianza / Partner y Contacto; cierre, claim, add y remove.
- Anuncios: publicación oficial con embed negro e imagen configurable.
- Eventos: crear, editar, cancelar, iniciar y finalizar.
- Premios: sorteos, participación por botón, finalización, reroll y registro de entrega.
- Postulaciones: Fase 1 mediante formulario, Fase 2 mediante entrevista oral y cooldown de 24 horas tras rechazo.
- Proyectos: creación, edición, estado, cierre y asignación de manager.
- Administración: configuración, canales, roles, permisos, mantenimiento y recarga.
- Logs: un canal de logs por servidor y persistencia en Supabase.

## Configuración
1. Copia `.env.example` a `.env`.
2. Completa credenciales e IDs.
3. Ejecuta `npm install`.
4. Registra comandos con `npm run deploy`.
5. Inicia con `npm start`.

Nunca subas `.env` a GitHub.

## Base de datos
Las migraciones están en `database/migrations/`. `001_initial_schema.sql` contiene la base principal y `002_projects.sql` agrega proyectos y tareas.

## Requisitos
- Node.js 20 o superior.
- Aplicación de Discord con token y Client ID.
- Permisos adecuados en los tres servidores.
- Proyecto Supabase.
