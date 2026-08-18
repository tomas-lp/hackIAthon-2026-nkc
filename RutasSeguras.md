# Sistema de rutas seguras

# Arquitectura General

```
Ciudadano

↓

Aplicación Web

↓

Selecciona destino o refugio

↓

Motor de navegación (GraphHopper)

↓

Consulta mapa de calor

↓

Calcula el costo de cada calle

↓

Obtiene la ruta óptima

↓

Leaflet dibuja la ruta
```

# Paso 1 – Selección del destino

El usuario puede elegir:

- centros de evacuación (zonas seguras);

La aplicación obtiene:

- posición actual del usuario;
- destino seleccionado.

# Paso 2 – Obtención del mapa de calor

Antes de calcular la ruta, el sistema consulta todos los reclamos activos.

Cada reclamo posee:

- ubicación;
- intensidad;
- fecha;
- evidencia.

Aplicando el descuento por antigüedad se obtiene la intensidad actual de cada reporte.

Con esos datos se genera el mapa de calor utilizado para el cálculo del riesgo.

# Paso 3 – Evaluación de las calles

GraphHopper trabaja sobre la red vial obtenida desde OpenStreetMap. Cada calle está representada por segmentos.

Ejemplo:

```
A -------- B -------- C -------- D
```

Para cada segmento el sistema calcula cuánto riesgo atraviesa.

Por ejemplo:

```
Segmento AB

Riesgo medio = 0.10

Segmento BC

Riesgo medio = 0.75

Segmento CD

Riesgo medio = 0.05
```

Este riesgo se obtiene consultando el mapa de calor alrededor de cada segmento.

# Paso 4 – Asignación del costo de circulación

En un GPS tradicional el costo de una calle depende casi exclusivamente de la distancia y del tiempo.

Ejemplo:

```
Costo = Distancia
```

En este sistema se incorpora el riesgo.

Por ejemplo:

```
Costo = Distancia × (1 + Riesgo × Factor)
```

Donde:

- Riesgo ∈ [0,1]
- Factor define cuánto influye el riesgo en la navegación.

Ejemplo:

| Calle   | Distancia | Riesgo | Costo |
| ------- | --------- | ------ | ----- |
| Calle A | 100 m     | 0.10   | 120   |
| Calle B | 100 m     | 0.80   | 260   |
| Calle C | 100 m     | 1.00   | 300   |

De esta forma las calles peligrosas dejan de ser atractivas para el algoritmo.

# Paso 5 – Cálculo de la ruta

GraphHopper utiliza algoritmos de búsqueda sobre grafos, como A* (A Star), para encontrar el camino con menor costo total.

A diferencia de un GPS convencional, el costo ya no representa únicamente la distancia recorrida, sino una combinación entre distancia y nivel de riesgo.

Por este motivo, el sistema puede preferir una ruta más larga si resulta considerablemente más segura.

Ejemplo:

```
Ruta 1

3 km

Riesgo alto

Costo = 900
```

```
Ruta 2

4 km

Riesgo bajo

Costo = 420
```

El algoritmo seleccionará la Ruta 2.

# Paso 6 – Visualización

Una vez obtenida la ruta, GraphHopper devuelve una polilínea con las coordenadas.

Leaflet únicamente representa esa información sobre el mapa.

La interfaz mostrará simultáneamente:

- mapa base;
- mapa de calor;
- ubicación del usuario;
- refugios;
- ruta segura.

# Actualización dinámica

El riesgo cambia constantemente.

Cada nuevo reclamo modifica el mapa de calor.

Por ese motivo la aplicación puede recalcular automáticamente la ruta cuando ocurre alguno de estos eventos:

- ingreso de un nuevo reclamo cercano;
- desaparición de reclamos antiguos;
- aumento significativo del riesgo;
- cambio de ubicación del usuario.

De esta manera la navegación se adapta en tiempo real a la evolución de la emergencia.

# Arquitectura técnica

```
Telegram

↓

Supabase

↓

Reportes

↓

Motor de Intensidades

↓

Leaflet.heat

↓

Mapa de calor

↓

Motor de Riesgo

↓

GraphHopper

↓

Ruta óptima

↓

Leaflet
```
