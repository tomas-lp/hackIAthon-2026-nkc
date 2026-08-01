export interface WeatherAlertInfo {
  locality: string;
  hasActiveAlert: boolean;
  alertLevel?: "AMARILLA" | "NARANJA" | "ROJA" | "NINGUNA";
  title?: string;
  description?: string;
}

const MOCK_WEATHER_ALERTS: Record<string, WeatherAlertInfo> = {
  Capital: {
    locality: "Capital",
    hasActiveAlert: true,
    alertLevel: "NARANJA",
    title: "Alerta Naranja por Lluvias y Tormentas Fuertes",
    description:
      "Precipitación acumulada estimada entre 60 y 90 mm en lapsos cortos.",
  },
  "Paso de los Libres": {
    locality: "Paso de los Libres",
    hasActiveAlert: true,
    alertLevel: "ROJA",
    title: "Alerta Roja por Inundación y Tormenta Severa",
    description:
      "Precipitaciones extremas, granizo y ráfagas superiores a 80 km/h.",
  },
  Goya: {
    locality: "Goya",
    hasActiveAlert: true,
    alertLevel: "NARANJA",
    title: "Alerta Naranja por Crecida y Tormenta",
    description: "Abundante caída de agua y sudestada costera.",
  },
  Mercedes: {
    locality: "Mercedes",
    hasActiveAlert: false, // Weather API reports NO storm/rain alert active here!
    alertLevel: "NINGUNA",
    title: "Sin Alerta Meteorológica",
    description: "Condiciones estables. Precipitación 0mm.",
  },
  Ituzaingó: {
    locality: "Ituzaingó",
    hasActiveAlert: true,
    alertLevel: "AMARILLA",
    title: "Alerta Amarilla por Lluvias Moderadas",
    description: "Lluvias de variada intensidad.",
  },
  "Bella Vista": {
    locality: "Bella Vista",
    hasActiveAlert: true,
    alertLevel: "NARANJA",
    title: "Alerta Naranja por Tormentas y Granizo",
    description: "Probable caída de granizo y anegamientos en zonas bajas.",
  },
  "Curuzú Cuatiá": {
    locality: "Curuzú Cuatiá",
    hasActiveAlert: false, // Weather API reports NO storm/rain alert active here!
    alertLevel: "NINGUNA",
    title: "Sin Alerta Meteorológica",
    description: "Cielo nublado sin registro de precipitaciones.",
  },
  "Santo Tomé": {
    locality: "Santo Tomé",
    hasActiveAlert: true,
    alertLevel: "AMARILLA",
    title: "Alerta Amarilla por Tormentas Aisladas",
    description: "Chubascos fuertes de corta duración.",
  },
  Esquina: {
    locality: "Esquina",
    hasActiveAlert: true,
    alertLevel: "NARANJA",
    title: "Alerta Naranja por Desborde de Cauces",
    description: "Acumulados severos por frente frío copioso.",
  },
  "Monte Caseros": {
    locality: "Monte Caseros",
    hasActiveAlert: false, // Weather API reports NO storm/rain alert active here!
    alertLevel: "NINGUNA",
    title: "Sin Alerta Meteorológica",
    description: "Tiempo seco y vientos moderados.",
  },
};

export class WeatherService {
  static getWeatherAlert(locality?: string): WeatherAlertInfo {
    if (!locality || !MOCK_WEATHER_ALERTS[locality]) {
      return {
        locality: locality || "Desconocida",
        hasActiveAlert: true, // fallback default
        alertLevel: "AMARILLA",
        title: "Alerta Amarilla por Lluvias",
        description: "Registros pluviométricos en observación.",
      };
    }
    return MOCK_WEATHER_ALERTS[locality];
  }

  static isWeatherAlertActive(locality?: string): boolean {
    const alert = this.getWeatherAlert(locality);
    return alert.hasActiveAlert;
  }
}
