-- Agrega columna provincia a las tres tablas con datos geográficos

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS provincia text;

ALTER TABLE public.safe_zones
  ADD COLUMN IF NOT EXISTS provincia text;

ALTER TABLE public.health_centers
  ADD COLUMN IF NOT EXISTS provincia text;
