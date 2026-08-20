GRANT ALL ON TABLE public.safe_zones TO anon, authenticated, service_role;

-- Refrescar el caché de PostgREST para que detecte la tabla en el frontend
NOTIFY pgrst, 'reload schema';
