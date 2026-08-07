-- Añade columnas de puntaje a "public"."reports" y elimina la clasificación
-- por-reporte anterior (criticidad/riesgo/estado), reemplazada por el sistema
-- de evidencia por puntos y riesgo agregado por zonas (grilla 400 m).

-- Puntajes base del reclamo (evidencia):
--   puntaje_descripcion: AGUA_CALLE 5 / NO_CIRCULAR 10 / AGUA_CASAS 20 / EVACUADOS 35
--   puntaje_foto:        5 si la foto fue validada por IA
--   puntaje_clima:       0-10mm -> 0 / 11-25 -> 5 / 26-50 -> 10 / >50 -> 20
--   puntaje_base:        suma de los tres anteriores

ALTER TABLE "public"."reports"
  ADD COLUMN IF NOT EXISTS "puntaje_descripcion" integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "puntaje_foto" integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "puntaje_clima" integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "puntaje_base" integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "foto_valida" boolean DEFAULT false;

-- Columnas tipadas viejas (riesgo/estado) y criticidad: ya no se usan como
-- clasificador visual. Se conserva "tipo" (problema) con su CHECK e índice.
ALTER TABLE "public"."reports" DROP CONSTRAINT IF EXISTS "reports_riesgo_check";
ALTER TABLE "public"."reports" DROP CONSTRAINT IF EXISTS "reports_estado_check";
DROP INDEX IF EXISTS "public"."reports_riesgo_idx";
DROP INDEX IF EXISTS "public"."reports_estado_idx";
ALTER TABLE "public"."reports" DROP COLUMN IF EXISTS "riesgo";
ALTER TABLE "public"."reports" DROP COLUMN IF EXISTS "estado";
ALTER TABLE "public"."reports" DROP COLUMN IF EXISTS "criticidad";

-- Índice para filtrar por antigüedad (reportes activos < 24 hs)
CREATE INDEX IF NOT EXISTS "reports_created_at_idx" ON "public"."reports" ("created_at");

-- =====================================================================
-- BACKFILL: las filas existentes quedaron con los puntajes en 0.
-- Se infieren acá con las mismas heurísticas del frontend (mapDbRowToReport)
-- para que el puntaje funcione de inmediato. De ahora en más, la Edge
-- Function telegram-bot persiste estos valores al ingestar.
-- =====================================================================

UPDATE "public"."reports" SET
  "puntaje_descripcion" = CASE
    WHEN "descripcion" ILIKE '%evacuad%' THEN 35
    WHEN "descripcion" ILIKE '%no se puede circular%'
      OR "descripcion" ILIKE '%no se puede transitar%'
      OR "descripcion" ILIKE '%imposible circular%'
      OR "descripcion" ILIKE '%no estan entrando%'
      OR "descripcion" ILIKE '%no están entrando%' THEN 10
    WHEN "descripcion" ILIKE '%casa%'
      OR "descripcion" ILIKE '%vivienda%'
      OR "descripcion" ILIKE '%hogar%'
      OR "descripcion" ILIKE '%habitacion%'
      OR "descripcion" ILIKE '%habitación%'
      OR "descripcion" ILIKE '%patio%'
      OR "descripcion" ILIKE '%domicilio%' THEN 20
    ELSE 5
  END,
  "puntaje_foto" = CASE
    WHEN "foto_url" IS NOT NULL AND "foto_url" <> '' THEN 5
    ELSE 0
  END,
  "puntaje_clima" = CASE
    WHEN "lluvia_mm" IS NULL THEN 0
    WHEN "lluvia_mm" <= 10 THEN 0
    WHEN "lluvia_mm" <= 25 THEN 5
    WHEN "lluvia_mm" <= 50 THEN 10
    ELSE 20
  END;

UPDATE "public"."reports" SET
  "puntaje_base" = "puntaje_descripcion" + "puntaje_foto" + "puntaje_clima";
