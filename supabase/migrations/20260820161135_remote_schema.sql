create extension if not exists "pg_cron" with schema "pg_catalog";

create extension if not exists "pg_net" with schema "extensions";


  create table "public"."barrios" (
    "id" uuid not null default gen_random_uuid(),
    "osm_id" bigint,
    "nombre" text not null,
    "ciudad" text not null,
    "geom" public.geometry(MultiPolygon,4326) not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."barrios" enable row level security;


  create table "public"."health_centers" (
    "id" uuid not null default gen_random_uuid(),
    "nombre" text not null,
    "tipo" text not null,
    "localidad" text,
    "departamento" text,
    "direccion" text,
    "lat" double precision,
    "lon" double precision,
    "location" public.geography(Point,4326),
    "updated_at" timestamp with time zone not null default now(),
    "osm_id" bigint,
    "codigo_postal" text,
    "sitio_web" text
      );


alter table "public"."health_centers" enable row level security;


  create table "public"."safe_zones" (
    "id" uuid not null default gen_random_uuid(),
    "nombre" text not null,
    "descripcion" text,
    "latitud" double precision not null,
    "longitud" double precision not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now())
      );


alter table "public"."safe_zones" enable row level security;

alter table "public"."reports" add column "barrio" text;

alter table "public"."reports" add column "es_audio" boolean default false;

CREATE INDEX barrios_ciudad_idx ON public.barrios USING btree (ciudad);

CREATE INDEX barrios_geom_idx ON public.barrios USING gist (geom);

CREATE UNIQUE INDEX barrios_osm_id_key ON public.barrios USING btree (osm_id);

CREATE UNIQUE INDEX barrios_pkey ON public.barrios USING btree (id);

CREATE UNIQUE INDEX health_centers_osm_id_key ON public.health_centers USING btree (osm_id);

CREATE UNIQUE INDEX health_centers_pkey ON public.health_centers USING btree (id);

CREATE INDEX idx_health_centers_localidad ON public.health_centers USING btree (localidad);

CREATE INDEX idx_health_centers_location ON public.health_centers USING gist (location);

CREATE INDEX idx_health_centers_osm_id ON public.health_centers USING btree (osm_id);

CREATE INDEX idx_health_centers_tipo ON public.health_centers USING btree (tipo);

CREATE UNIQUE INDEX safe_zones_pkey ON public.safe_zones USING btree (id);

alter table "public"."barrios" add constraint "barrios_pkey" PRIMARY KEY using index "barrios_pkey";

alter table "public"."health_centers" add constraint "health_centers_pkey" PRIMARY KEY using index "health_centers_pkey";

alter table "public"."safe_zones" add constraint "safe_zones_pkey" PRIMARY KEY using index "safe_zones_pkey";

alter table "public"."barrios" add constraint "barrios_osm_id_key" UNIQUE using index "barrios_osm_id_key";

alter table "public"."health_centers" add constraint "health_centers_osm_id_key" UNIQUE using index "health_centers_osm_id_key";

alter table "public"."health_centers" add constraint "health_centers_tipo_check" CHECK ((tipo = ANY (ARRAY['SAPS'::text, 'CAPS'::text, 'HOSPITAL'::text]))) not valid;

alter table "public"."health_centers" validate constraint "health_centers_tipo_check";

set check_function_bodies = off;

create or replace view "public"."barrios_geo" as  SELECT id,
    osm_id,
    nombre,
    ciudad,
    created_at,
    (public.st_asgeojson(geom))::json AS geom_geojson
   FROM public.barrios;


CREATE OR REPLACE FUNCTION public.delete_duplicate_health_centers()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  deleted_count integer := 0;
BEGIN
  -- Elimina las filas duplicadas conservando el id UUID más pequeño por grupo.
  -- La función unaccent requiere la extensión unaccent; usamos regexp_replace
  -- para normalizar sin depender de extensiones adicionales.
  WITH normalized AS (
    SELECT
      id,
      location,
      lower(
        regexp_replace(
          nombre,
          '[^a-zA-Z0-9 ]',
          ' ',
          'g'
        )
      ) AS nombre_norm
    FROM public.health_centers
    WHERE location IS NOT NULL
  ),
  duplicates AS (
    SELECT
      a.id AS id_to_delete
    FROM normalized a
    JOIN normalized b
      ON a.id > b.id                          -- conservar el menor (más antiguo)
      AND a.nombre_norm = b.nombre_norm       -- mismo nombre normalizado
      AND ST_DWithin(a.location, b.location, 100)  -- dentro de 100 metros
  )
  DELETE FROM public.health_centers
  WHERE id IN (SELECT id_to_delete FROM duplicates);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_barrio_for_point(p_lat double precision, p_lon double precision, p_ciudad text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT nombre
  FROM public.barrios
  WHERE
    ST_Contains(geom, ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326))
    AND (p_ciudad IS NULL OR ciudad = p_ciudad)
  LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.get_barrios_geojson()
 RETURNS json
 LANGUAGE sql
 STABLE
AS $function$
  SELECT json_build_object(
    'type', 'FeatureCollection',
    'features', COALESCE(json_agg(
      json_build_object(
        'type', 'Feature',
        'geometry', CAST(ST_AsGeoJSON(b.geom) AS json),
        'properties', json_build_object(
          'id', b.id,
          'nombre', b.nombre,
          'ciudad', b.ciudad,
          'report_count', (
            SELECT COUNT(*)
            FROM public.reports r
            WHERE r.lat IS NOT NULL 
              AND r.lon IS NOT NULL
              AND ST_Contains(b.geom, ST_SetSRID(ST_MakePoint(r.lon, r.lat), 4326))
          )
        )
      )
    ), '[]'::json)
  )
  FROM public.barrios b;
