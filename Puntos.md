# Sistema de puntos v2.1

# 1. Recepción del reclamo

El ciudadano envía un reporte mediante Telegram.

El bot solicita:

- descripción del problema;
- ubicación;
- fotografía (opcional).

Toda esta información constituye la evidencia inicial del incidente.

# 2. Procesamiento mediante IA

Un agente de IA analiza el contenido del reclamo y genera una representación estructurada. El objetivo no es solamente clasificar el reporte, sino interpretar la magnitud del evento. El agente debe determinar:

- tipo de incidente (tipo).
- gravedad estimada (puntaje_descripcion).
- analizar la imagen y definir si es valida en relación a problemas climáticos o de inundaciones (puntaje_foto**).**
- analizar el clima actual y definir un puntaje (puntaje_clima**).**
- Y la intensidad del reclamo (puntaje base).

# 3. Validación de evidencia

El sistema incrementa la confiabilidad del reclamo utilizando otras fuentes de información.

1. Evidencia fotográfica: Si el usuario adjunta una fotografía, un agente de IA verifica que corresponda realmente a una inundación o emergencia climática. En caso afirmativo, aumenta la intensidad del reclamo.
2. Validación meteorológica: Se consulta Open-Meteo utilizando las coordenadas del reporte. Si existe precipitación reciente, el reclamo gana mayor credibilidad.

# 4. Cálculo de la intensidad del reclamo

Cada reporte obtiene una **intensidad**, que representa la cantidad de evidencia que aporta al sistema. Esto sería lo que actualmente es el sistema de puntos por reclamo, que se guarda en la BD como `puntaje_base` y luego se le aplica el descontador por antiguedad.

## Componentes:

### Gravedad detectada por IA (Actual análisis de la descripción)

| Situación                  | Puntos |
| -------------------------- | ------ |
| Agua sobre la calle        | +5     |
| Calle parcialmente anegada | +10    |
| No se puede circular       | +20    |
| Agua dentro de viviendas   | +35    |
| Personas evacuadas         | +50    |

### Evidencia fotográfica

| Evidencia   | Puntos |
| ----------- | ------ |
| Foto válida | +5     |

### Validación climática

| Precipitación | Puntos |
| ------------- | ------ |
| 0–10 mm       | +0     |
| 11–25 mm      | +5     |
| 26–50 mm      | +10    |
| Más de 50 mm  | +20    |

La intensidad final queda:

```
(Gravedad + Foto + Clima)
```

# 5. Influencia temporal

Los reclamos pierden importancia con el tiempo. La intensidad almacenada en BD nunca cambia. Lo que disminuye es su influencia sobre el mapa y lo que se muestra. Esto implica refrescar el mapa cada tanto para actualizar las intensidades de los pines.

| Antigüedad       | Multiplicador |
| ---------------- | ------------- |
| Menos de 2 horas | ×1            |
| 2–6 horas        | ×0.8          |
| 6–12 horas       | ×0.6          |
| 12–24 horas      | ×0.4          |
| Más de 24 horas  | ×0            |

Pasadas las 24 horas el reclamo deja de participar en el cálculo del riesgo.

# 6. Generación del mapa de calor

Cada reclamo deja de representar un punto aislado y se convierte en una fuente de influencia sobre el territorio. La intensidad es máxima en el lugar del incidente y disminuye gradualmente con la distancia. Cuando varias influencias se superponen, el riesgo aumenta de forma natural.

Se utilizará **Leaflet.heat**, que permite generar mapas de calor a partir de una lista de puntos con intensidad. Cada reclamo será convertido a:

```
latitud

longitud

intensidad
```

Ejemplo:

```
[
    [-27.47,-58.83,0.82],
    [-27.48,-58.82,0.35],
    [-27.46,-58.81,0.67]
]
```

La librería combinará automáticamente las influencias de todos los reclamos para construir el mapa.

