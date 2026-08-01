-- 1. Habilitar la extensión espacial PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Tabla para guardar la sesión y el estado de cada usuario
CREATE TABLE IF NOT EXISTS user_sessions (
    chat_id BIGINT PRIMARY KEY,
    state TEXT NOT NULL DEFAULT 'IDLE',
    intentos_fallidos INTEGER DEFAULT 0,
    datos_temporales JSONB DEFAULT '{}'::jsonb,
    ultima_interaccion TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla para almacenar los reportes de incidentes reales (¡Ahora con descripción!)
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id BIGINT NOT NULL,
    descripcion TEXT, -- NUEVO: Guarda lo que el usuario escribió
    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    criticidad TEXT NOT NULL,
    lluvia_24h_mm DOUBLE PRECISION, -- NUEVO: Lluvia acumulada, no solo actual
    clima_fuente TEXT,
    foto_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Índice espacial para búsquedas en mapas
CREATE INDEX IF NOT EXISTS reports_location_idx ON reports USING GIST (location);

-- 5. Función para contar incidentes a la redonda (Ej: 2000 metros)
CREATE OR REPLACE FUNCTION get_reports_nearby(p_lon DOUBLE PRECISION, p_lat DOUBLE PRECISION, p_radius DOUBLE PRECISION)
RETURNS INTEGER AS $$
DECLARE
  nearby_count INTEGER;
BEGIN
  SELECT count(*) INTO nearby_count
  FROM reports
  WHERE ST_DWithin(location, ST_MakePoint(p_lon, p_lat)::geography, p_radius);
  
  RETURN nearby_count;
END;
$$ LANGUAGE plpgsql;