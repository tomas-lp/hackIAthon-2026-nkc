import { createClient } from "@/utils/supabase/client";
import {
  SafeZone,
  CreateSafeZoneDto,
  UpdateSafeZoneDto,
} from "@/types/safeZone";

export class SafeZoneService {
  private get supabase() {
    return createClient();
  }

  async getSafeZones(): Promise<SafeZone[]> {
    const { data, error } = await this.supabase
      .from("safe_zones")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching safe zones:", error.message);
      return [];
    }

    return data as SafeZone[];
  }

  async createSafeZone(dto: CreateSafeZoneDto): Promise<SafeZone | null> {
    const { data, error } = await this.supabase
      .from("safe_zones")
      .insert([dto])
      .select()
      .single();

    if (error) {
      console.error("Error creating safe zone:", error.message);
      return null;
    }

    return data as SafeZone;
  }

  async updateSafeZone(
    id: string,
    dto: UpdateSafeZoneDto
  ): Promise<SafeZone | null> {
    const { data, error } = await this.supabase
      .from("safe_zones")
      .update(dto)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating safe zone:", error.message);
      return null;
    }

    return data as SafeZone;
  }

  async deleteSafeZone(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from("safe_zones")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting safe zone:", error.message);
      return false;
    }

    return true;
  }
}

export const safeZoneService = new SafeZoneService();
