import { createClient } from '@/utils/supabase/client';
import { RegionPersonalizada } from '@/types/region';

export const regionService = {
  async getRegions(): Promise<RegionPersonalizada[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('regiones_personalizadas_view')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching regions:', error);
      return [];
    }

    return (data || []).map((row: any) => {
      // GeoJSON Polygon coordinates are in [lng, lat] format and nested: [[[lng, lat], [lng, lat], ...]]
      const coords = row.geom_json.coordinates[0];
      // Convert to [lat, lng] for Leaflet
      const points = coords.map((c: number[]) => [c[1], c[0]]);

      return {
        id: row.id,
        user_id: row.user_id,
        nombre: row.nombre,
        points: points,
        created_at: row.created_at,
      };
    });
  },

  async createRegion(nombre: string, points: [number, number][]): Promise<void> {
    const supabase = createClient();
    
    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No auth user');

    // Convert Leaflet [lat, lng] to PostGIS POLYGON((lng lat, lng lat, ...)) string
    // Polygon must be closed (first point == last point)
    let ring = [...points];
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      ring.push(first);
    }

    const wkt = `POLYGON((${ring.map(p => `${p[1]} ${p[0]}`).join(', ')}))`;

    const { error } = await supabase
      .from('regiones_personalizadas')
      .insert({
        user_id: user.id,
        nombre,
        geom: wkt
      });

    if (error) throw error;
  },

  async deleteRegion(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('regiones_personalizadas')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