$function$
;

CREATE OR REPLACE FUNCTION public.insert_barrio(p_nombre text, p_tipo text, p_geom jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.barrios (nombre, tipo, geom)
    VALUES (
        p_nombre, 
        p_tipo, 
        ST_Multi(ST_GeomFromGeoJSON(p_geom::text))
    );
END;
$function$
;

grant delete on table "public"."barrios" to "anon";

grant insert on table "public"."barrios" to "anon";

grant references on table "public"."barrios" to "anon";

grant select on table "public"."barrios" to "anon";

grant trigger on table "public"."barrios" to "anon";

grant truncate on table "public"."barrios" to "anon";

grant update on table "public"."barrios" to "anon";

grant delete on table "public"."barrios" to "authenticated";

grant insert on table "public"."barrios" to "authenticated";

grant references on table "public"."barrios" to "authenticated";

grant select on table "public"."barrios" to "authenticated";

grant trigger on table "public"."barrios" to "authenticated";

grant truncate on table "public"."barrios" to "authenticated";

grant update on table "public"."barrios" to "authenticated";

grant delete on table "public"."barrios" to "service_role";

grant insert on table "public"."barrios" to "service_role";

grant references on table "public"."barrios" to "service_role";

grant select on table "public"."barrios" to "service_role";

grant trigger on table "public"."barrios" to "service_role";

grant truncate on table "public"."barrios" to "service_role";

grant update on table "public"."barrios" to "service_role";

grant delete on table "public"."health_centers" to "anon";

grant insert on table "public"."health_centers" to "anon";

grant references on table "public"."health_centers" to "anon";

grant select on table "public"."health_centers" to "anon";

grant trigger on table "public"."health_centers" to "anon";

grant truncate on table "public"."health_centers" to "anon";

grant update on table "public"."health_centers" to "anon";

grant delete on table "public"."health_centers" to "authenticated";

grant insert on table "public"."health_centers" to "authenticated";

grant references on table "public"."health_centers" to "authenticated";

grant select on table "public"."health_centers" to "authenticated";

grant trigger on table "public"."health_centers" to "authenticated";

grant truncate on table "public"."health_centers" to "authenticated";

grant update on table "public"."health_centers" to "authenticated";

grant delete on table "public"."health_centers" to "service_role";

grant insert on table "public"."health_centers" to "service_role";

grant references on table "public"."health_centers" to "service_role";

grant select on table "public"."health_centers" to "service_role";

grant trigger on table "public"."health_centers" to "service_role";

grant truncate on table "public"."health_centers" to "service_role";

grant update on table "public"."health_centers" to "service_role";

grant delete on table "public"."safe_zones" to "anon";

grant insert on table "public"."safe_zones" to "anon";

grant references on table "public"."safe_zones" to "anon";

grant select on table "public"."safe_zones" to "anon";

grant trigger on table "public"."safe_zones" to "anon";

grant truncate on table "public"."safe_zones" to "anon";

grant update on table "public"."safe_zones" to "anon";

grant delete on table "public"."safe_zones" to "authenticated";

grant insert on table "public"."safe_zones" to "authenticated";

grant references on table "public"."safe_zones" to "authenticated";

grant select on table "public"."safe_zones" to "authenticated";

grant trigger on table "public"."safe_zones" to "authenticated";

grant truncate on table "public"."safe_zones" to "authenticated";

grant update on table "public"."safe_zones" to "authenticated";

grant delete on table "public"."safe_zones" to "service_role";

grant insert on table "public"."safe_zones" to "service_role";

grant references on table "public"."safe_zones" to "service_role";

grant select on table "public"."safe_zones" to "service_role";

grant trigger on table "public"."safe_zones" to "service_role";

grant truncate on table "public"."safe_zones" to "service_role";

grant update on table "public"."safe_zones" to "service_role";


  create policy "Barrios son de lectura publica"
  on "public"."barrios"
  as permissive
  for select
  to public
using (true);



  create policy "barrios_public_read"
  on "public"."barrios"
  as permissive
  for select
  to public
using (true);



  create policy "Permitir lectura pública de establecimientos de salud"
  on "public"."health_centers"
  as permissive
  for select
  to public
using (true);



  create policy "Permitir todo a reports de forma anonima"
  on "public"."reports"
  as permissive
  for all
  to anon, authenticated
using (true)
with check (true);



  create policy "Actualizar zonas seguras"
  on "public"."safe_zones"
  as permissive
  for update
  to public
using (true)
with check (true);



  create policy "Eliminar zonas seguras"
  on "public"."safe_zones"
  as permissive
  for delete
  to public
using (true);



  create policy "Insertar zonas seguras"
  on "public"."safe_zones"
  as permissive
  for insert
  to public
with check (true);



  create policy "Todos pueden ver las zonas seguras"
  on "public"."safe_zones"
  as permissive
  for select
  to public
using (true);



  create policy "Permitir todo a user_sessions de forma anonima"
  on "public"."user_sessions"
  as permissive
  for all
  to anon, authenticated
using (true)
with check (true);



