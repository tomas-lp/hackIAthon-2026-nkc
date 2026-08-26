-- Migración: Limpieza estricta de health_centers fuera de Corrientes Capital -> Santa Ana y Gran Resistencia

-- 1. Crear tabla de respaldo para los centros de salud eliminados
CREATE TABLE IF NOT EXISTS public.health_centers_eliminados (
  id uuid NOT NULL PRIMARY KEY,
  nombre text NOT NULL,
  tipo text,
  localidad text,
  departamento text,
  provincia text,
  direccion text,
  lat double precision,
  lon double precision,
  location public.geography(Point,4326),
  updated_at timestamp with time zone DEFAULT now(),
  osm_id bigint,
  codigo_postal text,
  sitio_web text,
  deleted_at timestamp with time zone DEFAULT now()
);

-- RLS para la tabla de respaldo
ALTER TABLE public.health_centers_eliminados ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'health_centers_eliminados' AND policyname = 'authenticated_read_deleted_health_centers'
  ) THEN
    CREATE POLICY "authenticated_read_deleted_health_centers"
      ON public.health_centers_eliminados FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- 2. Guardar en health_centers_eliminados todo lo que NO esté en Corrientes Capital -> Santa Ana / Gran Resistencia
INSERT INTO public.health_centers_eliminados (
  id, nombre, tipo, localidad, departamento, provincia, direccion, lat, lon, location, updated_at, osm_id, codigo_postal, sitio_web
)
SELECT 
  id, nombre, tipo, localidad, departamento, provincia, direccion, lat, lon, location, updated_at, osm_id, codigo_postal, sitio_web
FROM public.health_centers
WHERE 
  -- Se eliminan todos los que NO cumplan con la zona permitida
  NOT (
    -- Zona permitida por Coordenadas (Gran Resistencia hasta Corrientes Capital / Santa Ana)
    (
      lat IS NOT NULL AND lon IS NOT NULL 
      AND lat BETWEEN -27.65 AND -27.30 
      AND lon BETWEEN -59.15 AND -58.60
    )
    -- O Zona permitida por Localidad (en caso de no tener coordenadas)
    OR (
      lat IS NULL AND lon IS NULL AND localidad IS NOT NULL
      AND LOWER(TRIM(localidad)) IN (
        'corrientes', 'corrientes capital', 'capital', 'santa ana', 
        'santa ana de los guácaras', 'santa ana de los guacaras', 
        'riachuelo', 'san cosme', 'paso de la patria', 
        'resistencia', 'barranqueras', 'fontana', 'puerto vilelas', 'vilelas'
      )
    )
  )
ON CONFLICT (id) DO NOTHING;

-- 3. Eliminar de la tabla principal los registros que fueron respaldados
DELETE FROM public.health_centers
WHERE id IN (
  SELECT id FROM public.health_centers_eliminados
);

-- 4. Vista de respaldo
CREATE OR REPLACE VIEW public.health_cares_eliminados AS
SELECT * FROM public.health_centers_eliminados;
