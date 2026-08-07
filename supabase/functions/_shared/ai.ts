import {
  GROQ_API_KEY_1,
  GROQ_API_KEY_2,
  GEMINI_API_KEY,
  GROQ_MODELS,
  GEMINI_MODELS,
  TIMEOUTS,
  REGEX_REPORTE,
  REGEX_CONSULTA,
} from "./constants.ts";

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

// Cachés dinámicos por si los hardcodeados fallan
let activeGroqIntentModel = GROQ_MODELS.intent[0];
let activeGroqValidationModel = GROQ_MODELS.validation[0];

async function fetchActiveGroqModels(apiKey: string): Promise<string[]> {
  const res = await fetchWithTimeout(
    "https://api.groq.com/openai/v1/models",
    {
      headers: { Authorization: `Bearer ${apiKey}` },
    },
    5000
  );

  if (!res.ok) throw new Error("Fallo al obtener modelos de Groq");
  const data = await res.json();
  const models = data.data.map((m: { id: string }) => m.id);
  return models;
}

function selectBestModel(available: string[], preferences: string[]): string {
  for (const pref of preferences) {
    if (available.includes(pref)) return pref;
  }
  // Fallback a algún llama u open source que encontremos
  return (
    available.find(
      (id) =>
        id.includes("llama") ||
        id.includes("gemma") ||
        id.includes("qwen") ||
        id.includes("gpt")
    ) || available[0]
  );
}

async function executeGroqCall(
  apiKey: string,
  model: string,
  prompt: string,
  expectJson: boolean
) {
  const res = await fetchWithTimeout(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        ...(expectJson ? { response_format: { type: "json_object" } } : {}),
      }),
    },
    TIMEOUTS.ai_call
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw { status: res.status, errorData, message: "Error HTTP en Groq" };
  }

  const data = await res.json();
  const content = data.choices[0].message.content;
  return expectJson ? JSON.parse(content) : content;
}

export async function callGroqWithDiscovery(
  apiKey: string,
  task: "intent" | "validation",
  prompt: string,
  expectJson: boolean
) {
  const model =
    task === "intent" ? activeGroqIntentModel : activeGroqValidationModel;

  try {
    return await executeGroqCall(apiKey, model, prompt, expectJson);
  } catch (error: unknown) {
    const err = error as { status?: number; errorData?: unknown };
    const isModelError =
      err.status === 404 ||
      err.status === 400 ||
      JSON.stringify(err.errorData).includes("model");

    if (isModelError) {
      console.warn(
        `Modelo ${model} falló en Groq. Iniciando autodescubrimiento...`
      );
      try {
        const availableModels = await fetchActiveGroqModels(apiKey);
        const preferences =
          task === "intent" ? GROQ_MODELS.intent : GROQ_MODELS.validation;
        const newModel = selectBestModel(availableModels, preferences);

        if (newModel) {
          if (task === "intent") activeGroqIntentModel = newModel;
          else activeGroqValidationModel = newModel;
          console.info(`Nuevo modelo configurado: ${newModel}`);
          return await executeGroqCall(apiKey, newModel, prompt, expectJson);
        }
      } catch (discoveryError) {
        console.error("Fallo el autodescubrimiento en Groq", discoveryError);
      }
    }
    throw error;
  }
}

async function executeGeminiCall(
  model: string,
  prompt: string,
  expectJson: boolean
) {
  const res = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    },
    TIMEOUTS.ai_call
  );

  if (!res.ok) throw new Error("Gemini Text API falló");
  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error("Respuesta vacía de Gemini");

  return expectJson ? JSON.parse(rawText.replace(/```json|```/g, "")) : rawText;
}

async function runTextAIFallback(
  task: "intent" | "validation",
  prompt: string,
  expectJson: boolean = true
) {
  try {
    return await callGroqWithDiscovery(
      GROQ_API_KEY_1,
      task,
      prompt,
      expectJson
    );
  } catch (e1) {
    console.error("Groq 1 failed:", e1);
    try {
      return await callGroqWithDiscovery(
        GROQ_API_KEY_2,
        task,
        prompt,
        expectJson
      );
    } catch (e2) {
      console.error("Groq 2 failed, falling back to Gemini Text:", e2);
      try {
        const geminiModel = GEMINI_MODELS.text[0]; // ej. gemini-3.5-flash-lite
        return await executeGeminiCall(geminiModel, prompt, expectJson);
      } catch (e3) {
        console.error("All text AI models failed:", e3);
        throw e3;
      }
    }
  }
}

