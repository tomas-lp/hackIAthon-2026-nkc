-- Corrige el matching de barrios IDECorr:
-- 1) Capital y Corrientes representan la misma localidad para este dataset.
-- 2) Los nombres repetidos dentro de una misma importacion no se aplican
--    automaticamente; quedan para revision.

CREATE OR REPLACE FUNCTION public.normalize_geo_locality(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE public.normalize_geo_name(value)
    WHEN 'capital' THEN 'corrientes'
    WHEN 'corrientes capital' THEN 'corrientes'
    ELSE public.normalize_geo_name(value)
  END;
$$;

UPDATE public.barrios_import_staging
SET localidad_normalizada = public.normalize_geo_locality(localidad_original)
WHERE localidad_original IS NOT NULL;

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
    public.normalize_geo_locality(item->>'localidad'),
    NULLIF(item->>'area_ha', '')::numeric,
    public.ST_Multi(public.ST_SetSRID(public.ST_GeomFromGeoJSON((item->'geometry')::text), 4326)),
    COALESCE(item->'properties', '{}'::jsonb)
  FROM jsonb_array_elements(COALESCE(p_rows, '[]'::jsonb)) AS item;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  UPDATE public.data_import_runs
  SET registros_recibidos = inserted_count
  WHERE id = p_import_run_id;
  RETURN inserted_count;
END;
$$;

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
  duplicate_staging_id uuid;
  overlap numeric;
  same_name boolean;
  new_count integer := 0;
  existing_count integer := 0;
  review_count integer := 0;
  rejected_count integer := 0;
BEGIN
  FOR item IN
    SELECT *
    FROM public.barrios_import_staging
    WHERE import_run_id = p_import_run_id
    ORDER BY created_at, id
  LOOP
    IF NOT public.ST_IsValid(item.geom) THEN
      UPDATE public.barrios_import_staging
      SET resultado_match = 'descartado',
          aprobado = false,
          observaciones = 'Geometria invalida'
      WHERE id = item.id;
      rejected_count := rejected_count + 1;
      CONTINUE;
    END IF;

    -- Evita aprobar automaticamente la segunda geometria con el mismo
    -- nombre y localidad dentro de la misma fuente. Puede ser un duplicado
    -- o dos sectores legitimos y requiere revision humana.
    SELECT s.id INTO duplicate_staging_id
    FROM public.barrios_import_staging s
    WHERE s.import_run_id = p_import_run_id
      AND s.id < item.id
      AND s.nombre_normalizado = item.nombre_normalizado
      AND s.localidad_normalizada = item.localidad_normalizada
      AND public.ST_IsValid(s.geom)
    ORDER BY s.id
    LIMIT 1;

    IF duplicate_staging_id IS NOT NULL THEN
      UPDATE public.barrios_import_staging
      SET resultado_match = 'posible_duplicado',
          aprobado = false,
          observaciones = format(
            'Nombre y localidad repetidos en la misma importacion; revisar contra staging %s',
            duplicate_staging_id
          )
      WHERE id = item.id;
      review_count := review_count + 1;
      CONTINUE;
    END IF;

    SELECT b.id,
           public.normalize_geo_name(b.nombre) = item.nombre_normalizado AS same_name,
           CASE WHEN public.ST_Intersects(b.geom, item.geom)
             THEN public.ST_Area(public.ST_Intersection(b.geom, item.geom)::geography)
                  / NULLIF(LEAST(public.ST_Area(b.geom::geography), public.ST_Area(item.geom::geography)), 0)
             ELSE 0 END AS overlap_ratio
    INTO candidate_id, candidate_same_name, candidate_overlap
    FROM public.barrios b
    WHERE COALESCE(b.es_activo, true)
      AND public.normalize_geo_locality(COALESCE(b.localidad, b.ciudad)) = item.localidad_normalizada
      AND (
        public.normalize_geo_name(b.nombre) = item.nombre_normalizado
        OR public.ST_Intersects(b.geom, item.geom)
      )
    ORDER BY (public.normalize_geo_name(b.nombre) = item.nombre_normalizado) DESC,
             overlap_ratio DESC
    LIMIT 1;

    IF NOT FOUND OR candidate_id IS NULL THEN
      UPDATE public.barrios_import_staging
      SET resultado_match = 'nuevo', aprobado = false, observaciones = NULL
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
          aprobado = false,
          observaciones = NULL
      WHERE id = item.id;
      IF overlap >= 0.85 THEN
        existing_count := existing_count + 1;
      ELSE
        review_count := review_count + 1;
      END IF;
    END IF;
  END LOOP;

  UPDATE public.data_import_runs
  SET estado = 'validado',
      registros_nuevos = new_count,
      registros_existentes = existing_count,
      registros_revision = review_count,
      registros_rechazados = rejected_count,
      resumen = jsonb_build_object(
        'nuevos', new_count,
        'existentes', existing_count,
        'revision', review_count,
        'rechazados', rejected_count
      )
  WHERE id = p_import_run_id;

  RETURN (SELECT resumen FROM public.data_import_runs WHERE id = p_import_run_id);
END;
$$;

REVOKE ALL ON FUNCTION public.normalize_geo_locality(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.stage_formal_barrios(uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.classify_formal_barrios(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_geo_locality(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.stage_formal_barrios(uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.classify_formal_barrios(uuid) TO service_role;
