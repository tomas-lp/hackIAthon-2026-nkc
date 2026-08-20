export interface RegionPersonalizada {
  id: string;
  user_id: string;
  nombre: string;
  /**
   * En el frontend manejaremos la geometría como un array de coordenadas [lat, lng]
   * para que sea más fácil de dibujar en react-leaflet.
   */
  points: [number, number][];
  created_at: string;
}
