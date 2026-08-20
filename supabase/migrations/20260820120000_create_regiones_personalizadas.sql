CREATE TABLE public.regiones_personalizadas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  nombre text NOT NULL,
  geom geometry(Polygon, 4326) NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.regiones_personalizadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own regions" ON public.regiones_personalizadas 
  FOR ALL 
  USING (auth.uid() = user_id);

-- Vista para facilitar la lectura del frontend (convertir a GeoJSON)
CREATE VIEW public.regiones_personalizadas_view WITH (security_invoker = true) AS
SELECT 
  id,
  user_id,
  nombre,
  ST_AsGeoJSON(geom)::jsonb as geom_json,
  created_at
FROM public.regiones_personalizadas;
