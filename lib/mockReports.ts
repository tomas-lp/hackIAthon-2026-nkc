import { Report, ReportType, RiskLevel } from "@/types/report";
import { GrokAgentService } from "@/services/grokAgentService";

interface CityCenter {
  name: string;
  lat: number;
  lng: number;
}

const CITIES: CityCenter[] = [
  { name: "Capital", lat: -27.4692, lng: -58.8306 },
  { name: "Paso de los Libres", lat: -29.7125, lng: -57.0883 },
  { name: "Goya", lat: -29.14, lng: -59.2642 },
  { name: "Mercedes", lat: -29.1842, lng: -58.0753 }, // Weather API: No Active Rain
  { name: "Ituzaingó", lat: -27.5975, lng: -56.6806 },
  { name: "Bella Vista", lat: -28.5081, lng: -59.045 },
  { name: "Curuzú Cuatiá", lat: -29.7917, lng: -58.0544 }, // Weather API: No Active Rain
  { name: "Santo Tomé", lat: -28.5494, lng: -56.0408 },
  { name: "Esquina", lat: -30.0144, lng: -59.6017 },
  { name: "Monte Caseros", lat: -30.2547, lng: -57.6008 }, // Weather API: No Active Rain
];

const TELEGRAM_RAIN_MESSAGES: Record<ReportType, string[]> = {
  INUNDACION_URBANA: [
    "⚠️ Alerta vecinos: La calle principal está totalmente tapada de agua de vereda a vereda tras la tormenta.",
    "No se puede circular en auto por la avenida, la lluvia desbordó el nivel de las calles.",
    "Agua estancada que supera los 40 cm en la esquina principal tras las precipitaciones de esta madrugada.",
    "Calle inundada por acumulación directa de lluvia. Colectivos no están entrando al barrio.",
    "Anegamiento total de la calzada por lluvias continuas de gran intensidad.",
  ],
  LLUVIAS_FUERTES: [
    "🌧️ Lluvia torrencial sin parar desde hace 2 horas. Imposible salir a la calle.",
    "Intensas precipitaciones acumulando más de 50mm en pocos minutos.",
    "Tormenta muy fuerte con descarga eléctrica y ráfagas que anegan la zona.",
    "Alerta por lluvias continuas y visibilidad casi nula en accesos.",
    "Caída masiva de agua anegando esquinas bajas.",
  ],
  GRANIZO: [
    "🧊 Caída de granizo de gran tamaño dañando techos y canaletas.",
    "Granizada fuerte acompañada de viento helado y lluvias copiosas.",
    "Temporal con piedras de hielo afectando las viviendas del sector.",
    "Granizo intenso derritiéndose y colapsando desagües pluviales.",
    "Caída repentina de granizo junto a tormenta eléctrica.",
  ],
  ANEGAMIENTO_VIVIENDA: [
    "🚨 El agua de lluvia comenzó a entrar a las casas del barrio. Necesitamos asistencia.",
    "Agua ingresando por los patios y puerta principal debido a la intensa precipitación.",
    "Familias con agua dentro de las viviendas tras la tormenta severa.",
    "Anegamiento de domicilio por acumulación inmediata de lluvia.",
    "Pidiendo bolsas de arena porque el agua de la lluvia está por entrar a las habitaciones.",
  ],
};

const TELEGRAM_IRRELEVANT_MESSAGES = [
  "Hola alguien sabe a qué hora abre la panadería hoy?",
  "Vendo bicicleta rodado 29 en excelente estado contactar al privado.",
  "Se me perdió un perro caniche blanco por el centro por favor avisar.",
  "Busco alquilar departamento de 2 ambientes en zona céntrica.",
  "Reporto árbol caído en el patio pero no hay lluvia ni viento.",
];

const TELEGRAM_USERS = [
  "@vecino_corrientes",
  "@marcos_ctes",
  "@alerta_goya",
  "@defensa_civil_bot",
  "@caro_libres",
  "@rodrigo_mercedes",
  "@valeria_ituzaingo",
  "@silvia_bellavista",
  "@lucas_curuzu",
  "@matias_santotome",
  "@sofi_esquina",
  "@juan_montecaseros",
  "@vecino_alerta_inu",
  "@ciudadano_ctes",
  "@bot_telegram_user",
];

function pseudoRandom(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

function generateMockReports(): Report[] {
  const reports: Report[] = [];
  const types: ReportType[] = [
    "INUNDACION_URBANA",
    "LLUVIAS_FUERTES",
    "GRANIZO",
    "ANEGAMIENTO_VIVIENDA",
  ];
  const risks: RiskLevel[] = ["BAJO", "MEDIO", "ALTO", "CRITICO"];

  let idCounter = 1;
  let seed = 303;

  CITIES.forEach((city, cityIndex) => {
    const countForCity = cityIndex < 4 ? 10 : 10;

    for (let i = 0; i < countForCity; i++) {
      const typeIndex = Math.floor(pseudoRandom(seed++) * types.length);
      const riskIndex = Math.floor(pseudoRandom(seed++) * risks.length);
      const selectedType = types[typeIndex];
      const selectedRisk = risks[riskIndex];

      const isIrrelevantMsg = pseudoRandom(seed++) < 0.1;

      let rawTelegramMessage = "";
      if (isIrrelevantMsg) {
        const irrIndex = Math.floor(
          pseudoRandom(seed++) * TELEGRAM_IRRELEVANT_MESSAGES.length
        );
        rawTelegramMessage = TELEGRAM_IRRELEVANT_MESSAGES[irrIndex];
      } else {
        const msgList = TELEGRAM_RAIN_MESSAGES[selectedType];
        const msgIndex = Math.floor(pseudoRandom(seed++) * msgList.length);
        rawTelegramMessage = msgList[msgIndex];
      }

      const userIndex = Math.floor(
        pseudoRandom(seed++) * TELEGRAM_USERS.length
      );

      const latOffset = (pseudoRandom(seed++) - 0.5) * 0.07;
      const lngOffset = (pseudoRandom(seed++) - 0.5) * 0.07;

      const hoursAgo = Math.floor(pseudoRandom(seed++) * 36) + 1;
      const reportDate = new Date(
        Date.now() - hoursAgo * 3600 * 1000
      ).toISOString();

      const processedGrok = GrokAgentService.processTelegramMessage(
        rawTelegramMessage,
        city.name,
        isIrrelevantMsg ? undefined : selectedType,
        selectedRisk
      );

      reports.push({
        id: `INU-${String(idCounter).padStart(3, "0")}`,
        fecha: reportDate,
        latitud: Number((city.lat + latOffset).toFixed(5)),
        longitud: Number((city.lng + lngOffset).toFixed(5)),
        tipo: processedGrok.tipo,
        descripcion: rawTelegramMessage,
        riesgo: processedGrok.riesgo,
        estado: processedGrok.estado,
        usuario: TELEGRAM_USERS[userIndex],
        localidad: city.name,
        grokPayload: processedGrok.grokPayload,
      });

      idCounter++;
    }
  });

  return reports;
}

export const MOCK_REPORTS: Report[] = generateMockReports();
