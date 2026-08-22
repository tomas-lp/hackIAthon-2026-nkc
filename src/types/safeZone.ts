export interface SafeZone {
  id: string;
  nombre: string;
  descripcion: string;
  latitud: number;
  longitud: number;
  created_at: string;
}

export type CreateSafeZoneDto = Omit<SafeZone, "id" | "created_at">;
export type UpdateSafeZoneDto = Partial<CreateSafeZoneDto>;
