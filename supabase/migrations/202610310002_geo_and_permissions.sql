create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
-- Supabase may already have PostGIS in a different schema; resolve it explicitly.
do $$ declare ext_schema text; begin
  select n.nspname into ext_schema from pg_extension e
    join pg_namespace n on n.oid=e.extnamespace where e.extname='postgis';
  execute format('alter table app_private.collection_points add column location %I.geography(Point,4326)', ext_schema);
  execute format('update app_private.collection_points set location=%I.ST_SetSRID(%I.ST_MakePoint(longitude,latitude),4326)::%I.geography', ext_schema,ext_schema,ext_schema);
end $$;
create index collection_location_gist on app_private.collection_points using gist(location);
-- The trigger keeps canonical coordinates and their spatial index in sync.
do $$ declare ext_schema text; begin
  select n.nspname into ext_schema from pg_extension e
    join pg_namespace n on n.oid=e.extnamespace where e.extname='postgis';
  execute format($fn$ create function app_private.set_point_location() returns trigger
    language plpgsql set search_path = pg_catalog as $body$ begin
      NEW.location := %I.ST_SetSRID(%I.ST_MakePoint(NEW.longitude,NEW.latitude),4326)::%I.geography;
      return NEW;
    end $body$ $fn$, ext_schema,ext_schema,ext_schema);
end $$;
create trigger point_location before insert or update of latitude,longitude
  on app_private.collection_points for each row execute function app_private.set_point_location();

grant usage on schema app_private, extensions to bluesteps_runtime;
do $$ declare t record; r text; begin
  for t in select tablename from pg_tables where schemaname='app_private' loop
    execute format('alter table app_private.%I enable row level security',t.tablename);
    execute format('create policy runtime_only on app_private.%I to bluesteps_runtime using (true) with check (true)',t.tablename);
    execute format('revoke all on app_private.%I from public',t.tablename);
    -- Explicit role boundary; per-user authorization remains in Python.
    execute format('grant select,insert,update,delete on app_private.%I to bluesteps_runtime',t.tablename);
  end loop;
  foreach r in array array['anon','authenticated'] loop
    if exists(select 1 from pg_roles where rolname=r) then
      execute format('revoke all on schema app_private from %I',r);
      execute format('revoke all on all tables in schema app_private from %I',r);
      execute format('revoke all on all functions in schema app_private from %I',r);
      execute format('alter default privileges in schema app_private revoke all on tables from %I',r);
      execute format('alter default privileges in schema app_private revoke execute on functions from %I',r);
    end if;
  end loop;
end $$;
revoke all on all functions in schema app_private from public;
-- Facts and audit records are append-only for runtime; session/OTP state is mutable.
revoke update,delete on app_private.point_ledger, app_private.audit_logs,
  app_private.consent_records, app_private.sorting_actions from bluesteps_runtime;
revoke insert,update,delete on app_private.user_roles from bluesteps_runtime;
revoke insert,update,delete on app_private.waste_categories,app_private.waste_materials,
  app_private.waste_items,app_private.events,app_private.articles,
  app_private.rewards,app_private.reward_inventory from bluesteps_runtime;
