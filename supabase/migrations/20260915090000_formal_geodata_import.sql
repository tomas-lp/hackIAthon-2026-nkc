-- Arquitectura de importacion segura para barrios formales y centros de salud
-- IDECorr. Esta migracion es aditiva: no reemplaza ni elimina datos existentes.

-- ---------------------------------------------------------------------------
-- Metadatos de las entidades canonicas
-- ---------------------------------------------------------------------------

ALTER TABLE public.barrios
  ADD COLUMN IF NOT EXISTS tipo text,
  ADD COLUMN IF NOT EXISTS localidad text,
  ADD COLUMN IF NOT EXISTS fuente_principal text,
  ADD COLUMN IF NOT EXISTS fuente_id text,
  ADD COLUMN IF NOT EXISTS fuente_url text,
  ADD COLUMN IF NOT EXISTS import_run_id uuid,
  ADD COLUMN IF NOT EXISTS estado_validacion text,
  ADD COLUMN IF NOT EXISTS es_activo boolean;

UPDATE public.barrios
SET tipo = COALESCE(tipo, 'formal'),
    localidad = COALESCE(localidad, ciudad),
    fuente_principal = COALESCE(fuente_principal, CASE WHEN osm_id IS NOT NULL THEN 'OSM' ELSE 'Actual' END),
    estado_validacion = COALESCE(estado_validacion, 'validado'),
    es_activo = COALESCE(es_activo, true);

ALTER TABLE public.barrios
  ALTER COLUMN tipo SET DEFAULT 'formal',
  ALTER COLUMN fuente_principal SET DEFAULT 'Actual',
  ALTER COLUMN estado_validacion SET DEFAULT 'validado',
  ALTER COLUMN es_activo SET DEFAULT true;

ALTER TABLE public.health_centers
  ADD COLUMN IF NOT EXISTS fuente_principal text,
  ADD COLUMN IF NOT EXISTS fuente_id text,
  ADD COLUMN IF NOT EXISTS fuente_url text,
  ADD COLUMN IF NOT EXISTS import_run_id uuid,
  ADD COLUMN IF NOT EXISTS categoria_oficial text,
  ADD COLUMN IF NOT EXISTS estado_validacion text,
  ADD COLUMN IF NOT EXISTS es_activo boolean;

UPDATE public.health_centers
SET fuente_principal = COALESCE(fuente_principal, CASE WHEN osm_id IS NOT NULL THEN 'OSM' ELSE 'Manual' END),
    estado_validacion = COALESCE(estado_validacion, 'validado'),
    es_activo = COALESCE(es_activo, true);

ALTER TABLE public.health_centers
  ALTER COLUMN fuente_principal SET DEFAULT 'Manual',
  ALTER COLUMN estado_validacion SET DEFAULT 'validado',
  ALTER COLUMN es_activo SET DEFAULT true;

CREATE INDEX IF NOT EXISTS barrios_localidad_idx
  ON public.barrios (localidad);
CREATE INDEX IF NOT EXISTS barrios_fuente_idx
  ON public.barrios (fuente_principal, fuente_id);
CREATE INDEX IF NOT EXISTS barrios_import_run_idx
  ON public.barrios (import_run_id);
CREATE INDEX IF NOT EXISTS health_centers_fuente_idx
  ON public.health_centers (fuente_principal, fuente_id);
CREATE INDEX IF NOT EXISTS health_centers_import_run_idx
  ON public.health_centers (import_run_id);

-- El alcance de esta primera importacion es formal, pero no se agrega una
-- restriccion global: asi el RPC historico insert_barrio conserva su contrato
-- para futuras fuentes o tipos de barrio.

-- ---------------------------------------------------------------------------
-- Auditoria de ejecuciones
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.data_import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset text NOT NULL CHECK (dataset IN ('barrios', 'health_centers')),
  fuente text NOT NULL,
  url_fuente text NOT NULL,
  estado text NOT NULL DEFAULT 'iniciado'
    CHECK (estado IN ('iniciado', 'validado', 'aplicado', 'fallido', 'revertido')),
  iniciado_at timestamptz NOT NULL DEFAULT now(),
  finalizado_at timestamptz,
  registros_recibidos integer NOT NULL DEFAULT 0,
  registros_nuevos integer NOT NULL DEFAULT 0,
  registros_existentes integer NOT NULL DEFAULT 0,
  registros_revision integer NOT NULL DEFAULT 0,
  registros_rechazados integer NOT NULL DEFAULT 0,
  resumen jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS data_import_runs_dataset_idx
  ON public.data_import_runs (dataset, fuente, iniciado_at DESC);

