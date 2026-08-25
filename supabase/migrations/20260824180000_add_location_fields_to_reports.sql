ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS localidad    text,
  ADD COLUMN IF NOT EXISTS departamento text,
  ADD COLUMN IF NOT EXISTS direccion    text;
