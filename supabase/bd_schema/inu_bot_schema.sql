-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

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
  lluvia_mm double precision,
  clima_fuente text,
  foto_url text,
  created_at timestamp with time zone DEFAULT now(),
  descripcion text,
  tipo text CHECK (tipo = ANY (ARRAY['INUNDACION_URBANA'::text, 'LLUVIAS_FUERTES'::text, 'GRANIZO'::text, 'ANEGAMIENTO_VIVIENDA'::text])),
  descripcion_imagen text,
  puntaje_descripcion integer DEFAULT 0,
  puntaje_foto integer DEFAULT 0,
  puntaje_clima integer DEFAULT 0,
  puntaje_base integer DEFAULT 0,
  foto_valida boolean DEFAULT false,
  adjunto_foto boolean DEFAULT false,
  es_audio boolean DEFAULT false,
  CONSTRAINT reports_pkey PRIMARY KEY (id)
);

CREATE TABLE public.safe_zones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  descripcion text,
  latitud double precision NOT NULL,
  longitud double precision NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT safe_zones_pkey PRIMARY KEY (id)
);