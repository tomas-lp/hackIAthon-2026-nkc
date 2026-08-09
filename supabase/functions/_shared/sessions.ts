import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { SUPABASE_URL, SUPABASE_KEY } from "./constants.ts";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Esquema real de user_sessions:
//   chat_id bigint PK, state text, intentos_fallidos int, datos_temporales jsonb, ultima_interaccion timestamptz

export type BotSession = {
  chat_id: number;
  state: string;
  intentos_fallidos: number;
  datos_temporales: Record<string, unknown>;
  ultima_interaccion: string;
};

export async function getDBSession(chatId: number): Promise<BotSession> {
  const { data, error } = await supabase
    .from("user_sessions")
    .select("*")
    .eq("chat_id", chatId)
    .single();

  const now = new Date();

  if (error || !data) {
    const newSession: BotSession = {
      chat_id: chatId,
      state: "IDLE",
      intentos_fallidos: 0,
      datos_temporales: {},
      ultima_interaccion: now.toISOString(),
    };
    await supabase.from("user_sessions").upsert(newSession);
    return newSession;
  }

  // Reset de sesión si lleva más de 1 hora inactiva (3600000 ms)
  if (now.getTime() - new Date(data.ultima_interaccion).getTime() > 3600000) {
    const resetSession: BotSession = {
      chat_id: chatId,
      state: "IDLE",
      intentos_fallidos: 0,
      datos_temporales: {},
      ultima_interaccion: now.toISOString(),
    };
    await supabase.from("user_sessions").upsert(resetSession);
    return resetSession;
  }

  return data as BotSession;
}

export async function saveDBSession(session: BotSession) {
  session.ultima_interaccion = new Date().toISOString();
  const { error } = await supabase.from("user_sessions").upsert(session);
  if (error) console.error("Error saving session:", error);
}

export async function saveReport(reportData: Record<string, unknown>) {
  const { error } = await supabase.from("reports").insert(reportData);

  if (error) {
    console.error("Error saving report:", error);
    throw error;
  }
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function countNearbyReports(
  lat: number,
  lon: number,
  radiusKm: number = 2
) {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("reports")
    .select("lat, lon")
    .gte("created_at", yesterday);

  if (error || !data) return 0;

  let count = 0;
  for (const r of data) {
    if (r.lat && r.lon) {
      if (haversineDistance(lat, lon, r.lat, r.lon) <= radiusKm) count++;
    }
  }
  return count;
}

export async function uploadPhoto(
  chatId: number,
  base64: string,
  mimeType: string
): Promise<string | null> {
  try {
    const { decode } =
      await import("https://deno.land/std@0.177.0/encoding/base64.ts");
    const bytes = decode(base64);

    const fileName = `${chatId}_${Date.now()}.jpg`;
    const { error } = await supabase.storage
      .from("reports-photos")
      .upload(fileName, bytes, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      console.error("Error subiendo foto a Supabase storage:", error);
      return null;
    }

    // Usamos el cliente de Supabase para obtener la URL pública
    const { data } = supabase.storage
      .from("reports-photos")
      .getPublicUrl(fileName);

    return data.publicUrl;
  } catch (err) {
    console.error("Exception in uploadPhoto:", err);
    return null;
  }
}
