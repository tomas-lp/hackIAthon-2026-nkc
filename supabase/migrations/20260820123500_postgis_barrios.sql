-- Main RPC to get barrios con reporte de counts
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
        'geometry', CAST(ST_AsGeoJSON(b.geom) AS json),
        'properties', json_build_object(
          'id', b.id,
          'nombre', b.nombre,
          'ciudad', b.ciudad,
          'report_count', (
            SELECT COUNT(*)
            FROM public.reports r
            WHERE r.latitud IS NOT NULL 
              AND r.longitud IS NOT NULL
              AND ST_Contains(b.geom, ST_SetSRID(ST_MakePoint(r.longitud, r.latitud), 4326))
          )
        )
      )
    ), '[]'::json)
  )
  FROM public.barrios b;
$$;
