-- Migración para extender la tabla safe_zones y habilitar CRUD de health_centers para usuarios autenticados

-- 1. Agregar columnas a safe_zones
ALTER TABLE public.safe_zones
  ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'REFUGIO_MUNICIPAL',
  ADD COLUMN IF NOT EXISTS localidad text,
  ADD COLUMN IF NOT EXISTS departamento text,
  ADD COLUMN IF NOT EXISTS direccion text,
  ADD COLUMN IF NOT EXISTS capacidad_maxima integer DEFAULT NULL;

-- 2. Restricción para validar tipos permitidos en safe_zones
ALTER TABLE public.safe_zones 
  DROP CONSTRAINT IF EXISTS safe_zones_tipo_check;

ALTER TABLE public.safe_zones
  ADD CONSTRAINT safe_zones_tipo_check 
  CHECK (tipo IN ('ESCUELA', 'POLIDEPORTIVO', 'SUM_COMUNITARIO', 'REFUGIO_MUNICIPAL', 'IGLESIA', 'OTRO'));

-- 3. Políticas RLS para health_centers (permitir a usuarios autenticados insertar, actualizar y eliminar)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'health_centers' AND policyname = 'authenticated_insert_health_centers'
  ) THEN
    CREATE POLICY "authenticated_insert_health_centers"
      ON public.health_centers FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'health_centers' AND policyname = 'authenticated_delete_health_centers'
  ) THEN
    CREATE POLICY "authenticated_delete_health_centers"
      ON public.health_centers FOR DELETE
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'health_centers' AND policyname = 'authenticated_update_health_centers'
  ) THEN
    CREATE POLICY "authenticated_update_health_centers"
      ON public.health_centers FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
