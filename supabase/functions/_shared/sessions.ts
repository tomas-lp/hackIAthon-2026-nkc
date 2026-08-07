import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { SUPABASE_URL, SUPABASE_KEY } from "./constants.ts";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function getSession(
  userId: string,
  platform: "telegram" | "whatsapp"
) {
  const { data, error } = await supabase
    .from("user_sessions")
    .select("estado, contexto_reporte")
    .eq("user_id", userId)
    .eq("platform", platform)
    .single();

  if (error || !data) return { estado: "IDLE", contexto_reporte: {} };
  return { estado: data.estado, contexto_reporte: data.contexto_reporte || {} };
}

export async function updateSession(
  userId: string,
  platform: "telegram" | "whatsapp",
  estado: string,
  contexto: Record<string, unknown> = {}
) {
  const { error } = await supabase
    .from("user_sessions")
    .upsert({ user_id: userId, platform, estado, contexto_reporte: contexto });

  if (error) console.error("Error updating session:", error);
}

export async function saveReport(reportData: Record<string, unknown>) {
  const { error } = await supabase.from("reportes").insert(reportData);

  if (error) {
    console.error("Error saving report:", error);
    throw error;
  }
}