ALTER TABLE public.data_import_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.data_import_runs FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.data_import_runs TO service_role;

-- ---------------------------------------------------------------------------
-- Staging de barrios
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.barrios_import_staging (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_run_id uuid NOT NULL REFERENCES public.data_import_runs(id) ON DELETE CASCADE,
  fuente_id text,
  nombre_original text NOT NULL,
  localidad_original text,
  nombre_normalizado text NOT NULL,
  localidad_normalizada text,
  area_ha numeric,
  geom public.geometry(MultiPolygon, 4326) NOT NULL,
  atributos_originales jsonb NOT NULL DEFAULT '{}'::jsonb,
  barrio_existente_id uuid REFERENCES public.barrios(id),
  overlap_ratio numeric,
  resultado_match text NOT NULL DEFAULT 'pendiente'
    CHECK (resultado_match IN ('pendiente', 'nuevo', 'existente', 'posible_duplicado', 'geometria_diferente', 'descartado')),
  aprobado boolean NOT NULL DEFAULT false,
  observaciones text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS barrios_import_staging_run_idx
  ON public.barrios_import_staging (import_run_id, resultado_match);
CREATE INDEX IF NOT EXISTS barrios_import_staging_geom_idx
  ON public.barrios_import_staging USING gist (geom);
CREATE INDEX IF NOT EXISTS barrios_import_staging_name_idx
  ON public.barrios_import_staging (localidad_normalizada, nombre_normalizado);

ALTER TABLE public.barrios_import_staging ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.barrios_import_staging FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.barrios_import_staging TO service_role;

-- ---------------------------------------------------------------------------
-- Staging de centros de salud
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.health_centers_import_staging (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_run_id uuid NOT NULL REFERENCES public.data_import_runs(id) ON DELETE CASCADE,
  fuente_id text,
  nombre_original text NOT NULL,
  tipo_original text NOT NULL CHECK (tipo_original IN ('Hospital', 'CAPS', 'SAPS')),
  nombre_normalizado text NOT NULL,
  departamento text,
  municipio text,
  localidad text,
  localidad_normalizada text,
  direccion text,
  categoria text,
  lat double precision NOT NULL,
  lon double precision NOT NULL,
  location public.geography(Point, 4326) NOT NULL,
  atributos_originales jsonb NOT NULL DEFAULT '{}'::jsonb,
  health_center_existente_id uuid REFERENCES public.health_centers(id),
  distance_m numeric,
  resultado_match text NOT NULL DEFAULT 'pendiente'
    CHECK (resultado_match IN ('pendiente', 'nuevo', 'existente', 'posible_duplicado', 'tipo_diferente', 'descartado')),
  aprobado boolean NOT NULL DEFAULT false,
  observaciones text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS health_import_staging_run_idx
  ON public.health_centers_import_staging (import_run_id, resultado_match);
CREATE INDEX IF NOT EXISTS health_import_staging_location_idx
  ON public.health_centers_import_staging USING gist (location);
CREATE INDEX IF NOT EXISTS health_import_staging_name_idx
  ON public.health_centers_import_staging (localidad_normalizada, nombre_normalizado);

ALTER TABLE public.health_centers_import_staging ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.health_centers_import_staging FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.health_centers_import_staging TO service_role;

-- ---------------------------------------------------------------------------
-- Relacion de fuentes: un registro canonico puede tener varias fuentes
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.barrio_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barrio_id uuid NOT NULL REFERENCES public.barrios(id) ON DELETE CASCADE,
  import_run_id uuid REFERENCES public.data_import_runs(id) ON DELETE SET NULL,
  fuente text NOT NULL,
  fuente_id text,
  nombre_original text,
  atributos_originales jsonb NOT NULL DEFAULT '{}'::jsonb,
  url_fuente text,
  fecha_obtencion timestamptz NOT NULL DEFAULT now(),
  es_fuente_actual boolean NOT NULL DEFAULT true,
  UNIQUE (import_run_id, fuente_id)
);

CREATE INDEX IF NOT EXISTS barrio_sources_entity_idx ON public.barrio_sources (barrio_id);
CREATE INDEX IF NOT EXISTS barrio_sources_source_idx ON public.barrio_sources (fuente, fuente_id);
ALTER TABLE public.barrio_sources ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.barrio_sources FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.barrio_sources TO service_role;

CREATE TABLE IF NOT EXISTS public.health_center_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  health_center_id uuid NOT NULL REFERENCES public.health_centers(id) ON DELETE CASCADE,
  import_run_id uuid REFERENCES public.data_import_runs(id) ON DELETE SET NULL,
  fuente text NOT NULL,
  fuente_id text,
  nombre_original text,
  atributos_originales jsonb NOT NULL DEFAULT '{}'::jsonb,
  url_fuente text,
  fecha_obtencion timestamptz NOT NULL DEFAULT now(),
  es_fuente_actual boolean NOT NULL DEFAULT true,
  UNIQUE (import_run_id, fuente_id)
);

