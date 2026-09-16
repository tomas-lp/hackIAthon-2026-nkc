# Plan técnico: integración de barrios formales

## Objetivo

Incorporar barrios formales de fuentes oficiales —principalmente IDECorr— sin duplicar los barrios existentes, sin alterar los reportes históricos y sin mezclar barrios formales con barrios populares, villas o asentamientos.

Fuentes iniciales:

- Visor IDECorr: <https://ide.corrientes.gob.ar/visor/>
- GeoServer WFS: <https://geoportal.corrientes.gob.ar/geoserver/planeamiento_urbano_ide/ows>
- Capa: `planeamiento_urbano_ide:Barrios_por_Municipio`
- Repositorio: <https://github.com/GisSusti/IdeCorr-Open-Data/tree/main/Barrios>

La capa WFS relevada contiene 450 polígonos en 14 localidades. El repositorio contiene una copia estática; el WFS debe considerarse la fuente viva.

## Estado de implementación

La arquitectura y la primera importación ya fueron ejecutadas en el entorno Supabase. El script local se conserva para futuras cargas manuales:

- `supabase/migrations/20260915090000_formal_geodata_import.sql`: metadatos, staging, auditoría, matching y aplicación controlada para barrios y centros de salud.
- `scripts/import-idecorr-geodata.mjs`: descarga y carga local controlada de barrios formales y únicamente Hospital, CAPS y SAPS.
- `supabase/functions/update-health-centers/index.ts`: la sincronización OSM queda aislada de los registros IDECorr/manuales y desactiva únicamente sus propios registros ausentes.
- `src/services/healthCenterService.ts`: oculta centros marcados como inactivos.

La primera carga sigue siendo deliberadamente manual: el staging clasifica candidatos y solo un `apply` con IDs aprobados inserta nuevos registros.

## Principios

1. `public.barrios` continúa siendo la fuente canónica del mapa.
2. Toda fuente externa se carga primero en staging.
3. No se elimina ningún barrio actual automáticamente.
4. La localidad forma parte de la identidad lógica del barrio.
5. Los IDs del WFS no se usan como identificadores permanentes.
6. Cada importación es auditable y reversible.
7. Las diferencias geométricas quedan para revisión durante la primera etapa.
8. Solo se procesan barrios formales.

## Alcance

Incluido:

- barrios actuales del sistema;
- barrios formales de IDECorr;
- barrios formales de IN.VI.CO;
- barrios respaldados por municipios, catastros u ordenanzas;
- OSM únicamente como respaldo cuando no exista fuente oficial.

Excluido inicialmente:

- RENABAP;
- barrios populares;
- villas y asentamientos;
- capas de emergencia habitacional.

## Estado actual

La tabla existente es conceptualmente:

```text
public.barrios
├── id uuid
├── osm_id bigint
├── nombre text
├── ciudad text
├── geom geometry(MultiPolygon, 4326)
├── created_at timestamptz
└── updated_at timestamptz
```

El mapa consume `get_barrios_geojson()`. Los reportes utilizan la geometría para resolver el barrio correspondiente a un punto. La primera integración debe conservar este contrato.

## Arquitectura

```text
IDECorr WFS
    │
    ▼
barrios_import_staging
    │
    ├─ normalización de nombres y localidades
    ├─ validación geométrica
    └─ matching por nombre + localidad + geometría
          │
          ├─ nuevo ───────────────► public.barrios
          ├─ existente ──────────► registrar fuente, sin duplicar
          └─ conflicto ──────────► revisión manual
```

## Modelo de datos propuesto

### `public.barrios`

Se conserva la tabla y se agregan campos de trazabilidad:

```text
tipo              text
fuente_principal  text
localidad         text
nombre_oficial    text
fecha_fuente      timestamptz
url_fuente        text
estado_validacion text
```

Valores iniciales:

```text
tipo = formal
fuente_principal = Actual | IDECorr | IN.VI.CO | Municipalidad | OSM
estado_validacion = validado | pendiente | rechazado
```

Los registros actuales se marcarían inicialmente como `formal`, fuente `Actual` y estado `validado`. `osm_id` se mantiene por compatibilidad, pero no identifica registros IDECorr.

