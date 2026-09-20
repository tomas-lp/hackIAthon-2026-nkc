import { WEATHER_API_KEY, TIMEOUTS } from "./constants.ts";

export interface WeatherInfo {
  temp_c: number;
  condition: string;
  precip_mm: number;
  fuente: "Open-Meteo" | "WeatherAPI";
}

const WMO_CONDITIONS: Record<number, string> = {
  0: "Cielo despejado",
  1: "Mayormente despejado",
  2: "Parcialmente nublado",
  3: "Nublado",
  45: "Niebla",
  48: "Niebla con escarcha",
  51: "Llovizna ligera",
  53: "Llovizna moderada",
  55: "Llovizna densa",
  56: "Llovizna helada ligera",
  57: "Llovizna helada densa",
  61: "Lluvia ligera",
  63: "Lluvia moderada",
  65: "Lluvia fuerte",
  66: "Lluvia helada ligera",
  67: "Lluvia helada fuerte",
  71: "Nevada ligera",
  73: "Nevada moderada",
  75: "Nevada fuerte",
  77: "Granos de nieve",
  80: "Chubascos ligeros",
  81: "Chubascos moderados",
  82: "Chubascos violentos",
  85: "Chubascos de nieve ligeros",
  86: "Chubascos de nieve fuertes",
  95: "Tormenta eléctrica",
  96: "Tormenta eléctrica con granizo leve",
  99: "Tormenta eléctrica con granizo fuerte",
};

function wmoCodeToCondition(code?: number): string {
  if (code === undefined || code === null) return "Despejado";
  return WMO_CONDITIONS[code] || "Variable";
}

async function fetchOpenMeteo(
  lat: number,
  lon: number,
  signal: AbortSignal
): Promise<WeatherInfo | null> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,precipitation&hourly=precipitation&daily=precipitation_sum&timezone=auto&past_days=1&forecast_days=1`;

  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const data = await res.json();

  const nowStr = data.current?.time;
  let last24hMm = 0;

  if (
    Array.isArray(data.hourly?.time) &&
    Array.isArray(data.hourly?.precipitation)
  ) {
    const times: string[] = data.hourly.time;
    const precips: number[] = data.hourly.precipitation;
    let endIdx = nowStr ? times.findIndex((t) => t > nowStr) : times.length;
    if (endIdx === -1) endIdx = times.length;
    const startIdx = Math.max(0, endIdx - 24);
    last24hMm = precips
      .slice(startIdx, endIdx)
      .reduce((sum, p) => sum + (Number(p) || 0), 0);
  } else if (Array.isArray(data.daily?.precipitation_sum)) {
    last24hMm =
      data.daily.precipitation_sum[data.daily.precipitation_sum.length - 1] ??
      0;
  }

  return {
    temp_c: Math.round((data.current?.temperature_2m ?? 0) * 10) / 10,
    condition: wmoCodeToCondition(data.current?.weather_code),
    precip_mm: Math.round(Math.max(0, last24hMm) * 10) / 10,
    fuente: "Open-Meteo",
  };
}

async function fetchWeatherAPIFallback(
  lat: number,
  lon: number,
  signal: AbortSignal
): Promise<WeatherInfo | null> {
  if (!WEATHER_API_KEY) return null;

  // Intento A: Forecast diario para acumulación
  try {
    const res = await fetch(
      `https://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}&q=${lat},${lon}&days=1&aqi=no&alerts=no&lang=es`,
      { signal }
    );
    if (res.ok) {
      const data = await res.json();
      const dailyPrecip =
        data.forecast?.forecastday?.[0]?.day?.totalprecip_mm ??
        data.current?.precip_mm ??
        0;
      return {
        temp_c: data.current?.temp_c ?? 0,
        condition: data.current?.condition?.text ?? "Desconocido",
        precip_mm: Math.round(Number(dailyPrecip) * 10) / 10,
        fuente: "WeatherAPI",
      };
    }
  } catch {
    // Si forecast falla, intentar con current.json
  }

  // Intento B: Current de respaldo
  try {
    const res = await fetch(
      `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${lat},${lon}&lang=es`,
      { signal }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      temp_c: data.current?.temp_c ?? 0,
      condition: data.current?.condition?.text ?? "Desconocido",
      precip_mm: Math.round((Number(data.current?.precip_mm) || 0) * 10) / 10,
      fuente: "WeatherAPI",
    };
  } catch {
    return null;
  }
}

export async function fetchCurrentWeather(
  lat: number,
  lon: number
): Promise<WeatherInfo | null> {
  // 1. PRIORITARIO: Open-Meteo (acumulado 24h real sin API key)
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), TIMEOUTS.weather);
    const openMeteoResult = await fetchOpenMeteo(lat, lon, controller.signal);
    clearTimeout(id);

    if (openMeteoResult) {
      return openMeteoResult;
    }
  } catch (err) {
    console.warn("Open-Meteo falló, activando fallback a WeatherAPI:", err);
  }

  // 2. FALLBACK: WeatherAPI (acumulado diario o actual)
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), TIMEOUTS.weather);
    const weatherApiResult = await fetchWeatherAPIFallback(
      lat,
      lon,
      controller.signal
    );
    clearTimeout(id);

    if (weatherApiResult) {
      return weatherApiResult;
    }
  } catch (err) {
    console.error("Error en fallback de WeatherAPI:", err);
  }

  return null;
}
