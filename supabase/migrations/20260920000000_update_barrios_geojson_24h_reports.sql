-- Actualizar get_barrios_geojson para que solo cuente reportes de las ultimas 24 horas (MAX_EDAD_REPORTE_HORAS = 24)
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
              AND r.created_at >= (NOW() - INTERVAL '24 hours')
              AND public.ST_Contains(b.geom, public.ST_SetSRID(public.ST_MakePoint(r.lon, r.lat), 4326))
          )
        )
      )
    ), '[]'::json)
  )
  FROM public.barrios b
  WHERE COALESCE(b.es_activo, true) AND COALESCE(b.tipo, 'formal') = 'formal';
$$;
