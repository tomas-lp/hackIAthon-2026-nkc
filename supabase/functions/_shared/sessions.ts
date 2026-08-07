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

  // Reset de sesión si lleva más de 10 minutos inactiva
  if (now.getTime() - new Date(data.ultima_interaccion).getTime() > 600000) {
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

export async function uploadPhoto(
  chatId: number,
  base64: string,
  mimeType: string
): Promise<string | null> {
  try {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
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