### `public.barrio_import_runs`

Registra cada ejecución:

```text
id
fuente
url_fuente
iniciado_at
finalizado_at
cantidad_recibida
cantidad_nueva
cantidad_existente
cantidad_revision
estado
```

Estados: `iniciado`, `validado`, `aplicado`, `fallido`, `revertido`.

### `public.barrios_import_staging`

Recibe los datos externos antes de modificar la tabla canónica:

```text
id
import_run_id
nombre_original
localidad_original
area_ha
geom
fuente_id
nombre_normalizado
localidad_normalizada
resultado_match
barrio_existente_id
observaciones
```

Resultados posibles: `nuevo`, `existente`, `posible_duplicado`, `geometria_diferente`, `descartado`.

### Relación de fuentes — segunda etapa

Si el mismo barrio aparece en varias fuentes, conviene agregar:

```text
public.barrio_sources
├── id
├── barrio_id
├── fuente
├── fuente_id
├── nombre_original
├── atributos_originales jsonb
├── url_fuente
├── fecha_obtencion
└── es_fuente_actual
```

Esto permite conservar la relación IDECorr/municipio/OSM sin duplicar el barrio canónico.

## Deduplicación

### 1. Nombre y localidad

Normalizar:

- mayúsculas y minúsculas;
- acentos;
- espacios repetidos;
- diferencias de escritura;
- prefijos como `Barrio`, cuando sean equivalentes.

La clave lógica es:

```text
localidad_normalizada + nombre_normalizado
```

La localidad es obligatoria en la comparación porque existen nombres repetidos en distintos municipios.

### 2. Coincidencia espacial

Para validar coincidencias se calculará el porcentaje de intersección:

```sql
ST_Area(ST_Intersection(nueva.geom, existente.geom))
/
LEAST(ST_Area(nueva.geom), ST_Area(existente.geom))
```

Reglas iniciales:

```text
>= 0.85       mismo barrio probable
0.30 a 0.85   revisión manual
< 0.30        probablemente distinto
```

El cálculo de área debe hacerse en una proyección métrica adecuada, no directamente en grados geográficos.

### 3. Conflictos

Si coincide el nombre pero cambia la geometría:

- no se elimina el registro actual;
- no se actualiza automáticamente;
- se marca `geometria_diferente`;
- se conserva la fuente y la fecha de cada versión;
- se envía a revisión.

## Reglas de incorporación

| Situación                             | Acción                                                 |
| ------------------------------------- | ------------------------------------------------------ |
| Barrio IDECorr nuevo                  | Insertar después de validar                            |
| Mismo barrio y geometría coincidente  | No duplicar; registrar IDECorr como fuente             |
| Mismo nombre y geometría diferente    | Revisión manual                                        |
| Mismo nombre en localidades distintas | Mantener ambos                                         |
| Barrio sin localidad                  | No insertar automáticamente                            |
| Geometría inválida                    | Rechazar y registrar motivo                            |
| ID WFS cambiado                       | No duplicar si coinciden nombre, localidad y geometría |

## Flujo de importación

### Obtener la fuente

```text
service=WFS
version=1.0.0
request=GetFeature
typeName=planeamiento_urbano_ide:Barrios_por_Municipio
outputFormat=application/json
```

### Validar y cargar staging

Verificar GeoJSON, `MultiPolygon`, SRID 4326, nombre, localidad, geometrías válidas y ubicación dentro de Corrientes. Luego guardar los valores originales y normalizados en staging.

### Generar informe

El informe debe mostrar por localidad:

```text
recibidos | nuevos | existentes | posibles duplicados |
geometrías diferentes | rechazados
```

### Revisar y aplicar

La primera revisión debe priorizar Capital, donde ya existe cobertura, y luego Goya, Mercedes, Santo Tomé y Paso de los Libres. Solo se insertan registros aprobados como `nuevo`.

## Cambios previstos en el proyecto

### Base de datos

Nuevo archivo:

```text
supabase/migrations/<timestamp>_formal_barrios_import.sql
```

Debe incorporar los campos de trazabilidad, staging, ejecuciones, índices espaciales y políticas RLS. La migración debe ser aditiva: no borrar ni reemplazar la tabla actual.

