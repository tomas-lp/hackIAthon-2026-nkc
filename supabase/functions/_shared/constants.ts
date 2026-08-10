// ==========================================
// CONFIGURACIÓN Y CLAVES API
// ==========================================
export const GROQ_API_KEY_1 = Deno.env.get("GROQ_API_KEY_1") ?? "";
export const GROQ_API_KEY_2 = Deno.env.get("GROQ_API_KEY_2") ?? "";
export const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
export const WEATHER_API_KEY = Deno.env.get("WEATHER_API_KEY") ?? "";

export const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
export const SUPABASE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  Deno.env.get("SUPABASE_ANON_KEY") ??
  "";

export const MAP_BASE_URL =
  Deno.env.get("MAP_BASE_URL") ?? "http://localhost:3000/?report=";

// ==========================================
// CONFIGURACIÓN DE MODELOS E IAs
// ==========================================

export const GROQ_MODELS = {
  intent: ["openai/gpt-oss-20b", "gemma2-9b-it"],
  validation: ["openai/gpt-oss-120b", "qwen/qwen3.6-27b", "mixtral-8x7b-32768"],
  vision: ["llama-3.2-90b-vision-preview", "llama-3.2-11b-vision-preview"],
};

export const GEMINI_MODELS = {
  text: ["gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-3.5-flash"],
  vision: ["gemini-3.5-flash", "gemini-3.5-flash-lite"],
};

export const TIMEOUTS = {
  ai_call: 8000, // 8s máximo por llamada IA
  weather: 5000, // 5s para clima
  photo_analysis: 20000, // 20s para análisis de foto
};

// ==========================================
// PATRONES REGEX PARA CLASIFICACIÓN RÁPIDA
// ==========================================
export const REGEX_REPORTE =
  /(inundad|agua|desborde|caída|caida|árbol|arbol|emergencia|rescate|bote|tormenta|temporal|granizo|viento|ráfaga|rafaga|tornado|huracan|huracán|anegad|anegamiento|tapado|alcantarilla|techo|voló|volo|corte|luz|electricidad|cable|poste|peligro|evacuación|evacuacion|ayuda|socorro|bombero|policía|policia|ambulancia|herido|auxilio|río|rio|arroyo|cauce|creciente|derrumbe|socavón|socavon|desprendimiento|atrapad)/;
export const REGEX_CONSULTA = /(zona|barrio|clima|llover|lluvia|estado)/;
