import { createClient } from "@/lib/supabase/client";
import { formatTitleCase } from "@/lib/format";

export interface BarrioProperties {
  id: string;
  nombre: string;
  ciudad: string;
  report_count?: number;
}

export interface BarrioFeature {
  type: "Feature";
  geometry: GeoJSON.Geometry;
  properties: BarrioProperties;
}

export interface BarriosFeatureCollection {
  type: "FeatureCollection";
  features: BarrioFeature[];
}

export const barrioService = {
  async getBarriosGeoJson(): Promise<BarriosFeatureCollection | null> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("get_barrios_geojson");

    if (error) {
      console.error("Error fetching barrios geojson from PostGIS:", error);
      return null;
    }

    const geoJson = data as unknown as BarriosFeatureCollection;
    if (geoJson && geoJson.features) {
      geoJson.features = geoJson.features.map((feature) => {
        if (feature.properties) {
          feature.properties.nombre = formatTitleCase(
            feature.properties.nombre
          );
          feature.properties.ciudad = formatTitleCase(
            feature.properties.ciudad
          );
        }
        return feature;
      });
    }

    return geoJson || null;
  },
};
