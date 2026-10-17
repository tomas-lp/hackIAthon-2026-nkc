export type LoraAntennaType = "GATEWAY" | "REPETIDOR" | "NODO_BASE";

export interface LoraAntenna {
  id: string;
  nombre: string;
  tipo: LoraAntennaType | string;
  frecuencia: string;
  estado: "OPERATIVO" | "ALERTA" | "RESPALDO";
  coberturaKm: number;
  canal: string;
  bateria?: string;
  latitud: number;
  longitud: number;
  direccion?: string;
  localidad?: string;
  departamento?: string;
  provincia?: string;
  descripcion?: string;
  created_at?: string;
}
