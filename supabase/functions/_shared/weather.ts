import { WEATHER_API_KEY, TIMEOUTS } from "./constants.ts";

export async function fetchCurrentWeather(lat: number, lon: number) {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), TIMEOUTS.weather);

    const res = await fetch(
      `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${lat},${lon}&lang=es`,
      { signal: controller.signal }
    );
    clearTimeout(id);

    if (!res.ok) return null;
    const data = await res.json();
    return {
      temp_c: data.current.temp_c,
      condition: data.current.condition.text,
      precip_mm: data.current.precip_mm,
    };
  } catch (err) {
    console.error("Error fetching weather:", err);
    return null;
  }
}
