# Hypnox Bot

Bot central de **Hypnox Studios** para tres servidores de Discord, desarrollado con Node.js, JavaScript, discord.js y Supabase.

## Servidores

- **Official Discord:** comunidad pública, contenido, series, eventos, premios, soporte, alianzas y postulaciones.
- **Staff Team Discord:** moderación, proyectos, departamentos y coordinación interna. No utiliza tickets.
- **Staff Applications Discord:** espacio destinado al proceso de postulación. No utiliza formularios, entrevistas ni tickets.

## Arquitectura

El bot utiliza una única aplicación de Discord y una única base de datos de Supabase para centralizar la información de los tres servidores.

- Los servidores, roles y canales se identifican mediante IDs configurados en `.env`.
- Las respuestas y embeds utilizan una identidad visual negra (`#000000`) y no dependen de nombres de roles.
- Los registros se almacenan en Supabase y cada servidor utiliza un único canal de logs configurado.
- `DISCORD_TOKEN` y `SUPABASE_SERVICE_ROLE_KEY` nunca deben publicarse.

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

## Módulos

- **Información:** help, reglas, roles, links e información general.
- **Moderación:** warn, warnings, unwarn, timeout, clear, slowmode, kick y ban.
- **Tickets:** panel, formularios, creación, claim, cierre, adición y retirada de usuarios.
- **Anuncios:** publicaciones oficiales con embed negro e imagen configurable.
- **Eventos:** crear, editar, cancelar, iniciar y finalizar.
- **Premios:** sorteos, participación, finalización, reroll y registro de entrega.
- **Proyectos:** creación, edición, estado, cierre y asignación de manager.
- **Postulaciones:** apertura, cierre, resultados, requisitos, FAQ y documentación del proceso.
- **Administración:** configuración, canales, roles, permisos, mantenimiento y recarga.
- **Logs:** un canal de logs por servidor y persistencia en Supabase.

## Ayuda

`/help inicio` muestra las categorías disponibles. La disponibilidad de las funciones se filtra mediante los IDs de roles configurados para cada servidor.

## Configuración

1. Copia `.env.example` a `.env`.
2. Completa las credenciales, IDs de servidores, roles y canales necesarios.
3. Ejecuta `npm install`.
4. Registra los comandos con `npm run deploy` cuando corresponda.
5. Inicia el bot con `npm start`.

En Wispbyte, después de actualizar el repositorio, reinicia el servicio para que descargue los cambios y vuelva a cargar las variables de entorno.

## Variables principales

La configuración operativa se mantiene fuera del código.

### Official Discord

Incluye IDs para Dirección, Administración, moderación, **Developer**, **Producer**, canales de tickets, anuncios, postulaciones, información, FAQ y reglamento.

Para Bugs / Errores son obligatorias las siguientes variables si se quiere habilitar ese acceso:

```env
OFFICIAL_ROLE_DEVELOPER_ID=
OFFICIAL_ROLE_PRODUCER_ID=
```

`OFFICIAL_TICKET_STAFF_MENTION_ROLE_ID` es opcional y se utiliza únicamente para mencionar el rol configurado al crear un ticket.

### Otros servidores

Staff Team y Staff Applications mantienen sus propios IDs de roles y canales porque los roles de Discord son específicos de cada servidor. Un ID de rol de Staff Team no puede utilizarse como reemplazo del ID equivalente en Official Discord.

## Base de datos y migraciones

Las migraciones se encuentran en `database/migrations/`.

- `20260901000000_initial_hypnox_bot_schema.sql`: esquema inicial.
- `002_projects.sql`: tablas de proyectos y tareas.
- `003_remove_old_application_flow.sql`: elimina el flujo antiguo de postulaciones y entrevistas.
- `004_add_dev_guild_type.sql`: habilita el tipo de servidor de desarrollo/pruebas.
- `20260902040000_harden_logs_and_rls_auto_enable.sql`: corrige categorías de logs, refuerza RLS en proyectos y tareas y restringe la ejecución pública de `rls_auto_enable()`.
- `20260902050000_add_bugs_ticket_type.sql`: añade `bugs` como tipo válido de ticket.

Algunas migraciones históricas ya fueron aplicadas directamente en el proyecto de Supabase antes de quedar registradas en el historial local. **No deben ejecutarse nuevamente de forma ciega** sobre una base existente. Primero debe comprobarse el estado real de la base de datos.

El bot utiliza `SUPABASE_SERVICE_ROLE_KEY` desde el backend, por lo que las operaciones internas no dependen de exponer las tablas a clientes públicos.

## Dependencias

Las versiones principales están fijadas en `package.json`:

- Node.js `>=22`
- discord.js `14.27.0`
- @supabase/supabase-js `2.112.4`
- dotenv `17.4.2`

El repositorio actualmente no incluye `package-lock.json`; si se incorpora uno en el futuro, debe mantenerse sincronizado con `package.json` para asegurar instalaciones reproducibles.

## Seguridad

- Nunca subas `.env` a GitHub.
- Nunca publiques `DISCORD_TOKEN`.
- Nunca publiques `SUPABASE_SERVICE_ROLE_KEY`.
- Mantén RLS habilitado en las tablas expuestas de Supabase.
- Los permisos del bot deben configurarse mediante IDs y no mediante nombres de roles.
- Antes de aplicar una migración sobre producción, verifica el estado actual de la base de datos.

## Repositorio

**Hypnox Studios — Hypnox Bot**

Repositorio oficial del código del bot y su infraestructura de configuración.
