-- Añade columnas tipadas a "public"."reports" (tipo, riesgo, estado)
-- para poder filtrar en SQL (push-down) en lugar de inferir por heurística
-- al leer las filas desde el frontend.

-- Los valores replican exactamente los dominios de types/report.ts:
--   ReportType:        INUNDACION_URBANA, LLUVIAS_FUERTES, GRANIZO, ANEGAMIENTO_VIVIENDA
--   RiskLevel:         BAJO, MEDIO, ALTO, CRITICO
--   ValidationStatus:  VALIDADO_CLIMA, PENDIENTE_VALIDACION, DESESTIMADO_SIN_ALERTA, DESESTIMADO_IRRELEVANTE

-- tipo: tipo de incidente (antes se infería de la descripción en el frontend)
ALTER TABLE "public"."reports"
  ADD COLUMN IF NOT EXISTS "tipo" "text"
  CONSTRAINT "reports_tipo_check" CHECK ("tipo" IN ('INUNDACION_URBANA', 'LLUVIAS_FUERTES', 'GRANIZO', 'ANEGAMIENTO_VIVIENDA'));

-- riesgo: nivel de riesgo (mapea 1:1 a la criticidad del bot: ROJA→CRITICO, NARANJA→ALTO, AMARILLA→MEDIO)
ALTER TABLE "public"."reports"
  ADD COLUMN IF NOT EXISTS "riesgo" "text"
  CONSTRAINT "reports_riesgo_check" CHECK ("riesgo" IN ('BAJO', 'MEDIO', 'ALTO', 'CRITICO'));

-- estado: resultado de la validación contra el clima
ALTER TABLE "public"."reports"
  ADD COLUMN IF NOT EXISTS "estado" "text"
  CONSTRAINT "reports_estado_check" CHECK ("estado" IN ('VALIDADO_CLIMA', 'PENDIENTE_VALIDACION', 'DESESTIMADO_SIN_ALERTA', 'DESESTIMADO_IRRELEVANTE'));

-- Índices para los filtros más frecuentes del dashboard
CREATE INDEX IF NOT EXISTS "reports_tipo_idx" ON "public"."reports" ("tipo");
CREATE INDEX IF NOT EXISTS "reports_riesgo_idx" ON "public"."reports" ("riesgo");
CREATE INDEX IF NOT EXISTS "reports_estado_idx" ON "public"."reports" ("estado");

-- =====================================================================
-- BACKFILL: las filas existentes quedaron con las columnas en NULL.
-- Se infieren acá con las mismas heurísticas que usa el frontend
-- (mapDbRowToReport) para que el filtrado en SQL funcione de inmediato.
-- De ahora en más, la Edge Function telegram-bot persiste estos valores
-- al ingestar, por lo que este backfill no vuelve a correr.
-- =====================================================================

UPDATE "public"."reports" SET "tipo" =
  CASE
    WHEN "descripcion" ILIKE '%inund%' THEN 'INUNDACION_URBANA'
    WHEN "descripcion" ILIKE '%lluv%' THEN 'LLUVIAS_FUERTES'
    WHEN "descripcion" ILIKE '%graniz%' THEN 'GRANIZO'
    WHEN "descripcion" ILIKE '%aneg%' THEN 'ANEGAMIENTO_VIVIENDA'
    WHEN "descripcion" ILIKE '%corte%' OR "descripcion" ILIKE '%ruta%' THEN 'INUNDACION_URBANA'
    WHEN "descripcion" ILIKE '%rescat%' THEN 'ANEGAMIENTO_VIVIENDA'
    ELSE 'INUNDACION_URBANA'
  END
WHERE "tipo" IS NULL AND "descripcion" IS NOT NULL AND "descripcion" <> '';

UPDATE "public"."reports" SET "riesgo" =
  CASE
    WHEN "criticidad" ILIKE '%ROJA%' THEN 'CRITICO'
    WHEN "criticidad" ILIKE '%NARANJA%' THEN 'ALTO'
    WHEN "criticidad" ILIKE '%AMARILLA%' THEN 'MEDIO'
    ELSE 'BAJO'
  END
WHERE "riesgo" IS NULL;

UPDATE "public"."reports" SET "estado" =
  CASE
    WHEN "clima_fuente" IS NULL OR "clima_fuente" = 'Desconocida' THEN 'PENDIENTE_VALIDACION'
    WHEN "lluvia_mm" IS NULL THEN 'PENDIENTE_VALIDACION'
    WHEN "lluvia_mm" > 0 THEN 'VALIDADO_CLIMA'
    ELSE 'DESESTIMADO_SIN_ALERTA'
  END
WHERE "estado" IS NULL;