## Cálculo de la intensidad mostrada

Cada vez que la aplicación actualiza el mapa:

1. Consulta todos los reclamos activos (menos de 24 horas).
2. Para cada reclamo calcula su intensidad actual aplicando el factor de antigüedad.
3. Normaliza la intensidad a un valor entre 0 y 1.
4. Genera una lista con el formato requerido por Leaflet.heat:

```
[
  [latitud,longitud,intensidad_normalizada],
  ...
]
```

Esta lista constituye la única entrada del mapa de calor.

## Superposición de intensidades

Leaflet.heat representa cada reclamo como una distribución radial de intensidad alrededor de su ubicación. La forma de esa distribución está determinada por los parámetros `radius` y `blur`.

Cuando las áreas de influencia de dos o más reclamos se superponen, la librería suma automáticamente sus intensidades y genera zonas de mayor concentración visual.

Esto significa que:

- varios reclamos leves muy cercanos pueden producir una zona de riesgo alto;
- un reclamo aislado de alta intensidad genera una mancha localizada;
- los reclamos distribuidos en distintos puntos producen varias manchas independientes.

## Área de Influencia (Radio Físico)

Cada reporte afecta a un área geográfica específica a su alrededor:

- Alcance Físico: El sistema asigna un radio de influencia de **100 metros** a la redonda por cada reclamo.
- Escala Dinámica: El mapa ajusta el tamaño visual del radio automáticamente según el nivel de acercamiento (zoom), garantizando que siempre represente la misma distancia en el terreno.
- Límites Visuales: Se aplican restricciones de tamaño mínimo y máximo para asegurar la legibilidad del mapa y prevenir un consumo excesivo de recursos en los dispositivos de visualización.

## Generación del Mapa de Calor e Intersección

La visualización de los colores se determina a partir del puntaje de los reportes y su concentración geográfica, bajo las siguientes reglas:

1. **Límite de Intensidad y Opacidad:** El sistema establece un umbral de máxima intensidad configurado en **80 puntos**. El puntaje de cada reporte se divide por este valor para determinar su nivel de opacidad base (fuerza de presencia en el mapa).
2. **Superposición e Intersección:** Cuando las áreas de influencia de **100 metros** de múltiples reportes se cruzan, **sus niveles de opacidad se suman de forma acumulativa en las zonas de intersección**. Esto significa que varios reportes leves cercanos pueden generar la misma presencia que un solo reporte grave.
3. **Escala Cromática:** El mapa aplica un gradiente de colores basado en la opacidad final acumulada en cada zona del terreno:
   - **Azul:** Niveles bajos de acumulación.
   - **Verde y Amarillo:** Niveles medios.
   - **Naranja:** Niveles altos.
   - **Rojo:** Niveles críticos.

## Configuración Técnica

Los parámetros que controlan las reglas de visualización, área de influencia e intensidades se encuentran definidos en el archivo `lib/heatmap.ts`. A continuación se presenta el bloque de código que rige este comportamiento:

````markdown
```typescript
export const HEATMAP_CONFIG: HeatmapConfig = {
  radius: 30, // Proporción interna del pincel para el difuminado visual.
  blur: 20, // Nivel de suavizado en los bordes de cada mancha.
  radiusMeters: 100, // Área de influencia física real de cada reporte (100 metros).
  maxZoom: 12, // Nivel de acercamiento base para la escala gráfica.
  minOpacity: 0.05, // Opacidad mínima requerida para dibujar un punto.
  gradient: {
    // Escala cromática aplicada sobre la opacidad final.
    0.2: "#3b82f6", // Azul
    0.4: "#22c55e", // Verde
    0.6: "#eab308", // Amarillo
    0.8: "#f97316", // Naranja
    1.0: "#ef4444", // Rojo
  },
  maxIntensity: 80, // Umbral de intensidad máxima para regular la opacidad (y alcanzar el rojo).
};
```
````

```

```
