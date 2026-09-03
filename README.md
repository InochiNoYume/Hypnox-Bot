# Hypnox Bot

Bot de Discord de Hypnox Studios, construido con Node.js, discord.js y Supabase.

## Arquitectura

El bot funciona como una única aplicación backend para los servidores de Hypnox Studios. La configuración sensible y todos los identificadores de Discord se mantienen mediante variables de entorno.

Los servidores soportados son:

- `official`: servidor oficial de Hypnox Studios.
- `staff`: servidor interno del Staff Team.
- `applications`: servidor de postulaciones.
- `dev`: servidor de desarrollo y pruebas. Recibe el conjunto de comandos de todos los demás servidores para validar cambios antes de producción.

Los comandos normales se registran exclusivamente en los servidores declarados en cada comando. No existe un registro global intencional.

## Comandos

El bot carga automáticamente los módulos de `src/commands/`.

Cada comando debe exportar:

```js
module.exports = {
  data,
  execute,
  guilds: ['official']
};
```

`guilds` es obligatorio y solo admite `official`, `staff` y `applications`. El servidor `dev` es especial: durante el registro recibe todos los comandos para realizar pruebas.

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