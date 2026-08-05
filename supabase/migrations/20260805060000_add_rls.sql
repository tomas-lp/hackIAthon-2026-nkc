-- RLS en las tablas de la app del schema public.
-- Políticas que reflejan el modelo de acceso real:
--   - reports:        datos públicos de crisis -> SELECT para anon/authenticated.
--                     Los writes los hace SOLO el service_role (server Next + Edge
--                     Function telegram-bot), que salta RLS: sin políticas de
--                     INSERT/UPDATE/DELETE, el Data API no puede modificar reportes.
--   - user_sessions:  estado interno del bot (privado) -> sin políticas: se niega
--                     todo acceso por Data API; solo el service_role lo toca.
-- Nota: spatial_ref_sys (PostGIS) queda sin RLS: es data de referencia read-only,
-- la posee supabase_admin y el rol postgres de la migración no puede alterarla.

ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_sessions" ENABLE ROW LEVEL SECURITY;

-- reports: lectura pública (mapa de crisis + realtime futuro). Sin políticas de
-- escritura: insertar/modificar/borrar queda reservado al service_role.
CREATE POLICY "reports_select_public"
  ON "public"."reports"
  AS PERMISSIVE
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- user_sessions: deny-by-default (sin políticas).