export async function classifyIntent(
  text: string
): Promise<"REPORTE" | "CONSULTA" | "DESCONOCIDO"> {
  const cleanText = text.substring(0, 500);

  // 1. Shortcuts exactos
  if (cleanText === "🚨 Enviar Reporte" || cleanText === "REPORTE")
    return "REPORTE";
  if (cleanText === "📍 Estado de mi zona" || cleanText === "CONSULTA")
    return "CONSULTA";

  // 2. Regex rápido
  const lower = cleanText.toLowerCase();
  if (REGEX_REPORTE.test(lower)) return "REPORTE";
  if (REGEX_CONSULTA.test(lower)) return "CONSULTA";

  // 3. IA Fallback
  const prompt = `Analiza el texto de este ciudadano. Clasifica la intención en: 'REPORTE' (inundación, agua, peligro, caída de árbol), 'CONSULTA' (clima, saber estado de zona) o 'DESCONOCIDO' (otra cosa). Texto: "${cleanText}". Responde SÓLO con JSON: {"intent": "REPORTE"}`;

  try {
    const res = await runTextAIFallback("intent", prompt, true);
    return res.intent || "DESCONOCIDO";
  } catch {
    return "DESCONOCIDO";
  }
}

export async function validateDescription(text: string): Promise<{
  es_emergencia: boolean;
  tipo: string;
  nivel_descripcion: string;
}> {
  const cleanText = text.substring(0, 500);
  const prompt = `Analiza este texto de un ciudadano reportando un problema. Considera como emergencia válida (es_emergencia: true) cualquier reporte relacionado con lluvia, inundación, granizo, árboles caídos, anegamientos o problemas climáticos, incluso si el tono es casual o no parece muy grave. Responde SÓLO con JSON:
{
  "es_emergencia": true/false,
  "tipo": "INUNDACION_URBANA" | "LLUVIAS_FUERTES" | "GRANIZO" | "ANEGAMIENTO_VIVIENDA",
  "nivel": "AGUA_CALLE" | "NO_CIRCULAR" | "AGUA_CASAS" | "EVACUADOS"
}
Texto: "${cleanText}"`;

  try {
    const res = await runTextAIFallback("validation", prompt, true);
    const nivel = String(
      res.nivel || res.nivel_descripcion || "AGUA_CALLE"
    ).toUpperCase();
    const nivelesValidos = [
      "AGUA_CALLE",
      "NO_CIRCULAR",
      "AGUA_CASAS",
      "EVACUADOS",
    ];

    return {
      es_emergencia: !!res.es_emergencia,
      tipo: res.tipo || "INUNDACION_URBANA",
      nivel_descripcion: nivelesValidos.includes(nivel) ? nivel : "AGUA_CALLE",
    };
  } catch {
    return {
      es_emergencia: true,
      tipo: "INUNDACION_URBANA",
      nivel_descripcion: "AGUA_CALLE",
    };
  }
}

export async function analyzePhoto(
  base64Image: string,
  mimeType: string
): Promise<{
  foto_valida: boolean;
  nivel_agua?: string;
  descripcion_breve: string;
}> {
  const models = GEMINI_MODELS.vision;

  for (const model of models) {
    const isThinkingModel =
      model.includes("2.0") ||
      model.includes("2.5") ||
      model.includes("3.5") ||
      model.includes("3.6");

    const payload = {
      contents: [
        {
          parts: [
            { text: "Analiza esta imagen de reporte ciudadano." },
            { inlineData: { mimeType, data: base64Image } },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            foto_valida: {
              type: "BOOLEAN",
              description:
                "true si muestra inundación, calle anegada, daño climático o árbol caído. false en caso contrario.",
            },
            nivel_agua: {
              type: "STRING",
              enum: ["ALTO", "MEDIO", "BAJO", "NULO"],
            },
            descripcion_breve: {
              type: "STRING",
              description: "Descripción muy corta (máximo 15 palabras).",
            },
          },
          required: ["foto_valida", "nivel_agua", "descripcion_breve"],
        },
        ...(isThinkingModel ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
      },
    };

    try {
      console.info(`Intentando análisis de foto con modelo: ${model}`);
      const res = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        TIMEOUTS.photo_analysis
      );

      if (!res.ok) {
        const errText = await res.text().catch(() => "Desconocido");
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error("Respuesta vacía de Gemini");

      const result = JSON.parse(rawText.replace(/```json|```/g, ""));
      console.info(`Análisis exitoso con ${model}:`, JSON.stringify(result));
      return result;
    } catch (err: unknown) {
      const error = err as Error;
      console.error(
        `Fallo análisis de foto con el modelo ${model}:`,
        error.message
      );
      // Continuamos al siguiente modelo
    }
  }

  console.error("Todos los modelos de visión de Gemini fallaron.");
  return {
    foto_valida: false,
    descripcion_breve: "Fallo el análisis visual",
  };
}
