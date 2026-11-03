-- =============================================================================
-- Upgrade de una base creada con la migración única `20260506040553_Init`
-- (DbContext compartido, todo en `public`) al modelo de un DbContext por módulo.
--
-- Mueve las tablas existentes (con sus datos, índices, FKs e identidades) al
-- esquema de su módulo, crea el outbox de los módulos que no lo tenían y marca
-- como aplicada la migración `InitialModuleSchema` de cada módulo.
--
-- Uso (una sola vez, antes de `dotnet ef database update` por módulo):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/db/2026-11-upgrade-to-module-schemas.sql
--
-- Es transaccional: si algo falla no cambia nada. Si la base ya está migrada
-- (no existe public."__EFMigrationsHistory" con Init) no hace nada.
-- =============================================================================
BEGIN;

DO $$
DECLARE
    s text;
BEGIN
    IF to_regclass('public."__EFMigrationsHistory"') IS NULL THEN
        RAISE NOTICE 'No existe public."__EFMigrationsHistory": nada que hacer.';
        RETURN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public."__EFMigrationsHistory" WHERE "MigrationId" = '20260506040553_Init') THEN
        RAISE NOTICE 'No se encontró la migración Init en public: nada que hacer.';
        RETURN;
    END IF;

    CREATE SCHEMA IF NOT EXISTS users;
    CREATE SCHEMA IF NOT EXISTS groups;
    CREATE SCHEMA IF NOT EXISTS schedules;

    -- Users
    ALTER TABLE public.users SET SCHEMA users;
    ALTER TABLE public.musicians SET SCHEMA users;
    -- Los eventos pendientes existentes los emitió el módulo Users.
    ALTER TABLE public.outbox_events SET SCHEMA users;

    -- Groups
    ALTER TABLE public.music_groups SET SCHEMA groups;
    ALTER TABLE public.group_members SET SCHEMA groups;
    ALTER TABLE public.music_genres SET SCHEMA groups;
    ALTER TABLE public.group_genres SET SCHEMA groups;
    ALTER TABLE public.group_media SET SCHEMA groups;

    -- Schedules
    ALTER TABLE public.group_availability SET SCHEMA schedules;
    ALTER TABLE public.busy_schedules SET SCHEMA schedules;

    -- Outbox propio para groups y schedules (misma DDL que genera EF).
    FOREACH s IN ARRAY ARRAY['groups', 'schedules'] LOOP
        EXECUTE format($ddl$
            CREATE TABLE %1$I.outbox_events (
                id uuid NOT NULL CONSTRAINT "PK_outbox_events" PRIMARY KEY,
                event_id uuid NOT NULL,
                event_type character varying(100) NOT NULL,
                event_data text NOT NULL,
                processed boolean DEFAULT false NOT NULL,
                created_at timestamp with time zone NOT NULL,
                processed_at timestamp with time zone,
                retry_count integer DEFAULT 0 NOT NULL,
                last_error character varying(1000),
                next_retry_at timestamp with time zone);
            CREATE INDEX ix_outbox_events_created_at ON %1$I.outbox_events (created_at);
            CREATE INDEX ix_outbox_events_event_type ON %1$I.outbox_events (event_type);
            CREATE INDEX ix_outbox_events_next_retry_at ON %1$I.outbox_events (next_retry_at);
            CREATE INDEX ix_outbox_events_processed ON %1$I.outbox_events (processed);
        $ddl$, s);
    END LOOP;

    -- Historial de migraciones por módulo.
    FOREACH s IN ARRAY ARRAY['users', 'groups', 'schedules'] LOOP
        EXECUTE format($ddl$
            CREATE TABLE %1$I.__ef_migrations_history (
                "MigrationId" character varying(150) NOT NULL CONSTRAINT "PK___ef_migrations_history" PRIMARY KEY,
                "ProductVersion" character varying(32) NOT NULL);
        $ddl$, s);
    END LOOP;

    INSERT INTO users.__ef_migrations_history VALUES ('20261103070815_InitialModuleSchema', '10.0.7');
    INSERT INTO groups.__ef_migrations_history VALUES ('20261103070826_InitialModuleSchema', '10.0.7');
    INSERT INTO schedules.__ef_migrations_history VALUES ('20261103070837_InitialModuleSchema', '10.0.7');

    DROP TABLE public."__EFMigrationsHistory";
END
$$;

COMMIT;