CREATE INDEX IF NOT EXISTS health_center_sources_entity_idx ON public.health_center_sources (health_center_id);
CREATE INDEX IF NOT EXISTS health_center_sources_source_idx ON public.health_center_sources (fuente, fuente_id);
ALTER TABLE public.health_center_sources ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.health_center_sources FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.health_center_sources TO service_role;

-- ---------------------------------------------------------------------------
-- Normalizacion y staging controlado
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.normalize_geo_name(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT regexp_replace(
    regexp_replace(
      lower(translate(trim(COALESCE(value, '')), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')),
      '[^a-z0-9]+', ' ', 'g'
    ),
    '^\s+|\s+$', '', 'g'
  );
$$;

CREATE OR REPLACE FUNCTION public.stage_formal_barrios(
  p_import_run_id uuid,
  p_rows jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  inserted_count integer;
BEGIN
  INSERT INTO public.barrios_import_staging (
    import_run_id, fuente_id, nombre_original, localidad_original,
    nombre_normalizado, localidad_normalizada, area_ha, geom,
    atributos_originales
  )
  SELECT
    p_import_run_id,
    item->>'fuente_id',
    COALESCE(NULLIF(item->>'nombre', ''), 'Sin nombre'),
    NULLIF(item->>'localidad', ''),
    public.normalize_geo_name(item->>'nombre'),
    public.normalize_geo_name(item->>'localidad'),
    NULLIF(item->>'area_ha', '')::numeric,
    public.ST_Multi(public.ST_SetSRID(public.ST_GeomFromGeoJSON((item->'geometry')::text), 4326)),
    COALESCE(item->'properties', '{}'::jsonb)
  FROM jsonb_array_elements(COALESCE(p_rows, '[]'::jsonb)) AS item;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  UPDATE public.data_import_runs SET registros_recibidos = inserted_count WHERE id = p_import_run_id;
  RETURN inserted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.stage_idecorr_health_centers(
  p_import_run_id uuid,
  p_rows jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  inserted_count integer;
BEGIN
  INSERT INTO public.health_centers_import_staging (
    import_run_id, fuente_id, nombre_original, tipo_original,
    nombre_normalizado, departamento, municipio, localidad,
    localidad_normalizada, direccion, categoria, lat, lon, location,
    atributos_originales
  )
  SELECT
    p_import_run_id,
    item->>'fuente_id',
    COALESCE(NULLIF(item->>'nombre', ''), 'Sin nombre'),
    item->>'tipo',
    public.normalize_geo_name(item->>'nombre'),
    NULLIF(item->>'departamento', ''),
    NULLIF(item->>'municipio', ''),
    NULLIF(item->>'localidad', ''),
    public.normalize_geo_name(COALESCE(item->>'localidad', item->>'municipio')),
    NULLIF(item->>'direccion', ''),
    NULLIF(item->>'categoria', ''),
    (item->>'lat')::double precision,
    (item->>'lon')::double precision,
    public.ST_SetSRID(public.ST_Point((item->>'lon')::double precision, (item->>'lat')::double precision), 4326)::public.geography,
    COALESCE(item->'properties', '{}'::jsonb)
  FROM jsonb_array_elements(COALESCE(p_rows, '[]'::jsonb)) AS item;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  UPDATE public.data_import_runs SET registros_recibidos = inserted_count WHERE id = p_import_run_id;
  RETURN inserted_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- Clasificacion: primero preview, luego apply explicito
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.classify_formal_barrios(p_import_run_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  item record;
  candidate_id uuid;
  candidate_same_name boolean;
  candidate_overlap numeric;
  overlap numeric;
  same_name boolean;
  new_count integer := 0;
  existing_count integer := 0;
  review_count integer := 0;
  rejected_count integer := 0;
BEGIN
  FOR item IN SELECT * FROM public.barrios_import_staging WHERE import_run_id = p_import_run_id LOOP
    IF NOT public.ST_IsValid(item.geom) THEN
      UPDATE public.barrios_import_staging
      SET resultado_match = 'descartado', observaciones = 'Geometria invalida'
      WHERE id = item.id;
      rejected_count := rejected_count + 1;
      CONTINUE;
    END IF;

    SELECT b.id,
           public.normalize_geo_name(COALESCE(b.localidad, b.ciudad)) = item.localidad_normalizada
             AND public.normalize_geo_name(b.nombre) = item.nombre_normalizado AS same_name,
           CASE WHEN public.ST_Intersects(b.geom, item.geom)
             THEN public.ST_Area(public.ST_Intersection(b.geom, item.geom)::geography)
                  / NULLIF(LEAST(public.ST_Area(b.geom::geography), public.ST_Area(item.geom::geography)), 0)
             ELSE 0 END AS overlap_ratio
    INTO candidate_id, candidate_same_name, candidate_overlap
    FROM public.barrios b
    WHERE COALESCE(b.es_activo, true)
      AND public.normalize_geo_name(COALESCE(b.localidad, b.ciudad)) = item.localidad_normalizada
      AND (
        public.normalize_geo_name(b.nombre) = item.nombre_normalizado
        OR public.ST_Intersects(b.geom, item.geom)
      )
    ORDER BY (public.normalize_geo_name(b.nombre) = item.nombre_normalizado) DESC,
             overlap_ratio DESC
    LIMIT 1;

    IF NOT FOUND OR candidate_id IS NULL THEN
      UPDATE public.barrios_import_staging
      SET resultado_match = 'nuevo', aprobado = false
      WHERE id = item.id;
      new_count := new_count + 1;
    ELSE
      overlap := COALESCE(candidate_overlap, 0);
      same_name := COALESCE(candidate_same_name, false);
      UPDATE public.barrios_import_staging
      SET barrio_existente_id = candidate_id,
          overlap_ratio = overlap,
          resultado_match = CASE
            WHEN overlap >= 0.85 THEN 'existente'
            WHEN same_name THEN 'geometria_diferente'
            ELSE 'posible_duplicado'
          END,
          aprobado = false
      WHERE id = item.id;
      IF overlap >= 0.85 THEN existing_count := existing_count + 1;
      ELSE review_count := review_count + 1;
      END IF;
    END IF;
  END LOOP;

  UPDATE public.data_import_runs
  SET estado = 'validado',
      registros_nuevos = new_count,
      registros_existentes = existing_count,
      registros_revision = review_count,
      registros_rechazados = rejected_count,
      resumen = jsonb_build_object('nuevos', new_count, 'existentes', existing_count, 'revision', review_count, 'rechazados', rejected_count)
  WHERE id = p_import_run_id;

  RETURN (SELECT resumen FROM public.data_import_runs WHERE id = p_import_run_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.classify_idecorr_health_centers(p_import_run_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  item record;
  candidate_id uuid;
  candidate_same_name boolean;
  candidate_distance_m numeric;
  same_name boolean;
  distance_m_value numeric;
  new_count integer := 0;
  existing_count integer := 0;
  review_count integer := 0;
BEGIN
  FOR item IN SELECT * FROM public.health_centers_import_staging WHERE import_run_id = p_import_run_id LOOP
    SELECT h.id,
           public.normalize_geo_name(h.nombre) = item.nombre_normalizado AS same_name,
           public.ST_Distance(h.location, item.location) AS distance_m
    INTO candidate_id, candidate_same_name, candidate_distance_m
    FROM public.health_centers h
    WHERE COALESCE(h.es_activo, true)
      AND h.location IS NOT NULL
      AND (
        public.ST_DWithin(h.location, item.location, 150)
        OR public.normalize_geo_name(h.nombre) = item.nombre_normalizado
      )
    ORDER BY (public.normalize_geo_name(h.nombre) = item.nombre_normalizado) DESC,
             public.ST_Distance(h.location, item.location)
    LIMIT 1;

    IF NOT FOUND OR candidate_id IS NULL THEN
      UPDATE public.health_centers_import_staging
      SET resultado_match = 'nuevo', aprobado = false
      WHERE id = item.id;
      new_count := new_count + 1;
    ELSE
      same_name := COALESCE(candidate_same_name, false);
      distance_m_value := COALESCE(candidate_distance_m, 999999);
      UPDATE public.health_centers_import_staging
      SET health_center_existente_id = candidate_id,
          distance_m = distance_m_value,
          resultado_match = CASE
            WHEN distance_m_value <= 150 THEN 'existente'
            WHEN same_name THEN 'posible_duplicado'
            ELSE 'tipo_diferente'
          END,
          aprobado = false
      WHERE id = item.id;
      IF distance_m_value <= 150 THEN existing_count := existing_count + 1;
      ELSE review_count := review_count + 1;
      END IF;
    END IF;
  END LOOP;

  UPDATE public.data_import_runs
  SET estado = 'validado',
      registros_nuevos = new_count,
      registros_existentes = existing_count,
      registros_revision = review_count,
      resumen = jsonb_build_object('nuevos', new_count, 'existentes', existing_count, 'revision', review_count)
  WHERE id = p_import_run_id;

  RETURN (SELECT resumen FROM public.data_import_runs WHERE id = p_import_run_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- Aplicacion explicita: solo filas aprobadas y solo una vez por ejecucion
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.apply_formal_geodata_import(p_import_run_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  run_row public.data_import_runs;
  item record;
  new_id uuid;
  applied_count integer := 0;
BEGIN
  SELECT * INTO run_row FROM public.data_import_runs WHERE id = p_import_run_id FOR UPDATE;
  IF run_row.id IS NULL THEN RAISE EXCEPTION 'Importacion inexistente: %', p_import_run_id; END IF;
  IF run_row.estado = 'aplicado' THEN
    RETURN jsonb_build_object('status', 'already_applied', 'run_id', p_import_run_id);
  END IF;
  IF run_row.estado <> 'validado' THEN
    RAISE EXCEPTION 'La importacion debe estar validada antes de aplicar: %', run_row.estado;
  END IF;

  IF run_row.dataset = 'barrios' THEN
    FOR item IN SELECT * FROM public.barrios_import_staging
      WHERE import_run_id = p_import_run_id AND resultado_match = 'nuevo' AND aprobado LOOP
      INSERT INTO public.barrios (
        nombre, ciudad, localidad, geom, tipo, fuente_principal, fuente_id,
        fuente_url, import_run_id, estado_validacion, es_activo
      ) VALUES (
        item.nombre_original, COALESCE(item.localidad_original, 'Corrientes'), item.localidad_original,
        item.geom, 'formal', 'IDECorr', item.fuente_id,
        'https://geoportal.corrientes.gob.ar/geoserver/planeamiento_urbano_ide/ows',
        p_import_run_id, 'validado', true
      ) RETURNING id INTO new_id;
      UPDATE public.barrios_import_staging SET barrio_existente_id = new_id WHERE id = item.id;
      INSERT INTO public.barrio_sources (barrio_id, import_run_id, fuente, fuente_id, nombre_original, atributos_originales, url_fuente)
      VALUES (new_id, p_import_run_id, 'IDECorr', item.fuente_id, item.nombre_original, item.atributos_originales,
        'https://geoportal.corrientes.gob.ar/geoserver/planeamiento_urbano_ide/ows');
      applied_count := applied_count + 1;
    END LOOP;

    INSERT INTO public.barrio_sources (barrio_id, import_run_id, fuente, fuente_id, nombre_original, atributos_originales, url_fuente)
    SELECT barrio_existente_id, p_import_run_id, 'IDECorr', fuente_id, nombre_original, atributos_originales,
      'https://geoportal.corrientes.gob.ar/geoserver/planeamiento_urbano_ide/ows'
    FROM public.barrios_import_staging
    WHERE import_run_id = p_import_run_id AND barrio_existente_id IS NOT NULL
      AND resultado_match IN ('existente', 'geometria_diferente', 'posible_duplicado')
    ON CONFLICT (import_run_id, fuente_id) DO NOTHING;
  ELSE
    FOR item IN SELECT * FROM public.health_centers_import_staging
      WHERE import_run_id = p_import_run_id AND resultado_match = 'nuevo' AND aprobado LOOP
      INSERT INTO public.health_centers (
        osm_id, nombre, tipo, localidad, departamento, provincia, direccion,
        lat, lon, location, codigo_postal, sitio_web, fuente_principal,
        fuente_id, fuente_url, import_run_id, categoria_oficial,
        estado_validacion, es_activo, updated_at
      ) VALUES (
        NULL, item.nombre_original, upper(item.tipo_original), item.localidad,
        item.departamento, 'Corrientes', item.direccion, item.lat, item.lon,
        item.location, NULL, NULL, 'IDECorr', item.fuente_id,
        'https://geoportal.corrientes.gob.ar/geoserver/salud_ide/ows',
        p_import_run_id, item.categoria, 'validado', true, now()
      ) RETURNING id INTO new_id;
      UPDATE public.health_centers_import_staging SET health_center_existente_id = new_id WHERE id = item.id;
      INSERT INTO public.health_center_sources (health_center_id, import_run_id, fuente, fuente_id, nombre_original, atributos_originales, url_fuente)
      VALUES (new_id, p_import_run_id, 'IDECorr', item.fuente_id, item.nombre_original, item.atributos_originales,
        'https://geoportal.corrientes.gob.ar/geoserver/salud_ide/ows');
      applied_count := applied_count + 1;
    END LOOP;

    INSERT INTO public.health_center_sources (health_center_id, import_run_id, fuente, fuente_id, nombre_original, atributos_originales, url_fuente)
    SELECT health_center_existente_id, p_import_run_id, 'IDECorr', fuente_id, nombre_original, atributos_originales,
      'https://geoportal.corrientes.gob.ar/geoserver/salud_ide/ows'
    FROM public.health_centers_import_staging
    WHERE import_run_id = p_import_run_id AND health_center_existente_id IS NOT NULL
      AND resultado_match IN ('existente', 'posible_duplicado', 'tipo_diferente')
    ON CONFLICT (import_run_id, fuente_id) DO NOTHING;
  END IF;

  UPDATE public.data_import_runs
  SET estado = 'aplicado', finalizado_at = now(), registros_nuevos = applied_count
  WHERE id = p_import_run_id;

  RETURN jsonb_build_object('status', 'applied', 'run_id', p_import_run_id, 'inserted', applied_count);
END;
$$;

-- Solo el proceso de importacion puede ejecutar estas funciones.
REVOKE ALL ON FUNCTION public.stage_formal_barrios(uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.stage_idecorr_health_centers(uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.classify_formal_barrios(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.classify_idecorr_health_centers(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_formal_geodata_import(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stage_formal_barrios(uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.stage_idecorr_health_centers(uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.classify_formal_barrios(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.classify_idecorr_health_centers(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_formal_geodata_import(uuid) TO service_role;

-- El mapa continua mostrando solamente barrios formales activos.
CREATE OR REPLACE FUNCTION public.get_barrios_geojson()
RETURNS json
LANGUAGE sql
STABLE
AS $$
  SELECT json_build_object(
    'type', 'FeatureCollection',
    'features', COALESCE(json_agg(
      json_build_object(
        'type', 'Feature',
        'geometry', CAST(public.ST_AsGeoJSON(b.geom) AS json),
        'properties', json_build_object(
          'id', b.id,
          'nombre', b.nombre,
          'ciudad', COALESCE(b.localidad, b.ciudad),
          'tipo', b.tipo,
          'fuente', b.fuente_principal,
          'report_count', (
            SELECT COUNT(*)
            FROM public.reports r
            WHERE r.lat IS NOT NULL AND r.lon IS NOT NULL
              AND public.ST_Contains(b.geom, public.ST_SetSRID(public.ST_MakePoint(r.lon, r.lat), 4326))
          )
        )
      )
    ), '[]'::json)
  )
  FROM public.barrios b
  WHERE COALESCE(b.es_activo, true) AND COALESCE(b.tipo, 'formal') = 'formal';
$$;

CREATE OR REPLACE FUNCTION public.get_barrio_for_point(
  p_lat double precision,
  p_lon double precision,
  p_ciudad text DEFAULT NULL
)
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT b.nombre
  FROM public.barrios b
  WHERE COALESCE(b.es_activo, true)
    AND COALESCE(b.tipo, 'formal') = 'formal'
    AND public.ST_Contains(b.geom, public.ST_SetSRID(public.ST_MakePoint(p_lon, p_lat), 4326))
    AND (p_ciudad IS NULL OR COALESCE(b.localidad, b.ciudad) = p_ciudad)
  LIMIT 1;
$$;
