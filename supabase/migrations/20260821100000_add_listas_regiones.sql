CREATE TABLE IF NOT EXISTS public.listas_regiones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  nombre text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.listas_regiones ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'listas_regiones' AND policyname = 'Users can manage their own lists'
  ) THEN
    CREATE POLICY "Users can manage their own lists" ON public.listas_regiones 
      FOR ALL 
      TO authenticated
      USING ((select auth.uid()) = user_id)
      WITH CHECK ((select auth.uid()) = user_id);
  END IF;
END $$;

GRANT ALL ON TABLE public.listas_regiones TO anon, authenticated, service_role;

ALTER TABLE public.regiones_personalizadas 
  ADD COLUMN IF NOT EXISTS lista_id uuid REFERENCES public.listas_regiones(id) ON DELETE SET NULL;

-- Asignar "Lista 1" por defecto a todas las regiones ya existentes en la BD
DO $$
DECLARE
  r RECORD;
  default_list_id uuid;
BEGIN
  FOR r IN SELECT DISTINCT user_id FROM public.regiones_personalizadas WHERE lista_id IS NULL LOOP
    SELECT id INTO default_list_id FROM public.listas_regiones WHERE user_id = r.user_id AND nombre = 'Lista 1' LIMIT 1;
    
    IF default_list_id IS NULL THEN
      INSERT INTO public.listas_regiones (user_id, nombre) VALUES (r.user_id, 'Lista 1') RETURNING id INTO default_list_id;
    END IF;
    
    UPDATE public.regiones_personalizadas SET lista_id = default_list_id WHERE user_id = r.user_id AND lista_id IS NULL;
  END LOOP;
END $$;

DROP VIEW IF EXISTS public.regiones_personalizadas_view CASCADE;

CREATE VIEW public.regiones_personalizadas_view WITH (security_invoker = true) AS
SELECT 
  r.id,
  r.user_id,
  r.nombre,
  r.lista_id,
  COALESCE(l.nombre, 'Lista 1') as lista_nombre,
  ST_AsGeoJSON(r.geom)::jsonb as geom_json,
  r.created_at
FROM public.regiones_personalizadas r
LEFT JOIN public.listas_regiones l ON r.lista_id = l.id;

NOTIFY pgrst, 'reload schema';
