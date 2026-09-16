-- Deja activos en el mapa únicamente centros de salud de Corrientes.
-- Se conserva el registro original y se desactiva para permitir auditoría.

UPDATE public.health_centers
SET es_activo = false,
    estado_validacion = 'fuera_de_alcance'
WHERE lower(trim(COALESCE(provincia, ''))) = 'chaco'
   OR lower(trim(COALESCE(localidad, ''))) IN (
     'resistencia',
     'barranqueras',
     'fontana',
     'puerto vilelas',
     'vilelas'
   );

CREATE INDEX IF NOT EXISTS health_centers_provincia_activo_idx
  ON public.health_centers (provincia, es_activo);
