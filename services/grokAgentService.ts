import {
  ReportType,
  RiskLevel,
  ValidationStatus,
  TelegramGrokPayload,
} from "@/types/report";
import { WeatherService } from "./weatherService";

export interface ProcessedGrokMessage {
  tipo: ReportType;
  riesgo: RiskLevel;
  estado: ValidationStatus;
  grokPayload: TelegramGrokPayload;
}

export class GrokAgentService {
  /**
   * Simulates Grok AI Agent NLP processing on raw Telegram natural language messages,
   * extracting strictly direct rain/precipitation tags and cross-checking against current Weather API.
   */
  static processTelegramMessage(
    rawText: string,
    locality: string,
    forcedType?: ReportType,
    forcedRisk?: RiskLevel
  ): ProcessedGrokMessage {
    const textLower = rawText.toLowerCase();

    // Check if the claim is related strictly to current rain / precipitation / direct rainfall flooding
    const isDirectRainRelated =
      textLower.includes("inundac") ||
      textLower.includes("lluvia") ||
      textLower.includes("agua") ||
      textLower.includes("granizo") ||
      textLower.includes("anegam") ||
      textLower.includes("tormenta");

    if (!isDirectRainRelated) {
      return {
        tipo: forcedType || "INUNDACION_URBANA",
        riesgo: forcedRisk || "BAJO",
        estado: "DESESTIMADO_IRRELEVANTE",
        grokPayload: {
          rawTelegramMessage: rawText,
          grokExtractedTags: ["NO_PRECIPITACION_DIRECTA"],
          grokConfidence: 0.98,
          weatherApiMatch: false,
          weatherAlertDetails:
            "Desestimado por Agente Grok AI: El mensaje no corresponde a un evento de precipitación o lluvia directa.",
        },
      };
    }

    // Determine type from Grok NLP
    let extractedType: ReportType = forcedType || "INUNDACION_URBANA";
    if (!forcedType) {
      if (textLower.includes("granizo")) extractedType = "GRANIZO";
      else if (textLower.includes("vivienda") || textLower.includes("casa"))
        extractedType = "ANEGAMIENTO_VIVIENDA";
      else if (
        textLower.includes("lluvia fuerte") ||
        textLower.includes("torrencial")
      )
        extractedType = "LLUVIAS_FUERTES";
    }

    // Weather API Cross-Validation Check (Current precipitation / rain status)
    const weatherAlert = WeatherService.getWeatherAlert(locality);
    const weatherApiMatch = weatherAlert.hasActiveAlert;

    let finalStatus: ValidationStatus = "VALIDADO_CLIMA";
    if (!weatherApiMatch) {
      // User claims rain/flooding, BUT Weather API indicates NO active rain/precipitation in this locality!
      finalStatus = "DESESTIMADO_SIN_ALERTA";
    }

    return {
      tipo: extractedType,
      riesgo: forcedRisk || "ALTO",
      estado: finalStatus,
      grokPayload: {
        rawTelegramMessage: rawText,
        grokExtractedTags: [extractedType, forcedRisk || "ALTO", locality],
        grokConfidence: 0.95,
        weatherApiMatch,
        weatherAlertDetails: weatherAlert.hasActiveAlert
          ? `${weatherAlert.title}: ${weatherAlert.description}`
          : "Desestimado: La API del Clima indica 0mm de lluvia y cielo estable en esta ubicación.",
      },
    };
  }
}
