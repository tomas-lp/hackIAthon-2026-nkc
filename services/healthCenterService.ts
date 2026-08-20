import { createClient } from "@/utils/supabase/client";
import { HealthCenter, HealthCenterType } from "@/types/healthCenter";

function inferTipo(
  nombre: string,
  rawTipo: HealthCenterType
): HealthCenterType {
  const n = (nombre || "").toUpperCase();
  if (
    n.includes("SAPS") ||
    n.includes("S.A.P.S") ||
    n.includes("SALUD DE ATENCION PRIMARIA") ||
    n.includes("SALA DE ATENCION PRIMARIA") ||
    n.includes("SALA DE SALUD")
  )
    return "SAPS";
  if (n.includes("CAPS") || n.includes("C.A.P.S")) return "CAPS";
  if (n.includes("CLINICA") || n.includes("CLÍNICA")) return "CLINICA";
  if (n.includes("SANATORIO")) return "SANATORIO";
  if (
    n.includes("POLICONSULTORIO") ||
    n.includes("POLICLÍNICA") ||
    n.includes("POLICLINICA") ||
    n.includes("CONSULTORIO") ||
    n.includes("CONSULTORIOS")
  )
    return "POLICONSULTORIO";
  if (n.includes("HOSPITAL") || n.includes("HOSP.")) return "HOSPITAL";

  if (rawTipo) return rawTipo;
  return "HOSPITAL";
}

export const healthCenterService = {
  async getHealthCenters(): Promise<HealthCenter[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("health_centers")
      .select("*")
      .order("nombre", { ascending: true });

    if (error) {
      console.error("Error al obtener centros de salud:", error.message);
      return [];
    }

    return (data as HealthCenter[]).map((hc) => ({
      ...hc,
      tipo: inferTipo(hc.nombre, hc.tipo),
    }));
  },

  async getHealthCentersByType(
    tipo: HealthCenterType
  ): Promise<HealthCenter[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("health_centers")
      .select("*")
      .eq("tipo", tipo)
      .order("nombre", { ascending: true });

    if (error) {
      console.error(
        `Error al obtener centros de salud del tipo ${tipo}:`,
        error.message
      );
      return [];
    }

    return data as HealthCenter[];
  },

  async getHealthCentersNearby(
    lat: number,
    lon: number,
    radiusKm: number = 5
  ): Promise<HealthCenter[]> {
    const supabase = createClient();
    // Utiliza consulta espacial mediante PostGIS ST_DWithin si la RPC está disponible, o filtrado Haversine en cliente
    const { data, error } = await supabase
      .from("health_centers")
      .select("*")
      .not("lat", "is", null)
      .not("lon", "is", null);

    if (error) {
      console.error(
        "Error al obtener centros de salud cercanos:",
        error.message
      );
      return [];
    }

    const R = 6371; // Radio de la Tierra en km
    const centers = (data as HealthCenter[]).filter((c) => {
      if (c.lat === null || c.lon === null) return false;
      const dLat = ((c.lat - lat) * Math.PI) / 180;
      const dLon = ((c.lon - lon) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat * Math.PI) / 180) *
          Math.cos((c.lat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return dist <= radiusKm;
    });

    return centers;
  },

  async updateHealthCenter(
    id: string,
    dto: { nombre: string; tipo?: HealthCenterType }
  ): Promise<HealthCenter | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("health_centers")
      .update(dto)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error al actualizar centro de salud:", error.message);
      return null;
    }

    return data as HealthCenter;
  },

  async deleteHealthCenter(id: string): Promise<boolean> {
    const supabase = createClient();
    const { error } = await supabase
      .from("health_centers")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error al eliminar centro de salud:", error.message);
      return false;
    }

    return true;
  },
};