### Importador

Proceso previsto:

```text
supabase/functions/import-formal-barrios/index.ts
```

Responsabilidades: consultar IDECorr, validar GeoJSON, convertir geometrías a PostGIS, cargar staging, calcular coincidencias y aplicar únicamente los registros aprobados.

La primera ejecución debe ser manual o protegida. No se debe permitir que una actualización externa modifique barrios automáticamente.

### Servicio existente

```text
src/services/barrioService.ts
```

Debe conservar el contrato actual. El RPC puede sumar propiedades opcionales (`tipo`, `fuente`, `localidad`) sin dejar de devolver `id`, `nombre`, `ciudad` y `report_count`.

### Frontend

No requiere cambios obligatorios en la primera etapa. El mapa y las estadísticas seguirán leyendo el RPC existente.

Como mejora posterior puede agregarse una pantalla administrativa para revisar importaciones, conflictos y rollback.

## Compatibilidad con reportes

No se deben modificar inicialmente:

```text
reports.barrio
get_barrio_for_point()
get_barrios_geojson()
```

Los reportes históricos permanecen intactos. Los barrios nuevos comienzan a recibir reportes una vez aprobados e insertados en `public.barrios`.

Las geometrías de barrios existentes no se actualizan automáticamente durante la primera versión, porque podrían cambiar la asignación histórica de reportes.

## Índices y seguridad

Conservar o crear el índice espacial:

```sql
CREATE INDEX barrios_geom_idx
ON public.barrios
USING gist (geom);
```

Agregar índices para `localidad`, `fuente_principal`, `estado_validacion` e `import_run_id`.

La importación debe ejecutarse mediante el script local con credenciales administrativas o desde otro backend seguro. Nunca debe exponerse la `service_role` al frontend. Staging e importaciones deben ser de acceso administrativo; el acceso público queda limitado a barrios canónicos validados.

## Rollback

Cada registro nuevo queda asociado a `import_run_id`. Ante una carga incorrecta:

1. marcar la ejecución como `revertido`;
2. eliminar únicamente los barrios creados por esa ejecución;
3. conservar staging para auditoría;
4. no modificar barrios anteriores, reportes ni usuarios.

Las actualizaciones de geometría quedan fuera del rollback automático durante la primera etapa.

## Fases

### Fase 1 — esquema

- agregar trazabilidad;
- crear staging y ejecuciones;
- agregar índices y políticas;
- no modificar cobertura actual.

### Fase 2 — importación seca

- consultar IDECorr;
- cargar los 450 features en staging;
- ejecutar matching;
- revisar Capital y localidades del interior;
- no insertar todavía.

### Fase 3 — incorporación

- insertar solo barrios clasificados como `nuevo`;
- asociar fuente IDECorr;
- conservar los existentes;
- registrar la ejecución como `aplicado`.

### Fase 4 — validación

- comprobar mapa;
- comprobar estadísticas y conteos;
- probar reverse lookup por coordenadas;
- revisar muestras visuales;
- ejecutar controles de duplicados.

### Fase 5 — actualización controlada

- consultar nuevamente el WFS;
- detectar altas, bajas y cambios;
- proponer cambios sin aplicarlos automáticamente;
- mantener histórico de fuentes.

## Criterios de aceptación

- no se duplica ningún barrio existente;
- se conserva la cobertura actual;
- se incorporan barrios nuevos aprobados;
- cada registro tiene fuente y fecha;
- los conflictos quedan visibles;
- el mapa continúa usando el RPC actual;
- los reportes históricos conservan su comportamiento;
- la importación puede revertirse por ejecución;
- no se incorporan barrios populares, villas ni asentamientos.

## Decisiones pendientes

1. Confirmar si `ciudad` seguirá representando localidad o si se agrega `localidad` sin reemplazarlo.
2. Definir quién aprueba los conflictos geométricos.
3. Decidir si la trazabilidad se guarda directamente en `barrios` o mediante `barrio_sources`.
4. Confirmar si la primera carga cubre solo las 14 localidades IDECorr o deja listo el staging para fuentes municipales.
5. Definir frecuencia futura de actualización.
