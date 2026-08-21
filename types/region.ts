export interface RegionLista {
  id: string;
  user_id: string;
  nombre: string;
  created_at: string;
}

export interface RegionPersonalizada {
  id: string;
  user_id: string;
  nombre: string;
  lista_id?: string | null;
  lista_nombre?: string | null;
  /**
   * En el frontend manejaremos la geometría como un array de coordenadas [lat, lng]
   * para que sea más fácil de dibujar en react-leaflet.
   */
  points: [number, number][];
  created_at: string;
}
