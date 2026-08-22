import { createClient } from "@/lib/supabase/client";
import { RegionLista, RegionPersonalizada } from "@/types/region";

export const regionService = {
  async getLists(): Promise<RegionLista[]> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("listas_regiones")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching region lists:", error);
      return [];
    }

    // Si el usuario no tiene ninguna lista, creamos "Lista 1" por defecto
    if (!data || data.length === 0) {
      const defaultList = await this.createList("Lista 1");
      return defaultList ? [defaultList] : [];
    }

    return data;
  },

  async createList(nombre: string): Promise<RegionLista | null> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("No auth user");

    const cleanName = nombre.trim() || "Lista 1";

    const { data, error } = await supabase
      .from("listas_regiones")
      .insert({
        user_id: user.id,
        nombre: cleanName,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating region list:", error);
      return null;
    }

    return data;
  },

  async getRegions(): Promise<RegionPersonalizada[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("regiones_personalizadas_view")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching regions:", error);
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((row: any) => {
      const coords = row.geom_json?.coordinates?.[0] || [];
      const points = coords.map((c: number[]) => [c[1], c[0]]);

      return {
        id: row.id,
        user_id: row.user_id,
        nombre: row.nombre,
        lista_id: row.lista_id,
        lista_nombre: row.lista_nombre || "Lista 1",
        points: points,
        created_at: row.created_at,
      };
    });
  },

  async createRegion(
    nombre: string,
    points: [number, number][],
    lista_id?: string
  ): Promise<void> {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("No auth user");

    // Aseguramos tener un lista_id válido (por defecto Lista 1)
    let targetListaId =
      lista_id && lista_id.trim() !== "" ? lista_id.trim() : null;

    if (!targetListaId) {
      const existingLists = await this.getLists();
      targetListaId = existingLists[0]?.id || null;
    }

    // Convert Leaflet [lat, lng] to PostGIS POLYGON((lng lat, lng lat, ...)) string
    const ring = [...points];
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      ring.push(first);
    }

    const wkt = `POLYGON((${ring.map((p) => `${p[1]} ${p[0]}`).join(", ")}))`;

    const { error } = await supabase.from("regiones_personalizadas").insert({
      user_id: user.id,
      nombre: nombre.trim(),
      geom: wkt,
      lista_id: targetListaId,
    });

    if (error) {
      console.error("Error creating region in supabase:", error);
      throw error;
    }
  },

  async deleteRegion(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("regiones_personalizadas")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  async deleteRegions(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("regiones_personalizadas")
      .delete()
      .in("id", ids);

    if (error) throw error;
  },
};
