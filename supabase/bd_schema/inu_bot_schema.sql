-- WARNING: This schema is for context only and is not meant to be run directly.
-- Table order and constraints may not be valid for execution.

-- RLS (migración 20260805060000_add_rls.sql):
--   reports:       SELECT para anon/authenticated; writes solo service_role.
--   user_sessions: deny-by-default (solo service_role via Edge Function).
--   spatial_ref_sys: sin RLS (data PostGIS, propiedad de supabase_admin).

CREATE TABLE public.spatial_ref_sys (
  srid integer NOT NULL CHECK (srid > 0 AND srid <= 998999),
  auth_name character varying,
  auth_srid integer,
  srtext character varying,
  proj4text character varying,
  CONSTRAINT spatial_ref_sys_pkey PRIMARY KEY (srid)
);

CREATE TABLE public.user_sessions (
  chat_id bigint NOT NULL,
  state text NOT NULL DEFAULT 'IDLE'::text,
  intentos_fallidos integer DEFAULT 0,
  datos_temporales jsonb DEFAULT '{}'::jsonb,
  ultima_interaccion timestamp with time zone DEFAULT now(),
  CONSTRAINT user_sessions_pkey PRIMARY KEY (chat_id)
);

CREATE TABLE public.reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  chat_id bigint NOT NULL,
  lat double precision NOT NULL,
  lon double precision NOT NULL,
  location USER-DEFINED NOT NULL,
  
  -- Puntuación / Criticidad
  puntaje_base double precision DEFAULT 0,
  puntaje_descripcion double precision DEFAULT 0,
  puntaje_foto double precision DEFAULT 0,
  puntaje_clima double precision DEFAULT 0,
  
  -- Datos clima y multimedia
  lluvia_mm double precision,
  clima_fuente text,
  foto_url text,
  foto_valida boolean,
  es_audio boolean DEFAULT false,
  
  created_at timestamp with time zone DEFAULT now(),
  descripcion text,
  
  -- Columnas tipadas (migración 20260805050000_add_typed_columns.sql).
  tipo text CHECK (tipo IN ('INUNDACION_URBANA', 'LLUVIAS_FUERTES', 'GRANIZO', 'ANEGAMIENTO_VIVIENDA')),
  riesgo text CHECK (riesgo IN ('BAJO', 'MEDIO', 'ALTO', 'CRITICO')),
  estado text CHECK (estado IN ('VALIDADO_CLIMA', 'PENDIENTE_VALIDACION', 'DESESTIMADO_SIN_ALERTA', 'DESESTIMADO_IRRELEVANTE')),
  
  CONSTRAINT reports_pkey PRIMARY KEY (id)
);